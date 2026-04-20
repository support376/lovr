import 'server-only'
import { randomUUID } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import {
  actions as actionsTbl,
  events,
  goals,
  outcomes,
  type Action,
  type Outcome,
} from '../db/schema'
import { ensureSchema } from '../db/init'
import { anthropic, MODEL } from '../ai/client'
import {
  outcomeAnalysisPrompt,
  strategyProposalPrompt,
  weeklyReportPrompt,
} from '../prompts/loader'
import { buildContext } from './context'
import { evaluateActionText, evaluateGoal } from '../rules/ethics'
import { promptContextBlock, findPlays, playsPromptBlock } from '../ontology'

/**
 * 전략 제안 생성 (ontology 3.2).
 * 윤리 룰 → LLM → Action 레코드 저장.
 */
export async function proposeStrategy(params: {
  relationshipId: string
  goalId: string
  currentSituation: string // 유저가 이번 쿼리 때 쓰는 추가 맥락
}): Promise<{ actionId: string; markdown: string; ethicsStatus: string }> {
  await ensureSchema()

  const ctx = await buildContext(params.relationshipId, 30)

  // 1. Goal + self/partner 기준 윤리 체크
  const goal = ctx.goals.find((g) => g.id === params.goalId)
  if (!goal) throw new Error('Goal not found')

  if (ctx.self && ctx.partner) {
    const goalEval = evaluateGoal({
      self: ctx.self,
      partner: ctx.partner,
      goalCategory: goal.category as never,
    })
    if (goalEval.status === 'blocked') {
      throw new Error(
        `윤리 룰 차단: ${goalEval.results.map((r) => r.reason).join(' / ')}`
      )
    }
  }

  // 2. LLM — 전략 3안. stage·goal·style 온톨로지 블록 + Play 카탈로그 주입.
  const client = anthropic()
  const system = strategyProposalPrompt()
  const ontologyBlock = promptContextBlock({
    stage: ctx.relationship?.progress ?? null,
    goal: goal.category,
    style: ctx.relationship?.style ?? null,
  })
  const candidatePlays = findPlays({
    stage: ctx.relationship?.progress ?? null,
    goal: goal.category,
    style: ctx.relationship?.style ?? null,
  })
  const plays =
    candidatePlays.length > 0
      ? candidatePlays
      : findPlays({
          stage: ctx.relationship?.progress ?? null,
          goal: goal.category,
        })
  const playsBlock = playsPromptBlock(plays)

  const userMsg = `${ctx.markdown}

${ontologyBlock}

${playsBlock}

## [이번 쿼리 추가 맥락]
${params.currentSituation}

## [목표]
${goal.category} — ${goal.description}

전략 3안 출력. 반드시 [답변 스타일]의 톤·언어·실패 모드를 따를 것.`

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMsg }],
  })

  const markdown = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()

  // 3. Action 텍스트 레벨 윤리 재검증
  const actionEval =
    ctx.self && ctx.partner
      ? evaluateActionText({
          actionContent: markdown,
          self: ctx.self,
          partner: ctx.partner,
        })
      : { status: 'ok' as const, results: [], applicableLaws: [] }

  const id = `act-${randomUUID()}`
  try {
    await db.insert(actionsTbl).values({
      id,
      relationshipId: params.relationshipId,
      goalId: goal.id,
      source: 'ai_proposed',
      content: markdown,
      status: 'proposed',
      ethicsStatus: actionEval.status,
      ethicsReasons: actionEval.results.map((r) => `[${r.ruleId}] ${r.reason}`),
    })
  } catch (e) {
    console.error('[proposeStrategy insert]', {
      id,
      relationshipId: params.relationshipId,
      goalId: goal.id,
      markdownLen: markdown.length,
      error: (e as Error).message,
    })
    throw e
  }

  return { actionId: id, markdown, ethicsStatus: actionEval.status }
}

/**
 * 실행 후 결과 분석 (ontology 3.3).
 * action + action 이후 event들을 LLM에 던져 Outcome 초안 생성.
 */
export async function analyzeOutcome(actionId: string): Promise<{
  outcomeId: string
  markdown: string
}> {
  await ensureSchema()
  const [action] = await db
    .select()
    .from(actionsTbl)
    .where(eq(actionsTbl.id, actionId))
    .limit(1)
  if (!action) throw new Error('Action not found')

  const [goal] = await db.select().from(goals).where(eq(goals.id, action.goalId)).limit(1)
  const ctx = await buildContext(action.relationshipId, 50)

  // action.executedAt 이후 events만 필터
  const executedAt =
    action.executedAt instanceof Date
      ? action.executedAt.getTime()
      : action.executedAt != null
      ? Number(action.executedAt)
      : null
  const afterEvents = executedAt
    ? ctx.events.filter((e) => {
        const t = e.timestamp instanceof Date ? e.timestamp.getTime() : Number(e.timestamp)
        return t >= executedAt
      })
    : ctx.events

  const eventsBlock = afterEvents.length
    ? afterEvents
        .map((e) => {
          const ts = e.timestamp instanceof Date ? e.timestamp : new Date(Number(e.timestamp))
          return `### [${e.type}] ${ts.toISOString()}\n${e.content}`
        })
        .join('\n\n')
    : '(실행 후 이벤트 없음)'

  const client = anthropic()
  const system = outcomeAnalysisPrompt()
  const userMsg = `## [action]
${action.content}

## [goal]
${goal?.category ?? '?'} / ${goal?.description ?? '?'}

## [executed_at]
${executedAt ? new Date(executedAt).toISOString() : '(미실행)'}

## [events after executed_at]
${eventsBlock}

## [relationship 현재 상태]
${ctx.markdown}`

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMsg }],
  })

  const markdown = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()

  // Outcome 테이블 저장. markdown을 narrative에 통째로, 파싱은 나중에.
  const id = `out-${randomUUID()}`
  await db.insert(outcomes).values({
    id,
    actionId,
    observedSignals: eventsBlock,
    relatedEventIds: afterEvents.map((e) => e.id),
    goalProgress: 'unclear', // 파싱 정교화는 후순위
    surpriseLevel: 'expected',
    narrative: markdown,
    lessons: [],
    triggeredActionIds: [],
  })

  return { outcomeId: id, markdown }
}

/**
 * Action을 실행 완료 상태로 전환.
 */
export async function markActionExecuted(actionId: string): Promise<void> {
  await ensureSchema()
  await db
    .update(actionsTbl)
    .set({ status: 'executed', executedAt: new Date() })
    .where(eq(actionsTbl.id, actionId))
}

/**
 * Action 을 실행 안 함으로 처리 (유저가 "안 했음" 선택).
 */
export async function markActionCancelled(actionId: string): Promise<void> {
  await ensureSchema()
  await db
    .update(actionsTbl)
    .set({ status: 'cancelled' })
    .where(eq(actionsTbl.id, actionId))
}

/**
 * 유저가 직접 기록하는 outcome (LLM 사용 안 함).
 * closed-loop 최소 착수: action 실행 후 한 줄 narrative + 4단 진행도.
 */
export async function recordManualOutcome(params: {
  actionId: string
  narrative: string
  goalProgress: 'advanced' | 'stagnant' | 'regressed' | 'unclear'
}): Promise<{ outcomeId: string }> {
  await ensureSchema()
  const [action] = await db
    .select()
    .from(actionsTbl)
    .where(eq(actionsTbl.id, params.actionId))
    .limit(1)
  if (!action) throw new Error('Action not found')

  // executed 아직 아니면 같이 executed 로 올림
  if (action.status !== 'executed') {
    await db
      .update(actionsTbl)
      .set({ status: 'executed', executedAt: new Date() })
      .where(eq(actionsTbl.id, params.actionId))
  }

  const id = `out-${randomUUID()}`
  await db.insert(outcomes).values({
    id,
    actionId: params.actionId,
    observedSignals: '(manual entry)',
    relatedEventIds: [],
    goalProgress: params.goalProgress,
    surpriseLevel: 'expected',
    narrative: params.narrative,
    lessons: [],
    triggeredActionIds: [],
  })

  return { outcomeId: id }
}

/**
 * 주간 리포트 (ontology 3.5).
 * 지난 7일 event/action/outcome을 받아 Insight 초안 생성.
 */
export async function generateWeeklyReport(relationshipId: string): Promise<{
  markdown: string
}> {
  await ensureSchema()

  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

  const allEvents = await db
    .select()
    .from(events)
    .where(eq(events.relationshipId, relationshipId))
    .orderBy(desc(events.timestamp))
  const recent = allEvents.filter((e) => {
    const t = e.timestamp instanceof Date ? e.timestamp.getTime() : Number(e.timestamp)
    return t >= sevenDaysAgo
  })

  const allActions = await db
    .select()
    .from(actionsTbl)
    .where(eq(actionsTbl.relationshipId, relationshipId))
  const recentActions = allActions.filter((a) => {
    const t = a.createdAt instanceof Date ? a.createdAt.getTime() : Number(a.createdAt)
    return t >= sevenDaysAgo
  })

  const actionIds = recentActions.map((a) => a.id)
  const recentOutcomes: Outcome[] = []
  for (const id of actionIds) {
    const rows = await db.select().from(outcomes).where(eq(outcomes.actionId, id))
    recentOutcomes.push(...rows)
  }

  const ctx = await buildContext(relationshipId, 0)
  const partnerName = ctx.partner?.displayName ?? '?'

  const system = weeklyReportPrompt()
  const userMsg = `## [events last 7d]
${formatEvents(recent)}

## [actions last 7d]
${formatActions(recentActions)}

## [outcomes last 7d]
${formatOutcomes(recentOutcomes)}

## [active insights]
${ctx.insights.length === 0 ? '(없음)' : ctx.insights.map((i) => `- [${i.id}][${i.scope}] ${i.observation}`).join('\n')}

## [relationship name]
${partnerName}`

  const client = anthropic()
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMsg }],
  })

  const markdown = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()

  return { markdown }
}

function formatEvents(list: Array<typeof events.$inferSelect>): string {
  if (list.length === 0) return '(없음)'
  return list
    .map((e) => {
      const ts = e.timestamp instanceof Date ? e.timestamp : new Date(Number(e.timestamp))
      return `### [${e.type}] ${ts.toISOString()}\n${e.content}`
    })
    .join('\n\n')
}

function formatActions(list: Action[]): string {
  if (list.length === 0) return '(없음)'
  return list.map((a) => `- [${a.status}] ${a.content.slice(0, 200)}…`).join('\n')
}

function formatOutcomes(list: Outcome[]): string {
  if (list.length === 0) return '(없음)'
  return list
    .map((o) => `### outcome ${o.id}\n${o.narrative}`)
    .join('\n\n')
}

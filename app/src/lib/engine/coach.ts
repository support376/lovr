import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '../db/client'
import {
  actions as actionsTbl,
  events,
  goals,
  outcomes,
  type Action,
  type Outcome,
} from '../db/schema'
import { anthropic, MODEL } from '../ai/client'
import {
  outcomeAnalysisPrompt,
  strategyProposalPrompt,
  weeklyReportPrompt,
} from '../prompts/loader'
import { buildContext } from './context'

export async function proposeStrategy(params: {
  userId: string
  relationshipId: string
  currentSituation?: string
}): Promise<{ actionId: string; markdown: string }> {
  const ctx = await buildContext(params.userId, params.relationshipId, 30)

  const client = anthropic()
  const system = strategyProposalPrompt()
  const userMsg = `${ctx.markdown}

## [이번 쿼리 추가 맥락]
${params.currentSituation?.trim() || '(없음 · 최근 Event 기반으로만 제안)'}

지금까지의 모든 맥락 + 관찰된 행동·파워 다이내믹·과거 시도 결과를 읽고, **지금 해야 할 행동 3개**를 제안하라. 명령조, 구체적으로.`

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMsg }],
  })

  const markdown = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()

  const autoGoalId = await ensureAutoGoal(params.userId, params.relationshipId)

  const id = `act-${randomUUID()}`
  await db.insert(actionsTbl).values({
    id,
    userId: params.userId,
    relationshipId: params.relationshipId,
    goalId: autoGoalId,
    source: 'ai_proposed',
    content: markdown,
    status: 'proposed',
    ethicsStatus: 'ok',
    ethicsReasons: [],
  })

  return { actionId: id, markdown }
}

async function ensureAutoGoal(userId: string, relationshipId: string): Promise<string> {
  const existing = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.relationshipId, relationshipId),
        eq(goals.userId, userId),
        eq(goals.category, 'auto'),
        isNull(goals.deprecatedAt)
      )
    )
    .limit(1)
  if (existing[0]) return existing[0].id

  const id = `goal-${randomUUID()}`
  await db.insert(goals).values({
    id,
    userId,
    relationshipId,
    category: 'auto',
    description: '(legacy placeholder — ontology 제거 후 자동 생성)',
    priority: 'primary',
    ethicsStatus: 'ok',
    ethicsReasons: [],
    applicableLaws: [],
  })
  return id
}

export async function analyzeOutcome(
  userId: string,
  actionId: string,
  userNote?: string
): Promise<{ outcomeId: string; markdown: string }> {
  const [action] = await db
    .select()
    .from(actionsTbl)
    .where(and(eq(actionsTbl.id, actionId), eq(actionsTbl.userId, userId)))
    .limit(1)
  if (!action) throw new Error('Action not found')

  const ctx = await buildContext(userId, action.relationshipId, 50)

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
          const whyBlock = e.selfNote ? `\n**Why:** ${e.selfNote}` : ''
          return `### [${e.type}] ${ts.toISOString()}\n**Fact:**\n${e.content}${whyBlock}`
        })
        .join('\n\n')
    : '(실행 후 이벤트 없음)'

  const client = anthropic()
  const system = outcomeAnalysisPrompt()
  const userMsg = `## [action]
${action.content}

## [executed_at]
${executedAt ? new Date(executedAt).toISOString() : '(미실행)'}

## [유저가 남긴 결과 메모]
${userNote?.trim() || '(없음)'}

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

  const combined = userNote?.trim()
    ? `**유저 메모:**\n${userNote.trim()}\n\n---\n\n**분석:**\n${markdown}`
    : markdown

  const id = `out-${randomUUID()}`
  await db.insert(outcomes).values({
    id,
    userId,
    actionId,
    observedSignals: eventsBlock,
    relatedEventIds: afterEvents.map((e) => e.id),
    goalProgress: 'unclear',
    surpriseLevel: 'expected',
    narrative: combined,
    lessons: [],
    triggeredActionIds: [],
  })

  // 결과를 기록(Event) 에도 append — 타임라인에 자동 노출
  try {
    const eventId = `evt-${randomUUID()}`
    await db.insert(events).values({
      id: eventId,
      userId,
      relationshipId: action.relationshipId,
      timestamp: new Date(),
      type: 'recovery', // 결과 기록 이벤트 (기존 enum 활용)
      content: userNote?.trim()
        ? `**전략 결과 기록**\n\n${userNote.trim()}`
        : `**전략 결과 기록**\n\n(메모 없이 결과만 기록)`,
      selfNote: combined.slice(0, 2000),
      sender: null,
      attachments: [],
      contextTags: ['outcome', 'from-strategy'],
    })
  } catch (e) {
    // event 생성 실패해도 outcome 은 살려둠
    console.error('[analyzeOutcome event append]', e)
  }

  return { outcomeId: id, markdown: combined }
}

export async function markActionExecuted(
  userId: string,
  actionId: string
): Promise<void> {
  await db
    .update(actionsTbl)
    .set({ status: 'executed', executedAt: new Date() })
    .where(and(eq(actionsTbl.id, actionId), eq(actionsTbl.userId, userId)))

  // 실행 완료 기록 — 타임라인에 마일스톤으로 노출
  try {
    const [action] = await db
      .select()
      .from(actionsTbl)
      .where(and(eq(actionsTbl.id, actionId), eq(actionsTbl.userId, userId)))
      .limit(1)
    if (action) {
      const eventId = `evt-${randomUUID()}`
      await db.insert(events).values({
        id: eventId,
        userId,
        relationshipId: action.relationshipId,
        timestamp: new Date(),
        type: 'milestone',
        content: `**전략 실행**\n\n${action.content.slice(0, 300)}…`,
        sender: null,
        attachments: [],
        contextTags: ['executed', 'from-strategy'],
      })
    }
  } catch (e) {
    console.error('[markActionExecuted event]', e)
  }
}

export async function generateWeeklyReport(
  userId: string,
  relationshipId: string
): Promise<{ markdown: string }> {
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

  const allEvents = await db
    .select()
    .from(events)
    .where(and(eq(events.relationshipId, relationshipId), eq(events.userId, userId)))
    .orderBy(desc(events.timestamp))
  const recent = allEvents.filter((e) => {
    const t = e.timestamp instanceof Date ? e.timestamp.getTime() : Number(e.timestamp)
    return t >= sevenDaysAgo
  })

  const allActions = await db
    .select()
    .from(actionsTbl)
    .where(
      and(eq(actionsTbl.relationshipId, relationshipId), eq(actionsTbl.userId, userId))
    )
  const recentActions = allActions.filter((a) => {
    const t = a.createdAt instanceof Date ? a.createdAt.getTime() : Number(a.createdAt)
    return t >= sevenDaysAgo
  })

  const actionIds = recentActions.map((a) => a.id)
  const recentOutcomes: Outcome[] = []
  for (const id of actionIds) {
    const rows = await db
      .select()
      .from(outcomes)
      .where(and(eq(outcomes.actionId, id), eq(outcomes.userId, userId)))
    recentOutcomes.push(...rows)
  }

  const ctx = await buildContext(userId, relationshipId, 0)
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
      const whyBlock = e.selfNote ? `\n**Why:** ${e.selfNote}` : ''
      return `### [${e.type}] ${ts.toISOString()}\n**Fact:**\n${e.content}${whyBlock}`
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

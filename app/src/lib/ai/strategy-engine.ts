import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, desc, eq, isNotNull, ne } from 'drizzle-orm'
import { db } from '../db/client'
import {
  interactions,
  strategies,
  targets,
  type Self,
  type Strategy,
  type StrategyOption,
  type Target,
} from '../db/schema'
import { callWithTool } from './client'
import { SYSTEM_BASE, renderDossier } from './prompts'

const STRATEGY_CONTEXT_SIZE = 25
const PAST_STRATEGIES_SAME_TARGET = 5
const PAST_STRATEGIES_CROSS_TARGET = 8

type StrategyResult = {
  situationReport: string
  goalAlignment: {
    progress: number
    note: string
  }
  suggestedStage?: string
  options: Array<{
    label: string
    action: string
    rationale: string
    risk: string
    reward: string
    messageDraft?: string
    timing?: string
  }>
}

const STRATEGY_TOOL = {
  name: 'submit_strategy',
  description:
    '현재 상태 판단 + 다음 수 3~4개 제안. 각 옵션은 유저의 목표(goal)에 수렴해야 함. 과거 outcome이 망한 전략은 반복하지 말고, 성공 패턴(playbook)은 적극 활용. 기만/조작 전략 금지.',
  input_schema: {
    type: 'object' as const,
    properties: {
      situationReport: {
        type: 'string',
        description:
          '상대 현재 상태·관계 모멘텀을 3~5문장으로 냉정하게 진단. 과거 전략 결과에서 드러난 패턴이 있으면 명시.',
      },
      goalAlignment: {
        type: 'object',
        properties: {
          progress: { type: 'number', minimum: 0, maximum: 1 },
          note: { type: 'string' },
        },
        required: ['progress', 'note'],
      },
      suggestedStage: {
        type: 'string',
        enum: ['matched', 'exploring', 'crush', 'confirmed', 'committed', 'fading', 'ended'],
      },
      options: {
        type: 'array',
        minItems: 3,
        maxItems: 4,
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            action: { type: 'string' },
            rationale: {
              type: 'string',
              description:
                '왜 이 수인가 — 과거 outcome 패턴이나 Self playbook을 근거로 언급하면 좋음',
            },
            risk: { type: 'string' },
            reward: { type: 'string' },
            messageDraft: {
              type: 'string',
              description: '유저의 톤 샘플을 반영한 바로 쓸 수 있는 초안',
            },
            timing: { type: 'string' },
          },
          required: ['label', 'action', 'rationale', 'risk', 'reward'],
        },
      },
    },
    required: ['situationReport', 'goalAlignment', 'options'],
  },
}

export async function generateStrategy(self: Self, target: Target): Promise<Strategy> {
  // 1) 해당 Target의 최근 Interaction
  const recent = await db
    .select()
    .from(interactions)
    .where(eq(interactions.targetId, target.id))
    .orderBy(desc(interactions.occurredAt))
    .limit(STRATEGY_CONTEXT_SIZE)
  const orderedRecent = [...recent].reverse()
  const dossier = renderDossier(self, target, orderedRecent)

  // 2) 같은 Target 과거 전략 (채택 + outcome 있는 것만)
  const sameTargetPast = await db
    .select()
    .from(strategies)
    .where(and(eq(strategies.targetId, target.id), isNotNull(strategies.chosenOptionId)))
    .orderBy(desc(strategies.createdAt))
    .limit(PAST_STRATEGIES_SAME_TARGET)

  // 3) 다른 Target의 outcome 라벨된 전략 (교차 학습)
  const crossTargetPast = await db
    .select()
    .from(strategies)
    .where(and(ne(strategies.targetId, target.id), isNotNull(strategies.outcome)))
    .orderBy(desc(strategies.createdAt))
    .limit(PAST_STRATEGIES_CROSS_TARGET)

  // 다른 Target alias 매핑용
  const crossIds = Array.from(new Set(crossTargetPast.map((s) => s.targetId)))
  const crossTargets = crossIds.length
    ? await Promise.all(
        crossIds.map(async (id) => {
          const [t] = await db.select().from(targets).where(eq(targets.id, id)).limit(1)
          return t
        })
      )
    : []
  const crossTargetMap = new Map(crossTargets.filter(Boolean).map((t) => [t.id, t]))

  // 4) Self playbook — 유저 프로파일에 쌓인 집계
  const playbook = self.psychProfile?.playbook ?? []

  // 5) 섹션 빌드
  const extraSections: string[] = []

  extraSections.push('## [이 상대에 대한 과거 전략 + 결과]')
  if (sameTargetPast.length === 0) {
    extraSections.push('(이번이 첫 전략)')
  } else {
    for (const s of sameTargetPast) {
      const chosen = s.options.find((o) => o.id === s.chosenOptionId)
      extraSections.push(
        `- ${new Date(s.createdAt).toLocaleDateString('ko-KR')} · "${chosen?.label ?? '?'}" → ${chosen?.action ?? ''} → outcome: ${s.outcome ?? '(피드백 없음)'}${s.outcomeNote ? ` — ${s.outcomeNote}` : ''}`
      )
    }
  }

  extraSections.push('')
  extraSections.push('## [다른 상대에서 유저가 쌓은 교차 학습]')
  if (crossTargetPast.length === 0) {
    extraSections.push('(교차 데이터 없음)')
  } else {
    for (const s of crossTargetPast) {
      const t = crossTargetMap.get(s.targetId)
      const chosen = s.options.find((o) => o.id === s.chosenOptionId)
      const attach = t?.profile?.attachment?.type ?? 'unknown'
      extraSections.push(
        `- [${t?.alias ?? '?'}/${t?.stage ?? '?'}/애착=${attach}] "${chosen?.label ?? '?'}" → outcome: ${s.outcome}`
      )
    }
  }

  if (playbook.length > 0) {
    extraSections.push('')
    extraSections.push('## [유저 Playbook — 지금까지 집계된 성공/실패 패턴]')
    for (const pb of playbook) {
      extraSections.push(
        `- ${pb.when} → "${pb.strategy}" (근거: ${pb.evidence}, confidence ${pb.confidence.toFixed(2)})`
      )
    }
  }

  if (self.psychProfile?.weaknesses && self.psychProfile.weaknesses.length > 0) {
    extraSections.push('')
    extraSections.push('## [유저의 반복 약점 — 새 전략에서 반영 필요]')
    self.psychProfile.weaknesses.forEach((w) => extraSections.push(`- ${w}`))
  }

  if (self.psychProfile?.strengths && self.psychProfile.strengths.length > 0) {
    extraSections.push('')
    extraSections.push('## [유저의 강점 — 이번 수에 활용]')
    self.psychProfile.strengths.forEach((s) => extraSections.push(`- ${s}`))
  }

  const extras = extraSections.join('\n')

  // 6) LLM 호출
  const result = await callWithTool<StrategyResult>({
    system: SYSTEM_BASE,
    messages: [
      {
        role: 'user',
        content: `${dossier}

---

${extras}

---

## [작업 지시]
지금 상태를 진단하고, 유저가 설정한 목표("${target.goal.description}")에 수렴하는 다음 수 3~4개를 제안하세요.

제약:
- 과거 outcome이 "bad"인 전략은 그 유형을 피하거나, 쓴다면 왜 이번엔 다르게 가는지 rationale에 명시.
- Playbook에 해당 맥락과 매칭되는 성공 패턴이 있으면 그 전략을 최소 한 옵션에 반영.
- 유저의 **반복 약점**을 자극하는 옵션 지양 — 예: "확정 단계에서 회피" 패턴이면, 확정 요구를 옵션에 넣더라도 단계적 접근으로.
- 유저의 **강점**을 쓸 수 있는 옵션이 있으면 우선.
- 메시지 초안은 유저의 톤 샘플 반영.
- 데이터 부족하면 "더 많은 관찰 필요" 옵션을 포함해도 됨.

제출: submit_strategy`,
      },
    ],
    tool: STRATEGY_TOOL,
    cacheSystem: true,
    maxTokens: 3500,
  })

  const options: StrategyOption[] = result.options.map((o) => ({
    id: randomUUID(),
    label: o.label,
    action: o.action,
    rationale: o.rationale,
    risk: o.risk,
    reward: o.reward,
    messageDraft: o.messageDraft,
    timing: o.timing,
  }))

  const strategyId = randomUUID()
  const [saved] = await db
    .insert(strategies)
    .values({
      id: strategyId,
      targetId: target.id,
      snapshotContext: {
        goal: target.goal,
        stage: target.stage,
        interactionCount: target.stats.messageCount,
        profileSnapshotId: target.latestProfileSnapshotId ?? null,
      },
      situationReport: result.situationReport,
      goalAlignment: JSON.stringify(result.goalAlignment),
      options,
    })
    .returning()

  return saved
}

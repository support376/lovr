import 'server-only'
import { desc, eq, isNotNull } from 'drizzle-orm'
import { db } from '../db/client'
import {
  interactions,
  selves,
  strategies,
  targets,
  type Self,
  type SelfPsychProfile,
  type Target,
} from '../db/schema'
import { callWithTool } from './client'
import { SYSTEM_BASE } from './prompts'

// ============================================================================
// Self Auto-Profiler
// 입력: Self 메타 + 전 Target 메타 + 내가 보낸 메시지 집합 + 과거 전략/outcome
// 출력: Self의 Big Five / Attachment / CommStyle / Values / strengths / weaknesses
//      / patterns / playbook / summary
// ============================================================================

type SelfProfileResult = {
  summary: string
  bigFive?: Partial<Record<
    'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism',
    { value: number; confidence: number }
  >>
  attachment?: {
    type: 'secure' | 'anxious' | 'avoidant' | 'disorganized' | 'unknown'
    confidence: number
  }
  commStyle?: Partial<Record<
    'directness' | 'emotionalExpressiveness' | 'humor' | 'formality',
    { value: number; confidence: number }
  >>
  values?: Partial<Record<
    'achievement' | 'benevolence' | 'hedonism' | 'security' | 'tradition' | 'selfDirection',
    { value: number; confidence: number }
  >>
  strengths: string[]
  weaknesses: string[]
  patterns: string[]
  playbook: Array<{
    when: string
    strategy: string
    evidence: string
    confidence: number
  }>
  // 유저 자가선언엔 없지만 AI가 대화 데이터에서 발견한 것들 — 추가 제안용
  suggestedStrengths?: string[]
  suggestedWeaknesses?: string[]
}

const dimSchema = (label: string) => ({
  type: 'object' as const,
  properties: {
    value: { type: 'number', minimum: 0, maximum: 1, description: `${label} 정도` },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['value', 'confidence'],
})

const SELF_TOOL = {
  name: 'submit_self_profile',
  description:
    '유저 본인(Self)의 연애 운영 프로파일 추출. tone 샘플이 적고 데이터가 빈약하면 해당 차원은 빼거나 낮은 confidence로. playbook은 outcome 라벨된 전략이 최소 2개 이상 있을 때만 작성.',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'string',
        description:
          '유저를 한 사람의 "연애 운영자"로 1~3문장 요약. 데이터 빈약하면 솔직히 기재.',
      },
      bigFive: {
        type: 'object',
        properties: {
          openness: dimSchema('개방성'),
          conscientiousness: dimSchema('성실성'),
          extraversion: dimSchema('외향성'),
          agreeableness: dimSchema('친화성'),
          neuroticism: dimSchema('신경성'),
        },
      },
      attachment: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['secure', 'anxious', 'avoidant', 'disorganized', 'unknown'],
          },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['type', 'confidence'],
      },
      commStyle: {
        type: 'object',
        properties: {
          directness: dimSchema('직설 vs 간접'),
          emotionalExpressiveness: dimSchema('감정 표현 강도'),
          humor: dimSchema('유머 사용'),
          formality: dimSchema('격식'),
        },
      },
      values: {
        type: 'object',
        properties: {
          achievement: dimSchema('성취 지향'),
          benevolence: dimSchema('이타·배려'),
          hedonism: dimSchema('쾌락 추구'),
          security: dimSchema('안정 추구'),
          tradition: dimSchema('전통·보수'),
          selfDirection: dimSchema('자율·독립'),
        },
      },
      strengths: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 6,
        description:
          '유저가 연애 운영에서 잘하는 것. **유저가 이미 자가선언한 강점은 그대로 유지하고, 대화에서 관찰된 근거로 보강**. 새 항목 추가 자제 (그건 suggestedStrengths로).',
      },
      weaknesses: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 6,
        description:
          '반복되는 약점. **유저 자가선언 약점을 우선 반영**. 새로 발견한 약점은 suggestedWeaknesses로.',
      },
      suggestedStrengths: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 4,
        description:
          '대화 데이터에서 새로 발견한, 유저가 **자가선언하지 않은** 강점 후보. 유저에게 "추가할래?" 제안 용도. 2개 이상의 관계에서 반복 관찰될 때만.',
      },
      suggestedWeaknesses: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 4,
        description:
          '대화 데이터에서 새로 발견한, 유저가 **자가선언하지 않은** 약점 후보. 2개 이상 관계에서 반복일 때만.',
      },
      patterns: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 6,
        description:
          '관계 궤적에서 반복 관찰되는 패턴 (예: "3주차에 모멘텀 잃음", "회피형 상대에게 끌리는 경향"). 데이터 부족하면 빈 배열.',
      },
      playbook: {
        type: 'array',
        maxItems: 8,
        description:
          '특정 맥락(상대 타입 + 단계)에서 유저가 성공/실패한 전략 집계',
        items: {
          type: 'object',
          properties: {
            when: {
              type: 'string',
              description: '어떤 상황/상대 유형에 (예: "회피형 상대 + 썸 단계")',
            },
            strategy: {
              type: 'string',
              description: '어떤 전략이 효과 있었나 (예: "거리감 존중하며 간헐 강화")',
            },
            evidence: {
              type: 'string',
              description: '근거 (예: "3번 시도 중 2번 good, 1번 neutral outcome")',
            },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
          required: ['when', 'strategy', 'evidence', 'confidence'],
        },
      },
    },
    required: ['summary', 'strengths', 'weaknesses', 'patterns', 'playbook'],
  },
}

// ============================================================================
// 메인
// ============================================================================
export async function updateSelfProfile(self: Self): Promise<SelfPsychProfile> {
  // 1) 모든 Target 수집
  const allTargets = await db
    .select()
    .from(targets)
    .where(eq(targets.selfId, self.id))

  // 2) 내가 보낸 메시지 샘플 — 최근 50개 (Target 전역)
  const myMessages: Array<{
    targetAlias: string
    targetStage: string
    text: string
    at: Date
  }> = []

  for (const t of allTargets) {
    const its = await db
      .select()
      .from(interactions)
      .where(eq(interactions.targetId, t.id))
      .orderBy(desc(interactions.occurredAt))
      .limit(40)
    for (const it of its) {
      if (
        it.payload.kind === 'message' &&
        it.payload.sender === 'me' &&
        it.payload.text.trim()
      ) {
        myMessages.push({
          targetAlias: t.alias,
          targetStage: t.stage,
          text: it.payload.text,
          at: it.occurredAt,
        })
      }
    }
  }
  myMessages.sort((a, b) => b.at.getTime() - a.at.getTime())
  const myMessagesTrimmed = myMessages.slice(0, 50).reverse()

  // 3) outcome 라벨링된 과거 전략 수집 (Target 전역)
  const strats = await db
    .select()
    .from(strategies)
    .where(isNotNull(strategies.outcome))
    .orderBy(desc(strategies.createdAt))
    .limit(30)

  // 전략 → Target 조인 (현재 target.attachment 등)
  const targetById = new Map(allTargets.map((t) => [t.id, t]))

  // 4) 총 interaction 수
  let totalInteractions = 0
  for (const t of allTargets) totalInteractions += t.stats.messageCount

  const basedOn = {
    toneSampleCount: self.toneSamples.length,
    totalInteractions,
    totalStrategies: strats.length,
    totalTargets: allTargets.length,
  }

  // 5) 프롬프트 조립
  const sections: string[] = []

  sections.push('## [유저 기본 정보]')
  sections.push(`- 이름: ${self.displayName}`)
  if (self.age) sections.push(`- 나이: ${self.age}`)
  if (self.gender) sections.push(`- 성별: ${self.gender}`)
  if (self.orientation) sections.push(`- 지향: ${self.orientation}`)
  if (self.mbti) sections.push(`- MBTI: ${self.mbti}`)
  if (self.experienceLevel) sections.push(`- 연애 경험: ${self.experienceLevel}`)
  if (self.relationshipGoal) sections.push(`- 관계 지향: ${self.relationshipGoal}`)

  sections.push('')
  sections.push('## [유저 자가 선언] ★ 이 값들은 존중. weaknesses/strengths output에 우선 포함.')
  if (self.strengths.length > 0)
    sections.push(`- 강점: ${self.strengths.join(' / ')}`)
  if (self.weaknesses.length > 0)
    sections.push(`- 약점: ${self.weaknesses.join(' / ')}`)
  if (self.dealBreakers.length > 0)
    sections.push(`- 딜 브레이커: ${self.dealBreakers.join(' / ')}`)
  if (self.idealType) sections.push(`- 이상형: ${self.idealType}`)
  if (self.personalityNotes) sections.push(`- 성격 기술: ${self.personalityNotes}`)
  if (self.valuesNotes) sections.push(`- 가치관 기술: ${self.valuesNotes}`)
  if (self.notes) sections.push(`- 기타: ${self.notes}`)

  sections.push('')
  sections.push(`## [관리 중인 상대 ${allTargets.length}명]`)
  if (allTargets.length === 0) {
    sections.push('(없음)')
  } else {
    for (const t of allTargets) {
      const attach = t.profile?.attachment?.type ?? 'unknown'
      sections.push(
        `- ${t.alias} (${t.stage}, 목표=${t.goal.preset}, 상대 애착=${attach}, 메시지 ${t.stats.messageCount})`
      )
    }
  }

  sections.push('')
  sections.push(`## [내가 실제로 보낸 메시지 ${myMessagesTrimmed.length}개 — 과거→최근]`)
  if (myMessagesTrimmed.length === 0) {
    sections.push('(없음 — 아직 메시지 기록 없음)')
  } else {
    for (const m of myMessagesTrimmed) {
      sections.push(`- [${m.targetAlias}/${m.targetStage}] "${m.text}"`)
    }
  }

  sections.push('')
  sections.push(`## [채택한 전략 + outcome — ${strats.length}건]`)
  if (strats.length === 0) {
    sections.push('(없음 — 아직 outcome 라벨된 전략 없음)')
  } else {
    for (const s of strats) {
      const tg = targetById.get(s.targetId)
      const chosen = s.options.find((o) => o.id === s.chosenOptionId)
      const attach = tg?.profile?.attachment?.type ?? 'unknown'
      sections.push(
        `- [${tg?.alias ?? '?'}/${tg?.stage ?? '?'}/애착=${attach}] 전략: "${chosen?.label ?? '(채택 안됨)'}" → action: "${chosen?.action ?? ''}" → outcome: ${s.outcome}${s.outcomeNote ? ` (${s.outcomeNote})` : ''}`
      )
    }
  }

  sections.push('')
  sections.push(`## [작업 지시]
위 데이터에서 유저 본인(Self)의 프로파일을 추출하세요.

원칙:
1. 데이터 양에 비례해 confidence 산정. 메시지 < 10 → 최대 0.3 / < 40 → 최대 0.6 / ≥ 80 → 최대 0.85.
2. tone 샘플만 있고 실제 interaction이 없으면 bigFive·attachment는 "unknown" 또는 빈 값. 추측 금지.
3. strengths/weaknesses는 근거가 있는 것만. 근거 없는 일반론 금지 (예: "대화 잘함").
4. patterns는 **2개 이상의 관계/전략에서 반복 관찰**될 때만. 단일 사례로 패턴 만들지 마세요.
5. playbook은 **outcome 라벨된 전략 최소 2건 이상**이 같은 맥락(상대 애착 + 단계)에서 일어났을 때만 집계.
6. 기존 self.psychProfile이 있으면 거기 있는 summary/strengths를 통째로 덮어쓰지 말고 새 근거에 비춰 **업데이트**.

제출: submit_self_profile`)

  const existingHint = self.psychProfile
    ? `\n\n## [직전 Self 프로파일 (참고용, 업데이트 대상)]\n${JSON.stringify(self.psychProfile, null, 2)}`
    : ''

  // 6) LLM 호출
  const result = await callWithTool<SelfProfileResult>({
    system: SYSTEM_BASE,
    messages: [
      {
        role: 'user',
        content: sections.join('\n') + existingHint,
      },
    ],
    tool: SELF_TOOL,
    cacheSystem: true,
    maxTokens: 2000,
  })

  // 7) 병합해서 저장
  const merged: SelfPsychProfile = {
    ...self.psychProfile,
    summary: result.summary,
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    patterns: result.patterns,
    playbook: result.playbook,
    suggestedStrengths: result.suggestedStrengths ?? [],
    suggestedWeaknesses: result.suggestedWeaknesses ?? [],
    basedOn,
    lastProfiledAt: Date.now(),
  }
  if (result.bigFive && Object.keys(result.bigFive).length > 0) {
    merged.bigFive = { ...(self.psychProfile.bigFive ?? {}), ...result.bigFive }
  }
  if (result.attachment) merged.attachment = result.attachment
  if (result.commStyle && Object.keys(result.commStyle).length > 0) {
    merged.commStyle = { ...(self.psychProfile.commStyle ?? {}), ...result.commStyle }
  }
  if (result.values && Object.keys(result.values).length > 0) {
    merged.values = { ...(self.psychProfile.values ?? {}), ...result.values }
  }

  await db.update(selves).set({ psychProfile: merged }).where(eq(selves.id, self.id))

  return merged
}

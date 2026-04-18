import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import {
  interactions,
  profileSnapshots,
  targets,
  type Interaction,
  type Target,
  type TargetProfile,
} from '../db/schema'
import { callWithTool } from './client'
import { SYSTEM_BASE, renderDossier } from './prompts'
import type { Self } from '../db/schema'

// 최근 몇 개의 interaction을 컨텍스트로 넘길지
const RECENT_CONTEXT_SIZE = 20

// LLM이 반환하는 프로파일 업데이트 shape
type ProfileUpdateResult = {
  summary: string
  rationale: string
  updates: {
    bigFive?: Partial<Record<'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism', { value: number; confidence: number; evidence?: string }>>
    attachment?: { type: 'secure' | 'anxious' | 'avoidant' | 'disorganized' | 'unknown'; confidence: number; evidence?: string }
    commStyle?: Partial<Record<'directness' | 'emotionalExpressiveness' | 'humor' | 'formality', { value: number; confidence: number; evidence?: string }>>
    values?: Partial<Record<'achievement' | 'benevolence' | 'hedonism' | 'security' | 'tradition' | 'selfDirection', { value: number; confidence: number; evidence?: string }>>
  }
  redFlags?: string[]
  greenFlags?: string[]
}

const UPDATE_TOOL = {
  name: 'submit_profile_update',
  description:
    '상대 프로파일 업데이트. 기존 프로파일에 새 정보를 병합할 것. 확신 없는 차원은 포함하지 말 것. 근거가 있는 차원만 제출. confidence는 데이터 양에 비례 (메시지 5개 미만이면 최대 0.3, 20개면 최대 0.6, 50개+ 최대 0.85).',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'string',
        description:
          '1~2문장으로 상대의 현재까지 드러난 성향을 요약. 데이터 부족하면 그대로 표기.',
      },
      rationale: {
        type: 'string',
        description: '직전 스냅샷 대비 무엇이 바뀌었고 왜 바뀌었는지 한국어 2~4문장.',
      },
      updates: {
        type: 'object',
        properties: {
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
              evidence: { type: 'string' },
            },
            required: ['type', 'confidence'],
          },
          commStyle: {
            type: 'object',
            properties: {
              directness: dimSchema('직설성 vs 간접성'),
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
        },
      },
      redFlags: {
        type: 'array',
        items: { type: 'string' },
        description: '주의해야 할 신호 (확실한 것만, 최대 5개).',
      },
      greenFlags: {
        type: 'array',
        items: { type: 'string' },
        description: '긍정 신호 (확실한 것만, 최대 5개).',
      },
    },
    required: ['summary', 'rationale', 'updates'],
  },
}

function dimSchema(desc: string) {
  return {
    type: 'object' as const,
    properties: {
      value: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: `${desc}: 0=전혀 없음, 1=매우 강함`,
      },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      evidence: { type: 'string', description: '근거가 된 발언 인용 또는 관찰' },
    },
    required: ['value', 'confidence'],
  }
}

// ============================================================================
// 핵심 함수
// ============================================================================
export async function updateTargetProfile(
  self: Self,
  target: Target
): Promise<{ profile: TargetProfile; snapshotId: string; rationale: string }> {
  // 최근 interaction 가져옴 (시간순 오름차순으로 제공)
  const recent = await db
    .select()
    .from(interactions)
    .where(eq(interactions.targetId, target.id))
    .orderBy(desc(interactions.occurredAt))
    .limit(RECENT_CONTEXT_SIZE)

  const orderedRecent = [...recent].reverse()

  if (orderedRecent.length === 0) {
    // 아무 데이터 없음 — 초기 상태로 그냥 반환
    return { profile: target.profile, snapshotId: '', rationale: 'No interactions yet' }
  }

  const dossier = renderDossier(self, target, orderedRecent)

  const result = await callWithTool<ProfileUpdateResult>({
    system: SYSTEM_BASE,
    messages: [
      {
        role: 'user',
        content: `${dossier}

---

## [작업 지시]
위 Dossier의 최근 Interaction을 기반으로 상대의 프로파일을 업데이트하세요.

원칙:
1. **점진적 업데이트**: 기존 프로파일이 있으면 그 위에 병합하는 방향으로. 단, 새 증거가 기존과 배치되면 value를 조정하고 confidence를 재산정.
2. **근거 없는 추론 금지**: 메시지가 10개 미만이면 애착 유형은 "unknown"을 유지. 확실한 근거가 있을 때만 바꾸기.
3. **confidence 보수적 산정**: 메시지 < 5 → 최대 0.3 / < 20 → 최대 0.6 / ≥ 50 → 최대 0.85. 1.0은 절대 쓰지 않음.
4. **불필요한 차원 생략**: 근거가 없는 차원은 updates에 포함하지 말 것.

제출 도구: submit_profile_update`,
      },
    ],
    tool: UPDATE_TOOL,
    cacheSystem: true,
    maxTokens: 2500,
  })

  // 기존 프로파일에 업데이트 병합
  const merged = mergeProfile(target.profile, result)

  // 스냅샷 저장
  const snapshotId = randomUUID()
  const totalCount = await db
    .select({ count: interactions.id })
    .from(interactions)
    .where(eq(interactions.targetId, target.id))
  const basedOnCount = totalCount.length

  await db.insert(profileSnapshots).values({
    id: snapshotId,
    targetId: target.id,
    basedOnInteractionCount: basedOnCount,
    profile: merged,
    rationale: result.rationale,
  })

  // Target에도 최신 프로파일 반영
  await db
    .update(targets)
    .set({
      profile: merged,
      latestProfileSnapshotId: snapshotId,
      updatedAt: new Date(),
    })
    .where(eq(targets.id, target.id))

  // 반영된 interaction들 analyzed 플래그 표기
  await db
    .update(interactions)
    .set({ analyzed: true })
    .where(and(eq(interactions.targetId, target.id), eq(interactions.analyzed, false)))

  return { profile: merged, snapshotId, rationale: result.rationale }
}

// ============================================================================
// 병합 로직 — 기존 프로파일 + 업데이트를 합친다
// evidence는 누적(최대 20개), value/confidence는 LLM이 내놓은 값으로 덮어쓰기
// (LLM에게 "점진적 업데이트" 지시했으므로 그 값이 이미 병합된 결과)
// ============================================================================
function mergeProfile(existing: TargetProfile, update: ProfileUpdateResult): TargetProfile {
  const merged: TargetProfile = {
    ...existing,
    summary: update.summary ?? existing.summary,
  }

  const u = update.updates

  if (u.bigFive) {
    merged.bigFive = { ...(existing.bigFive ?? {}) }
    for (const [k, v] of Object.entries(u.bigFive)) {
      if (v) (merged.bigFive as Record<string, unknown>)[k] = { value: v.value, confidence: v.confidence }
    }
  }
  if (u.attachment) {
    merged.attachment = { type: u.attachment.type, confidence: u.attachment.confidence }
  }
  if (u.commStyle) {
    merged.commStyle = { ...(existing.commStyle ?? {}) }
    for (const [k, v] of Object.entries(u.commStyle)) {
      if (v) (merged.commStyle as Record<string, unknown>)[k] = { value: v.value, confidence: v.confidence }
    }
  }
  if (u.values) {
    merged.values = { ...(existing.values ?? {}) }
    for (const [k, v] of Object.entries(u.values)) {
      if (v) (merged.values as Record<string, unknown>)[k] = { value: v.value, confidence: v.confidence }
    }
  }

  if (update.redFlags) merged.redFlags = update.redFlags
  if (update.greenFlags) merged.greenFlags = update.greenFlags

  // evidence 누적
  const newEvidence: { claim: string; source: string; at: number }[] = []
  collectEvidence(u.bigFive, newEvidence)
  collectEvidence(u.commStyle, newEvidence)
  collectEvidence(u.values, newEvidence)
  if (u.attachment?.evidence) {
    newEvidence.push({ claim: u.attachment.evidence, source: 'attachment', at: Date.now() })
  }

  const allEvidence = [...(existing.evidence ?? []), ...newEvidence]
  merged.evidence = allEvidence.slice(-20)

  return merged
}

function collectEvidence(
  obj: Record<string, { evidence?: string } | undefined> | undefined,
  out: { claim: string; source: string; at: number }[]
) {
  if (!obj) return
  for (const [k, v] of Object.entries(obj)) {
    if (v?.evidence) out.push({ claim: v.evidence, source: k, at: Date.now() })
  }
}

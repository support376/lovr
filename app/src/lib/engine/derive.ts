import 'server-only'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { actors, relationships, type InferredTrait } from '../db/schema'
import { anthropic, MID_MODEL } from '../ai/client'
import { buildContext } from './context'
import { stateInferencePrompt } from '../prompts/loader'

type RawTrait = {
  observation?: string
  confidence?: string
  axis?: string
  group?: string
  score?: number | string
}

export type DerivedState = {
  progress: string
  exclusivity: string
  conflictState: string
  powerBalance: string
  communicationPattern: string
  investmentAsymmetry: string
  escalationSpeed: string
  selfTraits: RawTrait[]
  partnerTraits: RawTrait[]
  rationale: string
}

const VALID_PROGRESS = new Set([
  'pre_match',
  'first_contact',
  'sseom',
  'dating_early',
  'dating_stable',
  'conflict',
  'reconnection',
])
const VALID_EXCLUSIVITY = new Set(['unknown', 'open', 'exclusive', 'married'])
const VALID_CONFLICT = new Set(['healthy', 'tension', 'conflict', 'recovery'])

/**
 * Event 기반으로 관계 stage + dynamics 자동 추론 후 DB에 저장.
 * Sonnet 사용. 이벤트 부족하면 그대로 unknown 유지.
 */
export async function deriveRelationshipState(
  userId: string,
  relationshipId: string
): Promise<{
  derived: DerivedState
  updatedFields: string[]
}> {
  const ctx = await buildContext(userId, relationshipId, 40)
  if (!ctx.relationship || !ctx.partner) {
    throw new Error('관계 찾을 수 없음')
  }

  // 이벤트가 너무 적으면 추론 스킵
  if (ctx.events.length === 0) {
    return {
      derived: {
        progress: ctx.relationship.progress,
        exclusivity: ctx.relationship.exclusivity,
        conflictState: ctx.relationship.conflictState,
        powerBalance: ctx.relationship.powerBalance ?? '',
        communicationPattern: ctx.relationship.communicationPattern ?? '',
        investmentAsymmetry: ctx.relationship.investmentAsymmetry ?? '',
        escalationSpeed: ctx.relationship.escalationSpeed ?? '',
        selfTraits: [],
        partnerTraits: [],
        rationale: '이벤트 없음 — 추론 스킵.',
      },
      updatedFields: [],
    }
  }

  const current = `
progress: ${ctx.relationship.progress}
exclusivity: ${ctx.relationship.exclusivity}
conflictState: ${ctx.relationship.conflictState}
powerBalance: ${ctx.relationship.powerBalance ?? '(없음)'}
communicationPattern: ${ctx.relationship.communicationPattern ?? '(없음)'}
investmentAsymmetry: ${ctx.relationship.investmentAsymmetry ?? '(없음)'}
escalationSpeed: ${ctx.relationship.escalationSpeed ?? '(없음)'}
`.trim()

  const client = anthropic()
  const res = await client.messages.create({
    model: MID_MODEL,
    max_tokens: 1200,
    system: [
      {
        type: 'text',
        text: stateInferencePrompt(),
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `${ctx.markdown}

## [현재 저장된 값 — 이전 추론]
${current}`,
      },
    ],
  })

  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()

  let parsed: Partial<DerivedState> = {}
  try {
    // 코드펜스로 감쌌어도 구해냄
    const jsonStr = extractJson(text)
    parsed = JSON.parse(jsonStr) as DerivedState
  } catch (err) {
    throw new Error(`LLM JSON 파싱 실패: ${(err as Error).message}\n\n${text.slice(0, 500)}`)
  }

  // 유효성 검사 + 기본값 fallback
  const derived: DerivedState = {
    progress: VALID_PROGRESS.has(parsed.progress ?? '')
      ? (parsed.progress as string)
      : ctx.relationship.progress,
    exclusivity: VALID_EXCLUSIVITY.has(parsed.exclusivity ?? '')
      ? (parsed.exclusivity as string)
      : ctx.relationship.exclusivity,
    conflictState: VALID_CONFLICT.has(parsed.conflictState ?? '')
      ? (parsed.conflictState as string)
      : ctx.relationship.conflictState,
    powerBalance: (parsed.powerBalance ?? '').trim(),
    communicationPattern: (parsed.communicationPattern ?? '').trim(),
    investmentAsymmetry: (parsed.investmentAsymmetry ?? '').trim(),
    escalationSpeed: (parsed.escalationSpeed ?? '').trim(),
    selfTraits: Array.isArray(parsed.selfTraits) ? parsed.selfTraits : [],
    partnerTraits: Array.isArray(parsed.partnerTraits) ? parsed.partnerTraits : [],
    rationale: (parsed.rationale ?? '').trim(),
  }

  // 변경 감지
  const updatedFields: string[] = []
  if (derived.progress !== ctx.relationship.progress) updatedFields.push('progress')
  if (derived.exclusivity !== ctx.relationship.exclusivity) updatedFields.push('exclusivity')
  if (derived.conflictState !== ctx.relationship.conflictState) updatedFields.push('conflictState')
  if (derived.powerBalance !== (ctx.relationship.powerBalance ?? ''))
    updatedFields.push('powerBalance')
  if (derived.communicationPattern !== (ctx.relationship.communicationPattern ?? ''))
    updatedFields.push('communicationPattern')
  if (derived.investmentAsymmetry !== (ctx.relationship.investmentAsymmetry ?? ''))
    updatedFields.push('investmentAsymmetry')
  if (derived.escalationSpeed !== (ctx.relationship.escalationSpeed ?? ''))
    updatedFields.push('escalationSpeed')

  await db
    .update(relationships)
    .set({
      progress: derived.progress,
      exclusivity: derived.exclusivity,
      conflictState: derived.conflictState,
      powerBalance: derived.powerBalance || null,
      communicationPattern: derived.communicationPattern || null,
      investmentAsymmetry: derived.investmentAsymmetry || null,
      escalationSpeed: derived.escalationSpeed || null,
      updatedAt: new Date(),
    })
    .where(and(eq(relationships.id, relationshipId), eq(relationships.userId, userId)))

  // 역프로파일링 trait를 self/partner actor에 저장 (덮어쓰기: 이 추론이 최신 관찰)
  const eventIds = ctx.events.map((e) => e.id)
  const now = Date.now()
  if (ctx.self) {
    const traits = toInferredTraits(derived.selfTraits, eventIds, now)
    if (traits.length > 0) {
      await db
        .update(actors)
        .set({ inferredTraits: traits })
        .where(and(eq(actors.id, ctx.self.id), eq(actors.userId, userId)))
    }
  }
  if (ctx.partner) {
    const traits = toInferredTraits(derived.partnerTraits, eventIds, now)
    if (traits.length > 0) {
      await db
        .update(actors)
        .set({ inferredTraits: traits })
        .where(and(eq(actors.id, ctx.partner.id), eq(actors.userId, userId)))
    }
  }

  return { derived, updatedFields }
}

const ALLOWED_GROUPS = new Set(['personality', 'attachment', 'communication'])

function toInferredTraits(
  raw: RawTrait[],
  evidenceIds: string[],
  at: number
): InferredTrait[] {
  return raw
    .filter((t) => t && typeof t.observation === 'string' && t.observation.trim())
    .map((t) => {
      const rawScore =
        typeof t.score === 'number'
          ? t.score
          : typeof t.score === 'string'
          ? parseFloat(t.score)
          : NaN
      const score = Number.isFinite(rawScore)
        ? Math.max(0, Math.min(100, Math.round(rawScore)))
        : undefined
      const axis = typeof t.axis === 'string' && t.axis.trim() ? t.axis.trim() : undefined
      const groupRaw =
        typeof t.group === 'string' ? t.group.trim().toLowerCase() : ''
      const group = ALLOWED_GROUPS.has(groupRaw) ? groupRaw : undefined
      return {
        axis,
        group,
        score,
        observation: t.observation!.trim(),
        evidenceEventIds: evidenceIds,
        confidenceNarrative: (t.confidence ?? '중간').trim() || '중간',
        firstObserved: at,
        lastUpdated: at,
      }
    })
}

function extractJson(s: string): string {
  // 코드펜스 제거
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) return fence[1].trim()
  // 첫 { ~ 마지막 } 까지
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) return s.slice(start, end + 1)
  return s
}

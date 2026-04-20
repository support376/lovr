import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { relationships } from '../db/schema'
import { ensureSchema } from '../db/init'
import { anthropic, MID_MODEL } from '../ai/client'
import { buildContext } from './context'
import { stateInferencePrompt } from '../prompts/loader'

export type DerivedState = {
  progress: string
  exclusivity: string
  conflictState: string
  powerBalance: string
  communicationPattern: string
  investmentAsymmetry: string
  escalationSpeed: string
  rationale: string
}

const VALID_PROGRESS = new Set([
  'pre_match',
  'early_dating',
  'stable',
  'long_term',
  'post_breakup',
])
const VALID_EXCLUSIVITY = new Set(['unknown', 'open', 'exclusive', 'married'])
const VALID_CONFLICT = new Set(['healthy', 'tension', 'conflict', 'recovery'])

/**
 * Event 기반으로 관계 stage + dynamics 자동 추론 후 DB에 저장.
 * Sonnet 사용. 이벤트 부족하면 그대로 unknown 유지.
 */
export async function deriveRelationshipState(relationshipId: string): Promise<{
  derived: DerivedState
  updatedFields: string[]
}> {
  await ensureSchema()

  const ctx = await buildContext(relationshipId, 40)
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
    .where(eq(relationships.id, relationshipId))

  return { derived, updatedFields }
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

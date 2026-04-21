import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import {
  actors,
  events,
  relationships,
  type Event,
  type Relationship,
  type RelationshipModel,
  type RelationshipRule,
} from '../db/schema'
import { anthropic, MID_MODEL } from '../ai/client'
import {
  MODEL_EXTRACTION_PROMPT,
  SIMULATION_PROMPT,
} from '../prompts/model'

type RawRule = {
  x?: string
  y?: string
  observations?: number | string
  confidence?: number | string
}

type RawModel = {
  rules?: RawRule[]
  baseline?: string
  confidence?: number | string
  evidenceCount?: number | string
  rationale?: string
}

/**
 * Event 원자료 → Y = aX + b 모델 추출. 결과를 relationships.model 에 저장.
 */
export async function extractRelationshipModel(
  userId: string,
  relationshipId: string
): Promise<{ model: RelationshipModel; evidenceCount: number }> {
  // 1. load context
  const [rel] = await db
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.id, relationshipId),
        eq(relationships.userId, userId)
      )
    )
    .limit(1)
  if (!rel) throw new Error('Relationship not found')

  const [partner] = await db
    .select()
    .from(actors)
    .where(and(eq(actors.id, rel.partnerId), eq(actors.userId, userId)))
    .limit(1)

  const [self] = await db
    .select()
    .from(actors)
    .where(and(eq(actors.userId, userId), eq(actors.role, 'self')))
    .limit(1)

  const evList = await db
    .select()
    .from(events)
    .where(
      and(eq(events.relationshipId, relationshipId), eq(events.userId, userId))
    )
    .orderBy(desc(events.createdAt))
    .limit(80)

  if (evList.length === 0) {
    throw new Error('Event 없음 — 기록 먼저 추가해주세요.')
  }

  // 2. prompt
  const userMsg = renderMarkdown({
    self: self ?? null,
    partner: partner ?? null,
    relationship: rel,
    events: evList.reverse(), // 오래된 → 최신
  })

  const client = anthropic()
  const res = await client.messages.create({
    model: MID_MODEL,
    max_tokens: 2000,
    system: [
      {
        type: 'text',
        text: MODEL_EXTRACTION_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMsg }],
  })

  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()

  // 3. parse
  let parsed: RawModel = {}
  try {
    parsed = JSON.parse(extractJson(text)) as RawModel
  } catch (e) {
    throw new Error(
      `LLM JSON 파싱 실패: ${(e as Error).message}\n\n${text.slice(0, 500)}`
    )
  }

  const now = Date.now()
  const rules: RelationshipRule[] = (parsed.rules ?? [])
    .filter(
      (r) =>
        r && typeof r.x === 'string' && r.x.trim() &&
        typeof r.y === 'string' && r.y.trim()
    )
    .slice(0, 8)
    .map((r) => ({
      x: r.x!.trim(),
      y: r.y!.trim(),
      observations: clampInt(r.observations, 1, 1, 100),
      confidence: clampInt(r.confidence, 50, 0, 100),
      evidenceEventIds: evList.map((e) => e.id),
      lastUpdated: now,
    }))

  const model: RelationshipModel = {
    rules,
    baseline: (parsed.baseline ?? '').trim(),
    confidence: clampInt(parsed.confidence, 50, 0, 100),
    updatedAt: now,
    evidenceCount: clampInt(parsed.evidenceCount, evList.length, 0, 100000),
  }

  // 4. save
  await db
    .update(relationships)
    .set({ model, updatedAt: new Date() })
    .where(
      and(
        eq(relationships.id, relationshipId),
        eq(relationships.userId, userId)
      )
    )

  return { model, evidenceCount: evList.length }
}

/**
 * 현재 모델 + 제안 X → 예상 Y 시뮬레이션.
 */
export async function simulateResponse(
  userId: string,
  relationshipId: string,
  proposedX: string
): Promise<{ markdown: string }> {
  const [rel] = await db
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.id, relationshipId),
        eq(relationships.userId, userId)
      )
    )
    .limit(1)
  if (!rel) throw new Error('Relationship not found')
  if (!rel.model || !rel.model.rules || rel.model.rules.length === 0) {
    throw new Error('아직 모델 없음. 분석 탭에서 재분석 먼저 돌려줘.')
  }

  const [partner] = await db
    .select()
    .from(actors)
    .where(and(eq(actors.id, rel.partnerId), eq(actors.userId, userId)))
    .limit(1)

  const modelBlock = formatModel(rel.model, partner?.displayName ?? '상대')

  const userMsg = `${modelBlock}

## [제안 X — 내가 할 행동]
${proposedX.trim()}`

  const client = anthropic()
  const res = await client.messages.create({
    model: MID_MODEL,
    max_tokens: 700,
    system: [
      {
        type: 'text',
        text: SIMULATION_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMsg }],
  })

  const markdown = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()

  return { markdown }
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function renderMarkdown(c: {
  self: typeof actors.$inferSelect | null
  partner: typeof actors.$inferSelect | null
  relationship: Relationship
  events: Event[]
}): string {
  const lines: string[] = []

  lines.push('## [Self]')
  if (c.self) {
    lines.push(`- 이름: ${c.self.displayName}`)
    if (c.self.age) lines.push(`- 나이: ${c.self.age}`)
    if (c.self.occupation) lines.push(`- 직업: ${c.self.occupation}`)
    if (c.self.assetsNotes)
      lines.push(`- 자산: ${c.self.assetsNotes.slice(0, 200)}`)
    if (c.self.spendingNotes)
      lines.push(`- 지출: ${c.self.spendingNotes.slice(0, 200)}`)
  }

  lines.push('\n## [Partner]')
  if (c.partner) {
    lines.push(`- 이름: ${c.partner.displayName}`)
    if (c.partner.age) lines.push(`- 나이: ${c.partner.age}`)
    if (c.partner.occupation) lines.push(`- 직업: ${c.partner.occupation}`)
    if ((c.partner.knownConstraints ?? []).length > 0)
      lines.push(`- 제약: ${c.partner.knownConstraints!.join(', ')}`)
    if (c.partner.rawNotes)
      lines.push(`- 메모: ${c.partner.rawNotes.slice(0, 300)}`)
  }

  if (c.relationship.description) {
    lines.push(`\n## [관계 정의]\n${c.relationship.description}`)
  }

  if (c.relationship.model) {
    lines.push('\n## [현재 모델 — 이전 추론]')
    lines.push(formatModel(c.relationship.model, c.partner?.displayName ?? '상대'))
  }

  lines.push(`\n## [Events ${c.events.length}개 — 과거→최신]`)
  for (const e of c.events) {
    const ts = e.timestamp
      ? new Date(
          e.timestamp instanceof Date ? e.timestamp : Number(e.timestamp)
        ).toISOString()
      : '날짜 불명'
    lines.push(`\n### [${e.type}] ${ts}`)
    lines.push(e.content)
  }

  return lines.join('\n')
}

function formatModel(m: RelationshipModel, partnerName: string): string {
  const lines: string[] = []
  lines.push(`[모델 신뢰도 ${m.confidence}% · 증거 ${m.evidenceCount}개]`)
  if (m.rules.length > 0) {
    lines.push('\n### 규칙 (a — X→Y)')
    for (const r of m.rules) {
      lines.push(
        `- 내가 "${r.x}" → ${partnerName}: "${r.y}" (관찰 ${r.observations}회 · 신뢰 ${r.confidence}%)`
      )
    }
  }
  if (m.baseline) {
    lines.push('\n### Baseline (b — X 무관 디폴트)')
    lines.push(m.baseline)
  }
  return lines.join('\n')
}

function extractJson(s: string): string {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) return fence[1].trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) return s.slice(start, end + 1)
  return s
}

function clampInt(
  v: number | string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

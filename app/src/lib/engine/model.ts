import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import {
  actors,
  events,
  relationships,
  AXES,
  GOAL_LABEL,
  STATE_LABEL,
  type Axis,
  type Event,
  type Relationship,
  type RelationshipBaseline,
  type RelationshipModel,
  type RelationshipRule,
  type RelationshipState,
  type RelationshipGoal,
} from '../db/schema'
import { anthropic, DEEP_MODEL, MID_MODEL } from '../ai/client'
import {
  MODEL_EXTRACTION_PROMPT,
  SIMULATION_PROMPT,
} from '../prompts/model'

// =============================================================================
// Model extraction
// =============================================================================

type RawRule = {
  xAxis?: string
  yAxis?: string
  intensity?: number | string
  observations?: number | string
  confidence?: number | string
  examplesX?: unknown
  examplesY?: unknown
}

type RawBaseline = {
  axes?: Partial<Record<string, number | string>>
  narrative?: string
}

type RawModel = {
  rules?: RawRule[]
  baseline?: RawBaseline
  narrative?: string
  confidenceOverall?: number | string
  rationale?: string
}

function isAxis(v: unknown): v is Axis {
  return typeof v === 'string' && (AXES as readonly string[]).includes(v)
}

function clampInt(
  v: number | string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const n =
    typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

function defaultBaseline(): RelationshipBaseline {
  return {
    axes: {
      proximity_push: 50,
      proximity_pull: 50,
      emotion_open: 50,
      emotion_hide: 50,
      commit_push: 50,
      commit_hold: 50,
      conflict_press: 50,
      conflict_soothe: 50,
    },
    narrative: '',
  }
}

function parseBaseline(raw: RawBaseline | undefined): RelationshipBaseline {
  const base = defaultBaseline()
  if (!raw) return base
  if (raw.axes && typeof raw.axes === 'object') {
    for (const ax of AXES) {
      const v = (raw.axes as Record<string, number | string | undefined>)[ax]
      base.axes[ax] = clampInt(v, 50, 0, 100)
    }
  }
  base.narrative = typeof raw.narrative === 'string' ? raw.narrative.trim() : ''
  return base
}

function parseRules(
  raw: RawRule[] | undefined,
  evidenceIds: string[],
  evidenceCount: number,
  at: number
): RelationshipRule[] {
  if (!Array.isArray(raw)) return []
  const rules: RelationshipRule[] = []
  const seen = new Set<string>() // dedupe by xAxis→yAxis key
  for (const r of raw) {
    if (!isAxis(r.xAxis) || !isAxis(r.yAxis)) continue
    const key = `${r.xAxis}→${r.yAxis}`
    if (seen.has(key)) continue
    seen.add(key)
    // intensity 양수만 (음수면 절댓값)
    const rawIntensity =
      typeof r.intensity === 'number'
        ? Math.abs(r.intensity)
        : Math.abs(parseFloat((r.intensity ?? '50') as string))
    rules.push({
      xAxis: r.xAxis,
      yAxis: r.yAxis,
      intensity: clampInt(rawIntensity, 50, 0, 100),
      // observations 는 evidenceCount 초과 금지
      observations: Math.min(
        evidenceCount,
        clampInt(r.observations, 1, 1, Math.max(1, evidenceCount))
      ),
      confidence: clampInt(r.confidence, 50, 0, 100),
      examplesX: Array.isArray(r.examplesX)
        ? r.examplesX.filter((s): s is string => typeof s === 'string').slice(0, 3)
        : [],
      examplesY: Array.isArray(r.examplesY)
        ? r.examplesY.filter((s): s is string => typeof s === 'string').slice(0, 3)
        : [],
      evidenceEventIds: evidenceIds,
      lastUpdated: at,
    })
    if (rules.length >= 6) break
  }
  return rules
}

export async function extractRelationshipModel(
  userId: string,
  relationshipId: string
): Promise<{ model: RelationshipModel; evidenceCount: number }> {
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

  const userMsg = renderExtractionContext({
    self: self ?? null,
    partner: partner ?? null,
    relationship: rel,
    events: [...evList].reverse(),
  })

  const client = anthropic()
  const res = await client.messages.create({
    model: MID_MODEL,
    max_tokens: 2500,
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

  let parsed: RawModel = {}
  try {
    parsed = JSON.parse(extractJson(text)) as RawModel
  } catch (e) {
    throw new Error(
      `LLM JSON 파싱 실패: ${(e as Error).message}\n\n${text.slice(0, 500)}`
    )
  }

  const now = Date.now()
  const evidenceIds = evList.map((e) => e.id)
  const rules = parseRules(parsed.rules, evidenceIds, evList.length, now)
  const baseline = parseBaseline(parsed.baseline)
  const confidenceOverall = clampInt(parsed.confidenceOverall, 50, 0, 100)

  const previousVersion = rel.model?.version ?? 0

  const model: RelationshipModel = {
    rules,
    baseline,
    lastEventIds: evidenceIds,
    version: previousVersion + 1,
    evidenceCount: evList.length,
    confidenceOverall,
    updatedAt: now,
    narrative:
      typeof parsed.narrative === 'string' ? parsed.narrative.trim() : '',
  }

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

// =============================================================================
// Simulation
// =============================================================================

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
    throw new Error('아직 모델 없음. 분석 탭에서 "모델 추출" 먼저 돌려줘.')
  }

  const [partner] = await db
    .select()
    .from(actors)
    .where(and(eq(actors.id, rel.partnerId), eq(actors.userId, userId)))
    .limit(1)

  const modelBlock = formatModel(
    rel.model,
    partner?.displayName ?? '상대',
    rel.state as RelationshipState,
    rel.goal as RelationshipGoal | null
  )

  const userMsg = `${modelBlock}

## [제안 X / 유저 질의]
${proposedX.trim()}`

  const client = anthropic()
  const res = await client.messages.create({
    model: DEEP_MODEL,
    max_tokens: 1500,
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

// =============================================================================
// Context rendering
// =============================================================================

function renderExtractionContext(c: {
  self: typeof actors.$inferSelect | null
  partner: typeof actors.$inferSelect | null
  relationship: Relationship
  events: Event[]
}): string {
  const lines: string[] = []
  const rel = c.relationship

  lines.push('## [관계 맥락]')
  lines.push(
    `- state: ${rel.state} (${STATE_LABEL[rel.state as RelationshipState] ?? rel.state})`
  )
  if (rel.goal) {
    const goalLabel = GOAL_LABEL[rel.goal as RelationshipGoal] ?? rel.goal
    lines.push(`- goal: ${rel.goal} (${goalLabel})`)
  }
  if (rel.description) lines.push(`- description: ${rel.description}`)
  if (rel.timelineStart)
    lines.push(`- first_met: ${new Date(rel.timelineStart).toISOString().slice(0, 10)}`)
  if (rel.timelineEnd)
    lines.push(`- ended_at: ${new Date(rel.timelineEnd).toISOString().slice(0, 10)}`)

  lines.push('\n## [Self]')
  if (c.self) {
    lines.push(`- 이름: ${c.self.displayName}`)
    if (c.self.age) lines.push(`- 나이: ${c.self.age}`)
    if (c.self.gender) lines.push(`- 성별: ${c.self.gender}`)
    if (c.self.occupation) lines.push(`- 직업: ${c.self.occupation}`)
    if (c.self.rawNotes) lines.push(`- 메모: ${c.self.rawNotes.slice(0, 400)}`)
  }

  lines.push('\n## [Partner]')
  if (c.partner) {
    lines.push(`- 이름: ${c.partner.displayName}`)
    if (c.partner.age) lines.push(`- 나이: ${c.partner.age}`)
    if (c.partner.gender) lines.push(`- 성별: ${c.partner.gender}`)
    if (c.partner.occupation) lines.push(`- 직업: ${c.partner.occupation}`)
    if ((c.partner.knownConstraints ?? []).length > 0)
      lines.push(`- 제약: ${c.partner.knownConstraints!.join(', ')}`)
    if (c.partner.rawNotes)
      lines.push(`- 메모: ${c.partner.rawNotes.slice(0, 500)}`)
  }

  if (rel.model) {
    lines.push('\n## [현재 모델 — 이전 추론, 참고용]')
    lines.push(`- 버전: v${rel.model.version} · 신뢰도 ${rel.model.confidenceOverall}%`)
    if (rel.model.narrative) lines.push(`- 축약: ${rel.model.narrative}`)
  }

  lines.push(`\n## [Events ${c.events.length}개 — 과거→최신]`)
  for (const e of c.events) {
    const ts = e.timestamp
      ? new Date(e.timestamp).toISOString()
      : '날짜 불명'
    lines.push(`\n### [${e.type}] ${ts}`)
    lines.push(e.content)
  }

  return lines.join('\n')
}

export function formatModel(
  m: RelationshipModel,
  partnerName: string,
  state: RelationshipState,
  goal: RelationshipGoal | null
): string {
  const lines: string[] = []
  lines.push(`## [관계 맥락]`)
  lines.push(`- state: ${state} (${STATE_LABEL[state] ?? state})`)
  if (goal) {
    lines.push(`- goal: ${goal} (${GOAL_LABEL[goal] ?? goal})`)
  }
  lines.push(`\n## [관계 모델 v${m.version} · 신뢰도 ${m.confidenceOverall}% · 증거 ${m.evidenceCount}]`)
  lines.push(`대상: ${partnerName}`)

  lines.push('\n### Baseline (X 무관 평상시 성향 · 0~100)')
  for (const ax of AXES) {
    lines.push(`- ${ax}: ${m.baseline.axes[ax]}`)
  }
  if (m.baseline.narrative) {
    lines.push(`\nbaseline narrative: ${m.baseline.narrative}`)
  }

  lines.push('\n### Rules (관찰 강한 순)')
  const sorted = [...m.rules].sort((a, b) => b.confidence - a.confidence)
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i]
    const sign = r.intensity >= 0 ? '+' : ''
    lines.push(
      `${i + 1}. [${r.xAxis} → ${r.yAxis} ${sign}${r.intensity}] 관찰 ${r.observations}회 · 신뢰 ${r.confidence}%`
    )
    if (r.examplesX[0]) lines.push(`   ex_X: "${r.examplesX[0]}"`)
    if (r.examplesY[0]) lines.push(`   ex_Y: "${r.examplesY[0]}"`)
  }

  if (m.narrative) {
    lines.push(`\n### 축약\n${m.narrative}`)
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

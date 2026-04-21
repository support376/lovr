import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import {
  actors,
  events,
  relationships,
  type Actor,
  type Event,
  type Relationship,
} from '../db/schema'

/**
 * LLM 컨텍스트 조립. Y = aX + b 모델 중심.
 */
export type RenderedContext = {
  markdown: string
  self: Actor | null
  partner: Actor | null
  relationship: Relationship | null
  events: Event[]
}

export async function buildContext(
  userId: string,
  relationshipId: string,
  eventLimit = 30
): Promise<RenderedContext> {
  const [self] = await db
    .select()
    .from(actors)
    .where(and(eq(actors.userId, userId), eq(actors.role, 'self')))
    .limit(1)

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

  const [partner] = rel
    ? await db
        .select()
        .from(actors)
        .where(and(eq(actors.id, rel.partnerId), eq(actors.userId, userId)))
        .limit(1)
    : [undefined]

  const evList = await db
    .select()
    .from(events)
    .where(
      and(eq(events.relationshipId, relationshipId), eq(events.userId, userId))
    )
    .orderBy(desc(events.createdAt))
    .limit(eventLimit)

  const md = renderMarkdown({
    self: self ?? null,
    partner: partner ?? null,
    relationship: rel ?? null,
    events: [...evList].reverse(),
  })

  return {
    markdown: md,
    self: self ?? null,
    partner: partner ?? null,
    relationship: rel ?? null,
    events: evList,
  }
}

function renderMarkdown(c: {
  self: Actor | null
  partner: Actor | null
  relationship: Relationship | null
  events: Event[]
}): string {
  const lines: string[] = []

  lines.push('## [Self]')
  if (c.self) {
    lines.push(`- 이름: ${c.self.displayName}`)
    if (c.self.age) lines.push(`- 나이: ${c.self.age}`)
    if (c.self.occupation) lines.push(`- 직업: ${c.self.occupation}`)
    if (c.self.rawNotes) lines.push(`- 메모: ${c.self.rawNotes.slice(0, 300)}`)
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

  if (c.relationship?.description) {
    lines.push(`\n## [관계 정의]\n${c.relationship.description}`)
  }

  if (c.relationship?.model) {
    const m = c.relationship.model
    lines.push('\n## [현재 모델 — Y = aX + b]')
    lines.push(`- 신뢰도 ${m.confidence}% · 증거 ${m.evidenceCount}개`)
    if (m.baseline) lines.push(`\n### b · baseline\n${m.baseline}`)
    if (m.rules.length > 0) {
      lines.push('\n### a · 규칙 (X→Y)')
      for (const r of m.rules) {
        lines.push(
          `- 내가 "${r.x}" → "${r.y}" (관찰 ${r.observations}회, 신뢰 ${r.confidence}%)`
        )
      }
    }
  }

  lines.push(`\n## [Events ${c.events.length}개 — 과거→최신]`)
  if (c.events.length === 0) {
    lines.push('(이벤트 없음)')
  } else {
    for (const e of c.events) {
      const ts = e.timestamp
        ? new Date(
            e.timestamp instanceof Date ? e.timestamp : Number(e.timestamp)
          ).toISOString()
        : '날짜 불명'
      lines.push(`\n### [${e.type}] ${ts}`)
      lines.push(e.content)
    }
  }

  return lines.join('\n')
}

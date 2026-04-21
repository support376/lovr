import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import {
  actors,
  events,
  relationships,
  STATE_LABEL,
  GOAL_LABEL,
  type Actor,
  type Event,
  type Relationship,
  type RelationshipState,
  type RelationshipGoal,
} from '../db/schema'
import { formatModel } from './model'

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
  eventLimit = 20
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

  const md = render({
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

function render(c: {
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

  if (c.relationship) {
    const rel = c.relationship
    lines.push('\n## [관계 맥락]')
    lines.push(
      `- state: ${rel.state} (${STATE_LABEL[rel.state as RelationshipState] ?? rel.state})`
    )
    if (rel.goal) {
      lines.push(
        `- goal: ${rel.goal} (${GOAL_LABEL[rel.goal as RelationshipGoal] ?? rel.goal})`
      )
    }
    if (rel.description) lines.push(`- 관계: ${rel.description}`)
    if (rel.timelineStart)
      lines.push(`- 첫 만남: ${new Date(rel.timelineStart).toISOString().slice(0, 10)}`)
    if (rel.timelineEnd)
      lines.push(`- 종료: ${new Date(rel.timelineEnd).toISOString().slice(0, 10)}`)

    if (rel.model && rel.model.rules && rel.model.rules.length > 0) {
      lines.push('\n' + formatModel(
        rel.model,
        c.partner?.displayName ?? '상대',
        rel.state as RelationshipState,
        (rel.goal as RelationshipGoal | null) ?? null
      ))
    }
  }

  lines.push(`\n## [Events ${c.events.length}개 — 과거→최신]`)
  if (c.events.length === 0) {
    lines.push('(이벤트 없음)')
  } else {
    for (const e of c.events) {
      const ts = e.timestamp
        ? new Date(e.timestamp).toISOString()
        : '날짜 불명'
      lines.push(`\n### [${e.type}] ${ts}`)
      lines.push(e.content)
    }
  }

  return lines.join('\n')
}

import 'server-only'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '../db/client'
import {
  actors,
  events,
  goals,
  insights,
  relationships,
  type Actor,
  type Event,
  type Goal,
  type Insight,
  type Relationship,
} from '../db/schema'

/**
 * LLM 컨텍스트 조립. user_id 기준 파티션.
 */
export type RenderedContext = {
  markdown: string
  self: Actor | null
  partner: Actor | null
  relationship: Relationship | null
  goals: Goal[]
  events: Event[]
  insights: Insight[]
}

export async function buildContext(
  userId: string,
  relationshipId: string,
  eventLimit = 15
): Promise<RenderedContext> {
  // self
  const [self] = await db
    .select()
    .from(actors)
    .where(and(eq(actors.userId, userId), eq(actors.role, 'self')))
    .limit(1)

  // relationship
  const [rel] = await db
    .select()
    .from(relationships)
    .where(and(eq(relationships.id, relationshipId), eq(relationships.userId, userId)))
    .limit(1)
  const [partner] = rel
    ? await db
        .select()
        .from(actors)
        .where(and(eq(actors.id, rel.partnerId), eq(actors.userId, userId)))
        .limit(1)
    : [undefined]

  const allGoals = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.relationshipId, relationshipId),
        eq(goals.userId, userId),
        isNull(goals.deprecatedAt)
      )
    )
    .orderBy(desc(goals.createdAt))

  const evList = await db
    .select()
    .from(events)
    .where(and(eq(events.relationshipId, relationshipId), eq(events.userId, userId)))
    .orderBy(desc(events.timestamp))
    .limit(eventLimit)

  const ins = await db
    .select()
    .from(insights)
    .where(and(eq(insights.userId, userId), eq(insights.status, 'active')))
    .orderBy(desc(insights.createdAt))

  const md = renderMarkdown({
    self: self ?? null,
    partner: partner ?? null,
    relationship: rel ?? null,
    goals: allGoals,
    events: [...evList].reverse(),
    insights: ins,
  })

  return {
    markdown: md,
    self: self ?? null,
    partner: partner ?? null,
    relationship: rel ?? null,
    goals: allGoals,
    events: evList,
    insights: ins,
  }
}

function renderMarkdown(c: {
  self: Actor | null
  partner: Actor | null
  relationship: Relationship | null
  goals: Goal[]
  events: Event[]
  insights: Insight[]
}): string {
  const lines: string[] = []

  lines.push('## [유저 self]')
  if (c.self) {
    lines.push(`- 이름: ${c.self.displayName}`)
    if ((c.self.knownConstraints ?? []).length > 0) {
      lines.push(`- 제약/맥락 태그: ${c.self.knownConstraints!.join(', ')}`)
    }
    if (c.self.rawNotes) {
      lines.push('- 자유 메모:')
      lines.push(indent(c.self.rawNotes, '  '))
    }
    if ((c.self.inferredTraits ?? []).length > 0) {
      lines.push('- 누적 관찰:')
      for (const t of c.self.inferredTraits!) {
        lines.push(`  - ${t.observation} (${t.confidenceNarrative})`)
      }
    }
  } else {
    lines.push('(self Actor 미생성)')
  }

  lines.push('')
  lines.push('## [현재 관계]')
  if (c.relationship && c.partner) {
    lines.push(`- 상대: ${c.partner.displayName}`)
    lines.push(`- 단계: ${c.relationship.progress} / 독점: ${c.relationship.exclusivity} / 갈등: ${c.relationship.conflictState}`)
    if (c.relationship.powerBalance) lines.push(`- 힘의 균형: ${c.relationship.powerBalance}`)
    if (c.relationship.communicationPattern) lines.push(`- 연락 패턴: ${c.relationship.communicationPattern}`)
    if (c.relationship.investmentAsymmetry) lines.push(`- 투자 비대칭: ${c.relationship.investmentAsymmetry}`)
    if (c.relationship.escalationSpeed) lines.push(`- 심화 속도: ${c.relationship.escalationSpeed}`)
    if ((c.partner.knownConstraints ?? []).length > 0) {
      lines.push(`- 상대 제약: ${c.partner.knownConstraints!.join(', ')}`)
    }
    if (c.partner.rawNotes) {
      lines.push('- 상대 자유 메모:')
      lines.push(indent(c.partner.rawNotes, '  '))
    }
    if ((c.partner.inferredTraits ?? []).length > 0) {
      lines.push('- 상대 누적 관찰:')
      for (const t of c.partner.inferredTraits!) {
        lines.push(`  - ${t.observation} (${t.confidenceNarrative})`)
      }
    }
  } else {
    lines.push('(관계 미연결)')
  }

  lines.push('')
  lines.push(`## [최근 Event ${c.events.length}개 — 과거→최신]`)
  if (c.events.length === 0) {
    lines.push('(이벤트 없음)')
  } else {
    for (const e of c.events) {
      const ts = e.timestamp instanceof Date ? e.timestamp : new Date(Number(e.timestamp))
      lines.push(`### [${e.type}] ${ts.toISOString()}`)
      lines.push('**Fact (유저가 입력한 사실):**')
      lines.push(e.content)
      if (e.selfNote) {
        lines.push('**Why (유저의 해석·맥락):**')
        lines.push(e.selfNote)
      }
      if ((e.contextTags ?? []).length > 0) {
        lines.push(`tags: ${e.contextTags!.join(', ')}`)
      }
      lines.push('')
    }
  }

  lines.push('## [Insight — active]')
  if (c.insights.length === 0) {
    lines.push('(누적된 Insight 없음)')
  } else {
    for (const ins of c.insights) {
      lines.push(`- [${ins.scope}] ${ins.observation}`)
    }
  }

  return lines.join('\n')
}

function indent(s: string, pad: string): string {
  return s
    .split('\n')
    .map((l) => pad + l)
    .join('\n')
}

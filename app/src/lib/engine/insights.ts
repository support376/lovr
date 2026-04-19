import 'server-only'
import { randomUUID } from 'node:crypto'
import { db } from '../db/client'
import { insights } from '../db/schema'
import { ensureSchema } from '../db/init'

/**
 * 주간 리포트 markdown 의 "## Insight 갱신" 섹션을 파싱해서
 * 신규 Insight를 insights 테이블에 삽입.
 *
 * 파싱 규칙 (weekly_report.md 출력 포맷 기준):
 *   - "- [NEW] [scope] — 관찰: ..." 라인 → 신규 Insight
 *   - "- [INS-xxx] invalidate — ..."   → 해당 id 상태를 invalidated 로
 *   - "- [INS-xxx] supersede — ..."    → 해당 id 상태를 superseded 로
 *
 * 파싱 실패 시 throw 안 하고 최대한 salvage.
 */
const VALID_SCOPES = new Set([
  'relationship_specific',
  'self_pattern',
  'partner_pattern',
  'cross_relationship',
])

type ParseResult = {
  newItems: Array<{ scope: string; observation: string }>
  invalidate: string[]
  supersede: string[]
}

export function parseInsightsSection(markdown: string): ParseResult {
  const out: ParseResult = { newItems: [], invalidate: [], supersede: [] }

  // "## Insight 갱신" 섹션 추출
  const idx = markdown.indexOf('## Insight 갱신')
  if (idx < 0) return out
  const section = markdown.slice(idx)

  const lines = section.split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line.startsWith('-')) continue
    const body = line.slice(1).trim()

    // [NEW] [scope] — 관찰: ...
    const newMatch = body.match(/^\[NEW\]\s*\[(\w+)\]\s*[—\-–]\s*(.+)$/)
    if (newMatch) {
      const scope = newMatch[1].trim()
      const obs = newMatch[2].trim()
      if (VALID_SCOPES.has(scope)) {
        out.newItems.push({ scope, observation: obs })
      }
      continue
    }

    // [INS-xxx] invalidate — ... / supersede — ...
    const opMatch = body.match(/^\[(INS-[a-z0-9\-]+)\]\s*(invalidate|supersede|keep)\b/i)
    if (opMatch) {
      const insId = opMatch[1]
      const op = opMatch[2].toLowerCase()
      if (op === 'invalidate') out.invalidate.push(insId)
      else if (op === 'supersede') out.supersede.push(insId)
    }
  }
  return out
}

export async function saveInsightsFromReport(params: {
  relationshipId: string
  reportMarkdown: string
}): Promise<{ count: number; invalidated: number; superseded: number }> {
  await ensureSchema()
  const parsed = parseInsightsSection(params.reportMarkdown)

  // 신규 삽입
  for (const it of parsed.newItems) {
    await db.insert(insights).values({
      id: `ins-${randomUUID()}`,
      scope: it.scope,
      relationshipId:
        it.scope === 'relationship_specific' || it.scope === 'partner_pattern'
          ? params.relationshipId
          : null,
      observation: it.observation,
      supportingEventIds: [],
      supportingOutcomeIds: [],
      status: 'active',
    })
  }

  // 상태 업데이트 (invalidate / supersede)
  const { eq } = await import('drizzle-orm')
  for (const id of parsed.invalidate) {
    await db.update(insights).set({ status: 'invalidated' }).where(eq(insights.id, id))
  }
  for (const id of parsed.supersede) {
    await db.update(insights).set({ status: 'superseded' }).where(eq(insights.id, id))
  }

  return {
    count: parsed.newItems.length,
    invalidated: parsed.invalidate.length,
    superseded: parsed.supersede.length,
  }
}

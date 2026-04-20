import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { actions as actionsTbl, events, relationships } from '@/lib/db/schema'
import { proposeStrategy } from '@/lib/engine/coach'

/**
 * 매일 자동 propose — Vercel Cron.
 *
 * 실행 조건 per relationship:
 *   - status = 'active'
 *   - primary active Goal 존재
 *   - 최근 1개 이상 Event
 *   - 마지막 Action 이 24h+ 경과 (혹은 없음)
 *
 * Vercel Cron 호출은 인증 헤더 있음 (`Authorization: Bearer $CRON_SECRET`).
 */
export const maxDuration = 300 // 5분 (Pro 필요)

export async function GET(req: Request) {
  // 인증 체크
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const activeRels = await db
    .select()
    .from(relationships)
    .where(eq(relationships.status, 'active'))

  const results: Array<{
    relationshipId: string
    status: 'proposed' | 'skipped'
    reason?: string
    actionId?: string
  }> = []

  const now = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000

  for (const rel of activeRels) {
    try {
      const evRows = await db
        .select({ id: events.id })
        .from(events)
        .where(and(eq(events.relationshipId, rel.id), eq(events.userId, rel.userId)))
      if (evRows.length === 0) {
        results.push({ relationshipId: rel.id, status: 'skipped', reason: 'no_events' })
        continue
      }

      const lastAction = (
        await db
          .select()
          .from(actionsTbl)
          .where(
            and(eq(actionsTbl.relationshipId, rel.id), eq(actionsTbl.userId, rel.userId))
          )
          .orderBy(desc(actionsTbl.createdAt))
          .limit(1)
      )[0]
      if (lastAction) {
        const lastTs =
          lastAction.createdAt instanceof Date
            ? lastAction.createdAt.getTime()
            : Number(lastAction.createdAt)
        if (now - lastTs < DAY_MS) {
          results.push({
            relationshipId: rel.id,
            status: 'skipped',
            reason: 'recent_action',
          })
          continue
        }
      }

      const r = await proposeStrategy({
        userId: rel.userId,
        relationshipId: rel.id,
        currentSituation: '(매일 자동 업데이트 · 최근 Event 기반)',
      })
      results.push({ relationshipId: rel.id, status: 'proposed', actionId: r.actionId })
    } catch (e) {
      results.push({
        relationshipId: rel.id,
        status: 'skipped',
        reason: `error: ${(e as Error).message}`,
      })
    }
  }

  return NextResponse.json({
    ran: new Date().toISOString(),
    total: activeRels.length,
    results,
  })
}

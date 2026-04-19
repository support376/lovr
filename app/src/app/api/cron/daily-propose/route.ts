import { NextResponse } from 'next/server'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { actions as actionsTbl, goals, events, relationships } from '@/lib/db/schema'
import { ensureSchema } from '@/lib/db/init'
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

  await ensureSchema()

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
      // Primary goal
      const primary = (
        await db
          .select()
          .from(goals)
          .where(and(eq(goals.relationshipId, rel.id), isNull(goals.deprecatedAt)))
          .orderBy(desc(goals.createdAt))
      ).find((g) => g.priority === 'primary')

      if (!primary) {
        results.push({ relationshipId: rel.id, status: 'skipped', reason: 'no_goal' })
        continue
      }
      if (primary.ethicsStatus === 'blocked') {
        results.push({ relationshipId: rel.id, status: 'skipped', reason: 'blocked' })
        continue
      }

      // Events 수
      const evRows = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.relationshipId, rel.id))
      if (evRows.length === 0) {
        results.push({ relationshipId: rel.id, status: 'skipped', reason: 'no_events' })
        continue
      }

      // 마지막 Action 시점
      const lastAction = (
        await db
          .select()
          .from(actionsTbl)
          .where(eq(actionsTbl.relationshipId, rel.id))
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

      // 실행
      const r = await proposeStrategy({
        relationshipId: rel.id,
        goalId: primary.id,
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

  // inArray 사용 없어도 되지만 import 안 지우려고 noop
  void inArray

  return NextResponse.json({
    ran: new Date().toISOString(),
    total: activeRels.length,
    results,
  })
}

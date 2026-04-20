import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { relationships } from '@/lib/db/schema'
import { generateWeeklyReport } from '@/lib/engine/coach'
import { saveInsightsFromReport } from '@/lib/engine/insights'

/**
 * 주간 리포트 자동 생성 — Vercel Cron (일요일 21시).
 * 각 active relationship에 대해 rel.userId 스코프로 실행.
 */
export const maxDuration = 300

export async function GET(req: Request) {
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
    status: 'generated' | 'skipped'
    reason?: string
    insightsAdded?: number
  }> = []

  for (const rel of activeRels) {
    try {
      const { markdown } = await generateWeeklyReport(rel.userId, rel.id)
      const saved = await saveInsightsFromReport({
        userId: rel.userId,
        relationshipId: rel.id,
        reportMarkdown: markdown,
      })
      results.push({
        relationshipId: rel.id,
        status: 'generated',
        insightsAdded: saved.count,
      })
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

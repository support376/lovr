import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Lock, User } from 'lucide-react'
import { desc, eq, inArray, and } from 'drizzle-orm'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { db } from '@/lib/db/client'
import { actions as actionsTbl, insights, outcomes } from '@/lib/db/schema'
import { requireUserId } from '@/lib/supabase/server'
import { Card } from '@/components/ui'
import { StrategyCards } from './StrategyCards'
import { QuickActionCTA } from './QuickActionCTA'

/**
 * 전략 탭 상세 — /s/[id]
 * 해야할 행동 · 최근 Action · Outcome · Insight 중심. 프로필/관계 분석은 /r/[id].
 */
export default async function StrategyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const { id } = await params
  const rel = await getRelationship(id)
  if (!rel) notFound()

  const uid = await requireUserId()

  const latestActions = await db
    .select()
    .from(actionsTbl)
    .where(
      and(
        eq(actionsTbl.userId, uid),
        eq(actionsTbl.relationshipId, id),
        inArray(actionsTbl.status, ['proposed', 'accepted'])
      )
    )
    .orderBy(desc(actionsTbl.createdAt))
    .limit(1)
  const latestAction = latestActions[0] ?? null

  const outs = latestAction
    ? await db
        .select()
        .from(outcomes)
        .where(and(eq(outcomes.userId, uid), eq(outcomes.actionId, latestAction.id)))
    : []
  const hasOutcome = outs.length > 0

  const activeInsights = await db
    .select()
    .from(insights)
    .where(and(eq(insights.userId, uid), eq(insights.status, 'active')))
    .orderBy(desc(insights.createdAt))
    .limit(8)
  const relevantInsights = activeInsights.filter(
    (i) => !i.relationshipId || i.relationshipId === id
  )

  return (
    <>
      <header className="px-5 pt-4 pb-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">
            {rel.partner.displayName}
            {rel.partner.age ? (
              <span className="text-muted font-normal text-lg ml-1">
                ({rel.partner.age})
              </span>
            ) : null}
          </h1>
          <div className="mt-1 text-[11px] text-muted">
            전략 · 지금 해야할 행동
          </div>
        </div>
        <Link
          href={`/r/${id}`}
          className="shrink-0 inline-flex items-center gap-1 text-xs text-muted hover:text-accent px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border"
        >
          <User size={13} /> 관계
        </Link>
      </header>

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        <section className="flex flex-col gap-3">
          <QuickActionCTA relationshipId={id} hasAction={!!latestAction} />

          {latestAction && (
            <StrategyCards
              action={latestAction}
              relationshipId={id}
              hasOutcome={hasOutcome}
            />
          )}
        </section>

        {relevantInsights.length > 0 && (
          <section>
            <div className="text-xs text-muted mb-1.5 flex items-center justify-between">
              <span>누적 Insight · 주간 리포트</span>
              <Link href={`/s/${id}/report`} className="text-[11px] text-accent">
                다시 생성 →
              </Link>
            </div>
            <Card>
              <ul className="flex flex-col gap-1.5">
                {relevantInsights.slice(0, 5).map((i) => (
                  <li key={i.id} className="text-xs leading-relaxed">
                    <span className="text-muted">[{i.scope.replace('_', ' ')}]</span>{' '}
                    {i.observation}
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        <section>
          <Link href={`/s/${id}/report`}>
            <Card className="border-warn/30 bg-gradient-to-br from-warn/10 via-transparent to-accent-2/5 hover:border-warn/50 transition-colors">
              <div className="flex items-start gap-3">
                <Lock size={16} className="text-warn mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">다면 관계 리포트</div>
                  <div className="text-[11px] text-muted mt-0.5 leading-relaxed">
                    지금까지의 전 기록 통합 인사이트 · 패턴 · 장기 경고. (베타 무료)
                  </div>
                </div>
                <span className="text-xs text-warn shrink-0">받기 →</span>
              </div>
            </Card>
          </Link>
        </section>
      </div>
    </>
  )
}

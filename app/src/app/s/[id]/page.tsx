import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { User } from 'lucide-react'
import { desc, eq, and } from 'drizzle-orm'
import { getSelf } from '@/lib/actions/self'
import {
  getRelationship,
  listRelationships,
} from '@/lib/actions/relationships'
import { db } from '@/lib/db/client'
import { actions as actionsTbl, insights, outcomes } from '@/lib/db/schema'
import { requireUserId } from '@/lib/supabase/server'
import { Card } from '@/components/ui'
import { StrategyCards } from './StrategyCards'
import { QuickActionCTA } from './QuickActionCTA'
import { InlineOutcome } from './InlineOutcome'
import { OutcomeHistory } from './OutcomeHistory'
import { TargetSwitcher } from '@/components/TargetSwitcher'

/**
 * 전략 탭 상세 — /s/[id]
 * 해야할 행동 + 결과 기록 inline + 먹힘/안먹힘 이력 + Insight.
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
  const all = await listRelationships()

  // 최근 action (실행 전 or 후 모두 포함 — 결과 입력을 inline 으로 받기 위해)
  const latestActions = await db
    .select()
    .from(actionsTbl)
    .where(and(eq(actionsTbl.userId, uid), eq(actionsTbl.relationshipId, id)))
    .orderBy(desc(actionsTbl.createdAt))
    .limit(1)
  const latestAction = latestActions[0] ?? null

  // 해당 relationship 의 모든 outcomes (먹힘/안먹힘 집계용)
  const allActionIds = (
    await db
      .select({ id: actionsTbl.id })
      .from(actionsTbl)
      .where(and(eq(actionsTbl.userId, uid), eq(actionsTbl.relationshipId, id)))
  ).map((a) => a.id)
  const allOutcomes =
    allActionIds.length === 0
      ? []
      : await db
          .select()
          .from(outcomes)
          .where(eq(outcomes.userId, uid))
          .orderBy(desc(outcomes.createdAt))

  const relOutcomes = allOutcomes.filter((o) => allActionIds.includes(o.actionId))
  const latestOutcomesForCurrent = latestAction
    ? relOutcomes.filter((o) => o.actionId === latestAction.id)
    : []
  const hasOutcome = latestOutcomesForCurrent.length > 0

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
      <div className="pt-3 pb-1">
        <TargetSwitcher
          relationships={all}
          currentId={id}
          buildHref={(rid) => `/s/${rid}`}
        />
      </div>

      <header className="px-5 pt-3 pb-3 flex items-start gap-3">
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
            전략 · 지금 해야할 행동 + 결과 루프
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
        {/* 액션 제안 + 카드 */}
        <section className="flex flex-col gap-3">
          <QuickActionCTA relationshipId={id} hasAction={!!latestAction} />

          {latestAction && (
            <>
              <StrategyCards
                action={latestAction}
                relationshipId={id}
                hasOutcome={hasOutcome}
              />

              {/* 결과 입력 inline — 실행 전: 실행 버튼 / 실행 후: 메모 + 분석 */}
              <InlineOutcome
                actionId={latestAction.id}
                status={latestAction.status}
                hasOutcome={hasOutcome}
              />
            </>
          )}
        </section>

        {/* 먹힘 / 안 먹힘 2컬럼 */}
        <OutcomeHistory outcomes={relOutcomes} />

        {/* Insight */}
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
      </div>
    </>
  )
}

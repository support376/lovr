import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Lock } from 'lucide-react'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { db } from '@/lib/db/client'
import { actions as actionsTbl, goals, outcomes } from '@/lib/db/schema'
import { ensureSchema } from '@/lib/db/init'
import { Card, Pill } from '@/components/ui'
import { PartnerInlineEditor } from './PartnerInlineEditor'
import { DetailsToggle } from './DetailsToggle'
import { StrategyCards } from './StrategyCards'
import { QuickActionCTA } from './QuickActionCTA'
import { STAGES, GOALS } from '@/lib/ontology'
import {
  canAccessMultiTargetReport,
  getCurrentTier,
} from '@/lib/billing/tier'

export default async function RelationshipPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const { id } = await params
  const sp = await searchParams
  const editOpen = sp.edit === '1'

  const rel = await getRelationship(id)
  if (!rel) notFound()

  await ensureSchema()
  const activeGoals = await db
    .select()
    .from(goals)
    .where(and(eq(goals.relationshipId, id), isNull(goals.deprecatedAt)))
    .orderBy(desc(goals.createdAt))
  const primaryGoal =
    activeGoals.find((g) => g.priority === 'primary') ?? activeGoals[0] ?? null

  const latestActions = await db
    .select()
    .from(actionsTbl)
    .where(
      and(
        eq(actionsTbl.relationshipId, id),
        inArray(actionsTbl.status, ['proposed', 'accepted'])
      )
    )
    .orderBy(desc(actionsTbl.createdAt))
    .limit(1)
  const latestAction = latestActions[0] ?? null

  const outs = latestAction
    ? await db.select().from(outcomes).where(eq(outcomes.actionId, latestAction.id))
    : []
  const hasOutcome = outs.length > 0

  const stageLabel =
    rel.progress && STAGES[rel.progress as keyof typeof STAGES]
      ? STAGES[rel.progress as keyof typeof STAGES].ko
      : null
  const goalLabel = primaryGoal
    ? GOALS[primaryGoal.category as keyof typeof GOALS]?.ko ?? primaryGoal.category
    : null

  return (
    <>
      {/* 헤더 — 이름(나이) + 상세 토글 */}
      <header className="px-5 pt-4 pb-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">
              {rel.partner.displayName}
              {rel.partner.age ? (
                <span className="text-muted font-normal text-lg ml-1">
                  ({rel.partner.age})
                </span>
              ) : null}
            </h1>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
            {stageLabel && <Pill tone="accent">{stageLabel}</Pill>}
            {rel.partner.mbti && (
              <span className="px-1.5 py-0.5 rounded bg-surface-2 text-muted font-mono">
                {rel.partner.mbti}
              </span>
            )}
            {rel.partner.occupation && (
              <span className="px-1.5 py-0.5 rounded bg-surface-2 text-muted">
                {rel.partner.occupation}
              </span>
            )}
          </div>
        </div>

        <DetailsToggle open={editOpen} relationshipId={id} />
      </header>

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        {editOpen && (
          <PartnerInlineEditor rel={rel} showToggleButton={false} open={true} />
        )}

        {/* 1. 현재 상태 + 목표 — 단 두 줄 요약 */}
        <section className="rounded-2xl border border-border bg-surface/50 divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-muted shrink-0">현재 상태</span>
            <div className="flex items-center gap-2 min-w-0">
              {stageLabel ? (
                <span className="text-sm">{stageLabel}</span>
              ) : (
                <span className="text-xs text-muted">미설정</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-muted shrink-0">🎯 목표</span>
            <div className="flex items-center gap-2 min-w-0">
              {goalLabel ? (
                <span className="text-sm truncate">{goalLabel}</span>
              ) : (
                <span className="text-xs text-muted">아직 없음</span>
              )}
              <Link
                href={`/r/${id}/goals`}
                className="shrink-0 text-[11px] text-accent"
              >
                변경
              </Link>
            </div>
          </div>
        </section>

        {/* 2. 행동 */}
        <section className="flex flex-col gap-3">
          <QuickActionCTA
            relationshipId={id}
            partnerId={rel.partner.id}
            primaryGoalId={primaryGoal?.id ?? null}
            hasAction={!!latestAction}
            stage={rel.progress}
          />

          {latestAction && (
            <StrategyCards
              action={latestAction}
              relationshipId={id}
              hasOutcome={hasOutcome}
            />
          )}
        </section>

        {/* 3. 다면 관계 리포트 — Deep tier 전용 */}
        <MultiTargetReportCTA relationshipId={id} />
      </div>
    </>
  )
}

function MultiTargetReportCTA({ relationshipId }: { relationshipId: string }) {
  const tier = getCurrentTier()
  const unlocked = canAccessMultiTargetReport(tier)

  const body = (
    <Card
      className={
        unlocked
          ? 'border-warn/30 bg-gradient-to-br from-warn/10 via-transparent to-accent-2/5 hover:border-warn/50 transition-colors'
          : 'border-border bg-surface-2/50'
      }
    >
      <div className="flex items-start gap-3">
        <Lock
          size={16}
          className={`${unlocked ? 'text-warn' : 'text-muted'} mt-0.5 shrink-0`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold">다면 관계 리포트</span>
            {!unlocked && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
                Deep
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted mt-0.5 leading-relaxed">
            {unlocked
              ? '지금까지의 전 기록 통합 인사이트 · 패턴 · 장기 경고.'
              : '모든 Target 을 가로질러 반복되는 패턴·경고·LTV 예측. Deep 플랜에서 열림.'}
          </div>
        </div>
        <span
          className={`text-xs shrink-0 ${
            unlocked ? 'text-warn' : 'text-muted'
          }`}
        >
          {unlocked ? '받기 →' : '잠김'}
        </span>
      </div>
    </Card>
  )

  return (
    <section>
      {unlocked ? (
        <Link href={`/r/${relationshipId}/report`}>{body}</Link>
      ) : (
        body
      )}
    </section>
  )
}


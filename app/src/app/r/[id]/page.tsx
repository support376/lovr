import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Lock } from 'lucide-react'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { db } from '@/lib/db/client'
import { actions as actionsTbl, goals, outcomes } from '@/lib/db/schema'
import { ensureSchema } from '@/lib/db/init'
import { Card } from '@/components/ui'
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
    .where(eq(actionsTbl.relationshipId, id))
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
    ? GOALS[primaryGoal.category as keyof typeof GOALS]?.ko ??
      primaryGoal.category
    : null

  return (
    <>
      {/* 1줄 축약 헤더: 이름 · stage · MBTI · 상세 */}
      <header className="px-5 pt-4 pb-2 flex items-center gap-2">
        <h1 className="text-lg font-bold truncate flex-1 min-w-0">
          {rel.partner.displayName}
          {rel.partner.age ? (
            <span className="text-muted font-normal ml-1">
              ({rel.partner.age})
            </span>
          ) : null}
          {stageLabel && (
            <span className="ml-2 text-[11px] text-accent font-medium">
              · {stageLabel}
            </span>
          )}
          {rel.partner.mbti && (
            <span className="ml-2 text-[11px] text-muted font-mono">
              · {rel.partner.mbti}
            </span>
          )}
        </h1>
        <DetailsToggle open={editOpen} relationshipId={id} />
      </header>

      {/* 맥락 배지 — 목표만. 탭하면 /goals */}
      <div className="px-5 pb-2">
        <Link
          href={`/r/${id}/goals`}
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border bg-surface-2 hover:border-accent/40"
        >
          <span className="text-muted">🎯</span>
          <span className={goalLabel ? 'text-accent font-medium' : 'text-muted'}>
            {goalLabel ?? '목표 미설정'}
          </span>
          <span className="text-muted">▾</span>
        </Link>
      </div>

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        {editOpen && (
          <PartnerInlineEditor rel={rel} showToggleButton={false} open={true} />
        )}

        {/* 행동 영역 — 주 콘텐츠 */}
        <section className="flex flex-col gap-3">
          {!latestAction && (
            <QuickActionCTA
              relationshipId={id}
              partnerId={rel.partner.id}
              primaryGoalId={primaryGoal?.id ?? null}
              hasAction={false}
              stage={rel.progress}
            />
          )}

          {latestAction && (
            <>
              <StrategyCards
                action={latestAction}
                relationshipId={id}
                hasOutcome={hasOutcome}
              />
              {/* 다시 받기 — 주 전략 아래 얇게 */}
              <QuickActionCTA
                relationshipId={id}
                partnerId={rel.partner.id}
                primaryGoalId={primaryGoal?.id ?? null}
                hasAction={true}
                stage={rel.progress}
              />
            </>
          )}
        </section>

        {/* 다면 관계 리포트 — Deep tier 전용. 잠금 배지로 포지션만 박아둠. */}
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
          : 'border-border bg-surface-2/40'
      }
    >
      <div className="flex items-center gap-2.5">
        <Lock
          size={14}
          className={`${unlocked ? 'text-warn' : 'text-muted'} shrink-0`}
        />
        <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold">다면 패턴 리포트</span>
          {!unlocked && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
              Deep
            </span>
          )}
        </div>
        <span
          className={`text-[11px] shrink-0 ${
            unlocked ? 'text-warn' : 'text-muted'
          }`}
        >
          {unlocked ? '→' : '잠김'}
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

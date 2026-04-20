import { notFound, redirect } from 'next/navigation'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { db } from '@/lib/db/client'
import { actions as actionsTbl, goals, outcomes } from '@/lib/db/schema'
import { ensureSchema } from '@/lib/db/init'
import { PartnerInlineEditor } from './PartnerInlineEditor'
import { DetailsToggle } from './DetailsToggle'
import { StrategyCards } from './StrategyCards'
import { QuickActionCTA } from './QuickActionCTA'
import { StagePicker } from './StagePicker'
import { GoalPicker } from './GoalPicker'

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

  // 현재 stage 가 얼마나 지속 중인지 (마지막 전이 시점부터)
  const stageHistory = Array.isArray(rel.stageHistory) ? rel.stageHistory : []
  const lastTransition = stageHistory[stageHistory.length - 1]
  const daysSinceStage = lastTransition
    ? Math.max(
        0,
        Math.floor((Date.now() - Number(lastTransition.at)) / 86400000)
      )
    : null

  return (
    <>
      {/* 1줄 축약 헤더: 이름(나이) · MBTI · 상세 */}
      <header className="px-5 pt-4 pb-2 flex items-center gap-2">
        <h1 className="text-lg font-bold truncate flex-1 min-w-0">
          {rel.partner.displayName}
          {rel.partner.age ? (
            <span className="text-muted font-normal ml-1">
              ({rel.partner.age})
            </span>
          ) : null}
          {rel.partner.mbti && (
            <span className="ml-2 text-[11px] text-muted font-mono">
              · {rel.partner.mbti}
            </span>
          )}
        </h1>
        <DetailsToggle open={editOpen} relationshipId={id} />
      </header>

      {/* 맥락 배지 — Stage (왼쪽) + Goal (오른쪽). 둘 다 같은 inline dropdown. */}
      <div className="px-5 pb-3 flex items-start gap-2">
        <div className="flex flex-col gap-0.5">
          <StagePicker relationshipId={id} current={rel.progress} />
          {daysSinceStage !== null && daysSinceStage > 0 && (
            <span className="text-[10px] text-muted pl-1">
              · {daysSinceStage}일째
            </span>
          )}
        </div>
        <div className="ml-auto">
          <GoalPicker
            relationshipId={id}
            partnerId={rel.partner.id}
            stage={rel.progress}
            currentGoalCategory={primaryGoal?.category ?? null}
          />
        </div>
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
      </div>
    </>
  )
}

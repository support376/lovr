import { notFound, redirect } from 'next/navigation'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { db } from '@/lib/db/client'
import { actions as actionsTbl, goals, outcomes } from '@/lib/db/schema'
import { ensureSchema } from '@/lib/db/init'
import { StrategyCards } from './StrategyCards'
import { QuickActionCTA } from './QuickActionCTA'
import { StagePicker } from './StagePicker'
import { GoalPicker } from './GoalPicker'
import { NarrativeCard } from './NarrativeCard'

export default async function RelationshipPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const { id } = await params

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
      {/* 이름 헤드라인 */}
      <header className="px-5 pt-5 pb-2">
        <h1 className="text-3xl font-black tracking-tight leading-none">
          {rel.partner.displayName}
          {rel.partner.age ? (
            <span className="text-muted font-semibold ml-2 text-xl align-baseline">
              {rel.partner.age}
            </span>
          ) : null}
        </h1>
      </header>

      {/* 맥락 배지 — Stage (왼쪽) + Goal (오른쪽). 즉시 수정. */}
      <div className="px-5 pb-4 flex items-start gap-2">
        <div className="flex flex-col gap-0.5">
          <StagePicker relationshipId={id} current={rel.progress} />
          {daysSinceStage !== null && daysSinceStage > 0 && (
            <span className="text-[10px] text-muted pl-1">
              {daysSinceStage}일째
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

      <div className="px-5 pb-10 flex-1 flex flex-col gap-3">
        {/* 현재 상태 해석 — 언제부터 · 지금 OO 단계 · 전략 OO */}
        <NarrativeCard rel={rel} primaryGoal={primaryGoal} />

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
            <QuickActionCTA
              relationshipId={id}
              partnerId={rel.partner.id}
              primaryGoalId={primaryGoal?.id ?? null}
              hasAction={true}
              stage={rel.progress}
            />
          </>
        )}
      </div>
    </>
  )
}

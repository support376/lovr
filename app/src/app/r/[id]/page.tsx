import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Lock } from 'lucide-react'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { db } from '@/lib/db/client'
import { actions as actionsTbl, goals, insights, outcomes } from '@/lib/db/schema'
import { ensureSchema } from '@/lib/db/init'
import { Card, Pill } from '@/components/ui'
import { PartnerInlineEditor } from './PartnerInlineEditor'
import { StylePicker } from './StylePicker'
import { DetailsToggle } from './DetailsToggle'
import { StrategyCards } from './StrategyCards'
import { QuickActionCTA } from './QuickActionCTA'
import { STAGES, STYLES, GOALS } from '@/lib/ontology'

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

  // active Insight — 이 관계 특정 + self/partner 공통 패턴
  const activeInsights = await db
    .select()
    .from(insights)
    .where(eq(insights.status, 'active'))
    .orderBy(desc(insights.createdAt))
    .limit(8)
  const relevantInsights = activeInsights.filter(
    (i) => !i.relationshipId || i.relationshipId === id
  )

  const stageLabel =
    rel.progress && STAGES[rel.progress as keyof typeof STAGES]
      ? STAGES[rel.progress as keyof typeof STAGES].ko
      : null
  const styleLabel =
    rel.style && STYLES[rel.style as keyof typeof STYLES]
      ? STYLES[rel.style as keyof typeof STYLES].ko
      : null
  const goalLabel = primaryGoal
    ? GOALS[primaryGoal.category as keyof typeof GOALS]?.ko ?? primaryGoal.category
    : null

  return (
    <>
      {/* 헤더 — 이름(나이) + 상세 토글 우측 */}
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

        {/* 1. 행동 — 최상단 메인 */}
        <section className="flex flex-col gap-3">
          <QuickActionCTA
            relationshipId={id}
            partnerId={rel.partner.id}
            primaryGoalId={primaryGoal?.id ?? null}
            hasAction={!!latestAction}
          />

          {latestAction && (
            <StrategyCards
              action={latestAction}
              relationshipId={id}
              hasOutcome={hasOutcome}
            />
          )}
        </section>

        {/* 2. 컨텍스트 요약 + 접힘 설정 */}
        <details className="group rounded-2xl border border-border bg-surface/50 [&_summary::-webkit-details-marker]:hidden">
          <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-2 text-xs">
            <span className="text-muted">맥락</span>
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
              {goalLabel ? (
                <Pill tone="accent">{goalLabel}</Pill>
              ) : (
                <span className="text-muted">목표 미설정</span>
              )}
              {styleLabel ? (
                <Pill tone="accent">{styleLabel}</Pill>
              ) : (
                <span className="text-muted">· 스타일 자동</span>
              )}
            </div>
            <span className="text-[11px] text-muted group-open:rotate-180 transition-transform">
              ▾
            </span>
          </summary>

          <div className="px-4 pb-4 flex flex-col gap-3">
            {rel.description && (
              <div className="text-xs text-muted whitespace-pre-wrap leading-relaxed">
                {rel.description}
              </div>
            )}

            {/* 목표 미니 */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted shrink-0">🎯 목표</span>
                {primaryGoal ? (
                  <span className="text-sm truncate">
                    {GOALS[primaryGoal.category as keyof typeof GOALS]?.ko ??
                      primaryGoal.category}
                    {primaryGoal.description &&
                    primaryGoal.description !==
                      GOALS[primaryGoal.category as keyof typeof GOALS]?.ko
                      ? ` · ${primaryGoal.description}`
                      : ''}
                  </span>
                ) : (
                  <span className="text-xs text-muted">
                    아직 목표 설정 안 됨
                  </span>
                )}
              </div>
              <Link
                href={`/r/${id}/goals`}
                className="shrink-0 ml-2 text-[11px] text-accent"
              >
                변경
              </Link>
            </div>

            {/* 스타일 */}
            <StylePicker relationshipId={id} current={rel.style ?? null} />
          </div>
        </details>

        {/* 3. 주간 Insight — 최근 active */}
        {relevantInsights.length > 0 && (
          <section>
            <div className="text-xs text-muted mb-1.5 flex items-center justify-between">
              <span>누적 Insight · 주간 리포트에서 뽑힘</span>
              <Link href={`/r/${id}/report`} className="text-[11px] text-accent">
                다시 생성 →
              </Link>
            </div>
            <Card>
              <ul className="flex flex-col gap-1.5">
                {relevantInsights.slice(0, 5).map((i) => (
                  <li key={i.id} className="text-xs leading-relaxed">
                    <span className="text-muted">[{i.scope.replace('_', ' ')}]</span> {i.observation}
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        {/* 4. 다면 관계 리포트 */}
        <section>
          <Link href={`/r/${id}/report`}>
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

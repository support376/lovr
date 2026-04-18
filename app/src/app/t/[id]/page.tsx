import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Plus, Sparkles } from 'lucide-react'
import {
  getTarget,
  getTargetInteractions,
  getTargetStrategies,
} from '@/lib/actions/targets'
import { Card, Pill, STAGE_LABEL, STAGE_TONE, GOAL_LABEL } from '@/components/ui'
import { DossierProfile } from './DossierProfile'
import { InteractionTimeline } from './InteractionTimeline'
import { ReprofileButton } from './ReprofileButton'

export default async function TargetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const target = await getTarget(id)
  if (!target) notFound()

  const [interactions, strategies] = await Promise.all([
    getTargetInteractions(id, 50),
    getTargetStrategies(id),
  ])
  const latestStrategy = strategies[0]

  return (
    <>
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link
          href="/"
          className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{target.avatarEmoji}</span>
            <h1 className="text-xl font-bold truncate">{target.alias}</h1>
            <Pill tone={STAGE_TONE[target.stage] ?? 'neutral'}>
              {STAGE_LABEL[target.stage] ?? target.stage}
            </Pill>
          </div>
          <div className="text-xs text-muted mt-0.5 truncate">
            {[target.age && `${target.age}세`, target.job, target.matchPlatform]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
      </header>

      <div className="px-5 flex-1 flex flex-col gap-4 pb-6">
        {/* Goal card */}
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted">목표</div>
              <div className="mt-1 text-sm font-medium">
                {target.goal.description}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Pill tone="accent">{GOAL_LABEL[target.goal.preset]}</Pill>
                {target.goal.timeframeWeeks != null && (
                  <span className="text-xs text-muted">
                    {target.goal.timeframeWeeks}주 내
                  </span>
                )}
              </div>
            </div>
            <Link
              href={`/t/${target.id}/edit`}
              className="text-xs text-muted hover:text-text"
            >
              편집
            </Link>
          </div>
        </Card>

        {/* Strategy entry */}
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles size={16} className="text-accent" />
                전략
              </div>
              {latestStrategy ? (
                <div className="mt-1 text-xs text-muted line-clamp-2">
                  {latestStrategy.situationReport}
                </div>
              ) : (
                <div className="mt-1 text-xs text-muted">
                  아직 전략 없음. 생성해봐.
                </div>
              )}
            </div>
            <Link
              href={`/t/${target.id}/strategy`}
              className="text-xs font-semibold text-accent shrink-0"
            >
              {latestStrategy ? '보기' : '생성'} →
            </Link>
          </div>
        </Card>

        {/* Profile */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted uppercase tracking-wider">
              프로파일
            </div>
            <ReprofileButton targetId={target.id} />
          </div>
          <DossierProfile target={target} />
        </div>

        {/* Interactions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted uppercase tracking-wider">
              Interaction 타임라인
            </div>
            <Link
              href={`/t/${target.id}/add`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
            >
              <Plus size={14} /> 기록 추가
            </Link>
          </div>
          <InteractionTimeline items={interactions} />
        </div>
      </div>
    </>
  )
}

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

  // 렌더 실패 대신 유저에게 진짜 에러를 보여주도록 try/catch
  let target, interactions, strategies
  try {
    target = await getTarget(id)
    if (!target) notFound()
    ;[interactions, strategies] = await Promise.all([
      getTargetInteractions(id, 50),
      getTargetStrategies(id),
    ])
  } catch (err) {
    if ((err as { digest?: string }).digest?.startsWith('NEXT_')) throw err
    return <InlineError err={err as Error} id={id} phase="load" />
  }

  const latestStrategy = strategies[0]

  try {
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
                .join(' · ') || '정보 없음'}
            </div>
          </div>
        </header>

        <div className="px-5 flex-1 flex flex-col gap-4 pb-6">
          {target.currentSituation && (
            <Card>
              <div className="text-xs text-muted">현재 진행 상황</div>
              <div className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">
                {target.currentSituation}
              </div>
            </Card>
          )}

          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted">목표</div>
                <div className="mt-1 text-sm font-medium">
                  {target.goal?.description ?? '미설정'}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {target.goal?.preset && (
                    <Pill tone="accent">
                      {GOAL_LABEL[target.goal.preset] ?? target.goal.preset}
                    </Pill>
                  )}
                  {target.goal?.timeframeWeeks != null && (
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

          {(target.mbti ||
            target.background ||
            target.commonGround ||
            target.relationshipHistory ||
            (target.interests?.length ?? 0) > 0) && (
            <Card>
              <div className="text-xs text-muted mb-2">배경</div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {target.mbti && <Pill tone="accent">{target.mbti}</Pill>}
                {target.gender && (
                  <Pill tone="neutral">
                    {target.gender === 'female'
                      ? '여'
                      : target.gender === 'male'
                      ? '남'
                      : target.gender}
                  </Pill>
                )}
                {(target.interests ?? []).map((it, i) => (
                  <Pill key={i} tone="neutral">
                    {it}
                  </Pill>
                ))}
              </div>
              {target.background && (
                <div className="text-xs text-muted mt-2">
                  <span className="text-text">배경:</span> {target.background}
                </div>
              )}
              {target.commonGround && (
                <div className="text-xs text-muted mt-1">
                  <span className="text-text">접점:</span> {target.commonGround}
                </div>
              )}
              {target.relationshipHistory && (
                <div className="text-xs text-muted mt-1">
                  <span className="text-text">연애 이력:</span>{' '}
                  {target.relationshipHistory}
                </div>
              )}
            </Card>
          )}

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

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted uppercase tracking-wider">
                프로파일
              </div>
              <ReprofileButton targetId={target.id} />
            </div>
            <DossierProfile target={target} />
          </div>

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
  } catch (err) {
    if ((err as { digest?: string }).digest?.startsWith('NEXT_')) throw err
    return <InlineError err={err as Error} id={id} phase="render" target={target} />
  }
}

function InlineError({
  err,
  id,
  phase,
  target,
}: {
  err: Error
  id: string
  phase: string
  target?: unknown
}) {
  // 서버 로그 (Vercel 캡처)
  console.error('[TargetDetailPage error]', phase, id, err?.message, err?.stack)

  return (
    <div className="px-5 pt-6 pb-10 flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">상세 로드 실패</h1>
      </header>
      <div className="rounded-2xl border border-bad/40 bg-bad/5 p-4 text-xs leading-relaxed">
        <div className="text-bad font-semibold mb-2">
          phase: {phase} · id: {id}
        </div>
        <div className="text-bad whitespace-pre-wrap break-all">
          {err?.message ?? String(err)}
        </div>
        {err?.stack && (
          <pre className="mt-3 text-[10px] text-muted bg-bg/60 rounded-lg p-2 max-h-48 overflow-auto whitespace-pre-wrap">
            {err.stack}
          </pre>
        )}
        {target != null && (
          <details className="mt-3">
            <summary className="text-muted cursor-pointer">target dump</summary>
            <pre className="mt-1 text-[10px] text-muted bg-bg/60 rounded-lg p-2 max-h-48 overflow-auto whitespace-pre-wrap">
              {JSON.stringify(target, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

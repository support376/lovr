import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { Card } from '@/components/ui'
import { RadarChart } from '@/components/RadarChart'
import { ModelCard } from './ModelCard'
import { ExtractModelButton } from './ExtractModelButton'
import { CurrentTargetHeader } from '@/components/CurrentTargetHeader'
import type { RelationshipCompat, RelationshipModel } from '@/lib/db/schema'

/**
 * 분석 탭 — 케미·상대·나 · 그리고 X→Y 규칙.
 * 상대 정보·상태·목적 편집은 설정 탭에서.
 */
export default async function RelationshipAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const { id } = await params
  const rel = await getRelationship(id)
  if (!rel) notFound()

  const model = rel.model
  const hasModel = !!(model && model.rules && model.rules.length > 0)
  const compat = model?.compat

  return (
    <>
      <CurrentTargetHeader rel={rel} />
      <header className="px-5 pt-2 pb-3">
        <h1 className="text-2xl font-bold">분석</h1>
        <div className="text-[11px] text-muted mt-0.5">
          반응 모델 — Y = aX + b
        </div>
      </header>

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        {!hasModel ? (
          <ModelCard
            relationshipId={id}
            model={model}
            partnerName={rel.partner.displayName}
          />
        ) : (
          <>
            {/* 케미 헤드라인 */}
            <CompatHeadlineCard
              compat={compat}
              confidenceOverall={model!.confidenceOverall}
              partnerName={rel.partner.displayName}
            />

            {/* 상대 radar */}
            <AnalysisBlock
              title={rel.partner.displayName}
              oneLine={model!.baseline.narrative || model!.narrative}
              scores={model!.baseline.axes}
              tone="accent"
            />

            {/* 나 radar */}
            {compat?.selfBaseline && (
              <AnalysisBlock
                title="이 관계 속 나"
                oneLine={compat.selfOneLine}
                scores={compat.selfBaseline}
                tone="accent-2"
              />
            )}

            {/* 기존 ModelCard — rules 중심, baseline 수평 bar 는 여기만 유지 */}
            <details className="group">
              <summary className="cursor-pointer list-none text-xs text-muted uppercase tracking-wider flex items-center gap-1 hover:text-text">
                <span>반응 모델 상세 (a · X→Y 규칙)</span>
                <span className="group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="mt-2">
                <ModelCard
                  relationshipId={id}
                  model={model}
                  partnerName={rel.partner.displayName}
                />
              </div>
            </details>

            {/* 재추출 버튼 (펼침 밖에도 노출) */}
            <ExtractModelButton relationshipId={id} hasModel={true} />
          </>
        )}
      </div>
    </>
  )
}

function CompatHeadlineCard({
  compat,
  confidenceOverall,
  partnerName,
}: {
  compat: RelationshipCompat | undefined
  confidenceOverall: number
  partnerName: string
}) {
  if (!compat) {
    return (
      <Card className="border-dashed">
        <div className="text-sm leading-relaxed">
          이 모델은 구버전이라 케미 layer 가 없어.
          <br />
          아래 <strong>모델 재추출</strong> 한 번 돌리면 케미 점수·상대/나 비교 자동 채움.
        </div>
      </Card>
    )
  }

  const score = compat.score
  const scoreColor =
    score >= 70 ? 'text-accent' : score >= 45 ? 'text-text' : 'text-bad'

  return (
    <Card className="bg-gradient-to-br from-accent/10 to-accent-2/5 border-accent/30">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center shrink-0">
          <div className={`text-4xl font-black leading-none ${scoreColor}`}>
            {score}
          </div>
          <div className="text-[10px] text-muted mt-1">케미</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text leading-snug">
            {compat.headline || `${partnerName} 와의 관계`}
          </div>
          <div className="text-[10px] text-muted mt-0.5">
            모델 신뢰도 {confidenceOverall}%
          </div>
        </div>
      </div>

      {(compat.matches.length > 0 || compat.frictions.length > 0) && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <div className="text-[10px] font-semibold text-accent mb-1.5 tracking-wider">
              잘 맞는 점
            </div>
            <ul className="flex flex-col gap-1">
              {compat.matches.length === 0 ? (
                <li className="text-[11px] text-muted">—</li>
              ) : (
                compat.matches.map((m, i) => (
                  <li key={i} className="text-[11px] leading-snug">
                    · {m}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-bad mb-1.5 tracking-wider">
              안 맞는 점
            </div>
            <ul className="flex flex-col gap-1">
              {compat.frictions.length === 0 ? (
                <li className="text-[11px] text-muted">—</li>
              ) : (
                compat.frictions.map((m, i) => (
                  <li key={i} className="text-[11px] leading-snug">
                    · {m}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      <Link
        href="/"
        className="mt-4 inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-surface-2 hover:bg-accent/20 text-accent text-sm font-medium py-2.5 transition-colors"
      >
        <Sparkles size={14} /> 그래서 뭘 해야 할지 AI에게 물어보기
      </Link>
    </Card>
  )
}

function AnalysisBlock({
  title,
  oneLine,
  scores,
  tone,
}: {
  title: string
  oneLine: string
  scores: RelationshipModel['baseline']['axes']
  tone: 'accent' | 'accent-2'
}) {
  const headerClass = tone === 'accent' ? 'text-accent' : 'text-accent-2'
  const borderClass =
    tone === 'accent' ? 'border-accent/20' : 'border-accent-2/20'

  return (
    <Card className={borderClass}>
      <div className={`text-sm font-bold ${headerClass} mb-1`}>{title}</div>
      {oneLine ? (
        <div className="text-sm leading-relaxed mb-3 whitespace-pre-wrap">
          {oneLine}
        </div>
      ) : (
        <div className="text-[11px] text-muted mb-3">요약 없음</div>
      )}
      <RadarChart scores={scores} tone={tone} />
    </Card>
  )
}

import Link from 'next/link'
import {
  AXES,
  type Axis,
  type RelationshipModel,
} from '@/lib/db/schema'
import { Card } from '@/components/ui'
import { ExtractModelButton } from './ExtractModelButton'

const AXIS_LABEL: Record<Axis, string> = {
  proximity_push: '접근 / push',
  proximity_pull: '거리두기 / pull',
  emotion_open: '감정 공개',
  emotion_hide: '감정 숨김',
  commit_push: '관계 격상',
  commit_hold: '현상 유지',
  conflict_press: '갈등 표출',
  conflict_soothe: '갈등 완화',
}

export function ModelCard({
  relationshipId,
  model,
  partnerName,
}: {
  relationshipId: string
  model: RelationshipModel | null
  partnerName: string
}) {
  if (!model || !model.rules || model.rules.length === 0) {
    return (
      <Card className="border-dashed border-border">
        <div className="flex flex-col gap-3">
          <div className="text-xs text-muted uppercase tracking-wider">
            반응 모델 (Y = aX + b · 8축)
          </div>
          <div className="text-[11px] text-muted leading-relaxed">
            기록 탭에 카톡·사건 몇 개 쌓은 뒤 아래 &ldquo;모델 추출&rdquo; 누르면
            {partnerName} 의 <strong>8축 baseline + X→Y 규칙</strong> 이 자동 추정돼.
          </div>
          <ExtractModelButton relationshipId={relationshipId} hasModel={false} />
          <Link
            href={`/timeline?rel=${relationshipId}`}
            className="text-[11px] text-accent text-center hover:underline"
          >
            기록 탭으로 →
          </Link>
        </div>
      </Card>
    )
  }

  const sortedRules = [...model.rules].sort((a, b) => b.confidence - a.confidence)

  return (
    <div className="flex flex-col gap-3">
      <Card className="border-accent/30 bg-gradient-to-br from-accent/5 via-surface to-surface">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-xs text-muted uppercase tracking-wider">
            반응 모델 v{model.version}
          </div>
          <span className="text-[10px] text-muted font-mono">
            신뢰도 {model.confidenceOverall}% · 증거 {model.evidenceCount}
          </span>
        </div>

        {/* narrative (model 전체 축약) */}
        {model.narrative && (
          <div className="mb-3 text-[13px] leading-relaxed whitespace-pre-wrap">
            {model.narrative}
          </div>
        )}

        {/* Baseline 8축 */}
        <div className="mb-4">
          <div className="text-[10px] text-accent uppercase tracking-wider mb-2 font-semibold">
            b · {partnerName} 평상시 성향 (0~100)
          </div>
          <div className="flex flex-col gap-1.5">
            {AXES.map((ax) => {
              const v = model.baseline.axes[ax]
              return (
                <div key={ax} className="flex items-center gap-2">
                  <div className="text-[11px] text-muted w-24 shrink-0">
                    {AXIS_LABEL[ax]}
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="bg-accent h-full"
                      style={{ width: `${v}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-muted w-8 text-right">
                    {v}
                  </div>
                </div>
              )
            })}
          </div>
          {model.baseline.narrative && (
            <div className="mt-2 text-[11px] text-muted leading-relaxed whitespace-pre-wrap">
              {model.baseline.narrative}
            </div>
          )}
        </div>

        {/* Rules */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] text-accent uppercase tracking-wider font-semibold">
            a · 내가 X 하면 → 반응 Y
          </div>
          {sortedRules.map((r, i) => {
            const sign = r.intensity >= 0 ? '+' : ''
            const barPct = Math.abs(r.intensity)
            const barDirection = r.intensity >= 0 ? 'right' : 'left'
            return (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface-2 p-3"
              >
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <div className="text-[11px] font-mono text-muted">
                    관찰 {r.observations}회 · 신뢰 {r.confidence}%
                  </div>
                </div>
                <div className="text-[13px] leading-snug">
                  <span className="text-muted">내가 </span>
                  <span className="font-semibold text-accent-2">
                    {AXIS_LABEL[r.xAxis]}
                  </span>
                  <span className="text-muted"> → 상대 </span>
                  <span className="font-semibold text-accent">
                    {AXIS_LABEL[r.yAxis]}
                  </span>
                  <span
                    className={`ml-2 font-mono text-[11px] ${
                      r.intensity >= 0 ? 'text-good' : 'text-bad'
                    }`}
                  >
                    {sign}
                    {r.intensity}
                  </span>
                </div>
                {/* intensity 바 (양방향) */}
                <div className="mt-2 h-1 rounded-full bg-surface overflow-hidden relative">
                  <div
                    className={`absolute h-full ${
                      r.intensity >= 0 ? 'bg-good' : 'bg-bad'
                    }`}
                    style={{
                      width: `${barPct / 2}%`,
                      [barDirection === 'right' ? 'left' : 'right']: '50%',
                    }}
                  />
                  <div className="absolute top-0 left-1/2 w-px h-full bg-border" />
                </div>
                {/* 예시 */}
                {(r.examplesX[0] || r.examplesY[0]) && (
                  <details className="mt-2 text-[10px] text-muted group [&_summary::-webkit-details-marker]:hidden">
                    <summary className="cursor-pointer hover:text-accent">
                      <span className="group-open:rotate-90 inline-block transition-transform">
                        ▸
                      </span>{' '}
                      예시
                    </summary>
                    <div className="mt-1 pl-3 leading-relaxed">
                      {r.examplesX[0] && <div>X: &ldquo;{r.examplesX[0]}&rdquo;</div>}
                      {r.examplesY[0] && <div>Y: &ldquo;{r.examplesY[0]}&rdquo;</div>}
                    </div>
                  </details>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 text-[10px] text-muted text-center">
          마지막 업데이트 {new Date(model.updatedAt).toLocaleString('ko-KR')}
        </div>
      </Card>

      <ExtractModelButton relationshipId={relationshipId} hasModel={true} />

      <Link
        href="/"
        className="text-[11px] text-accent text-center hover:underline"
      >
        AI 탭에서 이 모델로 X 시뮬레이션 →
      </Link>
    </div>
  )
}

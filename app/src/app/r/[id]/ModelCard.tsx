import Link from 'next/link'
import type { RelationshipModel } from '@/lib/db/schema'
import { Card } from '@/components/ui'
import { ExtractModelButton } from './ExtractModelButton'

/**
 * Y = aX + b 모델 카드 — 관계 분석 메인.
 */
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
            반응 모델 (Y = aX + b)
          </div>
          <div className="text-[11px] text-muted leading-relaxed">
            기록 탭에 카톡·사건 몇 개 쌓은 뒤 아래 &ldquo;모델 추출&rdquo; 누르면
            {partnerName} 의 <strong>반응 패턴(a)</strong> 과{' '}
            <strong>평상시 톤(b)</strong> 을 자동 추정해.
          </div>
          <ExtractModelButton relationshipId={relationshipId} hasModel={false} />
          <Link
            href={`/timeline?rel=${relationshipId}`}
            className="text-[11px] text-accent text-center hover:underline"
          >
            기록 탭에서 먼저 쌓기 →
          </Link>
        </div>
      </Card>
    )
  }

  const topConfidence = model.rules[0]?.confidence ?? model.confidence
  const sortedRules = [...model.rules].sort((a, b) => b.confidence - a.confidence)

  return (
    <div className="flex flex-col gap-3">
      <Card className="border-accent/30 bg-gradient-to-br from-accent/5 via-surface to-surface">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-xs text-muted uppercase tracking-wider">
            반응 모델 (Y = aX + b)
          </div>
          <span className="text-[10px] text-muted font-mono">
            신뢰도 {model.confidence}% · 증거 {model.evidenceCount}
          </span>
        </div>

        {/* Baseline (b) */}
        {model.baseline && (
          <div className="mb-4">
            <div className="text-[10px] text-accent uppercase tracking-wider mb-1.5 font-semibold">
              b · {partnerName} 평상시 (baseline)
            </div>
            <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-text/90">
              {model.baseline}
            </div>
          </div>
        )}

        {/* Rules (a) */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] text-accent uppercase tracking-wider font-semibold">
            a · 내가 X 하면 {partnerName} 은
          </div>
          {sortedRules.map((r, i) => (
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
                <span className="font-semibold text-accent-2">{r.x}</span>
                <span className="text-muted"> → </span>
                <span className="font-semibold">{r.y}</span>
              </div>
              <div className="mt-2 h-1 rounded-full bg-surface overflow-hidden">
                <div
                  className="bg-accent h-full"
                  style={{ width: `${r.confidence}%` }}
                />
              </div>
            </div>
          ))}
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

export { ExtractModelButton } from './ExtractModelButton'

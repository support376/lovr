import type { Action } from '@/lib/db/schema'
import {
  parseStrategyBundle,
  fallbackSummary,
} from '@/lib/strategies/parse'
import { ActionFeedback } from './ActionFeedback'
import { SecondaryStrategyCard } from './SecondaryStrategyCard'

type Props = {
  action: Action
  relationshipId: string
  hasOutcome: boolean
}

/**
 * 관계 화면의 행동 영역.
 *   - Primary (1번) 만 전체 펼침. 타이밍 · 타이틀 · 메시지 초안 · [복사/보냄/패스] · 왜(접힘)
 *   - Secondary (2·3번) 은 축약 카드. 탭하면 확장.
 */
export function StrategyCards({ action, hasOutcome }: Props) {
  const { strategies } = parseStrategyBundle(action.content)

  if (strategies.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <details className="rounded-xl border border-border bg-surface/50 p-3 [&_summary::-webkit-details-marker]:hidden">
          <summary className="cursor-pointer list-none text-[11px] text-muted flex items-center gap-1">
            <span>▸</span>
            {new Date(action.createdAt).toLocaleDateString('ko-KR')} · 파싱 실패
            — 원문 보기
          </summary>
          <div className="mt-2 text-xs text-muted whitespace-pre-wrap leading-relaxed">
            {fallbackSummary(action.content, 2000)}
          </div>
        </details>
        <ActionFeedback
          actionId={action.id}
          status={action.status}
          hasOutcome={hasOutcome}
        />
      </div>
    )
  }

  const [primary, ...rest] = strategies

  return (
    <div className="flex flex-col gap-3">
      <PrimaryStrategyBlock
        strategy={primary}
        actionId={action.id}
        status={action.status}
        hasOutcome={hasOutcome}
      />

      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] text-muted uppercase tracking-wider px-1">
            다음 안
          </div>
          {rest.map((s) => (
            <SecondaryStrategyCard key={s.label} s={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function PrimaryStrategyBlock({
  strategy,
  actionId,
  status,
  hasOutcome,
}: {
  strategy: ReturnType<typeof parseStrategyBundle>['strategies'][number]
  actionId: string
  status: string
  hasOutcome: boolean
}) {
  const whyBody = [strategy.rationale, strategy.why].filter(Boolean).join('\n\n')

  return (
    <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 via-surface to-surface p-4 flex flex-col gap-3">
      {strategy.timing && (
        <div className="text-[11px] text-accent font-semibold">
          ⏱ {strategy.timing}
        </div>
      )}

      <div className="text-[17px] font-bold leading-snug">{strategy.title}</div>

      {strategy.messageDraft && (
        <div className="rounded-xl bg-surface-2 border border-border p-3">
          <div className="text-[10px] text-accent mb-1 uppercase">메시지 초안</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {strategy.messageDraft}
          </div>
        </div>
      )}

      <ActionFeedback
        actionId={actionId}
        status={status}
        hasOutcome={hasOutcome}
        messageDraft={strategy.messageDraft}
      />

      {whyBody && (
        <details className="group [&_summary::-webkit-details-marker]:hidden">
          <summary className="cursor-pointer list-none text-[11px] text-muted flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform">▸</span>
            왜 이 액션?
          </summary>
          <div className="mt-2 text-xs text-muted whitespace-pre-wrap leading-relaxed">
            {whyBody}
          </div>
        </details>
      )}
    </div>
  )
}

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

export function StrategyCards({ action, hasOutcome }: Props) {
  const { strategies } = parseStrategyBundle(action.content)

  if (strategies.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <details className="rounded-xl border border-border bg-surface/50 p-3 [&_summary::-webkit-details-marker]:hidden">
          <summary className="cursor-pointer list-none text-[11px] text-muted flex items-center gap-1">
            <span>▸</span>
            원문
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
    <div className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 via-surface to-surface p-5 flex flex-col gap-4">
      {strategy.timing && (
        <div className="inline-flex items-center self-start text-[11px] text-accent font-semibold px-2 py-0.5 rounded-full bg-accent/15">
          {strategy.timing}
        </div>
      )}

      <h2 className="text-2xl font-black tracking-tight leading-[1.15]">
        {strategy.title}
      </h2>

      {strategy.messageDraft && (
        <div className="rounded-xl bg-surface-2 border border-border p-4">
          <div className="text-[10px] text-accent mb-1.5 uppercase tracking-wider font-semibold">
            메시지
          </div>
          <div className="text-[15px] whitespace-pre-wrap leading-relaxed">
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
          <summary className="cursor-pointer list-none text-[11px] text-muted flex items-center gap-1 hover:text-accent">
            <span className="group-open:rotate-90 transition-transform">▸</span>
            왜
          </summary>
          <div className="mt-2 text-xs text-muted whitespace-pre-wrap leading-relaxed pl-3">
            {whyBody}
          </div>
        </details>
      )}
    </div>
  )
}

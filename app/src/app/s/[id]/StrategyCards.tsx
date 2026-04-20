import Link from 'next/link'
import { Card, Pill } from '@/components/ui'
import type { Action } from '@/lib/db/schema'
import {
  parseStrategyBundle,
  fallbackSummary,
  type ParsedStrategy,
} from '@/lib/strategies/parse'

type Props = {
  action: Action
  relationshipId: string
  hasOutcome: boolean
}

export function StrategyCards({ action, relationshipId, hasOutcome }: Props) {
  const { situation, strategies } = parseStrategyBundle(action.content)

  if (strategies.length === 0) {
    return (
      <Link href={`/s/${relationshipId}/action/${action.id}`}>
        <Card className="hover:border-accent/60 transition-colors">
          <div className="flex items-center gap-2 mb-1.5">
            <Pill tone={action.status === 'accepted' ? 'good' : 'accent'}>
              {action.status === 'accepted' ? '채택됨' : '제안됨'}
            </Pill>
            {hasOutcome && <Pill tone="neutral">결과 있음</Pill>}
            <span className="text-[10px] text-muted ml-auto">
              {new Date(action.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <div className="text-xs text-muted line-clamp-3 whitespace-pre-wrap leading-relaxed">
            {fallbackSummary(action.content)}
          </div>
        </Card>
      </Link>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 메타 + 상황 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span>
            {new Date(action.createdAt).toLocaleDateString('ko-KR')} 생성 ·{' '}
            {strategies.length}개 행동
          </span>
          <Link
            href={`/s/${relationshipId}/action/${action.id}`}
            className="ml-auto text-accent"
          >
            전체 보기 →
          </Link>
        </div>
        {situation && (
          <div className="rounded-xl bg-surface-2 border border-border px-3 py-2.5 text-xs leading-relaxed text-text whitespace-pre-wrap">
            <span className="text-muted text-[10px] mr-1.5 uppercase">상황</span>
            {situation}
          </div>
        )}
      </div>

      {/* 추천 행동 카드 */}
      {strategies.map((s) => (
        <StrategyCard key={s.label} s={s} />
      ))}
    </div>
  )
}

function StrategyCard({ s }: { s: ParsedStrategy }) {
  return (
    <Card className="hover:border-accent/40 transition-colors">
      <div className="flex items-start gap-2.5 mb-2">
        <div className="shrink-0 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">
          {s.label}
        </div>
        <div className="font-bold text-[15px] leading-snug text-text">
          {s.title}
        </div>
      </div>

      <div className="flex flex-col gap-2 pl-[34px]">
        {s.rationale && (
          <div className="text-xs leading-relaxed">
            <span className="text-muted text-[10px] uppercase mr-1.5">근거</span>
            <span className="text-text whitespace-pre-wrap">{s.rationale}</span>
          </div>
        )}
        {s.why && (
          <div className="text-xs leading-relaxed">
            <span className="text-accent text-[10px] uppercase mr-1.5">왜</span>
            <span className="text-text whitespace-pre-wrap">{s.why}</span>
          </div>
        )}
        {s.timing && (
          <div className="text-[11px] text-muted">
            <span className="mr-1">⏱</span>
            {s.timing}
          </div>
        )}
        {s.messageDraft && (
          <div className="mt-1 rounded-md bg-surface-2 border border-border p-2.5 text-xs leading-relaxed">
            <div className="text-[10px] text-accent mb-1 uppercase">메시지 초안</div>
            <div className="whitespace-pre-wrap text-text">{s.messageDraft}</div>
          </div>
        )}

        {/* 구포맷 호환 — steps만 있고 rationale/why 없는 경우 */}
        {!s.rationale && !s.why && s.steps && s.steps.length > 0 && (
          <ul className="text-xs text-text leading-relaxed space-y-0.5 list-disc pl-4">
            {s.steps.slice(0, 5).map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

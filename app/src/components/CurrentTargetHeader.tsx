import Link from 'next/link'
import { Settings } from 'lucide-react'
import {
  GOAL_LABEL,
  STATE_LABEL,
  type Actor,
  type Relationship,
  type RelationshipGoal,
  type RelationshipState,
} from '@/lib/db/schema'

/**
 * AI·기록·분석 상단 공통 — 현재 대상 + 상태 + 목적.
 * 읽기 전용. 탭하면 설정 탭으로 점프.
 */
export function CurrentTargetHeader({
  rel,
}: {
  rel: (Relationship & { partner: Actor }) | null
}) {
  if (!rel) {
    return (
      <div className="px-5 pt-3 pb-2">
        <Link
          href="/me?open=partner"
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-dashed border-border text-muted hover:border-accent/40 hover:text-accent"
        >
          <Settings size={11} /> 상대 등록 안 됨 · 설정에서 추가
        </Link>
      </div>
    )
  }

  const stateLabel =
    STATE_LABEL[rel.state as RelationshipState] ?? rel.state
  const goalLabel = rel.goal
    ? GOAL_LABEL[rel.goal as RelationshipGoal] ?? rel.goal
    : null

  return (
    <div className="px-5 pt-3 pb-2">
      <Link
        href="/me?open=partner"
        className="inline-flex items-center gap-1.5 text-[11px] hover:opacity-80"
      >
        <span className="font-semibold text-text">
          {rel.partner.displayName}
          {rel.partner.age ? (
            <span className="text-muted font-normal ml-0.5">
              ({rel.partner.age})
            </span>
          ) : null}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent font-medium">
          {stateLabel}
        </span>
        {goalLabel && (
          <span className="px-1.5 py-0.5 rounded bg-accent-2/15 text-accent-2 font-medium">
            {goalLabel}
          </span>
        )}
        <Settings size={10} className="text-muted ml-0.5" />
      </Link>
    </div>
  )
}

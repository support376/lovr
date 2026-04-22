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
 * AI·기록·분석 상단 공통 — 현재 대상 + 상태 + 목적 + 신뢰도 바.
 * 읽기 전용. 탭하면 설정 탭으로 점프.
 */
export function CurrentTargetHeader({
  rel,
}: {
  rel: (Relationship & { partner: Actor }) | null
}) {
  if (!rel) return null

  const stateLabel =
    STATE_LABEL[rel.state as RelationshipState] ?? rel.state
  const goalLabel = rel.goal
    ? GOAL_LABEL[rel.goal as RelationshipGoal] ?? rel.goal
    : null

  // 신뢰도 — 상대 명목 정보 4필드 중 채워진 개수.
  // 'partner placeholder 이름('상대')은 미채움 간주.
  const partnerIsPlaceholder = rel.partner.displayName === '상대'
  const fields = [
    partnerIsPlaceholder ? 0 : 1,
    rel.partner.age ? 1 : 0,
    rel.partner.occupation ? 1 : 0,
    rel.partner.rawNotes && rel.partner.rawNotes.length > 10 ? 1 : 0,
  ]
  const filled = fields.reduce((a, b) => a + b, 0)
  const pct = Math.round((filled / fields.length) * 100)

  const missing: string[] = []
  if (partnerIsPlaceholder) missing.push('상대 이름')
  if (!rel.partner.age) missing.push('나이')
  if (!rel.partner.occupation) missing.push('직업')
  if (!rel.partner.rawNotes || rel.partner.rawNotes.length <= 10)
    missing.push('상대 메모')

  return (
    <div className="px-5 pt-3 pb-2 flex flex-col gap-1.5">
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

      {pct < 100 && (
        <Link
          href="/me?open=partner"
          className="flex items-center gap-2 text-[10px] text-muted hover:text-accent"
        >
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-16 h-1 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full bg-accent/60 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <span className="truncate">
            {pct === 0
              ? '정보 더 주면 루바이가 더 정확해져'
              : `더 정확해지려면 · ${missing.slice(0, 2).join(' · ')}`}
          </span>
        </Link>
      )}
    </div>
  )
}

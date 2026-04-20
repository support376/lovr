import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Actor, Relationship } from '@/lib/db/schema'
import { STAGES, normalizeStage } from '@/lib/ontology'

type RelWithPartner = Relationship & { partner: Actor }

/**
 * 기록 탭 상단 상대 카드 스위처 — 가로 스크롤, snap, 탭으로 이동.
 * 끝에 '+ 상대 추가' 카드.
 */
export function TargetSwitcherCards({
  relationships,
  focusedId,
}: {
  relationships: RelWithPartner[]
  focusedId: string | null
}) {
  return (
    <div className="-mx-5 px-5 overflow-x-auto scrollbar-hide snap-x">
      <div className="flex gap-2 pb-1">
        {relationships.map((r) => {
          const active = r.id === focusedId
          const stageKo = STAGES[normalizeStage(r.progress)].ko
          const lastTs =
            r.updatedAt instanceof Date
              ? r.updatedAt.getTime()
              : Number(r.updatedAt)
          const daysSince = Math.max(
            0,
            Math.floor((Date.now() - lastTs) / 86400000)
          )
          const dateLabel =
            daysSince === 0 ? '오늘' : `${daysSince}일 전`

          return (
            <Link
              key={r.id}
              href={`/timeline?rel=${r.id}`}
              className={`snap-start shrink-0 w-40 rounded-2xl border p-3 flex flex-col gap-1.5 transition-colors ${
                active
                  ? 'border-accent/60 bg-accent/10'
                  : 'border-border bg-surface/60 hover:border-accent/40'
              }`}
            >
              <div className="flex items-baseline gap-1.5">
                <div
                  className={`text-base font-bold truncate ${
                    active ? 'text-accent' : 'text-text'
                  }`}
                >
                  {r.partner.displayName}
                </div>
                {r.partner.age && (
                  <div className="text-xs text-muted font-medium">
                    {r.partner.age}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                <span
                  className={`px-1.5 py-0.5 rounded font-medium ${
                    active
                      ? 'bg-accent/25 text-accent'
                      : 'bg-surface-2 text-muted'
                  }`}
                >
                  {stageKo}
                </span>
                {r.partner.mbti && (
                  <span className="font-mono text-muted">
                    {r.partner.mbti}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted mt-auto">
                기록 {dateLabel}
              </div>
            </Link>
          )
        })}

        <Link
          href="/r/new"
          className="snap-start shrink-0 w-32 rounded-2xl border border-dashed border-border bg-surface/30 flex flex-col items-center justify-center gap-1 text-muted hover:border-accent hover:text-accent transition-colors p-3"
        >
          <Plus size={18} />
          <div className="text-xs font-medium">상대 추가</div>
        </Link>
      </div>
    </div>
  )
}

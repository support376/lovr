'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Actor, Relationship } from '@/lib/db/schema'
import { setFocusRelationship } from '@/lib/actions/focus'

type RelWithPartner = Relationship & { partner: Actor }

const STAGE_KO: Record<string, string> = {
  unknown: '판단 불가',
  observing: '관찰 중',
  approaching: '다가가는 중',
  exploring: '서로 탐색',
  exclusive: '독점 직전',
  committed: '공식 연인',
  decayed: '식어감',
  ended: '종료',
  pre_match: '매칭 전',
  first_contact: '첫 접촉',
  sseom: '썸',
  dating_early: '연애 초기',
  dating_stable: '연애 안정',
  conflict: '갈등',
  reconnection: '재연결',
}

/**
 * 탭 공통 상대 스위처. 가로 스크롤 snap 카드.
 *   relationships: 전체 상대 리스트
 *   currentId: 지금 선택된 상대 (active highlight)
 *   buildHref: 선택 시 이동할 URL (각 탭이 제공)
 * 카드 탭 → focus cookie 업데이트 + buildHref(id) 로 navigate.
 */
export function TargetSwitcher({
  relationships,
  currentId,
  buildHref,
}: {
  relationships: RelWithPartner[]
  currentId: string | null
  buildHref: (id: string) => string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const select = (id: string) => {
    if (id === currentId || pending) return
    start(async () => {
      await setFocusRelationship(id)
      router.push(buildHref(id))
    })
  }

  return (
    <div className="-mx-5 px-5 overflow-x-auto scrollbar-hide snap-x">
      <div className="flex gap-2 pb-1">
        {relationships.map((r) => {
          const active = r.id === currentId
          const stageKo = STAGE_KO[r.progress] ?? r.progress
          const lastTs =
            r.updatedAt instanceof Date
              ? r.updatedAt.getTime()
              : Number(r.updatedAt)
          const daysSince = Math.max(
            0,
            Math.floor((Date.now() - lastTs) / 86400000)
          )
          const dateLabel = daysSince === 0 ? '오늘' : `${daysSince}일 전`

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => select(r.id)}
              disabled={pending}
              className={`snap-start shrink-0 w-40 rounded-2xl border p-3 flex flex-col gap-1.5 text-left transition-colors ${
                active
                  ? 'border-accent/60 bg-accent/10'
                  : 'border-border bg-surface/60 hover:border-accent/40'
              } ${pending ? 'opacity-60' : ''}`}
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
                {dateLabel}
              </div>
            </button>
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

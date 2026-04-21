'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Actor, Relationship } from '@/lib/db/schema'
import { setFocusRelationship } from '@/lib/actions/focus'

type RelWithPartner = Relationship & { partner: Actor }

/**
 * 라우팅 규칙 — 직렬화 가능한 값만. (server → client 경계 통과)
 *   kind='path'    : `${base}/${id}`         e.g. /r/<id>, /s/<id>
 *   kind='query'   : `${base}?${param}=${id}` e.g. /timeline?rel=<id>
 *   kind='refresh' : 같은 경로로 refresh 만      e.g. AI 홈
 */
export type SwitcherRoute =
  | { kind: 'path'; base: string }
  | { kind: 'query'; base: string; param: string }
  | { kind: 'refresh' }

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

export function TargetSwitcher({
  relationships,
  currentId,
  route,
}: {
  relationships: RelWithPartner[]
  currentId: string | null
  route: SwitcherRoute
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const hrefFor = (id: string): string | null => {
    if (route.kind === 'path') return `${route.base}/${id}`
    if (route.kind === 'query') return `${route.base}?${route.param}=${id}`
    return null
  }

  const select = (id: string) => {
    if (id === currentId || pending) return
    start(async () => {
      await setFocusRelationship(id)
      const href = hrefFor(id)
      if (href) router.push(href)
      else router.refresh()
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
                {r.partner.occupation && (
                  <span className="text-muted truncate max-w-[80px]">
                    {r.partner.occupation}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted mt-auto">{dateLabel}</div>
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

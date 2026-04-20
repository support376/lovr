'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { updateRelationship } from '@/lib/actions/relationships'
import {
  STAGES,
  STAGE_ORDER,
  normalizeStage,
  type StageKey,
} from '@/lib/ontology'

/**
 * Stage 퀵 에디터 — 관계 탭 메인에 inline 으로 떠 있음.
 * 탭하면 5단계 드롭다운. 선택 즉시 updateRelationship.
 * 관계가 시간 따라 변하므로(탐색 → 초기 → 안정), 접근성 최우선.
 */
export function StagePicker({
  relationshipId,
  current,
}: {
  relationshipId: string
  current: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()
  const ref = useRef<HTMLDivElement | null>(null)

  const currentKey = normalizeStage(current)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const select = (k: StageKey) => {
    if (k === currentKey) {
      setOpen(false)
      return
    }
    start(async () => {
      try {
        await updateRelationship(relationshipId, { progress: k } as never)
        setOpen(false)
        router.refresh()
      } catch (e) {
        console.error('[StagePicker]', e)
        setOpen(false)
      }
    })
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border bg-surface-2 hover:border-accent/40 disabled:opacity-60"
      >
        <span className="text-muted">단계</span>
        <span className="text-accent font-medium">
          {STAGES[currentKey].ko}
        </span>
        <span className="text-muted">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-64 rounded-xl border border-border bg-surface shadow-lg p-1">
          {STAGE_ORDER.map((k) => {
            const s = STAGES[k]
            const active = k === currentKey
            return (
              <button
                key={k}
                type="button"
                onClick={() => select(k)}
                disabled={pending}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'hover:bg-surface-2 text-text'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{s.ko}</div>
                    <div className="text-[10px] text-muted mt-0.5 leading-relaxed">
                      {s.hint}
                    </div>
                  </div>
                  {active && (
                    <Check size={12} className="text-accent mt-1 shrink-0" />
                  )}
                </div>
              </button>
            )
          })}
          <div className="px-3 py-1.5 text-[10px] text-muted border-t border-border mt-1">
            단계를 바꾸면 선택 가능한 목표도 자동으로 달라짐.
          </div>
        </div>
      )}
    </div>
  )
}

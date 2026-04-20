'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { createGoalAction } from '@/lib/actions/coach'
import type { Goal } from '@/lib/db/schema'
import {
  GOALS,
  ALLOWED_GOALS_BY_STAGE,
  normalizeStage,
  type GoalKey,
} from '@/lib/ontology'

/**
 * Goal 퀵 에디터 — StagePicker 와 동일한 inline dropdown.
 * 현재 stage 에 허용된 goal 만 노출. 선택 즉시 이전 활성 goal deprecate +
 * 새 goal primary 로 생성 (단일 활성 goal 정책).
 */
export function GoalPicker({
  relationshipId,
  partnerId,
  stage,
  currentGoalCategory,
}: {
  relationshipId: string
  partnerId: string
  stage: string
  currentGoalCategory: string | null
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()
  const ref = useRef<HTMLDivElement | null>(null)

  const stageKey = useMemo(() => normalizeStage(stage), [stage])
  const options = useMemo<GoalKey[]>(
    () => ALLOWED_GOALS_BY_STAGE[stageKey],
    [stageKey]
  )

  const currentLabel =
    currentGoalCategory && currentGoalCategory in GOALS
      ? GOALS[currentGoalCategory as GoalKey].ko
      : null

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const select = (k: GoalKey) => {
    if (k === currentGoalCategory) {
      setOpen(false)
      return
    }
    setErr(null)
    start(async () => {
      try {
        const r = await createGoalAction({
          relationshipId,
          partnerId,
          category: k as Goal['category'],
        })
        if (r.ethicsStatus === 'blocked') {
          setErr(r.reasons[0] ?? '생성 불가')
          return
        }
        setOpen(false)
        router.refresh()
      } catch (e) {
        console.error('[GoalPicker]', e)
        setErr((e as Error).message || '저장 실패')
      }
    })
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="inline-flex items-center gap-2 text-sm px-3.5 py-2 rounded-xl border border-border bg-surface-2 hover:border-accent/40 disabled:opacity-60"
      >
        <span className="text-[10px] text-muted uppercase tracking-wider">
          목표
        </span>
        <span
          className={
            currentLabel ? 'text-accent font-bold' : 'text-muted font-medium'
          }
        >
          {currentLabel ?? '미설정'}
        </span>
        <span className="text-muted text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-64 rounded-xl border border-border bg-surface shadow-lg p-1">
          {options.map((k) => {
            const g = GOALS[k]
            const active = k === currentGoalCategory
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
                    <div className="font-semibold">{g.ko}</div>
                    <div className="text-[10px] text-muted mt-0.5 leading-relaxed">
                      {g.hint}
                    </div>
                  </div>
                  {active && (
                    <Check size={12} className="text-accent mt-1 shrink-0" />
                  )}
                </div>
              </button>
            )
          })}
          {err && (
            <div className="text-[11px] text-bad bg-bad/10 border-t border-bad/30 px-3 py-2 whitespace-pre-wrap">
              {err}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

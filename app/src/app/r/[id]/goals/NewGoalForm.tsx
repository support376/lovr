'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Card } from '@/components/ui'
import { createGoalAction } from '@/lib/actions/coach'
import type { Goal } from '@/lib/db/schema'
import {
  GOALS,
  ALLOWED_GOALS_BY_STAGE,
  STAGES,
  normalizeStage,
  type GoalKey,
} from '@/lib/ontology'

/**
 * Stage 에 맞는 goal 버튼 리스트.
 * 누르면 이전 활성 goal deprecate + 새 goal primary 로 생성.
 * priority/description 개념 없음 — 단일 활성 goal 원칙.
 */
export function NewGoalForm({
  relationshipId,
  partnerId,
  stage,
  currentGoalKey,
}: {
  relationshipId: string
  partnerId: string
  stage: string
  currentGoalKey: string | null
}) {
  const stageKey = useMemo(() => normalizeStage(stage), [stage])
  const options = useMemo<GoalKey[]>(
    () => ALLOWED_GOALS_BY_STAGE[stageKey],
    [stageKey]
  )
  const [pending, start] = useTransition()
  const [selecting, setSelecting] = useState<GoalKey | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<string[] | null>(null)
  const router = useRouter()

  const choose = (k: GoalKey) => {
    if (k === currentGoalKey) return
    setErr(null)
    setBlocked(null)
    setSelecting(k)
    start(async () => {
      try {
        const r = await createGoalAction({
          relationshipId,
          partnerId,
          category: k as Goal['category'],
        })
        if (r.ethicsStatus === 'blocked') {
          setBlocked(r.reasons)
          setSelecting(null)
          return
        }
        router.push(`/r/${relationshipId}`)
      } catch (e) {
        console.error('[createGoalAction]', e)
        setErr((e as Error).message || '저장 실패')
        setSelecting(null)
      }
    })
  }

  return (
    <Card>
      <div className="flex flex-col gap-2">
        <div className="text-[11px] text-muted mb-1">
          단계:{' '}
          <span className="text-accent font-medium">{STAGES[stageKey].ko}</span>
        </div>
        {options.map((k) => {
          const g = GOALS[k]
          const active = k === currentGoalKey
          const loading = selecting === k && pending
          return (
            <button
              key={k}
              type="button"
              onClick={() => choose(k)}
              disabled={pending}
              className={`text-left rounded-xl border p-3 transition-colors ${
                active
                  ? 'bg-accent/15 border-accent/50'
                  : 'bg-surface-2 border-border hover:border-accent/40'
              } ${pending && !loading ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    {g.ko}
                    {active && (
                      <Check size={12} className="text-accent" />
                    )}
                    {loading && (
                      <span className="text-[10px] text-muted">저장…</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {g.hint}
                  </div>
                </div>
              </div>
            </button>
          )
        })}

        {blocked && (
          <div className="text-xs rounded-lg p-2 border bg-bad/10 border-bad/30 text-bad">
            <div className="font-semibold mb-1">생성 불가</div>
            {blocked.map((r, i) => (
              <div key={i}>· {r}</div>
            ))}
          </div>
        )}
        {err && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2">
            {err}
          </div>
        )}
      </div>
    </Card>
  )
}

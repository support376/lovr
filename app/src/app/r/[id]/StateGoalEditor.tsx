'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateRelationship } from '@/lib/actions/relationships'
import {
  ALLOWED_GOALS_BY_STATE,
  GOAL_LABEL,
  STATE_LABEL,
  type RelationshipGoal,
  type RelationshipState,
} from '@/lib/db/schema'

const STATES: RelationshipState[] = [
  'exploring',
  'dating',
  'serious',
  'struggling',
  'ended',
]

export function StateGoalEditor({
  relationshipId,
  state: initialState,
  goal: initialGoal,
}: {
  relationshipId: string
  state: RelationshipState
  goal: RelationshipGoal | null
}) {
  const [state, setState] = useState<RelationshipState>(initialState)
  const [goal, setGoal] = useState<RelationshipGoal | null>(initialGoal)
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const saveState = (next: RelationshipState) => {
    if (next === state) return
    setErr(null)
    // state 바뀌면 기존 goal 이 새 state 에서 유효한지 확인, 아니면 null
    const allowed = ALLOWED_GOALS_BY_STATE[next]
    const nextGoal = goal && allowed.includes(goal) ? goal : null
    setState(next)
    setGoal(nextGoal)
    start(async () => {
      try {
        await updateRelationship(relationshipId, {
          state: next,
          goal: nextGoal,
        } as never)
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  const saveGoal = (next: RelationshipGoal | null) => {
    if (next === goal) return
    setErr(null)
    setGoal(next)
    start(async () => {
      try {
        await updateRelationship(relationshipId, { goal: next } as never)
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  const allowedGoals = ALLOWED_GOALS_BY_STATE[state]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted uppercase tracking-wider w-10 shrink-0">
          상태
        </span>
        <div className="flex-1 flex gap-1 flex-wrap">
          {STATES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => saveState(s)}
              disabled={pending}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                state === s
                  ? 'bg-accent/15 border-accent/50 text-accent'
                  : 'bg-surface-2 border-border text-muted hover:border-accent/40'
              }`}
            >
              {STATE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted uppercase tracking-wider w-10 shrink-0">
          목적
        </span>
        <div className="flex-1 flex gap-1 flex-wrap">
          {allowedGoals.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => saveGoal(g)}
              disabled={pending}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                goal === g
                  ? 'bg-accent-2/15 border-accent-2/50 text-accent-2'
                  : 'bg-surface-2 border-border text-muted hover:border-accent-2/40'
              }`}
            >
              {GOAL_LABEL[g]}
            </button>
          ))}
          {goal && (
            <button
              type="button"
              onClick={() => saveGoal(null)}
              disabled={pending}
              className="px-2 py-1 rounded-full text-[10px] text-muted hover:text-bad"
            >
              ✕ 해제
            </button>
          )}
        </div>
      </div>

      {err && (
        <div className="text-[11px] text-bad bg-bad/10 border border-bad/30 rounded-lg p-2">
          {err}
        </div>
      )}
    </div>
  )
}

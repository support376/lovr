'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { createGoalAction } from '@/lib/actions/coach'
import {
  GOALS,
  ALLOWED_GOALS_BY_STAGE,
  STAGES,
  normalizeStage,
  type GoalKey,
} from '@/lib/ontology'
import type { Goal } from '@/lib/db/schema'

export function InlineGoalForm({
  relationshipId,
  partnerId,
  stage,
}: {
  relationshipId: string
  partnerId: string
  stage: string
}) {
  const stageKey = useMemo(() => normalizeStage(stage), [stage])
  const options = useMemo<GoalKey[]>(
    () => ALLOWED_GOALS_BY_STAGE[stageKey],
    [stageKey]
  )
  const [category, setCategory] = useState<GoalKey>(options[0])
  const [desc, setDesc] = useState('')
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const submit = () => {
    setErr(null)
    start(async () => {
      try {
        const r = await createGoalAction({
          relationshipId,
          partnerId,
          category: category as Goal['category'],
          description: desc.trim() || GOALS[category].ko,
          priority: 'primary',
        })
        if (r.ethicsStatus === 'blocked') {
          setErr(r.reasons[0] ?? '생성 불가')
          return
        }
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <Card className="border-accent/30">
      <div className="flex flex-col gap-2">
        <div className="text-[11px] text-muted">
          단계: <span className="text-accent font-medium">{STAGES[stageKey].ko}</span>
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as GoalKey)}
          className="rounded-lg bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none focus:border-accent"
        >
          {options.map((k) => (
            <option key={k} value={k}>
              {GOALS[k].ko} — {GOALS[k].hint}
            </option>
          ))}
        </select>
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="(선택) 세부 메모"
          className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent"
        />
        {err && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2">
            {err}
          </div>
        )}
        <Button onClick={submit} disabled={pending}>
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </Card>
  )
}

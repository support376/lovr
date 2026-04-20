'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, TextArea } from '@/components/ui'
import { createGoalAction } from '@/lib/actions/coach'
import type { Goal } from '@/lib/db/schema'
import {
  GOALS,
  ALLOWED_GOALS_BY_STAGE,
  STAGES,
  normalizeStage,
  type GoalKey,
} from '@/lib/ontology'

export function NewGoalForm({
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
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'primary' | 'secondary'>('primary')
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{
    status: string
    reasons: string[]
  } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const submit = () => {
    setErr(null)
    setResult(null)
    start(async () => {
      try {
        const r = await createGoalAction({
          relationshipId,
          partnerId,
          category: category as Goal['category'],
          description: description.trim() || GOALS[category].ko,
          priority,
        })
        setResult({ status: r.ethicsStatus, reasons: r.reasons })
        setDescription('')
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-col gap-3"
      >
        <div className="text-[11px] text-muted leading-relaxed">
          현재 단계: <span className="text-accent font-medium">{STAGES[stageKey].ko}</span>
          {' · '}이 단계에서 의미 있는 목표만 선택 가능.
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted">목표</span>
          <div className="flex flex-col gap-1.5">
            {options.map((k) => {
              const g = GOALS[k]
              const active = category === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setCategory(k)}
                  className={`text-left rounded-xl border p-3 transition-colors ${
                    active
                      ? 'bg-accent/10 border-accent/40'
                      : 'bg-surface-2 border-border'
                  }`}
                >
                  <div className="text-sm font-semibold">{g.ko}</div>
                  <div className="text-[11px] text-muted mt-0.5">{g.hint}</div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setPriority('primary')}
            className={`flex-1 py-2 rounded-lg border ${
              priority === 'primary'
                ? 'bg-accent/15 border-accent/40 text-accent'
                : 'bg-surface-2 border-border text-muted'
            }`}
          >
            primary
          </button>
          <button
            type="button"
            onClick={() => setPriority('secondary')}
            className={`flex-1 py-2 rounded-lg border ${
              priority === 'secondary'
                ? 'bg-accent/15 border-accent/40 text-accent'
                : 'bg-surface-2 border-border text-muted'
            }`}
          >
            secondary
          </button>
        </div>

        <TextArea
          label="설명 — 구체적 서술 (선택)"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="3개월 내 연인 관계 확정. 신뢰 기반 깊은 대화 루틴 구축."
        />

        {result && result.status === 'blocked' && (
          <div className="text-xs rounded-lg p-2 border bg-bad/10 border-bad/30 text-bad">
            <div className="font-semibold mb-1">생성 불가</div>
            {result.reasons.map((r, i) => (
              <div key={i}>· {r}</div>
            ))}
          </div>
        )}
        {err && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2">
            {err}
          </div>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? '저장 중…' : '저장'}
        </Button>
      </form>
    </Card>
  )
}

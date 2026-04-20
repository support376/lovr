'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Pill, TextArea } from '@/components/ui'
import { proposeStrategyAction } from '@/lib/actions/coach'
import type { Goal } from '@/lib/db/schema'

export function ProposeForm({
  relationshipId,
  goals,
}: {
  relationshipId: string
  goals: Goal[]
}) {
  const [goalId, setGoalId] = useState<string>(goals[0]?.id ?? '')
  const [situation, setSituation] = useState('')
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{
    actionId: string
    markdown: string
    ethicsStatus: string
  } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const submit = () => {
    if (!goalId || !situation.trim()) return
    setErr(null)
    setResult(null)
    start(async () => {
      try {
        const r = await proposeStrategyAction({
          relationshipId,
          goalId,
          currentSituation: situation.trim(),
        })
        if (!r.ok) {
          setErr(`${r.error}${r.where ? `\n@ ${r.where}` : ''}`)
          return
        }
        setResult({
          actionId: r.actionId,
          markdown: r.markdown,
          ethicsStatus: r.ethicsStatus,
        })
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="text-xs text-muted mb-2">목표 선택</div>
        <div className="flex flex-col gap-1.5">
          {goals.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGoalId(g.id)}
              className={`text-left rounded-xl border p-3 transition-colors ${
                goalId === g.id
                  ? 'bg-accent/10 border-accent/40'
                  : 'bg-surface-2 border-border'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Pill tone="accent">{g.category}</Pill>
              </div>
              <div className="mt-1 text-sm line-clamp-2">{g.description}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <TextArea
          label="지금 상황 — 자연어"
          rows={8}
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          placeholder={`예:\n- 최근 3일 답장 느려짐\n- 지난 주말 만나기로 한 거 상대가 미룬 상태\n- 이번 주 안에 만남 성사 시키려면 어떻게?`}
        />
      </Card>

      {err && (
        <Card className="border-bad/40 bg-bad/5">
          <div className="text-sm text-bad whitespace-pre-wrap">{err}</div>
        </Card>
      )}

      {!result && (
        <Button
          onClick={submit}
          disabled={pending || !goalId || !situation.trim()}
        >
          {pending ? 'LLM 호출 중 (15~30초)…' : '전략 3안 받기'}
        </Button>
      )}

      {result && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Pill tone="good">저장됨</Pill>
          </div>
          <div className="prose prose-invert max-w-none text-sm whitespace-pre-wrap leading-relaxed">
            {result.markdown}
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => router.push(`/r/${relationshipId}/action/${result.actionId}`)}
              className="flex-1"
            >
              상세로 이동
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setResult(null)
                setSituation('')
              }}
              className="flex-1"
            >
              새로 제안 받기
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

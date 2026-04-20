'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, MessageSquare } from 'lucide-react'
import {
  markActionCancelledAction,
  markActionExecutedAction,
  recordManualOutcomeAction,
} from '@/lib/actions/coach'

type Progress = 'advanced' | 'stagnant' | 'regressed' | 'unclear'

const PROGRESS_OPTIONS: Array<{ v: Progress; l: string; tone: string }> = [
  { v: 'advanced', l: '진전', tone: 'text-good' },
  { v: 'stagnant', l: '정체', tone: 'text-muted' },
  { v: 'regressed', l: '후퇴', tone: 'text-bad' },
  { v: 'unclear', l: '불명', tone: 'text-muted' },
]

/**
 * Action closed-loop 3버튼.
 * - 했음: executed 처리 (outcome 은 선택적으로 나중에)
 * - 안 했음: cancelled 처리
 * - 결과: 진행도 + narrative 입력 → outcome 기록
 */
export function ActionFeedback({
  actionId,
  status,
  hasOutcome,
}: {
  actionId: string
  status: string
  hasOutcome: boolean
}) {
  const [mode, setMode] = useState<'idle' | 'outcome'>('idle')
  const [progress, setProgress] = useState<Progress>('advanced')
  const [narrative, setNarrative] = useState('')
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const settled =
    status === 'executed' || status === 'cancelled' || hasOutcome

  const done = (fn: () => Promise<unknown>) => {
    setErr(null)
    start(async () => {
      try {
        await fn()
        setMode('idle')
        setNarrative('')
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  if (mode === 'outcome') {
    return (
      <div className="flex flex-col gap-2 p-3 rounded-xl border border-accent/30 bg-accent/5">
        <div className="text-xs text-muted">결과 기록</div>
        <div className="flex gap-1.5 flex-wrap">
          {PROGRESS_OPTIONS.map((p) => (
            <button
              key={p.v}
              type="button"
              onClick={() => setProgress(p.v)}
              disabled={pending}
              className={`text-xs px-2.5 py-1.5 rounded-full border ${
                progress === p.v
                  ? 'bg-accent/15 border-accent/50 text-accent'
                  : 'bg-surface-2 border-border text-muted'
              }`}
            >
              {p.l}
            </button>
          ))}
        </div>
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          rows={3}
          placeholder="상대 반응·느낌·관찰. 한 줄이라도 OK."
          className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent resize-none"
        />
        {err && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2">
            {err}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('idle')}
            disabled={pending}
            className="flex-1 py-2 text-xs rounded-lg border border-border text-muted"
          >
            취소
          </button>
          <button
            type="button"
            disabled={pending || !narrative.trim()}
            onClick={() =>
              done(() =>
                recordManualOutcomeAction({
                  actionId,
                  narrative: narrative.trim(),
                  goalProgress: progress,
                })
              )
            }
            className="flex-1 py-2 text-xs rounded-lg bg-accent text-white font-semibold disabled:opacity-60"
          >
            {pending ? '저장…' : '기록'}
          </button>
        </div>
      </div>
    )
  }

  if (settled) {
    const badge =
      status === 'executed' && hasOutcome
        ? '실행 + 결과 기록됨'
        : status === 'executed'
        ? '실행됨 · 결과 미기록'
        : status === 'cancelled'
        ? '안 함'
        : hasOutcome
        ? '결과 기록됨'
        : '완료'
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <span>· {badge}</span>
        {!hasOutcome && status === 'executed' && (
          <button
            type="button"
            onClick={() => setMode('outcome')}
            className="text-accent hover:underline"
          >
            결과 기록
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] text-muted">실행했어?</div>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => done(() => markActionExecutedAction(actionId))}
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-good/40 bg-good/5 text-good text-xs font-semibold hover:bg-good/10 disabled:opacity-60"
        >
          <Check size={14} /> 했음
        </button>
        <button
          type="button"
          onClick={() => done(() => markActionCancelledAction(actionId))}
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border bg-surface-2 text-muted text-xs font-semibold hover:bg-surface-3 disabled:opacity-60"
        >
          <X size={14} /> 안 했음
        </button>
        <button
          type="button"
          onClick={() => setMode('outcome')}
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-accent/40 bg-accent/5 text-accent text-xs font-semibold hover:bg-accent/10 disabled:opacity-60"
        >
          <MessageSquare size={14} /> 결과
        </button>
      </div>
      {err && (
        <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2">
          {err}
        </div>
      )}
    </div>
  )
}

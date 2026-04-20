'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Copy, CheckCheck } from 'lucide-react'
import {
  markActionCancelledAction,
  recordManualOutcomeAction,
} from '@/lib/actions/coach'

type Progress = 'advanced' | 'stagnant' | 'regressed' | 'unclear'

const PROGRESS_OPTIONS: Array<{ v: Progress; l: string }> = [
  { v: 'advanced', l: '진전' },
  { v: 'stagnant', l: '정체' },
  { v: 'regressed', l: '후퇴' },
  { v: 'unclear', l: '불명' },
]

/**
 * Primary Action closed-loop 버튼 행.
 *   - 복사: messageDraft clipboard
 *   - 보냄: 결과 입력 폼 노출 (executed + outcome)
 *   - 패스: cancelled
 */
export function ActionFeedback({
  actionId,
  status,
  hasOutcome,
  messageDraft,
}: {
  actionId: string
  status: string
  hasOutcome: boolean
  messageDraft?: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [mode, setMode] = useState<'idle' | 'outcome'>('idle')
  const [progress, setProgress] = useState<Progress>('advanced')
  const [narrative, setNarrative] = useState('')
  const [copied, setCopied] = useState(false)

  const run = (fn: () => Promise<unknown>) => {
    setErr(null)
    start(async () => {
      try {
        await fn()
        setMode('idle')
        setNarrative('')
        router.refresh()
      } catch (e) {
        console.error('[ActionFeedback]', e)
        setErr((e as Error).message || '저장 실패')
      }
    })
  }

  const copyMsg = async () => {
    if (!messageDraft) return
    try {
      await navigator.clipboard.writeText(messageDraft)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch (e) {
      console.error('[copy]', e)
    }
  }

  const executed = status === 'executed'
  const cancelled = status === 'cancelled'
  const settled = executed || cancelled || hasOutcome

  if (mode === 'outcome') {
    return (
      <div className="flex flex-col gap-2 p-3 rounded-xl border border-accent/30 bg-accent/5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-accent">결과 기록</div>
          <button
            type="button"
            onClick={() => setMode('idle')}
            disabled={pending}
            className="text-[11px] text-muted hover:text-accent"
          >
            닫기
          </button>
        </div>
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
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2 whitespace-pre-wrap">
            {err}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => run(() => recordManualOutcomeAction({ actionId, narrative: '(기록 생략)', goalProgress: 'unclear' }))}
            disabled={pending}
            className="flex-1 py-2 text-xs rounded-lg border border-border text-muted disabled:opacity-60"
          >
            나중에
          </button>
          <button
            type="button"
            disabled={pending || !narrative.trim()}
            onClick={() =>
              run(() =>
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
    const label = cancelled
      ? '· 패스됨'
      : hasOutcome
      ? '· 보냄 + 결과 기록됨'
      : '· 보냄'
    return (
      <div className="flex items-center justify-between text-[11px] text-muted px-1">
        <span>{label}</span>
        {executed && !hasOutcome && (
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
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={copyMsg}
          disabled={pending || !messageDraft}
          className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border bg-surface-2 text-xs font-semibold disabled:opacity-40 hover:border-accent/40"
        >
          {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
          {copied ? '복사됨' : '복사'}
        </button>
        <button
          type="button"
          onClick={() => setMode('outcome')}
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-good/40 bg-good/5 text-good text-xs font-semibold hover:bg-good/10 disabled:opacity-60"
        >
          <Check size={14} /> 보냄
        </button>
        <button
          type="button"
          onClick={() => run(() => markActionCancelledAction(actionId))}
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border bg-surface-2 text-muted text-xs font-semibold hover:bg-surface-3 disabled:opacity-60"
        >
          <X size={14} /> 패스
        </button>
      </div>
      {err && (
        <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2 whitespace-pre-wrap">
          {err}
        </div>
      )}
    </div>
  )
}

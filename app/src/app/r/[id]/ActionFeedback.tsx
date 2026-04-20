'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, CheckCheck } from 'lucide-react'
import { markActionExecutedAction } from '@/lib/actions/coach'

/**
 * Primary Action 피드백 — '보냄' 토글 1개만.
 *   - 미실행: [복사] [보냄]
 *   - 실행됨: 배지 + [취소]? 취소 없이 유지 (append-only 느낌)
 */
export function ActionFeedback({
  actionId,
  status,
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
  const [copied, setCopied] = useState(false)

  const executed = status === 'executed'

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

  const markExecuted = () => {
    setErr(null)
    start(async () => {
      try {
        await markActionExecutedAction(actionId)
        router.refresh()
      } catch (e) {
        console.error('[ActionFeedback]', e)
        setErr((e as Error).message || '저장 실패')
      }
    })
  }

  if (executed) {
    return (
      <div className="flex items-center justify-between text-[11px] text-muted px-1">
        <span className="inline-flex items-center gap-1 text-good">
          <Check size={12} /> 보냄
        </span>
        {messageDraft && (
          <button
            type="button"
            onClick={copyMsg}
            className="inline-flex items-center gap-1 text-muted hover:text-accent"
          >
            {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
            {copied ? '복사됨' : '메시지 복사'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
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
          onClick={markExecuted}
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-good/40 bg-good/5 text-good text-xs font-semibold hover:bg-good/10 disabled:opacity-60"
        >
          <Check size={14} /> {pending ? '저장…' : '보냄'}
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

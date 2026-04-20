'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import {
  analyzeOutcomeAction,
  markActionExecutedAction,
} from '@/lib/actions/coach'

export function ActionControls({
  actionId,
  status,
  hasOutcome,
  blocked,
}: {
  actionId: string
  status: string
  hasOutcome: boolean
  blocked: boolean
}) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const router = useRouter()

  const markExecuted = () => {
    start(async () => {
      try {
        await markActionExecutedAction(actionId)
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  const analyze = () => {
    start(async () => {
      try {
        await analyzeOutcomeAction(actionId, note.trim() || undefined)
        setNote('')
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  if (blocked) {
    return (
      <Card className="border-bad/40 bg-bad/5">
        <div className="text-sm text-bad">이 전략은 실행·분석 불가.</div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex flex-col gap-2">
        <div className="text-xs text-muted">라이프사이클</div>
        {status !== 'executed' ? (
          <Button onClick={markExecuted} disabled={pending} className="w-full">
            {pending ? '…' : '실행했어'}
          </Button>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-muted">
                결과 메모 (선택) — 뭐가 어땠어?
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="예) 답장 받았고 저녁 약속 잡힘 / 읽씹 / 분위기 무거웠음"
                className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent resize-y"
              />
            </label>
            <Button
              onClick={analyze}
              disabled={pending}
              className="w-full"
              variant={hasOutcome ? 'secondary' : 'primary'}
            >
              {pending
                ? '분석 중 (10~20초)…'
                : hasOutcome
                ? '재분석'
                : '결과 기록 + Outcome 생성'}
            </Button>
          </>
        )}
        {err && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2">
            {err}
          </div>
        )}
        <div className="text-[11px] text-muted leading-relaxed">
          메모 + 실행 후 Event를 합쳐 Outcome narrative 생성. Outcome은 다음 전략 제안 시 맥락으로 자동 주입 (클로즈드 루프).
        </div>
      </div>
    </Card>
  )
}

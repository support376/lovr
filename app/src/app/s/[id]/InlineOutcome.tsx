'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import {
  analyzeOutcomeAction,
  markActionExecutedAction,
} from '@/lib/actions/coach'

/**
 * 전략 메인에서 결과를 바로 입력하는 inline 폼.
 * 미실행 → [실행했어] · 실행됨 → 결과 메모 + [결과 기록] · 이미 결과 있음 → [재분석] + 메모 optional.
 */
export function InlineOutcome({
  actionId,
  status,
  hasOutcome,
}: {
  actionId: string
  status: string
  hasOutcome: boolean
}) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const router = useRouter()

  const executed = status === 'executed'

  const markExecuted = () => {
    setErr(null)
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
    setErr(null)
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

  if (!executed) {
    return (
      <Card>
        <div className="flex flex-col gap-2">
          <div className="text-[11px] text-muted">실행했어?</div>
          <Button onClick={markExecuted} disabled={pending} className="w-full">
            {pending ? '…' : '실행 완료'}
          </Button>
          {err && (
            <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2 whitespace-pre-wrap">
              {err}
            </div>
          )}
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex flex-col gap-2">
        <div className="text-[11px] text-muted">
          결과 메모 (선택) — 뭐가 어땠어? 저장하면 **기록 탭에도 자동**으로 쌓여.
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="예) 답장 받았고 저녁 약속 잡힘 / 읽씹 / 분위기 무거웠음"
          className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent resize-y"
        />
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
            : '결과 기록 + 분석'}
        </Button>
        {err && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2 whitespace-pre-wrap">
            {err}
          </div>
        )}
      </div>
    </Card>
  )
}

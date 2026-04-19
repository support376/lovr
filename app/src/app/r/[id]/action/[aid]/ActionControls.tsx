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
        await analyzeOutcomeAction(actionId)
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  if (blocked) {
    return (
      <Card className="border-bad/40 bg-bad/5">
        <div className="text-sm text-bad">
          이 전략은 윤리 룰에 차단됨. 실행·분석 불가.
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex flex-col gap-2">
        <div className="text-xs text-muted">라이프사이클</div>
        <div className="flex gap-2">
          {status !== 'executed' ? (
            <Button onClick={markExecuted} disabled={pending} className="flex-1">
              {pending ? '…' : '실행했어'}
            </Button>
          ) : (
            <Button
              onClick={analyze}
              disabled={pending}
              className="flex-1"
              variant={hasOutcome ? 'secondary' : 'primary'}
            >
              {pending
                ? '분석 중 (10~20초)…'
                : hasOutcome
                ? '재분석'
                : '결과 분석 → Outcome 생성'}
            </Button>
          )}
        </div>
        {err && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2">
            {err}
          </div>
        )}
        <div className="text-[11px] text-muted leading-relaxed">
          실행 후 관련 Event가 쌓이면 "결과 분석"으로 Outcome narrative 생성됨. Outcome은
          다음 전략 제안 시 맥락으로 자동 주입.
        </div>
      </div>
    </Card>
  )
}

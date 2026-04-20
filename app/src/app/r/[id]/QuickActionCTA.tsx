'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, RefreshCw } from 'lucide-react'
import { proposeStrategyAction } from '@/lib/actions/coach'

type Props = {
  relationshipId: string
  partnerId: string
  primaryGoalId: string | null
  hasAction: boolean
  stage: string
}

/**
 * 관계 화면 행동 버튼 — 단일 역할.
 * 목표 없으면 /goals 로 유도, 있으면 전략 제안/업데이트.
 */
export function QuickActionCTA({
  relationshipId,
  primaryGoalId,
  hasAction,
}: Props) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const run = () => {
    if (!primaryGoalId) return
    setErr(null)
    start(async () => {
      try {
        const res = await proposeStrategyAction({
          relationshipId,
          goalId: primaryGoalId,
          currentSituation: '(최근 Event 및 관계 맥락 기반)',
        })
        if (!res.ok) {
          setErr(
            `${res.error}${res.where ? `\n@ ${res.where}` : ''}`
          )
          return
        }
        router.refresh()
      } catch (e) {
        setErr((e as Error).message || '요청 실패')
      }
    })
  }

  if (!primaryGoalId) {
    return (
      <Link
        href={`/r/${relationshipId}/goals`}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-accent/40 bg-accent/5 text-accent font-semibold text-sm hover:bg-accent/10 transition"
      >
        <Sparkles size={16} />
        먼저 목표 설정
      </Link>
    )
  }

  const buttonLabel = pending
    ? '생각 중 (20~40초)…'
    : hasAction
    ? '다시 업데이트'
    : '지금 행동 받기'

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={run}
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-accent text-white font-semibold text-sm disabled:opacity-60 hover:brightness-110 transition"
      >
        {pending ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : (
          <Sparkles size={16} />
        )}
        {buttonLabel}
      </button>

      {err && (
        <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2 whitespace-pre-wrap font-mono leading-relaxed">
          {err}
        </div>
      )}
    </div>
  )
}

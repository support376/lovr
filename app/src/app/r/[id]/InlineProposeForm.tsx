'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { proposeStrategyAction } from '@/lib/actions/coach'

/**
 * 원클릭 "업데이트 하기" — 추가 인풋 없이 현재 관계 맥락으로 바로 propose.
 */
export function InlineProposeForm({
  relationshipId,
  goalId,
}: {
  relationshipId: string
  goalId: string
}) {
  const [pending, start] = useTransition()
  const router = useRouter()

  const run = () => {
    start(async () => {
      try {
        await proposeStrategyAction({
          relationshipId,
          goalId,
          currentSituation: '(최근 Event 및 관계 맥락 기반)',
        })
        router.refresh()
      } catch (e) {
        alert((e as Error).message)
      }
    })
  }

  return (
    <button
      onClick={run}
      disabled={pending}
      className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 disabled:opacity-40"
    >
      <RefreshCw size={12} className={pending ? 'animate-spin' : ''} />
      {pending ? '생성 중 (20~40초)…' : '업데이트 하기'}
    </button>
  )
}

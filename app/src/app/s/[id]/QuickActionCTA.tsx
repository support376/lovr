'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, RefreshCw } from 'lucide-react'
import { proposeStrategyAction } from '@/lib/actions/coach'

type Props = {
  relationshipId: string
  hasAction: boolean
}

/**
 * 전략 탭 최상단 CTA — goal·style 선택 없이 원클릭 제안.
 * 엔진이 프로필 + Event(Fact/Why) + Relationship State + 최근 Outcome/Insight만으로 전략 생성.
 */
export function QuickActionCTA({ relationshipId, hasAction }: Props) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const run = () => {
    setErr(null)
    start(async () => {
      try {
        await proposeStrategyAction({
          relationshipId,
          currentSituation: '(최근 Event 및 관계 맥락 기반)',
        })
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-surface to-surface p-4 flex flex-col gap-3">
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
        {pending ? '생각 중 (20~40초)…' : hasAction ? '다시 업데이트' : '지금 행동 받기'}
      </button>

      {err && (
        <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2">
          {err}
        </div>
      )}
    </div>
  )
}

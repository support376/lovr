'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, RefreshCw } from 'lucide-react'
import { createGoalAction, proposeStrategyAction } from '@/lib/actions/coach'
import { GOALS, GOAL_ORDER, type GoalKey } from '@/lib/ontology'
import type { Goal } from '@/lib/db/schema'

type Props = {
  relationshipId: string
  partnerId: string
  primaryGoalId: string | null
  hasAction: boolean
}

/**
 * 관계 화면 최상단 — 한 탭으로 "지금 행동 받기".
 * - 목표 없으면 카테고리 1개 고르면서 저장+제안 원클릭
 * - 목표 있으면 바로 제안/업데이트
 */
export function QuickActionCTA({
  relationshipId,
  partnerId,
  primaryGoalId,
  hasAction,
}: Props) {
  const [category, setCategory] = useState<GoalKey>('build_interest')
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const run = () => {
    setErr(null)
    start(async () => {
      try {
        let goalId = primaryGoalId
        if (!goalId) {
          const r = await createGoalAction({
            relationshipId,
            partnerId,
            category: category as Goal['category'],
            description: GOALS[category].ko,
            priority: 'primary',
          })
          if (r.ethicsStatus === 'blocked') {
            setErr(r.reasons[0] ?? '목표 생성 불가')
            return
          }
          goalId = r.goalId
        }
        await proposeStrategyAction({
          relationshipId,
          goalId,
          currentSituation: '(최근 Event 및 관계 맥락 기반)',
        })
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  const buttonLabel = pending
    ? '생각 중 (20~40초)…'
    : hasAction
    ? '다시 업데이트'
    : '지금 행동 받기'

  return (
    <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-surface to-surface p-4 flex flex-col gap-3">
      {!primaryGoalId && (
        <>
          <div className="text-xs text-muted">어떤 목적?</div>
          <div className="flex flex-wrap gap-1.5">
            {GOAL_ORDER.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setCategory(k)}
                disabled={pending}
                className={`text-[11px] px-2.5 py-1.5 rounded-full border transition-colors ${
                  category === k
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'bg-surface-2 border-border text-muted hover:border-accent/40'
                }`}
              >
                {GOALS[k].ko}
              </button>
            ))}
          </div>
        </>
      )}

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
        <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2">
          {err}
        </div>
      )}
    </div>
  )
}

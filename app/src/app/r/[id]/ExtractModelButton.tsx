'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Sparkles } from 'lucide-react'
import { extractModelAction } from '@/lib/actions/model'
import { usePlan, setPlan } from '@/lib/plan'
import { UpgradeGate } from '@/components/UpgradeGate'

export function ExtractModelButton({
  relationshipId,
  hasModel,
}: {
  relationshipId: string
  hasModel: boolean
}) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()
  const plan = usePlan()

  // Free: 첫 추출은 OK, 재추출(hasModel=true)부터 게이트.
  const requiresPaid = hasModel && plan === 'free'

  const run = () => {
    setErr(null)
    start(async () => {
      const r = await extractModelAction(relationshipId)
      if (!r.ok) {
        setErr(r.error)
        return
      }
      router.refresh()
    })
  }

  const Btn = (
    <button
      type="button"
      onClick={requiresPaid ? undefined : run}
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-accent/40 bg-accent/5 text-accent text-sm font-semibold hover:bg-accent/10 disabled:opacity-60"
    >
      {requiresPaid ? (
        <Sparkles size={14} />
      ) : (
        <RefreshCw size={14} className={pending ? 'animate-spin' : ''} />
      )}
      {pending
        ? '추출 중 (15~30초)…'
        : hasModel
          ? requiresPaid
            ? '모델 재추출 (프리미엄)'
            : '모델 재추출'
          : '모델 추출'}
    </button>
  )

  return (
    <div className="flex flex-col gap-2">
      {requiresPaid ? (
        <UpgradeGate
          feature="unlimited_extract"
          onProceed={() => {
            setPlan('paid')
            run()
          }}
        >
          {Btn}
        </UpgradeGate>
      ) : (
        Btn
      )}
      {err && (
        <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2 whitespace-pre-wrap">
          {err}
        </div>
      )}
    </div>
  )
}

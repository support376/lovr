'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { deriveRelationshipStateAction } from '@/lib/actions/derive'

export function DeriveStateButton({ relationshipId }: { relationshipId: string }) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const run = () => {
    setErr(null)
    start(async () => {
      try {
        await deriveRelationshipStateAction(relationshipId)
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-accent disabled:opacity-40"
      >
        <RefreshCw size={11} className={pending ? 'animate-spin' : ''} />
        {pending ? '분석 중…' : '재분석'}
      </button>
      {err && <div className="text-[10px] text-bad max-w-[200px] text-right">{err}</div>}
    </div>
  )
}

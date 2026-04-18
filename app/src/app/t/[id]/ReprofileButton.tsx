'use client'
import { useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { reprofileAction } from '@/lib/actions/strategy'

export function ReprofileButton({ targetId }: { targetId: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      onClick={() =>
        start(async () => {
          try {
            await reprofileAction(targetId)
          } catch (e) {
            alert((e as Error).message)
          }
        })
      }
      disabled={pending}
      className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent disabled:opacity-40"
    >
      <RefreshCw size={12} className={pending ? 'animate-spin' : ''} />
      {pending ? '분석 중…' : '재분석'}
    </button>
  )
}

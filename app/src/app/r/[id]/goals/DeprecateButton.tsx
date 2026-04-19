'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deprecateGoalAction } from '@/lib/actions/coach'

export function DeprecateButton({ goalId }: { goalId: string }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <button
      onClick={() =>
        start(async () => {
          await deprecateGoalAction(goalId)
          router.refresh()
        })
      }
      disabled={pending}
      className="ml-auto text-[11px] text-muted hover:text-bad disabled:opacity-40"
    >
      {pending ? '…' : '폐기'}
    </button>
  )
}

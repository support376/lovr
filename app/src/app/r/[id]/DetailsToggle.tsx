'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Info } from 'lucide-react'

export function DetailsToggle({
  open,
  relationshipId,
}: {
  open: boolean
  relationshipId: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const basePath = pathname ?? `/r/${relationshipId}`
  const sp = new URLSearchParams(searchParams?.toString() ?? '')
  if (open) sp.delete('edit')
  else sp.set('edit', '1')
  const href = `${basePath}${sp.toString() ? `?${sp.toString()}` : ''}`
  return (
    <Link
      href={href}
      scroll={false}
      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium border ${
        open
          ? 'bg-accent/15 border-accent/40 text-accent'
          : 'bg-surface-2 border-border text-muted hover:border-accent/40'
      }`}
    >
      <Info size={11} />
      {open ? '닫기' : '상세'}
    </Link>
  )
}

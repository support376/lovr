'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, Zap, Pencil, Settings } from 'lucide-react'
import clsx from 'clsx'

const items = [
  { href: '/', label: 'LuvAI', icon: Sparkles, match: (p: string) => p === '/' },
  {
    href: '/r',
    label: '전략',
    icon: Zap,
    match: (p: string) => p === '/r' || p.startsWith('/r/'),
  },
  {
    href: '/timeline',
    label: '기록',
    icon: Pencil,
    match: (p: string) => p.startsWith('/timeline'),
  },
  {
    href: '/me',
    label: '설정',
    icon: Settings,
    match: (p: string) => p.startsWith('/me'),
  },
]

export function BottomNav() {
  const pathname = usePathname() ?? '/'
  return (
    <nav
      className="shrink-0 border-t border-border bg-surface/90 backdrop-blur
                 flex justify-around items-stretch z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      {items.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname)
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center py-2 text-xs',
              active ? 'text-accent' : 'text-muted'
            )}
          >
            <Icon size={22} />
            <span className="mt-1">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

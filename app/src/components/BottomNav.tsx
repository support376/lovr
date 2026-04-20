'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, Zap, Users, PencilLine, User } from 'lucide-react'
import clsx from 'clsx'

const items = [
  {
    href: '/',
    label: 'AI',
    icon: Sparkles,
    match: (p: string) => p === '/',
  },
  {
    href: '/s',
    label: '전략',
    icon: Zap,
    match: (p: string) => p === '/s' || p.startsWith('/s/'),
  },
  {
    href: '/r',
    label: '관계',
    icon: Users,
    match: (p: string) => p === '/r' || p.startsWith('/r/'),
  },
  {
    href: '/timeline',
    label: '기록',
    icon: PencilLine,
    match: (p: string) => p.startsWith('/timeline'),
  },
  {
    href: '/me',
    label: 'MY',
    icon: User,
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
              'flex-1 flex flex-col items-center justify-center py-2 text-[11px]',
              active ? 'text-accent' : 'text-muted'
            )}
          >
            <Icon size={20} />
            <span className="mt-1">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

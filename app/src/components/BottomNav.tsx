'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Settings } from 'lucide-react'
import clsx from 'clsx'

const items = [
  { href: '/', label: '홈', icon: Home },
  { href: '/targets', label: '상대', icon: Users },
  { href: '/me', label: '나', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      className="shrink-0 border-t border-border bg-surface/90 backdrop-blur
                 flex justify-around items-stretch z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === '/' ? pathname === '/' : pathname.startsWith(href)
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

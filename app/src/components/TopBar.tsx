import Link from 'next/link'

export function TopBar() {
  return (
    <div
      className="sticky top-0 z-30 shrink-0 flex items-center px-4 py-2.5
                 border-b border-border bg-bg/85 backdrop-blur"
    >
      <Link
        href="/"
        className="text-base font-bold tracking-tight bg-gradient-to-br from-accent to-accent-2 bg-clip-text text-transparent"
      >
        LuvOS
      </Link>
    </div>
  )
}

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="px-5 pt-4 pb-10">
      <Link
        href="/me"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent mb-4"
      >
        <ArrowLeft size={12} /> 설정으로
      </Link>
      <article className="prose-invert max-w-none text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-accent [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:pl-5 [&_li]:list-disc [&_li]:mb-1 [&_strong]:text-text [&_strong]:font-semibold text-muted">
        {children}
      </article>
    </div>
  )
}

'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function TargetError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[/t/[id] error]', error)
  }, [error])

  return (
    <div className="px-5 pt-6 pb-10 flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">로드 실패</h1>
      </header>
      <div className="rounded-2xl border border-bad/40 bg-bad/5 p-4">
        <div className="text-sm font-semibold text-bad mb-2">
          서버 에러: {error.message || '알 수 없음'}
        </div>
        {error.digest && (
          <div className="text-[11px] text-muted font-mono mb-3">
            digest: {error.digest}
          </div>
        )}
        <pre className="text-[11px] text-muted whitespace-pre-wrap break-all bg-bg/60 rounded-lg p-2 max-h-60 overflow-auto">
          {error.stack ?? error.toString()}
        </pre>
      </div>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="flex-1 rounded-xl bg-accent text-white py-3 font-semibold text-sm"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="flex-1 rounded-xl bg-surface-2 border border-border text-text py-3 font-semibold text-sm text-center"
        >
          홈으로
        </Link>
      </div>
    </div>
  )
}

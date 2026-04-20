'use client'

import { useEffect } from 'react'

export default function RelationshipError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[r/[id] error]', error)
  }, [error])

  return (
    <div className="px-5 py-10 flex flex-col gap-4">
      <div className="text-sm font-semibold text-bad">관계 화면 렌더 실패</div>
      <pre className="text-xs text-muted whitespace-pre-wrap bg-bad/5 border border-bad/30 rounded-lg p-3 leading-relaxed">
        {error.message}
        {error.digest ? `\n\ndigest: ${error.digest}` : ''}
      </pre>
      <button
        onClick={reset}
        className="self-start px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold"
      >
        다시 시도
      </button>
    </div>
  )
}

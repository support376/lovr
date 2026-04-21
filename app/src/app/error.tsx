'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="p-5 text-sm">
      <div className="font-semibold mb-2 text-bad">앱 에러</div>
      <div className="text-xs text-muted mb-3">
        (개인용 배포 — 메시지 그대로 노출 중)
      </div>
      <pre className="text-xs whitespace-pre-wrap bg-bad/5 border border-bad/30 rounded p-3 mb-3">
        {error.message || '(no message)'}
        {error.digest ? `\n\ndigest: ${error.digest}` : ''}
        {error.stack ? `\n\n${error.stack}` : ''}
      </pre>
      <button
        onClick={reset}
        className="text-xs px-3 py-1.5 rounded bg-accent/15 border border-accent/40 text-accent"
      >
        다시 시도
      </button>
    </div>
  )
}

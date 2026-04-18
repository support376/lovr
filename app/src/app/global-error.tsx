'use client'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global-error]', error)
  }, [error])

  return (
    <html lang="ko">
      <body
        style={{
          minHeight: '100vh',
          background: '#0a0a0f',
          color: '#ededf3',
          fontFamily: 'system-ui',
          padding: '2rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
            앱 에러
          </h1>
          <div
            style={{
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.4)',
              borderRadius: 16,
              padding: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ color: '#f87171', fontWeight: 600, marginBottom: 8 }}>
              {error.message || '알 수 없는 에러'}
            </div>
            {error.digest && (
              <div style={{ fontSize: 11, color: '#8a8aa0', fontFamily: 'monospace' }}>
                digest: {error.digest}
              </div>
            )}
            {error.stack && (
              <pre
                style={{
                  fontSize: 11,
                  color: '#8a8aa0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  marginTop: 12,
                  maxHeight: 300,
                  overflow: 'auto',
                }}
              >
                {error.stack}
              </pre>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={reset}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#ff4d7d',
                color: 'white',
                borderRadius: 12,
                fontWeight: 600,
                border: 'none',
              }}
            >
              다시 시도
            </button>
            <a
              href="/"
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#1d1d28',
                color: '#ededf3',
                borderRadius: 12,
                fontWeight: 600,
                border: '1px solid #2a2a3a',
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              홈으로
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}

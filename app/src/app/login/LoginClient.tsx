'use client'

import { useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { supabaseBrowser } from '@/lib/supabase/client'

export function LoginClient() {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const sp = useSearchParams()
  const urlError = sp.get('error')
  const next = sp.get('next') ?? '/'

  const signInGoogle = () => {
    setErr(null)
    start(async () => {
      try {
        const sb = supabaseBrowser()
        const { error } = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        })
        if (error) setErr(error.message)
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={signInGoogle} disabled={pending} className="w-full">
        {pending ? '이동 중…' : 'Google로 계속하기'}
      </Button>

      {(err || urlError) && (
        <Card className="border-bad/40 bg-bad/5">
          <div className="text-xs text-bad">
            {err ?? 'OAuth 처리 중 오류. 잠시 후 다시 시도.'}
          </div>
        </Card>
      )}

      <div className="text-[11px] text-muted leading-relaxed mt-4">
        로그인하면 본인 계정에만 속한 연애 데이터가 저장돼. 다른 유저와 완전히 격리됨 (Postgres RLS).
      </div>
    </div>
  )
}

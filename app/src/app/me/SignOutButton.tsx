'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui'
import { supabaseBrowser } from '@/lib/supabase/client'

export function SignOutButton() {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const signOut = () => {
    setErr(null)
    start(async () => {
      try {
        const sb = supabaseBrowser()
        await sb.auth.signOut()
        router.push('/login')
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <>
      <Button
        onClick={signOut}
        disabled={pending}
        variant="secondary"
        className="w-full !bg-bad/10 !text-bad hover:!bg-bad/20"
      >
        <LogOut size={14} /> {pending ? '로그아웃 중…' : '로그아웃'}
      </Button>
      {err && <div className="mt-2 text-xs text-bad">{err}</div>}
    </>
  )
}

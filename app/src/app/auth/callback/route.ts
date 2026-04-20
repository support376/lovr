import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

/**
 * OAuth 콜백 — Supabase Auth가 code를 쿠키 세션으로 교환.
 * 성공 시 ?next로 리다이렉트, 없으면 /.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/'

  if (code) {
    const sb = await supabaseServer()
    const { error } = await sb.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=oauth', url.origin))
}

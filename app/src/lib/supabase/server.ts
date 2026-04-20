import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 서버 컴포넌트·서버액션·route handler에서 쓰는 Supabase 클라이언트.
 * 세션 쿠키를 읽어 `auth.getUser()` 호출 가능.
 */
export async function supabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 서버 컴포넌트에서 set 호출 시 에러 무시 (Next 정책).
          }
        },
      },
    }
  )
}

/**
 * 현재 로그인된 user id 반환. 미인증이면 null.
 */
export async function currentUserId(): Promise<string | null> {
  const sb = await supabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  return user?.id ?? null
}

/**
 * 서버액션 공통 가드 — 미인증이면 throw.
 */
export async function requireUserId(): Promise<string> {
  const id = await currentUserId()
  if (!id) throw new Error('UNAUTHORIZED')
  return id
}

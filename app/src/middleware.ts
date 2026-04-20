import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * 세션 쿠키 리프레시 + 미인증 가드.
 *
 * 최적화:
 *   1. Auth 쿠키 없으면 Supabase 클라이언트 만들지도 않고 즉시 /login 리다이렉트
 *      (getUser() 네트워크 호출 생략 → 대부분 콜드 플로우에서 수백 ms 절약)
 *   2. matcher로 /api/auth, /api/cron 등은 아예 미들웨어 건너뜀
 */
const PUBLIC_PATHS = new Set(['/login'])
const PUBLIC_PREFIXES = ['/auth/', '/_next/']

function hasSupabaseAuthCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic =
    PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))

  // 1) 공개 경로면 그냥 통과
  if (isPublic) return NextResponse.next()

  // 2) 쿠키가 아예 없으면 Supabase 호출 없이 즉시 로그인 리다이렉트
  if (!hasSupabaseAuthCookie(req)) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // 3) 쿠키 있음 → 세션 리프레시 (getUser로 한 번만 네트워크 호출, 쿠키 자동 갱신)
  let res = NextResponse.next({ request: req })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: [
    // /api/cron, /api/auth, 정적 에셋은 미들웨어 스킵
    '/((?!api/cron|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * 클라이언트 컴포넌트에서 쓰는 Supabase 클라이언트.
 * 현재는 signInWithOAuth / signOut 호출 용도.
 */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

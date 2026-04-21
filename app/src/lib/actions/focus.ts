'use server'

import { cookies } from 'next/headers'

const COOKIE = 'focusRel'

/**
 * 포커스 상대 ID 쓰기 (server action 전용 — 클라이언트에서만 호출).
 * 읽기는 lib/server/focus.ts 의 getFocusRelationshipId 사용.
 */
export async function setFocusRelationship(id: string | null): Promise<void> {
  const store = await cookies()
  if (id) {
    store.set(COOKIE, id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    })
  } else {
    store.delete(COOKIE)
  }
}

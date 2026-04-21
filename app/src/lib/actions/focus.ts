'use server'

import { cookies } from 'next/headers'

const COOKIE = 'focusRel'

/**
 * 현재 포커스 중인 상대 id — 탭 간 공유용.
 * 기록·관계·전략·AI 모두 이 값을 우선 참조.
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

export async function getFocusRelationshipId(): Promise<string | null> {
  const store = await cookies()
  return store.get(COOKIE)?.value ?? null
}

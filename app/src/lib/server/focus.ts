import 'server-only'
import { cookies } from 'next/headers'

const COOKIE = 'focusRel'

/**
 * 현재 포커스된 상대 ID 읽기 전용 헬퍼.
 * 'use server' 아닌 순수 server-only 모듈 — 서버 컴포넌트 render 에서 안전.
 */
export async function getFocusRelationshipId(): Promise<string | null> {
  try {
    const store = await cookies()
    return store.get(COOKIE)?.value ?? null
  } catch {
    return null
  }
}

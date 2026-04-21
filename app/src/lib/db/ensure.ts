import 'server-only'
import { sql } from 'drizzle-orm'
import { db } from './client'

/**
 * 런타임 idempotent 컬럼 추가.
 * Postgres 의 ADD COLUMN IF NOT EXISTS 로 안전. 서버 인스턴스당 1회.
 *
 * 새 컬럼 추가할 때마다 여기 라인 하나씩 늘리면 됨.
 * 배포 직후 첫 요청이 트리거 — users 가 sql editor 에 수동 ALTER 안 쳐도 됨.
 */

let ensured = false

export async function ensureRuntimeColumns(): Promise<void> {
  if (ensured) return
  try {
    await db.execute(
      sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS sender TEXT`
    )
    ensured = true
  } catch (e) {
    console.error('[ensureRuntimeColumns]', e)
    // 실패해도 앱은 계속 — 다음 요청에 재시도
  }
}

'use server'

import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import {
  actors,
  conversations,
  events,
  relationships,
} from '../db/schema'
import { requireUserId, supabaseServer } from '../supabase/server'

/**
 * 계정 관련 서버 액션 — 개인정보 처리방침에 명시된 유저 권리 구현.
 */

export type ExportBundle = {
  exportedAt: string
  userId: string
  self: Record<string, unknown> | null
  partners: Record<string, unknown>[]
  relationships: Record<string, unknown>[]
  events: Record<string, unknown>[]
  conversations: Record<string, unknown>[]
}

/**
 * 전체 데이터 JSON export.
 * 유저가 설정 → 데이터 내보내기 누르면 호출.
 */
export async function exportAllData(): Promise<ExportBundle> {
  const uid = await requireUserId()

  const actorRows = await db
    .select()
    .from(actors)
    .where(eq(actors.userId, uid))

  const relRows = await db
    .select()
    .from(relationships)
    .where(eq(relationships.userId, uid))

  const evRows = await db
    .select()
    .from(events)
    .where(eq(events.userId, uid))

  const convRows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, uid))

  const selfActor = actorRows.find((a) => a.role === 'self') ?? null
  const partners = actorRows.filter((a) => a.role !== 'self')

  return {
    exportedAt: new Date().toISOString(),
    userId: uid,
    self: selfActor as unknown as Record<string, unknown> | null,
    partners: partners as unknown as Record<string, unknown>[],
    relationships: relRows as unknown as Record<string, unknown>[],
    events: evRows as unknown as Record<string, unknown>[],
    conversations: convRows as unknown as Record<string, unknown>[],
  }
}

/**
 * 계정 영구 삭제.
 * - DB: actors·relationships·events·conversations 유저 행 전부 hard-delete
 *   (relationships FK cascade 로 events 자동 삭제되지만 명시)
 * - Auth: Supabase auth 사용자 계정은 현재 유저가 직접 지우기엔 권한 이슈 —
 *   DB 데이터만 완전 삭제하고 다음 로그인 시 다시 온보딩으로 들어옴.
 * - 추후 admin API 로 auth.users 까지 지우려면 service_role 필요.
 */
export async function deleteAccountData(): Promise<{
  ok: true
  deleted: { actors: number; relationships: number; events: number; conversations: number }
}> {
  const uid = await requireUserId()

  const [evDel, convDel, relDel, actDel] = await Promise.all([
    db.delete(events).where(eq(events.userId, uid)).returning({ id: events.id }),
    db
      .delete(conversations)
      .where(eq(conversations.userId, uid))
      .returning({ id: conversations.id }),
    db
      .delete(relationships)
      .where(eq(relationships.userId, uid))
      .returning({ id: relationships.id }),
    db.delete(actors).where(eq(actors.userId, uid)).returning({ id: actors.id }),
  ])

  // 로그아웃 — 세션 쿠키 제거
  try {
    const sb = await supabaseServer()
    await sb.auth.signOut()
  } catch {
    // ignore — 세션 종료는 best-effort
  }

  return {
    ok: true,
    deleted: {
      actors: actDel.length,
      relationships: relDel.length,
      events: evDel.length,
      conversations: convDel.length,
    },
  }
}

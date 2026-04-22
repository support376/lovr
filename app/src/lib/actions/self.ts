'use server'

import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { db } from '../db/client'
import {
  actors,
  relationships,
  type Actor,
  type RelationshipState,
} from '../db/schema'
import { requireUserId } from '../supabase/server'

function selfId(userId: string) {
  return `self-${userId}`
}

/** 내 성별 → 상대 성별 자동. 동성·기타 케이스 안 다룸. */
function oppositePartnerGender(g: 'male' | 'female'): 'male' | 'female' {
  return g === 'male' ? 'female' : 'male'
}

export async function getSelf(): Promise<Actor | null> {
  const uid = await requireUserId()
  const rows = await db
    .select()
    .from(actors)
    .where(and(eq(actors.userId, uid), eq(actors.role, 'self')))
    .limit(1)
  return rows[0] ?? null
}

export async function getSelfOrThrow(): Promise<Actor> {
  const s = await getSelf()
  if (!s) throw new Error('온보딩이 필요합니다')
  return s
}

export type SelfInput = {
  displayName?: string
  rawNotes?: string | null
  knownConstraints?: string[]
  age?: number | null
  gender?: string | null
  occupation?: string | null
}

/**
 * 신규 유저 첫 진입 — 자기 actor + 기본 관계/상대 actor 자동 생성.
 *
 * Why: 온보딩 클릭 한 번으로 AI 대화 가능 상태까지 도달해야 함.
 *      상대 등록을 별도 단계로 빼면 time-to-AI 가 길어져 드랍↑.
 *      상대 정보(이름·나이·직업)는 추후 대화 중 tool_use 로 채움.
 */
export async function createSelf(
  input: SelfInput & {
    displayName: string
    gender: 'male' | 'female'
    state: RelationshipState
  }
): Promise<Actor> {
  const uid = await requireUserId()
  const existing = await getSelf()
  if (existing) return updateSelf(input)

  const [created] = await db
    .insert(actors)
    .values({
      id: selfId(uid),
      userId: uid,
      role: 'self',
      displayName: input.displayName,
      rawNotes: input.rawNotes ?? null,
      knownConstraints: input.knownConstraints ?? [],
      age: input.age ?? null,
      gender: input.gender,
      occupation: input.occupation ?? null,
    })
    .returning()

  // 기본 관계 + 플레이스홀더 상대 자동 생성.
  const partnerId = `actor-${randomUUID()}`
  const relId = `rel-${randomUUID()}`
  await db.insert(actors).values({
    id: partnerId,
    userId: uid,
    role: 'partner',
    displayName: '상대',
    gender: oppositePartnerGender(input.gender),
  })
  await db.insert(relationships).values({
    id: relId,
    userId: uid,
    partnerId,
    state: input.state,
    status: 'active',
  })

  // focus 쿠키 박아서 홈에서 바로 이 관계 활성화.
  const store = await cookies()
  store.set('focusRel', relId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  })

  revalidatePath('/')
  return created
}

const ALLOWED_FIELDS = [
  'displayName',
  'rawNotes',
  'knownConstraints',
  'age',
  'gender',
  'occupation',
] as const

export async function updateSelf(input: SelfInput): Promise<Actor> {
  const uid = await requireUserId()
  const updates: Record<string, unknown> = {}
  for (const k of ALLOWED_FIELDS) {
    const v = (input as Record<string, unknown>)[k]
    if (v !== undefined) updates[k] = v
  }

  const [updated] = await db
    .update(actors)
    .set(updates)
    .where(and(eq(actors.userId, uid), eq(actors.role, 'self')))
    .returning()

  revalidatePath('/')
  revalidatePath('/me')
  return updated
}

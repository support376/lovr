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
 * 신규 유저 온보딩 — self actor + 기본 relationship + placeholder partner 자동 생성.
 *
 * 받는 값: 이름 + 성별 + 관계상태. 이거 3개로 충분.
 * 상대 정보(이름·나이·직업)는 null → 추후 대화 중 tool_use 로 채움.
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

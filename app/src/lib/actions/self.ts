'use server'

import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db/client'
import { selves, type Self } from '../db/schema'
import { ensureSchema } from '../db/init'
import { updateSelfProfile } from '../ai/self-profiler'

const SINGLETON_ID = 'self-singleton'

export async function getOrNullSelf(): Promise<Self | null> {
  await ensureSchema()
  const rows = await db.select().from(selves).where(eq(selves.id, SINGLETON_ID)).limit(1)
  return rows[0] ?? null
}

export async function getSelfOrThrow(): Promise<Self> {
  const s = await getOrNullSelf()
  if (!s) throw new Error('온보딩이 필요합니다')
  return s
}

type SelfInput = {
  displayName?: string
  age?: number
  gender?: string
  orientation?: string
  relationshipGoal?: string
  toneSamples?: string[]
  notes?: string
  mbti?: string
  strengths?: string[]
  weaknesses?: string[]
  dealBreakers?: string[]
  idealType?: string
  personalityNotes?: string
  valuesNotes?: string
  experienceLevel?: string
}

const SELF_FIELDS = [
  'displayName', 'age', 'gender', 'orientation', 'relationshipGoal',
  'toneSamples', 'notes', 'mbti', 'strengths', 'weaknesses', 'dealBreakers',
  'idealType', 'personalityNotes', 'valuesNotes', 'experienceLevel',
] as const

export async function createSelf(input: SelfInput & { displayName: string }): Promise<Self> {
  await ensureSchema()
  const existing = await getOrNullSelf()
  if (existing) {
    return updateSelf(input)
  }

  const [created] = await db
    .insert(selves)
    .values({
      id: SINGLETON_ID,
      displayName: input.displayName,
      age: input.age ?? null,
      gender: input.gender ?? null,
      orientation: input.orientation ?? null,
      relationshipGoal: input.relationshipGoal ?? null,
      toneSamples: input.toneSamples ?? [],
      notes: input.notes ?? null,
      mbti: input.mbti ?? null,
      strengths: input.strengths ?? [],
      weaknesses: input.weaknesses ?? [],
      dealBreakers: input.dealBreakers ?? [],
      idealType: input.idealType ?? null,
      personalityNotes: input.personalityNotes ?? null,
      valuesNotes: input.valuesNotes ?? null,
      experienceLevel: input.experienceLevel ?? null,
      psychProfile: {},
    })
    .returning()

  revalidatePath('/')
  return created
}

export async function updateSelf(input: SelfInput): Promise<Self> {
  await ensureSchema()
  const updates: Record<string, unknown> = {}
  for (const k of SELF_FIELDS) {
    const v = input[k]
    if (v !== undefined) updates[k] = v
  }

  const [updated] = await db
    .update(selves)
    .set(updates)
    .where(eq(selves.id, SINGLETON_ID))
    .returning()

  revalidatePath('/')
  revalidatePath('/me')
  revalidatePath('/onboarding')
  return updated
}

export async function ensureSelf(): Promise<Self> {
  // 온보딩 없이 들어왔을 때 기본값으로라도 하나 만들어 주는 helper.
  // UI에서 /onboarding으로 보내는 걸 원칙으로 하지만, 편의용.
  const existing = await getOrNullSelf()
  if (existing) return existing
  return createSelf({ displayName: 'me' })
}

// ============================================================================
// Self 자동 프로파일링 — 온보딩 완료 시, 그리고 /me 에서 수동으로
// ============================================================================
export async function reprofileSelfAction(): Promise<Self> {
  await ensureSchema()
  const self = await getSelfOrThrow()
  try {
    await updateSelfProfile(self)
  } catch (err) {
    // LLM 실패해도 Self 레코드는 유지
    console.error('[self profiling failed]', err)
    throw err
  }
  const updated = await getSelfOrThrow()
  revalidatePath('/')
  revalidatePath('/me')
  return updated
}

/**
 * 온보딩 직후에 "best-effort"로 1차 프로파일링을 시도.
 * 실패해도 throw 안 함. Self 생성 흐름을 막지 않기 위함.
 */
export async function bestEffortProfileSelf(): Promise<void> {
  await ensureSchema()
  const self = await getOrNullSelf()
  if (!self) return
  try {
    await updateSelfProfile(self)
    revalidatePath('/')
    revalidatePath('/me')
  } catch (err) {
    console.error('[best-effort self profile failed]', err)
  }
}

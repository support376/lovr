'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db/client'
import { actors, type Actor } from '../db/schema'
import { ensureSchema } from '../db/init'

const SELF_ID = 'actor-self'

export async function getSelf(): Promise<Actor | null> {
  await ensureSchema()
  const rows = await db.select().from(actors).where(eq(actors.id, SELF_ID)).limit(1)
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
  mbti?: string | null
  age?: number | null
  gender?: string | null
  orientation?: string | null
  experienceLevel?: string | null
  occupation?: string | null
  strengths?: string[]
  weaknesses?: string[]
  dealBreakers?: string[]
  idealTypeNotes?: string | null
  personalityNotes?: string | null
  valuesNotes?: string | null
}

export async function createSelf(input: SelfInput & { displayName: string }): Promise<Actor> {
  await ensureSchema()
  const existing = await getSelf()
  if (existing) return updateSelf(input)

  const [created] = await db
    .insert(actors)
    .values({
      id: SELF_ID,
      role: 'self',
      displayName: input.displayName,
      rawNotes: input.rawNotes ?? null,
      knownConstraints: input.knownConstraints ?? [],
      inferredTraits: [],
      mbti: input.mbti ?? null,
      age: input.age ?? null,
      gender: input.gender ?? null,
      orientation: input.orientation ?? null,
      experienceLevel: input.experienceLevel ?? null,
      occupation: input.occupation ?? null,
      strengths: input.strengths ?? [],
      weaknesses: input.weaknesses ?? [],
      dealBreakers: input.dealBreakers ?? [],
      idealTypeNotes: input.idealTypeNotes ?? null,
      personalityNotes: input.personalityNotes ?? null,
      valuesNotes: input.valuesNotes ?? null,
    })
    .returning()

  revalidatePath('/')
  return created
}

const ALLOWED_FIELDS = [
  'displayName',
  'rawNotes',
  'knownConstraints',
  'mbti',
  'age',
  'gender',
  'orientation',
  'experienceLevel',
  'occupation',
  'strengths',
  'weaknesses',
  'dealBreakers',
  'idealTypeNotes',
  'personalityNotes',
  'valuesNotes',
] as const

export async function updateSelf(input: SelfInput): Promise<Actor> {
  await ensureSchema()
  const updates: Record<string, unknown> = {}
  for (const k of ALLOWED_FIELDS) {
    const v = (input as Record<string, unknown>)[k]
    if (v !== undefined) updates[k] = v
  }

  const [updated] = await db
    .update(actors)
    .set(updates)
    .where(eq(actors.id, SELF_ID))
    .returning()

  revalidatePath('/')
  revalidatePath('/me')
  return updated
}

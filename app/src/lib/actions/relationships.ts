'use server'

import { randomUUID } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db/client'
import {
  actors,
  relationships,
  type Actor,
  type Relationship,
} from '../db/schema'
import { ensureSchema } from '../db/init'

export async function listRelationships(): Promise<Array<Relationship & { partner: Actor }>> {
  await ensureSchema()
  const rels = await db
    .select()
    .from(relationships)
    .orderBy(desc(relationships.updatedAt))

  const result: Array<Relationship & { partner: Actor }> = []
  for (const r of rels) {
    const [p] = await db
      .select()
      .from(actors)
      .where(eq(actors.id, r.partnerId))
      .limit(1)
    if (p) result.push({ ...r, partner: p })
  }
  return result
}

export async function getRelationship(
  id: string
): Promise<(Relationship & { partner: Actor }) | null> {
  await ensureSchema()
  const [r] = await db
    .select()
    .from(relationships)
    .where(eq(relationships.id, id))
    .limit(1)
  if (!r) return null
  const [p] = await db.select().from(actors).where(eq(actors.id, r.partnerId)).limit(1)
  if (!p) return null
  return { ...r, partner: p }
}

/** 가장 최근 업데이트된 active 관계를 "현재 focus"로 간주. */
export async function getCurrentRelationship(): Promise<
  (Relationship & { partner: Actor }) | null
> {
  const all = await listRelationships()
  return all.find((r) => r.status === 'active') ?? null
}

export async function createRelationship(input: {
  partnerName: string
  partnerRawNotes?: string
  partnerKnownConstraints?: string[]
  progress?: string
  exclusivity?: string
}): Promise<{ relationshipId: string; partnerId: string }> {
  await ensureSchema()

  const partnerId = `actor-${randomUUID()}`
  const relId = `rel-${randomUUID()}`

  await db.insert(actors).values({
    id: partnerId,
    role: 'partner',
    displayName: input.partnerName,
    rawNotes: input.partnerRawNotes ?? null,
    knownConstraints: input.partnerKnownConstraints ?? [],
    inferredTraits: [],
  })

  await db.insert(relationships).values({
    id: relId,
    partnerId,
    progress: input.progress ?? 'observing',
    exclusivity: input.exclusivity ?? 'unknown',
    conflictState: 'healthy',
    status: 'active',
  })

  revalidatePath('/')
  revalidatePath('/me')
  return { relationshipId: relId, partnerId }
}

export async function updateRelationship(
  id: string,
  patch: Partial<Pick<Relationship,
    'description' | 'style' | 'progress' | 'exclusivity' | 'conflictState' |
    'powerBalance' | 'communicationPattern' | 'investmentAsymmetry' |
    'escalationSpeed' | 'status'
  >>
): Promise<void> {
  await ensureSchema()
  await db
    .update(relationships)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(relationships.id, id))
  revalidatePath('/')
  revalidatePath(`/r/${id}`)
}

export async function updatePartner(
  partnerId: string,
  patch: {
    displayName?: string
    rawNotes?: string | null
    knownConstraints?: string[]
    mbti?: string | null
    age?: number | null
    gender?: string | null
    occupation?: string | null
  }
): Promise<void> {
  await ensureSchema()
  const updates: Record<string, unknown> = {}
  if (patch.displayName !== undefined) updates.displayName = patch.displayName
  if (patch.rawNotes !== undefined) updates.rawNotes = patch.rawNotes
  if (patch.knownConstraints !== undefined) updates.knownConstraints = patch.knownConstraints
  if (patch.mbti !== undefined) updates.mbti = patch.mbti
  if (patch.age !== undefined) updates.age = patch.age
  if (patch.gender !== undefined) updates.gender = patch.gender
  if (patch.occupation !== undefined) updates.occupation = patch.occupation
  await db.update(actors).set(updates).where(eq(actors.id, partnerId))
  revalidatePath('/')
}

'use server'

import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db/client'
import {
  actors,
  relationships,
  type Actor,
  type Relationship,
} from '../db/schema'
import { requireUserId } from '../supabase/server'
import { getFocusRelationshipId } from '../server/focus'

export async function listRelationships(): Promise<
  Array<Relationship & { partner: Actor }>
> {
  const uid = await requireUserId()
  const rels = await db
    .select()
    .from(relationships)
    .where(eq(relationships.userId, uid))
    .orderBy(desc(relationships.updatedAt))

  const result: Array<Relationship & { partner: Actor }> = []
  for (const r of rels) {
    const [p] = await db
      .select()
      .from(actors)
      .where(and(eq(actors.id, r.partnerId), eq(actors.userId, uid)))
      .limit(1)
    if (p) result.push({ ...r, partner: p })
  }
  return result
}

export async function getRelationship(
  id: string
): Promise<(Relationship & { partner: Actor }) | null> {
  const uid = await requireUserId()
  const [r] = await db
    .select()
    .from(relationships)
    .where(and(eq(relationships.id, id), eq(relationships.userId, uid)))
    .limit(1)
  if (!r) return null
  const [p] = await db
    .select()
    .from(actors)
    .where(and(eq(actors.id, r.partnerId), eq(actors.userId, uid)))
    .limit(1)
  if (!p) return null
  return { ...r, partner: p }
}

/**
 * 현재 focus 관계. 우선순위: focus cookie > 가장 최근 active > 첫번째.
 */
export async function getCurrentRelationship(): Promise<
  (Relationship & { partner: Actor }) | null
> {
  const all = await listRelationships()
  const focusId = await getFocusRelationshipId()
  if (focusId) {
    const focused = all.find((r) => r.id === focusId)
    if (focused) return focused
  }
  return all.find((r) => r.status === 'active') ?? all[0] ?? null
}

export async function createRelationship(input: {
  partnerName: string
  partnerRawNotes?: string
  partnerKnownConstraints?: string[]
  state?: string
}): Promise<{ relationshipId: string; partnerId: string }> {
  const uid = await requireUserId()

  const partnerId = `actor-${randomUUID()}`
  const relId = `rel-${randomUUID()}`

  await db.insert(actors).values({
    id: partnerId,
    userId: uid,
    role: 'partner',
    displayName: input.partnerName,
    rawNotes: input.partnerRawNotes ?? null,
    knownConstraints: input.partnerKnownConstraints ?? [],
  })

  await db.insert(relationships).values({
    id: relId,
    userId: uid,
    partnerId,
    state: input.state ?? 'exploring',
    status: 'active',
  })

  revalidatePath('/')
  revalidatePath('/me')
  return { relationshipId: relId, partnerId }
}

export async function updateRelationship(
  id: string,
  patch: Partial<
    Pick<
      Relationship,
      | 'description'
      | 'state'
      | 'goal'
      | 'status'
      | 'timelineStart'
      | 'timelineEnd'
    >
  >
): Promise<void> {
  const uid = await requireUserId()
  await db
    .update(relationships)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(relationships.id, id), eq(relationships.userId, uid)))
  revalidatePath('/')
  revalidatePath(`/r/${id}`)
}

export async function updatePartner(
  partnerId: string,
  patch: {
    displayName?: string
    rawNotes?: string | null
    knownConstraints?: string[]
    age?: number | null
    gender?: string | null
    occupation?: string | null
  }
): Promise<void> {
  const uid = await requireUserId()
  const updates: Record<string, unknown> = {}
  if (patch.displayName !== undefined) updates.displayName = patch.displayName
  if (patch.rawNotes !== undefined) updates.rawNotes = patch.rawNotes
  if (patch.knownConstraints !== undefined)
    updates.knownConstraints = patch.knownConstraints
  if (patch.age !== undefined) updates.age = patch.age
  if (patch.gender !== undefined) updates.gender = patch.gender
  if (patch.occupation !== undefined) updates.occupation = patch.occupation
  await db
    .update(actors)
    .set(updates)
    .where(and(eq(actors.id, partnerId), eq(actors.userId, uid)))
  revalidatePath('/')
}

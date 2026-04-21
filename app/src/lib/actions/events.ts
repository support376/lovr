'use server'

import { randomUUID } from 'node:crypto'
import { and, desc, eq, isNull, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db/client'
import { events, relationships, type Event } from '../db/schema'
import { requireUserId } from '../supabase/server'

export type EventType = 'chat' | 'event' | 'note'

async function assertRelationshipOwned(relationshipId: string, uid: string) {
  const [r] = await db
    .select({ id: relationships.id })
    .from(relationships)
    .where(and(eq(relationships.id, relationshipId), eq(relationships.userId, uid)))
    .limit(1)
  if (!r) throw new Error('Relationship not found or not yours')
}

export async function addEvent(input: {
  relationshipId: string
  type: EventType
  content: string
  /** undefined → 시간 불명 (덩어리 대화) */
  timestamp?: number | null
  attachments?: string[]
  contextTags?: string[]
}): Promise<{ eventId: string }> {
  const uid = await requireUserId()
  await assertRelationshipOwned(input.relationshipId, uid)

  const id = `evt-${randomUUID()}`

  await db.insert(events).values({
    id,
    userId: uid,
    relationshipId: input.relationshipId,
    timestamp:
      input.timestamp == null ? null : new Date(input.timestamp),
    type: input.type,
    content: input.content,
    attachments: input.attachments ?? [],
    contextTags: input.contextTags ?? [],
  })

  revalidatePath('/')
  revalidatePath('/timeline')
  revalidatePath(`/r/${input.relationshipId}`)
  return { eventId: id }
}

export async function listEvents(
  relationshipId: string,
  limit = 200
): Promise<Event[]> {
  const uid = await requireUserId()
  return db
    .select()
    .from(events)
    .where(and(eq(events.relationshipId, relationshipId), eq(events.userId, uid)))
    .orderBy(
      // null timestamp 는 뒤로
      desc(events.timestamp),
      desc(events.createdAt)
    )
    .limit(limit)
}

export async function updateEvent(input: {
  id: string
  type?: EventType
  content?: string
  timestamp?: number | null
}): Promise<void> {
  const uid = await requireUserId()
  const updates: Record<string, unknown> = {}
  if (input.type !== undefined) updates.type = input.type
  if (input.content !== undefined) updates.content = input.content
  if (input.timestamp !== undefined) {
    updates.timestamp =
      input.timestamp == null ? null : new Date(input.timestamp)
  }

  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, input.id), eq(events.userId, uid)))
    .limit(1)
  if (!row) throw new Error('Event not found')

  await db
    .update(events)
    .set(updates)
    .where(and(eq(events.id, input.id), eq(events.userId, uid)))
  revalidatePath('/timeline')
  revalidatePath(`/r/${row.relationshipId}`)
}

export async function deleteEvent(id: string): Promise<void> {
  const uid = await requireUserId()
  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.userId, uid)))
    .limit(1)
  if (!row) return
  await db.delete(events).where(and(eq(events.id, id), eq(events.userId, uid)))
  revalidatePath('/timeline')
  revalidatePath(`/r/${row.relationshipId}`)
}

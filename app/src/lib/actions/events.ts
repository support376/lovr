'use server'

import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db/client'
import { events, relationships, type Event } from '../db/schema'
import { ensureRuntimeColumns } from '../db/ensure'
import { requireUserId } from '../supabase/server'

export type EventType =
  | 'message'
  | 'conversation'
  | 'meeting'
  | 'call'
  | 'note'
  | 'milestone'
  | 'conflict'
  | 'recovery'
  | 'external_info'

export type EventSender = 'me' | 'partner' | null

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
  timestamp?: number
  transcript?: string
  attachments?: string[]
  selfNote?: string
  contextTags?: string[]
  sender?: EventSender
}): Promise<{ eventId: string }> {
  await ensureRuntimeColumns()
  const uid = await requireUserId()
  await assertRelationshipOwned(input.relationshipId, uid)

  const id = `evt-${randomUUID()}`
  const ts = input.timestamp ?? Date.now()

  await db.insert(events).values({
    id,
    userId: uid,
    relationshipId: input.relationshipId,
    timestamp: new Date(ts),
    type: input.type,
    content: input.content,
    transcript: input.transcript ?? null,
    sender: input.sender ?? null,
    attachments: input.attachments ?? [],
    selfNote: input.selfNote ?? null,
    contextTags: input.contextTags ?? [],
  })

  revalidatePath('/')
  revalidatePath('/timeline')
  return { eventId: id }
}

export async function listEvents(
  relationshipId: string,
  limit = 200
): Promise<Event[]> {
  await ensureRuntimeColumns()
  const uid = await requireUserId()
  return db
    .select()
    .from(events)
    .where(and(eq(events.relationshipId, relationshipId), eq(events.userId, uid)))
    .orderBy(desc(events.timestamp))
    .limit(limit)
}

export async function updateEvent(input: {
  id: string
  type?: EventType
  content?: string
  selfNote?: string | null
  timestamp?: number
  sender?: EventSender
}): Promise<void> {
  await ensureRuntimeColumns()
  const uid = await requireUserId()
  const updates: Record<string, unknown> = {}
  if (input.type !== undefined) updates.type = input.type
  if (input.content !== undefined) updates.content = input.content
  if (input.selfNote !== undefined) updates.selfNote = input.selfNote
  if (input.timestamp !== undefined) updates.timestamp = new Date(input.timestamp)
  if (input.sender !== undefined) updates.sender = input.sender

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

export async function listRecentEvents(
  relationshipId: string,
  sinceDays: number
): Promise<Event[]> {
  await ensureRuntimeColumns()
  const uid = await requireUserId()
  const all = await db
    .select()
    .from(events)
    .where(and(eq(events.relationshipId, relationshipId), eq(events.userId, uid)))
    .orderBy(desc(events.timestamp))
  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000
  return all.filter((e) => {
    const t = e.timestamp instanceof Date ? e.timestamp.getTime() : Number(e.timestamp)
    return t >= cutoff
  })
}

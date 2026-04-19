'use server'

import { randomUUID } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db/client'
import { events, type Event } from '../db/schema'
import { ensureSchema } from '../db/init'

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

/**
 * Event 추가 — append-only. 수정/삭제 금지 원칙.
 * content는 raw markdown 그대로 저장.
 */
export async function addEvent(input: {
  relationshipId: string
  type: EventType
  content: string
  timestamp?: number
  transcript?: string
  attachments?: string[]
  selfNote?: string
  contextTags?: string[]
}): Promise<{ eventId: string }> {
  await ensureSchema()

  const id = `evt-${randomUUID()}`
  const ts = input.timestamp ?? Date.now()

  await db.insert(events).values({
    id,
    relationshipId: input.relationshipId,
    timestamp: new Date(ts),
    type: input.type,
    content: input.content,
    transcript: input.transcript ?? null,
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
  await ensureSchema()
  return db
    .select()
    .from(events)
    .where(eq(events.relationshipId, relationshipId))
    .orderBy(desc(events.timestamp))
    .limit(limit)
}

/** Event 수정 — 날짜·타입·내용 변경 가능. */
export async function updateEvent(input: {
  id: string
  type?: EventType
  content?: string
  timestamp?: number
}): Promise<void> {
  await ensureSchema()
  const updates: Record<string, unknown> = {}
  if (input.type !== undefined) updates.type = input.type
  if (input.content !== undefined) updates.content = input.content
  if (input.timestamp !== undefined) updates.timestamp = new Date(input.timestamp)

  const [row] = await db.select().from(events).where(eq(events.id, input.id)).limit(1)
  if (!row) throw new Error('Event not found')

  await db.update(events).set(updates).where(eq(events.id, input.id))
  revalidatePath('/timeline')
  revalidatePath(`/r/${row.relationshipId}`)
}

export async function deleteEvent(id: string): Promise<void> {
  await ensureSchema()
  const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1)
  if (!row) return
  await db.delete(events).where(eq(events.id, id))
  revalidatePath('/timeline')
  revalidatePath(`/r/${row.relationshipId}`)
}

/** 주간 리포트 등에서 최근 N일 범위. */
export async function listRecentEvents(
  relationshipId: string,
  sinceDays: number
): Promise<Event[]> {
  await ensureSchema()
  const all = await db
    .select()
    .from(events)
    .where(eq(events.relationshipId, relationshipId))
    .orderBy(desc(events.timestamp))
  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000
  return all.filter((e) => {
    const t = e.timestamp instanceof Date ? e.timestamp.getTime() : Number(e.timestamp)
    return t >= cutoff
  })
}

'use server'

import { randomUUID } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db/client'
import { conversations, type Conversation } from '../db/schema'
import { ensureSchema } from '../db/init'

export type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
  at: number
}

export async function createConversation(input?: {
  relationshipId?: string | null
  title?: string
}): Promise<Conversation> {
  await ensureSchema()
  const id = `conv-${randomUUID()}`
  const [row] = await db
    .insert(conversations)
    .values({
      id,
      relationshipId: input?.relationshipId ?? null,
      title: input?.title ?? '새 대화',
      messages: [],
    })
    .returning()
  revalidatePath('/')
  return row
}

export async function appendConversationMessage(input: {
  id: string
  role: 'user' | 'assistant'
  content: string
}): Promise<void> {
  await ensureSchema()
  const [row] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, input.id))
    .limit(1)
  if (!row) throw new Error('Conversation not found')

  const next: ConversationMessage[] = [
    ...(row.messages ?? []),
    { role: input.role, content: input.content, at: Date.now() },
  ]

  // 첫 user 메시지면 title 자동 업데이트
  let title = row.title
  if (
    (row.messages ?? []).length === 0 &&
    input.role === 'user' &&
    (!title || title === '새 대화')
  ) {
    title = input.content.slice(0, 40).replace(/\n/g, ' ').trim() || '새 대화'
  }

  await db
    .update(conversations)
    .set({ messages: next, title, updatedAt: new Date() })
    .where(eq(conversations.id, input.id))
  revalidatePath('/')
}

export async function listConversations(limit = 20): Promise<
  Array<{
    id: string
    title: string
    updatedAt: number
    messageCount: number
  }>
> {
  await ensureSchema()
  const rows = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updatedAt))
    .limit(limit)
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt:
      r.updatedAt instanceof Date ? r.updatedAt.getTime() : Number(r.updatedAt),
    messageCount: (r.messages ?? []).length,
  }))
}

export async function getConversation(id: string): Promise<Conversation | null> {
  await ensureSchema()
  const [row] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1)
  return row ?? null
}

export async function deleteConversation(id: string): Promise<void> {
  await ensureSchema()
  await db.delete(conversations).where(eq(conversations.id, id))
  revalidatePath('/')
}

export async function getOrCreateLatestConversation(
  relationshipId?: string | null
): Promise<Conversation> {
  await ensureSchema()
  const recent = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updatedAt))
    .limit(1)
  if (recent[0]) return recent[0]
  return createConversation({ relationshipId })
}

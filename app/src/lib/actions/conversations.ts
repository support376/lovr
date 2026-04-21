'use server'

import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db/client'
import { conversations, type Conversation } from '../db/schema'
import { requireUserId } from '../supabase/server'

export type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
  at: number
}

export async function createConversation(input?: {
  relationshipId?: string | null
  title?: string
}): Promise<Conversation> {
  const uid = await requireUserId()
  const id = `conv-${randomUUID()}`
  const [row] = await db
    .insert(conversations)
    .values({
      id,
      userId: uid,
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
  const uid = await requireUserId()
  const [row] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, input.id), eq(conversations.userId, uid)))
    .limit(1)
  if (!row) throw new Error('Conversation not found')

  const next: ConversationMessage[] = [
    ...(row.messages ?? []),
    { role: input.role, content: input.content, at: Date.now() },
  ]

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
    .where(and(eq(conversations.id, input.id), eq(conversations.userId, uid)))
  revalidatePath('/')
}

export type ConvMetaResult = {
  ok: true
  items: Array<{
    id: string
    title: string
    updatedAt: number
    messageCount: number
    relationshipId: string | null
  }>
} | { ok: false; error: string }

export async function listConversations(
  limit = 20,
  relationshipId?: string | null
): Promise<ConvMetaResult> {
  try {
    const uid = await requireUserId()
    const where =
      relationshipId !== undefined
        ? and(
            eq(conversations.userId, uid),
            relationshipId === null
              ? eq(conversations.relationshipId, '__never__')
              : eq(conversations.relationshipId, relationshipId)
          )
        : eq(conversations.userId, uid)

    const rows = await db
      .select()
      .from(conversations)
      .where(where)
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
    return {
      ok: true,
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        updatedAt:
          r.updatedAt instanceof Date
            ? r.updatedAt.getTime()
            : Number(r.updatedAt),
        messageCount: (r.messages ?? []).length,
        relationshipId: r.relationshipId ?? null,
      })),
    }
  } catch (e) {
    console.error('[listConversations]', e)
    return {
      ok: false,
      error: (e as Error).message || String(e),
    }
  }
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const uid = await requireUserId()
  const [row] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, uid)))
    .limit(1)
  return row ?? null
}

export async function deleteConversation(id: string): Promise<void> {
  const uid = await requireUserId()
  await db
    .delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, uid)))
  revalidatePath('/')
}

export async function getOrCreateLatestConversation(
  relationshipId?: string | null
): Promise<Conversation> {
  const uid = await requireUserId()
  const recent = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, uid))
    .orderBy(desc(conversations.updatedAt))
    .limit(1)
  if (recent[0]) return recent[0]
  return createConversation({ relationshipId })
}

/**
 * 홈 채팅 한 세션 전체를 한 번에 아카이브.
 * 메모리에 쌓인 messages 를 받아 새 conversation 로우 1개로 박음.
 * 실패해도 UI 는 계속 돌도록 result 객체 반환.
 */
export async function archiveChat(input: {
  relationshipId?: string | null
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<{ ok: true; id: string; title: string } | { ok: false; error: string }> {
  try {
    const uid = await requireUserId()
    const filtered = input.messages.filter((m) => m.content.trim().length > 0)
    if (filtered.length === 0) {
      return { ok: false, error: '저장할 내용 없음' }
    }

    const now = Date.now()
    const msgs: ConversationMessage[] = filtered.map((m) => ({
      role: m.role,
      content: m.content,
      at: now,
    }))

    const firstUser = msgs.find((m) => m.role === 'user')?.content ?? '대화'
    const title = firstUser.slice(0, 40).replace(/\n/g, ' ').trim() || '대화'

    const id = `conv-${randomUUID()}`
    await db.insert(conversations).values({
      id,
      userId: uid,
      relationshipId: input.relationshipId ?? null,
      title,
      messages: msgs,
    })

    revalidatePath('/')
    return { ok: true, id, title }
  } catch (e) {
    console.error('[archiveChat]', e)
    return { ok: false, error: (e as Error).message ?? 'unknown' }
  }
}

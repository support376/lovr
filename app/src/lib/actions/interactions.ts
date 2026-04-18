'use server'

import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db/client'
import {
  interactions,
  targets,
  type InteractionPayload,
  type TargetStats,
} from '../db/schema'
import { ensureSchema } from '../db/init'
import { updateTargetProfile } from '../ai/profile-updater'
import { getSelfOrThrow } from './self'

/**
 * Interaction 하나 추가 → stats 갱신.
 * `triggerProfileUpdate`가 true면 즉시 프로파일 재학습.
 */
export async function addInteraction(input: {
  targetId: string
  occurredAt?: number
  payload: InteractionPayload
  triggerProfileUpdate?: boolean
}): Promise<{ interactionId: string; profileUpdated: boolean }> {
  await ensureSchema()

  const id = randomUUID()
  const when = input.occurredAt ?? Date.now()

  await db.insert(interactions).values({
    id,
    targetId: input.targetId,
    occurredAt: new Date(when),
    type: input.payload.kind,
    payload: input.payload,
    analyzed: false,
  })

  // stats 갱신
  await updateStatsForPayload(input.targetId, input.payload)

  let profileUpdated = false
  if (input.triggerProfileUpdate && input.payload.kind === 'message') {
    try {
      const self = await getSelfOrThrow()
      const [target] = await db.select().from(targets).where(eq(targets.id, input.targetId))
      if (target) {
        await updateTargetProfile(self, target)
        profileUpdated = true
      }
    } catch (err) {
      // 프로파일 업데이트는 실패해도 interaction 저장은 유지
      console.error('[profile update failed]', err)
    }
  }

  revalidatePath(`/t/${input.targetId}`)
  revalidatePath('/')
  return { interactionId: id, profileUpdated }
}

/**
 * 대량 메시지 한 번에 추가 (붙여넣기 케이스).
 * 각 줄을 sender 지정해서 넣은 뒤, 마지막에 1회 프로파일 갱신.
 */
export async function addBulkMessages(input: {
  targetId: string
  messages: Array<{ sender: 'me' | 'them'; text: string; occurredAt?: number }>
  triggerProfileUpdate?: boolean
}): Promise<{ count: number; profileUpdated: boolean }> {
  await ensureSchema()
  if (input.messages.length === 0) {
    return { count: 0, profileUpdated: false }
  }

  const now = Date.now()
  const rows = input.messages.map((m, i) => ({
    id: randomUUID(),
    targetId: input.targetId,
    occurredAt: new Date(m.occurredAt ?? now - (input.messages.length - i) * 1000),
    type: 'message' as const,
    payload: { kind: 'message' as const, sender: m.sender, text: m.text },
    analyzed: false,
  }))
  await db.insert(interactions).values(rows)

  for (const m of input.messages) {
    await updateStatsForPayload(input.targetId, {
      kind: 'message',
      sender: m.sender,
      text: m.text,
    })
  }

  let profileUpdated = false
  if (input.triggerProfileUpdate ?? true) {
    try {
      const self = await getSelfOrThrow()
      const [target] = await db.select().from(targets).where(eq(targets.id, input.targetId))
      if (target) {
        await updateTargetProfile(self, target)
        profileUpdated = true
      }
    } catch (err) {
      console.error('[profile update failed]', err)
    }
  }

  revalidatePath(`/t/${input.targetId}`)
  revalidatePath('/')
  return { count: input.messages.length, profileUpdated }
}

async function updateStatsForPayload(targetId: string, payload: InteractionPayload) {
  const [target] = await db.select().from(targets).where(eq(targets.id, targetId)).limit(1)
  if (!target) return

  const stats: TargetStats = { ...target.stats }
  stats.lastInteractionAt = Date.now()

  if (payload.kind === 'message') {
    stats.messageCount++
    stats.totalChars += payload.text.length
    if (payload.sender === 'me') stats.myMessageCount++
    else stats.theirMessageCount++
  }

  await db
    .update(targets)
    .set({ stats, updatedAt: new Date() })
    .where(eq(targets.id, targetId))
}

export async function labelOutcome(input: {
  targetId: string
  strategyId?: string
  label: 'good' | 'bad' | 'neutral'
  note?: string
  tags?: string[]
}) {
  await ensureSchema()
  await db.insert(interactions).values({
    id: randomUUID(),
    targetId: input.targetId,
    occurredAt: new Date(),
    type: 'outcome',
    payload: {
      kind: 'outcome',
      label: input.label,
      note: input.note,
      tags: input.tags,
    },
    analyzed: true,
  })

  revalidatePath(`/t/${input.targetId}`)
}

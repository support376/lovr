'use server'

import { randomUUID } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db/client'
import {
  interactions,
  profileSnapshots,
  strategies,
  targets,
  type Target,
  type TargetGoal,
} from '../db/schema'
import { ensureSchema } from '../db/init'
import { getSelfOrThrow } from './self'

export async function listTargets(): Promise<Target[]> {
  await ensureSchema()
  const self = await getSelfOrThrow().catch(() => null)
  if (!self) return []
  return db
    .select()
    .from(targets)
    .where(eq(targets.selfId, self.id))
    .orderBy(desc(targets.updatedAt))
}

export async function getTarget(id: string): Promise<Target | null> {
  await ensureSchema()
  const rows = await db.select().from(targets).where(eq(targets.id, id)).limit(1)
  return rows[0] ?? null
}

type TargetInput = {
  alias: string
  age?: number
  gender?: string
  job?: string
  matchPlatform?: string
  avatarEmoji?: string
  goal?: TargetGoal
  notes?: string
  firstContactAt?: number
  mbti?: string
  background?: string
  commonGround?: string
  relationshipHistory?: string
  physicalDescription?: string
  interests?: string[]
  currentSituation?: string
  stage?: string
}

export async function createTarget(input: TargetInput): Promise<Target> {
  await ensureSchema()
  const self = await getSelfOrThrow()

  const id = randomUUID()
  const [created] = await db
    .insert(targets)
    .values({
      id,
      selfId: self.id,
      alias: input.alias,
      age: input.age ?? null,
      gender: input.gender ?? null,
      job: input.job ?? null,
      matchPlatform: input.matchPlatform ?? null,
      avatarEmoji: input.avatarEmoji ?? '💭',
      goal: input.goal ?? { preset: 'explore', description: '일단 탐색' },
      notes: input.notes ?? null,
      firstContactAt: input.firstContactAt ? new Date(input.firstContactAt) : null,
      mbti: input.mbti ?? null,
      background: input.background ?? null,
      commonGround: input.commonGround ?? null,
      relationshipHistory: input.relationshipHistory ?? null,
      physicalDescription: input.physicalDescription ?? null,
      interests: input.interests ?? [],
      currentSituation: input.currentSituation ?? null,
      stage: (input.stage as Target['stage']) ?? 'matched',
      profile: {},
      stats: {
        messageCount: 0,
        myMessageCount: 0,
        theirMessageCount: 0,
        totalChars: 0,
        lastInteractionAt: null,
      },
      tags: [],
    })
    .returning()

  revalidatePath('/')
  return created
}

export async function updateTargetGoal(
  id: string,
  goal: TargetGoal
): Promise<Target> {
  await ensureSchema()
  const [updated] = await db
    .update(targets)
    .set({ goal, updatedAt: new Date() })
    .where(eq(targets.id, id))
    .returning()
  revalidatePath(`/t/${id}`)
  revalidatePath('/')
  return updated
}

export async function updateTargetStage(
  id: string,
  stage: Target['stage']
): Promise<Target> {
  await ensureSchema()
  const [updated] = await db
    .update(targets)
    .set({ stage, updatedAt: new Date() })
    .where(eq(targets.id, id))
    .returning()
  revalidatePath(`/t/${id}`)
  revalidatePath('/')
  return updated
}

const TARGET_META_FIELDS = [
  'alias', 'age', 'gender', 'job', 'matchPlatform', 'notes', 'avatarEmoji',
  'tags', 'mbti', 'background', 'commonGround', 'relationshipHistory',
  'physicalDescription', 'interests', 'currentSituation',
] as const

export async function updateTargetMeta(
  id: string,
  input: Partial<Record<(typeof TARGET_META_FIELDS)[number], unknown>>
): Promise<Target> {
  await ensureSchema()
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  for (const k of TARGET_META_FIELDS) {
    const v = input[k]
    if (v !== undefined) updates[k] = v
  }
  const [updated] = await db
    .update(targets)
    .set(updates)
    .where(eq(targets.id, id))
    .returning()
  revalidatePath(`/t/${id}`)
  return updated
}

export async function archiveTarget(id: string): Promise<void> {
  await ensureSchema()
  await db.update(targets).set({ archived: true }).where(eq(targets.id, id))
  revalidatePath('/')
}

export async function deleteTarget(id: string): Promise<void> {
  await ensureSchema()
  // interactions, snapshots, strategies는 ON DELETE CASCADE
  await db.delete(targets).where(eq(targets.id, id))
  revalidatePath('/')
}

export async function getTargetSnapshots(id: string) {
  await ensureSchema()
  return db
    .select()
    .from(profileSnapshots)
    .where(eq(profileSnapshots.targetId, id))
    .orderBy(desc(profileSnapshots.createdAt))
}

export async function getTargetStrategies(id: string) {
  await ensureSchema()
  return db
    .select()
    .from(strategies)
    .where(eq(strategies.targetId, id))
    .orderBy(desc(strategies.createdAt))
}

export async function getTargetInteractions(id: string, limit = 200) {
  await ensureSchema()
  return db
    .select()
    .from(interactions)
    .where(eq(interactions.targetId, id))
    .orderBy(desc(interactions.occurredAt))
    .limit(limit)
}

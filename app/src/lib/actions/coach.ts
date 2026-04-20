'use server'

import { revalidatePath } from 'next/cache'
import * as engine from '../engine/coach'
import { db } from '../db/client'
import { goals, type Goal } from '../db/schema'
import { ensureSchema } from '../db/init'
import { randomUUID } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { evaluateGoal } from '../rules/ethics'
import { getSelfOrThrow } from './self'
import { actors } from '../db/schema'

export type ProposeResult =
  | { ok: true; actionId: string; markdown: string; ethicsStatus: string }
  | { ok: false; error: string; where?: string }

export async function proposeStrategyAction(input: {
  relationshipId: string
  goalId: string
  currentSituation: string
}): Promise<ProposeResult> {
  try {
    const result = await engine.proposeStrategy(input)
    revalidatePath(`/r/${input.relationshipId}`)
    return { ok: true, ...result }
  } catch (e) {
    const msg = (e as Error).message ?? 'unknown'
    const stack = (e as Error).stack ?? ''
    console.error('[proposeStrategyAction]', { input, error: msg, stack })
    // 에러 위치 힌트 추출 (stack 상위 1줄)
    const where = stack
      .split('\n')
      .slice(1, 4)
      .join(' | ')
      .slice(0, 300)
    return { ok: false, error: msg, where }
  }
}

export async function analyzeOutcomeAction(actionId: string) {
  const result = await engine.analyzeOutcome(actionId)
  revalidatePath('/')
  return result
}

export async function markActionExecutedAction(actionId: string) {
  await engine.markActionExecuted(actionId)
  revalidatePath('/')
}

export async function markActionCancelledAction(actionId: string) {
  await engine.markActionCancelled(actionId)
  revalidatePath('/')
}

export async function recordManualOutcomeAction(input: {
  actionId: string
  narrative: string
  goalProgress: 'advanced' | 'stagnant' | 'regressed' | 'unclear'
}) {
  try {
    const res = await engine.recordManualOutcome(input)
    revalidatePath('/')
    return res
  } catch (e) {
    console.error('[recordManualOutcomeAction]', e)
    throw new Error(
      `결과 저장 실패: ${(e as Error).message ?? 'unknown'}`
    )
  }
}

export async function generateWeeklyReportAction(relationshipId: string) {
  return engine.generateWeeklyReport(relationshipId)
}

export async function createGoalAction(input: {
  relationshipId: string
  partnerId: string
  category: Goal['category']
  description?: string
}): Promise<{
  goalId: string
  ethicsStatus: string
  reasons: string[]
}> {
  await ensureSchema()
  const self = await getSelfOrThrow()
  const [partner] = await db
    .select()
    .from(actors)
    .where(eq(actors.id, input.partnerId))
    .limit(1)
  if (!partner) throw new Error('Partner not found')

  const ev = evaluateGoal({
    self,
    partner,
    goalCategory: input.category,
  })

  // 단일 활성 goal 정책 — 기존 activated goal 은 deprecate
  const now = new Date()
  await db
    .update(goals)
    .set({ deprecatedAt: now })
    .where(
      and(eq(goals.relationshipId, input.relationshipId), isNull(goals.deprecatedAt))
    )

  const id = `goal-${randomUUID()}`
  await db.insert(goals).values({
    id,
    relationshipId: input.relationshipId,
    category: input.category,
    description: input.description ?? input.category,
    priority: 'primary',
    ethicsStatus: ev.status,
    ethicsReasons: ev.results.map((r) => `[${r.ruleId}] ${r.reason}`),
    applicableLaws: ev.applicableLaws,
  })

  revalidatePath(`/r/${input.relationshipId}`)

  return {
    goalId: id,
    ethicsStatus: ev.status,
    reasons: ev.results.map((r) => r.reason),
  }
}

export async function deprecateGoalAction(goalId: string) {
  await ensureSchema()
  await db.update(goals).set({ deprecatedAt: new Date() }).where(eq(goals.id, goalId))
  revalidatePath('/')
}

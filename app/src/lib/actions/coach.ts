'use server'

import { revalidatePath } from 'next/cache'
import * as engine from '../engine/coach'
import { db } from '../db/client'
import { goals, type Goal } from '../db/schema'
import { ensureSchema } from '../db/init'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { evaluateGoal } from '../rules/ethics'
import { getSelfOrThrow } from './self'
import { actors } from '../db/schema'

export async function proposeStrategyAction(input: {
  relationshipId: string
  goalId: string
  currentSituation: string
}) {
  const result = await engine.proposeStrategy(input)
  revalidatePath(`/r/${input.relationshipId}`)
  return result
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
  const res = await engine.recordManualOutcome(input)
  revalidatePath('/')
  return res
}

export async function generateWeeklyReportAction(relationshipId: string) {
  return engine.generateWeeklyReport(relationshipId)
}

export async function createGoalAction(input: {
  relationshipId: string
  partnerId: string
  category: Goal['category']
  description: string
  priority?: 'primary' | 'secondary'
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

  const id = `goal-${randomUUID()}`
  await db.insert(goals).values({
    id,
    relationshipId: input.relationshipId,
    category: input.category,
    description: input.description,
    priority: input.priority ?? 'primary',
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

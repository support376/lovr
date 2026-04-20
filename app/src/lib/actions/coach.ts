'use server'

import { revalidatePath } from 'next/cache'
import * as engine from '../engine/coach'
import { requireUserId } from '../supabase/server'

export async function proposeStrategyAction(input: {
  relationshipId: string
  currentSituation?: string
}) {
  const uid = await requireUserId()
  const result = await engine.proposeStrategy({ userId: uid, ...input })
  revalidatePath(`/r/${input.relationshipId}`)
  return result
}

export async function analyzeOutcomeAction(actionId: string, userNote?: string) {
  const uid = await requireUserId()
  const result = await engine.analyzeOutcome(uid, actionId, userNote)
  revalidatePath('/')
  return result
}

export async function markActionExecutedAction(actionId: string) {
  const uid = await requireUserId()
  await engine.markActionExecuted(uid, actionId)
  revalidatePath('/')
}

export async function generateWeeklyReportAction(relationshipId: string) {
  const uid = await requireUserId()
  return engine.generateWeeklyReport(uid, relationshipId)
}

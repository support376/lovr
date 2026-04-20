'use server'

import { revalidatePath } from 'next/cache'
import * as engine from '../engine/coach'

export async function proposeStrategyAction(input: {
  relationshipId: string
  currentSituation?: string
}) {
  const result = await engine.proposeStrategy(input)
  revalidatePath(`/r/${input.relationshipId}`)
  return result
}

export async function analyzeOutcomeAction(actionId: string, userNote?: string) {
  const result = await engine.analyzeOutcome(actionId, userNote)
  revalidatePath('/')
  return result
}

export async function markActionExecutedAction(actionId: string) {
  await engine.markActionExecuted(actionId)
  revalidatePath('/')
}

export async function generateWeeklyReportAction(relationshipId: string) {
  return engine.generateWeeklyReport(relationshipId)
}

'use server'

import { revalidatePath } from 'next/cache'
import {
  extractRelationshipModel,
  simulateResponse,
} from '../engine/model'
import { requireUserId } from '../supabase/server'

export type ModelActionResult =
  | { ok: true; confidence: number; rulesCount: number; evidenceCount: number; version: number }
  | { ok: false; error: string }

export async function extractModelAction(
  relationshipId: string
): Promise<ModelActionResult> {
  try {
    const uid = await requireUserId()
    const { model, evidenceCount } = await extractRelationshipModel(
      uid,
      relationshipId
    )
    revalidatePath(`/r/${relationshipId}`)
    return {
      ok: true,
      confidence: model.confidenceOverall,
      rulesCount: model.rules.length,
      evidenceCount,
      version: model.version,
    }
  } catch (e) {
    console.error('[extractModelAction]', e)
    return { ok: false, error: (e as Error).message ?? 'unknown' }
  }
}

export type SimulateResult =
  | { ok: true; markdown: string }
  | { ok: false; error: string }

export async function simulateResponseAction(
  relationshipId: string,
  proposedX: string
): Promise<SimulateResult> {
  try {
    const uid = await requireUserId()
    const { markdown } = await simulateResponse(uid, relationshipId, proposedX)
    return { ok: true, markdown }
  } catch (e) {
    console.error('[simulateResponseAction]', e)
    return { ok: false, error: (e as Error).message ?? 'unknown' }
  }
}

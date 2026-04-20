'use server'

import { revalidatePath } from 'next/cache'
import * as engine from '../engine/insights'
import { requireUserId } from '../supabase/server'

export async function saveInsightsFromReportAction(input: {
  relationshipId: string
  reportMarkdown: string
}) {
  const uid = await requireUserId()
  const r = await engine.saveInsightsFromReport({ userId: uid, ...input })
  revalidatePath(`/r/${input.relationshipId}/report`)
  revalidatePath(`/r/${input.relationshipId}`)
  return r
}

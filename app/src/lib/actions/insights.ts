'use server'

import { revalidatePath } from 'next/cache'
import * as engine from '../engine/insights'

export async function saveInsightsFromReportAction(input: {
  relationshipId: string
  reportMarkdown: string
}) {
  const r = await engine.saveInsightsFromReport(input)
  revalidatePath(`/r/${input.relationshipId}/report`)
  revalidatePath(`/r/${input.relationshipId}`)
  return r
}

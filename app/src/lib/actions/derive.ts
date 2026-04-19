'use server'

import { revalidatePath } from 'next/cache'
import * as engine from '../engine/derive'

export async function deriveRelationshipStateAction(relationshipId: string) {
  const r = await engine.deriveRelationshipState(relationshipId)
  revalidatePath(`/r/${relationshipId}`)
  return r
}

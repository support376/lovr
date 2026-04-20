'use server'

import { revalidatePath } from 'next/cache'
import * as engine from '../engine/derive'
import { requireUserId } from '../supabase/server'

export async function deriveRelationshipStateAction(relationshipId: string) {
  const uid = await requireUserId()
  const r = await engine.deriveRelationshipState(uid, relationshipId)
  revalidatePath(`/r/${relationshipId}`)
  revalidatePath('/timeline')
  return r
}

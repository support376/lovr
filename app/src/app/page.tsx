import { getSelf } from '@/lib/actions/self'
import { getCurrentRelationship } from '@/lib/actions/relationships'
import { Landing } from '@/components/Landing'
import { LuvAIClientShell } from './LuvAIHomeClient'

export default async function LuvAIHome() {
  const self = await getSelf()
  if (!self) return <Landing />

  const cur = await getCurrentRelationship()

  return <LuvAIClientShell targetAlias={cur?.partner.displayName ?? null} />
}

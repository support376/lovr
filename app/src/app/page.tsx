import { getSelf } from '@/lib/actions/self'
import {
  getCurrentRelationship,
  listRelationships,
} from '@/lib/actions/relationships'
import { Landing } from '@/components/Landing'
import { LuvAIClientShell } from './LuvAIHomeClient'
import { TargetSwitcher } from '@/components/TargetSwitcher'

export default async function LuvAIHome() {
  const self = await getSelf()
  if (!self) return <Landing />

  const cur = await getCurrentRelationship()
  const all = await listRelationships()

  return (
    <>
      {all.length > 0 && (
        <div className="pt-3 pb-1">
          <TargetSwitcher
            relationships={all}
            currentId={cur?.id ?? null}
            buildHref={() => `/`}
          />
        </div>
      )}
      <LuvAIClientShell targetAlias={cur?.partner.displayName ?? null} />
    </>
  )
}

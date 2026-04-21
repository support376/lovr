import { getSelf } from '@/lib/actions/self'
import {
  getCurrentRelationship,
  listRelationships,
} from '@/lib/actions/relationships'
import { Landing } from '@/components/Landing'
import { LuvAIClientShell } from './LuvAIHomeClient'
import { TargetSwitcher } from '@/components/TargetSwitcher'

export default async function LuvAIHome() {
  try {
    const self = await getSelf()
    if (!self) return <Landing />

    let cur: Awaited<ReturnType<typeof getCurrentRelationship>> = null
    let all: Awaited<ReturnType<typeof listRelationships>> = []

    try {
      all = await listRelationships()
    } catch (e) {
      console.error('[LuvAIHome listRelationships]', e)
    }
    try {
      cur = await getCurrentRelationship()
    } catch (e) {
      console.error('[LuvAIHome getCurrentRelationship]', e)
    }

    const hasModel = !!(cur?.model && cur.model.rules && cur.model.rules.length > 0)

    return (
      <>
        {all.length > 0 && (
          <div className="pt-3 pb-1">
            <TargetSwitcher
              relationships={all}
              currentId={cur?.id ?? null}
              route={{ kind: 'refresh' }}
            />
          </div>
        )}
        <LuvAIClientShell
          targetAlias={cur?.partner.displayName ?? null}
          relationshipId={cur?.id ?? null}
          hasModel={hasModel}
        />
      </>
    )
  } catch (e) {
    console.error('[LuvAIHome render]', e)
    return (
      <div className="p-5 text-sm">
        <div className="font-semibold mb-2">홈 로드 실패</div>
        <pre className="text-xs text-muted whitespace-pre-wrap bg-bad/5 border border-bad/30 rounded p-3">
          {(e as Error).message ?? 'unknown'}
        </pre>
      </div>
    )
  }
}

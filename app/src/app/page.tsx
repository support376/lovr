import { redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import { getCurrentRelationship } from '@/lib/actions/relationships'
import { currentUserId } from '@/lib/supabase/server'
import { Landing } from '@/components/Landing'
import { LuvAIClientShell } from './LuvAIHomeClient'
import { CurrentTargetHeader } from '@/components/CurrentTargetHeader'

export default async function LuvAIHome() {
  try {
    const uid = await currentUserId().catch((e) => {
      console.error('[LuvAIHome currentUserId]', e)
      return null
    })
    if (!uid) return <Landing />

    const self = await getSelf().catch((e) => {
      console.error('[LuvAIHome getSelf]', e)
      return null
    })
    if (!self) return <Landing />

    let cur: Awaited<ReturnType<typeof getCurrentRelationship>> = null
    try {
      cur = await getCurrentRelationship()
    } catch (e) {
      console.error('[LuvAIHome getCurrentRelationship]', e)
    }

    const hasModel = !!(cur?.model && cur.model.rules && cur.model.rules.length > 0)

    return (
      <>
        <CurrentTargetHeader rel={cur} />
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
        <div className="font-semibold mb-2 text-bad">홈 로드 실패</div>
        <pre className="text-xs text-muted whitespace-pre-wrap bg-bad/5 border border-bad/30 rounded p-3">
          {(e as Error).message ?? 'unknown'}
          {(e as Error).stack ? '\n\n' + (e as Error).stack : ''}
        </pre>
      </div>
    )
  }
}

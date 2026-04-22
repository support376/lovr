import { redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import {
  ensureDefaultRelationship,
  getCurrentRelationship,
} from '@/lib/actions/relationships'
import { listConversations } from '@/lib/actions/conversations'
import { listEvents } from '@/lib/actions/events'
import { generateOpeningMessage } from '@/lib/actions/luvai'
import { currentUserId } from '@/lib/supabase/server'
import { Landing } from '@/components/Landing'
import { CurrentTargetHeader } from '@/components/CurrentTargetHeader'
import { LuvAIChat } from './LuvAIChat'

/**
 * 홈 — AI 채팅 (순수 Q&A).
 *
 * 대화 생명주기:
 * - 메모리 전용. 새로고침/네비게이션 시 날아감.
 * - 유저가 "저장" 누르면 conversations 테이블에 아카이브.
 * - 모델 업데이트(updatedAt 변화) 세션 중 감지되면 배너로 저장/리셋 유도.
 */
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

    // self 있는데 relationship 없으면 자동 복구 (기존 유저 포함).
    // "상대 등록" 은 사용자가 명시적으로 할 조건 아님 — 자동.
    if (!cur) {
      try {
        const newRelId = await ensureDefaultRelationship()
        if (newRelId) cur = await getCurrentRelationship()
      } catch (e) {
        console.error('[LuvAIHome ensureDefaultRelationship]', e)
      }
    }

    // 첫 기록 게이트 — 활성 관계 있는데 events 0 건이면 first-event 로.
    if (cur) {
      const seedCheck = await listEvents(cur.id, 1).catch(() => [])
      if (seedCheck.length === 0) redirect('/onboarding/first-event')
    }

    const relationshipId = cur?.id ?? null
    const modelUpdatedAt = cur?.model?.updatedAt ?? null

    const archivesRes = await listConversations(20, relationshipId).catch(
      () => ({ ok: false as const, error: 'list 실패' })
    )
    const archives = archivesRes.ok ? archivesRes.items : []

    // 루바이 선제 발화 — 활성 관계 있을 때만 (events 게이트 통과한 상태).
    const opening = cur ? await generateOpeningMessage().catch(() => null) : null

    return (
      <>
        <CurrentTargetHeader rel={cur} />
        <div className="px-5 pb-4 pt-1 flex-1 flex flex-col min-h-0">
          <LuvAIChat
            relationshipId={relationshipId}
            modelUpdatedAt={modelUpdatedAt}
            archives={archives}
            initialOpeningMessage={opening}
          />
        </div>
      </>
    )
  } catch (e) {
    // Next.js redirect() throws — let it bubble up.
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw e
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

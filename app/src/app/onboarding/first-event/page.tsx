import { redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import { getCurrentRelationship } from '@/lib/actions/relationships'
import { listEvents } from '@/lib/actions/events'
import { PageHeader } from '@/components/ui'
import { FirstEventForm } from './FirstEventForm'

/**
 * 온보딩 직후 게이트 — 첫 기록 1건 입력 강제.
 *
 * 진입 조건:
 *   - self 있음 (없으면 /onboarding 으로)
 *   - 활성 relationship 있음 (없으면 /onboarding 으로 — 비정상 상태)
 *   - events 0건 (이미 있으면 게이트 통과 → /)
 */
export default async function FirstEventPage() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const cur = await getCurrentRelationship()
  if (!cur) redirect('/onboarding')

  const ev = await listEvents(cur.id, 1)
  if (ev.length > 0) redirect('/')

  return (
    <>
      <PageHeader
        title={`${self.displayName}아, 한 가지만`}
        subtitle="카톡 1건 또는 한 줄 메모. 이거 있어야 루바이가 너 상황 보고 첫 마디를 줄 수 있어."
      />
      <div className="px-5 pb-8">
        <FirstEventForm relationshipId={cur.id} />
      </div>
    </>
  )
}

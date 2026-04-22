import { redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import {
  ensureDefaultRelationship,
  getCurrentRelationship,
} from '@/lib/actions/relationships'
import { listEvents } from '@/lib/actions/events'
import { Card, PageHeader } from '@/components/ui'
import { AddEventForm } from './AddEventForm'
import { EventCard } from './EventCard'
import { CurrentTargetHeader } from '@/components/CurrentTargetHeader'

/**
 * 기록 탭 — 현재 상대 1명 기준 대화·사건 로그.
 * self 있는데 relationship 없으면 자동 복구.
 */
export default async function TimelinePage() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  let focused = await getCurrentRelationship()
  if (!focused) {
    await ensureDefaultRelationship()
    focused = await getCurrentRelationship()
  }
  if (!focused) redirect('/')

  const events = await listEvents(focused.id, 100)

  return (
    <>
      <CurrentTargetHeader rel={focused} />
      <PageHeader title="기록" subtitle="대화 · 사건 · 메모" />

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        <AddEventForm relationshipId={focused.id} />

        <section>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            타임라인 ({events.length})
          </div>
          {events.length === 0 ? (
            <Card>
              <div className="text-sm text-muted">
                아직 기록 없음. 위에서 추가하자.
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-1.5">
              {events.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

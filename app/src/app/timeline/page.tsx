import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import { getCurrentRelationship } from '@/lib/actions/relationships'
import { listEvents } from '@/lib/actions/events'
import { Button, Card, Empty, PageHeader } from '@/components/ui'
import { AddEventForm } from './AddEventForm'
import { EventCard } from './EventCard'

/**
 * 기록 탭 — 현재 상대 1명 기준 대화·사건 로그. 상대 전환·프로필은 설정에서.
 */
export default async function TimelinePage() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const focused = await getCurrentRelationship()
  const events = focused ? await listEvents(focused.id, 100) : []

  return (
    <>
      <PageHeader title="기록" subtitle="대화 · 사건 · 메모" />

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        {!focused ? (
          <Empty
            title="등록된 상대 없음"
            subtitle="설정 탭에서 상대를 먼저 추가해줘."
            action={
              <Link href="/r/new">
                <Button>상대 추가</Button>
              </Link>
            }
          />
        ) : (
          <>
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
          </>
        )}
      </div>
    </>
  )
}

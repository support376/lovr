import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { getSelf } from '@/lib/actions/self'
import {
  listRelationships,
  getRelationship,
} from '@/lib/actions/relationships'
import { getFocusRelationshipId } from '@/lib/actions/focus'
import { listEvents } from '@/lib/actions/events'
import { Button, Card, Empty, PageHeader } from '@/components/ui'
import { AddEventForm } from './AddEventForm'
import { EventCard } from './EventCard'
import { PartnerInlineEditor } from '@/app/r/[id]/PartnerInlineEditor'
import { TargetSwitcher } from '@/components/TargetSwitcher'

/**
 * 기록 탭 — 상대별 대화 · 이벤트 누적.
 */
export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ rel?: string }>
}) {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const sp = await searchParams
  const all = await listRelationships()

  // 우선순위: ?rel=X > focus cookie > 첫번째
  const focusId = await getFocusRelationshipId()
  const preferredId = sp.rel ?? focusId ?? all[0]?.id ?? null
  const focused = preferredId ? await getRelationship(preferredId) : null

  const events = focused ? await listEvents(focused.id, 50) : []

  return (
    <>
      <PageHeader
        title="기록"
        subtitle="상대별 대화 · 만남 · 메모"
        right={
          <Link
            href="/r/new"
            className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center"
            aria-label="관계 추가"
          >
            <Plus size={20} />
          </Link>
        }
      />

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        {all.length === 0 ? (
          <Empty
            title="등록된 상대 없음"
            subtitle="상대를 추가하면 대화·만남·메모를 쌓을 수 있어."
            action={
              <Link href="/r/new">
                <Button>
                  <Plus size={16} /> 첫 상대 등록
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className="-mx-5">
              <TargetSwitcher
                relationships={all}
                currentId={focused?.id ?? null}
                buildHref={(id) => `/timeline?rel=${id}`}
              />
            </div>

            {focused && (
              <>
                <PartnerInlineEditor rel={focused} showToggleButton={true} />

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
          </>
        )}
      </div>
    </>
  )
}

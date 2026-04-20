import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { getSelf } from '@/lib/actions/self'
import {
  getCurrentRelationship,
  listRelationships,
  getRelationship,
} from '@/lib/actions/relationships'
import { listEvents } from '@/lib/actions/events'
import { Button, Card, Empty, PageHeader } from '@/components/ui'
import { AddEventForm } from './AddEventForm'
import { EventCard } from './EventCard'

/**
 * 기록 탭 — 대화·사건 로그 전용. 분석·상태 카드는 /r/[id] 로 이동.
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
  let focused = sp.rel ? await getRelationship(sp.rel) : await getCurrentRelationship()
  if (!focused && all[0]) focused = all[0]

  const events = focused ? await listEvents(focused.id, 50) : []

  return (
    <>
      <PageHeader
        title="기록"
        subtitle={
          focused
            ? `${focused.partner.displayName} · 대화 · 만남 · 사건`
            : '먼저 관계를 등록해야 기록할 수 있어'
        }
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

      <div className="px-5 pb-10 flex-1 flex flex-col gap-5">
        {!focused ? (
          <Empty
            title="등록된 관계 없음"
            subtitle="관계를 추가하면 여기서 대화·만남·메모를 쌓을 수 있어."
            action={
              <Link href="/r/new">
                <Button>첫 관계 등록</Button>
              </Link>
            }
          />
        ) : (
          <>
            {all.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {all.map((r) => (
                  <Link
                    key={r.id}
                    href={`/timeline?rel=${r.id}`}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${
                      r.id === focused!.id
                        ? 'bg-accent/15 border-accent/40 text-accent'
                        : 'bg-surface-2 border-border text-muted'
                    }`}
                  >
                    {r.partner.displayName}
                  </Link>
                ))}
              </div>
            )}

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

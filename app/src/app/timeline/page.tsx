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
import { PartnerInlineEditor } from '@/app/r/[id]/PartnerInlineEditor'

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
            ? '상대 정보 · 대화 · 메모 전부 여기서'
            : '먼저 관계를 등록해야 Event를 쌓을 수 있어'
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
            subtitle="관계를 추가하면 여기서 상대 정보 · 대화 · 메모를 쌓을 수 있어."
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

            {/* 상대 프로필 — 접힘 기본. 입력 UI 는 모두 여기 */}
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
      </div>
    </>
  )
}

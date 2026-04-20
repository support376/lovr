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
import { DeriveStateButton } from '../r/[id]/DeriveStateButton'

const PROGRESS_KO: Record<string, string> = {
  unknown: '판단 불가',
  observing: '관찰 중',
  approaching: '다가가는 중',
  exploring: '서로 탐색',
  exclusive: '독점 직전',
  committed: '공식 연인',
  decayed: '식어감',
  ended: '종료',
  pre_match: '매칭 전',
  first_contact: '첫 접촉',
  sseom: '썸',
  dating_early: '연애 초기',
  dating_stable: '연애 안정',
  conflict: '갈등',
  reconnection: '재연결',
}

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
        title="기록 · 분석"
        subtitle={
          focused
            ? `${focused.partner.displayName} · 대화·사건 넣으면 "지금 어떤 상태로 보인다"가 따라와`
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

            {/* 지금 상태 — Event 기반 derive 결과 요약 */}
            <Card className="border-accent/30 bg-gradient-to-br from-accent/5 via-transparent to-accent-2/5">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted uppercase tracking-wider">
                      지금 상태
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-accent/20 text-accent font-medium">
                      {PROGRESS_KO[focused.progress] ?? focused.progress}
                    </span>
                  </div>
                  {(focused.powerBalance ||
                    focused.communicationPattern ||
                    focused.investmentAsymmetry ||
                    focused.escalationSpeed) ? (
                    <ul className="flex flex-col gap-0.5 text-[11px] leading-relaxed">
                      {focused.powerBalance && (
                        <li>
                          <span className="text-muted">· 힘:</span> {focused.powerBalance}
                        </li>
                      )}
                      {focused.communicationPattern && (
                        <li>
                          <span className="text-muted">· 연락:</span>{' '}
                          {focused.communicationPattern}
                        </li>
                      )}
                      {focused.investmentAsymmetry && (
                        <li>
                          <span className="text-muted">· 투자:</span>{' '}
                          {focused.investmentAsymmetry}
                        </li>
                      )}
                      {focused.escalationSpeed && (
                        <li>
                          <span className="text-muted">· 심화:</span>{' '}
                          {focused.escalationSpeed}
                        </li>
                      )}
                    </ul>
                  ) : (
                    <div className="text-[11px] text-muted leading-relaxed">
                      아직 Event 기반 상태 추론 없음. 아래에 대화·사건 1~2개 기록하고 재분석 눌러.
                    </div>
                  )}
                </div>
                <DeriveStateButton relationshipId={focused.id} />
              </div>
            </Card>

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

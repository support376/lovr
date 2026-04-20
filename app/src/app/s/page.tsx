import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Zap } from 'lucide-react'
import { getSelf } from '@/lib/actions/self'
import { getCurrentRelationship, listRelationships } from '@/lib/actions/relationships'
import { Button, Card, Empty, PageHeader } from '@/components/ui'

/**
 * 전략 탭 루트. 현재 active 관계가 있으면 바로 /s/[id] 로.
 * 여러 명이면 리스트. 없으면 관계 추가 유도.
 */
export default async function StrategyHome() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const all = await listRelationships()
  if (all.length === 0) {
    return (
      <>
        <PageHeader title="전략" subtitle="지금 해야할 행동" />
        <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
          <Empty
            title="등록된 관계 없음"
            subtitle="상대를 등록하면 전략을 받을 수 있어."
            action={
              <Link href="/r/new">
                <Button>관계 추가</Button>
              </Link>
            }
          />
        </div>
      </>
    )
  }

  const cur = await getCurrentRelationship()
  // 한 명만 있고 active면 바로 디테일로 점프
  if (all.length === 1 && cur) {
    redirect(`/s/${cur.id}`)
  }

  return (
    <>
      <PageHeader
        title="전략"
        subtitle="상대 선택 → 해야할 행동"
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
      <div className="px-5 pb-10 flex-1 flex flex-col gap-3">
        {all.map((r) => (
          <Link key={r.id} href={`/s/${r.id}`}>
            <Card className="hover:border-accent/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <Zap size={16} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {r.partner.displayName}
                    {r.partner.age ? (
                      <span className="text-muted font-normal ml-1">({r.partner.age})</span>
                    ) : null}
                  </div>
                  {r.description && (
                    <div className="text-[11px] text-muted truncate">{r.description}</div>
                  )}
                </div>
                <span className="text-muted text-sm">→</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}

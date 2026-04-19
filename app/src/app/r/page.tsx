import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { getSelf } from '@/lib/actions/self'
import { listRelationships, getCurrentRelationship } from '@/lib/actions/relationships'
import { Button, Card, Empty, PageHeader, Pill } from '@/components/ui'

export default async function RelationshipsIndex() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const current = await getCurrentRelationship()
  if (current) {
    // 단일 상대 UX — 현재 관계로 바로 이동
    redirect(`/r/${current.id}`)
  }

  const all = await listRelationships()

  return (
    <>
      <PageHeader
        title="관계"
        subtitle="현재 활성 관계 없음"
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
            title="아직 등록된 관계 없어"
            subtitle="상대를 등록하면 Event를 쌓아 LuvAI 맥락 기반 답이 가능해져."
            action={
              <Link href="/r/new">
                <Button>
                  <Plus size={16} /> 첫 관계 등록
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className="text-xs text-muted uppercase tracking-wider">
              과거 관계 ({all.length})
            </div>
            {all.map((r) => (
              <Link key={r.id} href={`/r/${r.id}`}>
                <Card className="hover:border-accent/60 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{r.partner.displayName}</div>
                    <Pill tone="neutral">{r.progress}</Pill>
                    {r.status !== 'active' && <Pill tone="warn">{r.status}</Pill>}
                  </div>
                </Card>
              </Link>
            ))}
          </>
        )}
      </div>
    </>
  )
}

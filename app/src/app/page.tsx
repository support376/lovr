import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { getOrNullSelf } from '@/lib/actions/self'
import { listTargets } from '@/lib/actions/targets'
import { TargetCard } from '@/components/TargetCard'
import { SelfSummaryCard } from '@/components/SelfSummaryCard'
import { Button, Empty, PageHeader } from '@/components/ui'

export default async function HomePage() {
  const self = await getOrNullSelf()
  if (!self) redirect('/onboarding')

  const targets = await listTargets()
  const active = targets.filter((t) => !t.archived)

  return (
    <>
      <PageHeader
        title={`안녕, ${self.displayName}`}
        subtitle={`현재 ${active.length}명 관리 중`}
        right={
          <Link
            href="/t/new"
            className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center"
            aria-label="상대 추가"
          >
            <Plus size={20} />
          </Link>
        }
      />

      <div className="px-5 flex-1 flex flex-col gap-3">
        <SelfSummaryCard self={self} />

        {active.length === 0 ? (
          <Empty
            title="아직 등록된 상대가 없어"
            subtitle="상대를 추가하고 대화 기록을 넣으면 LuvOS가 프로파일링과 전략을 제안해줘."
            action={
              <Link href="/t/new">
                <Button>첫 상대 추가</Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className="text-xs text-muted uppercase tracking-wider mt-2">
              관리 중인 상대 · {active.length}
            </div>
            {active.map((t) => (
              <TargetCard key={t.id} target={t} />
            ))}
          </>
        )}
      </div>
    </>
  )
}

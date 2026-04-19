import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import { listRelationships } from '@/lib/actions/relationships'
import { Button, Card, PageHeader } from '@/components/ui'
import { NewRelationshipForm } from './NewRelationshipForm'

export default async function NewRelationshipPage() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const all = await listRelationships()
  const activeCount = all.filter((r) => r.status === 'active').length
  const locked = activeCount >= 1

  return (
    <>
      <PageHeader title="새 관계" subtitle="1명 단위로 등록" />
      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        {locked ? (
          <Card className="border-warn/40 bg-warn/5">
            <div className="text-sm font-semibold text-warn mb-1">🔒 2명 이상은 유료 플랜</div>
            <div className="text-xs text-muted leading-relaxed">
              현재 활성 관계 {activeCount}명. LuvOS는 "1명 집중" 모드로 시작해.
              2명 이상 동시 관리는 추후 유료 플랜에서 지원 예정이야.
              지금은 기존 관계를 "종료" 처리한 뒤 새 관계를 등록할 수 있어.
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/r" className="flex-1">
                <Button variant="secondary" className="w-full">
                  현재 관계로
                </Button>
              </Link>
              <Link href="/me" className="flex-1">
                <Button variant="ghost" className="w-full">
                  설정
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <NewRelationshipForm />
        )}
      </div>
    </>
  )
}

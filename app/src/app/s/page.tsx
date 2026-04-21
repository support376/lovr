import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { getSelf } from '@/lib/actions/self'
import { listRelationships } from '@/lib/actions/relationships'
import { getFocusRelationshipId } from '@/lib/actions/focus'
import { Button, Empty, PageHeader } from '@/components/ui'

/**
 * 전략 탭 루트 — focus 상대의 전략 상세로 자동 이동.
 */
export default async function StrategyIndex() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const all = await listRelationships()

  if (all.length === 0) {
    return (
      <>
        <PageHeader title="전략" subtitle="지금 해야할 행동" />
        <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
          <Empty
            title="등록된 상대 없음"
            subtitle="상대를 등록해야 전략을 받을 수 있어."
            action={
              <Link href="/r/new">
                <Button>
                  <Plus size={16} /> 상대 등록
                </Button>
              </Link>
            }
          />
        </div>
      </>
    )
  }

  const focusId = await getFocusRelationshipId()
  const target =
    (focusId ? all.find((r) => r.id === focusId) : undefined) ?? all[0]

  redirect(`/s/${target.id}`)
}

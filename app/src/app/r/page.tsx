import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { getSelf } from '@/lib/actions/self'
import { getCurrentRelationship } from '@/lib/actions/relationships'
import { Button, Empty, PageHeader } from '@/components/ui'

/**
 * 분석 탭 루트 — 현재 상대의 모델 화면으로 자동 이동.
 * 단일 active target UX.
 */
export default async function AnalysisIndex() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const cur = await getCurrentRelationship()

  if (cur) {
    redirect(`/r/${cur.id}`)
  }

  return (
    <>
      <PageHeader title="분석" subtitle="반응 모델 (Y = aX + b)" />
      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        <Empty
          title="등록된 상대 없음"
          subtitle="설정 탭 또는 여기서 상대를 먼저 추가해줘."
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

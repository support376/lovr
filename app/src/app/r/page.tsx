import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { getSelf } from '@/lib/actions/self'
import { listRelationships } from '@/lib/actions/relationships'
import { getFocusRelationshipId } from '@/lib/actions/focus'
import { Button, Empty, PageHeader } from '@/components/ui'

/**
 * 관계 탭 루트 — focus 상대 분석 화면으로 자동 이동.
 * 등록 상대 없으면 상대 등록 유도. 내 프로필은 MY 탭(/me).
 */
export default async function RelationshipsIndex() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const all = await listRelationships()

  if (all.length === 0) {
    return (
      <>
        <PageHeader
          title="관계"
          subtitle="상대별 분석 · 스타일 · 메트릭스"
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
          <Empty
            title="등록된 상대 없음"
            subtitle="상대를 등록하면 나와의 프로파일 비교·분석이 시작돼."
            action={
              <Link href="/r/new">
                <Button>
                  <Plus size={16} /> 첫 상대 등록
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

  redirect(`/r/${target.id}`)
}

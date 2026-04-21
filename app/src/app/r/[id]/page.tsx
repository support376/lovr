import { notFound, redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { ModelCard } from './ModelCard'
import { CurrentTargetHeader } from '@/components/CurrentTargetHeader'

/**
 * 분석 탭 — 모델만. 상대 정보·상태·목적 편집은 설정 탭에서.
 */
export default async function RelationshipAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const { id } = await params
  const rel = await getRelationship(id)
  if (!rel) notFound()

  return (
    <>
      <CurrentTargetHeader rel={rel} />
      <header className="px-5 pt-2 pb-3">
        <h1 className="text-2xl font-bold">분석</h1>
        <div className="text-[11px] text-muted mt-0.5">
          반응 모델 — Y = aX + b
        </div>
      </header>

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        <ModelCard
          relationshipId={id}
          model={rel.model}
          partnerName={rel.partner.displayName}
        />
      </div>
    </>
  )
}

import { notFound, redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import { getRelationship, listRelationships } from '@/lib/actions/relationships'
import { PartnerInlineEditor } from './PartnerInlineEditor'
import { ModelCard } from './ModelCard'
import { TargetSwitcher } from '@/components/TargetSwitcher'

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

  const all = await listRelationships()

  return (
    <>
      <div className="pt-3 pb-1">
        <TargetSwitcher
          relationships={all}
          currentId={id}
          route={{ kind: 'path', base: '/r' }}
        />
      </div>

      <header className="px-5 pt-3 pb-3">
        <h1 className="text-2xl font-bold truncate">
          {rel.partner.displayName}
          {rel.partner.age ? (
            <span className="text-muted font-normal text-lg ml-1">
              ({rel.partner.age})
            </span>
          ) : null}
        </h1>
        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
            {PROGRESS_KO[rel.progress] ?? rel.progress}
          </span>
          {rel.partner.occupation && (
            <span className="px-1.5 py-0.5 rounded bg-surface-2 text-muted">
              {rel.partner.occupation}
            </span>
          )}
          {rel.description && (
            <span className="px-1.5 py-0.5 rounded bg-surface-2 text-muted truncate max-w-[180px]">
              {rel.description}
            </span>
          )}
        </div>
      </header>

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        {/* Y = aX + b 모델 카드 — 이 화면의 메인 */}
        <ModelCard
          relationshipId={id}
          model={rel.model}
          partnerName={rel.partner.displayName}
        />

        {/* 상대 프로필 — 직접 입력 */}
        <section>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            {rel.partner.displayName} 프로필 (fact)
          </div>
          <PartnerInlineEditor rel={rel} open={true} showToggleButton={false} />
        </section>
      </div>
    </>
  )
}

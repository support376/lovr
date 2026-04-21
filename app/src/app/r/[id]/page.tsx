import { notFound, redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import {
  getRelationship,
  listRelationships,
} from '@/lib/actions/relationships'
import {
  STATE_LABEL,
  type RelationshipGoal,
  type RelationshipState,
} from '@/lib/db/schema'
import { PartnerInlineEditor } from './PartnerInlineEditor'
import { ModelCard } from './ModelCard'
import { StateGoalEditor } from './StateGoalEditor'
import { TargetSwitcher } from '@/components/TargetSwitcher'

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

  const state = (rel.state as RelationshipState) ?? 'exploring'
  const goal = (rel.goal as RelationshipGoal | null) ?? null

  return (
    <>
      <div className="pt-3 pb-1">
        <TargetSwitcher
          relationships={all}
          currentId={id}
          route={{ kind: 'path', base: '/r' }}
        />
      </div>

      <header className="px-5 pt-3 pb-2">
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
            {STATE_LABEL[state]}
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
        {/* 상태 + 목적 편집 */}
        <section>
          <StateGoalEditor
            relationshipId={id}
            state={state}
            goal={goal}
          />
        </section>

        {/* Y = aX + b 모델 카드 */}
        <ModelCard
          relationshipId={id}
          model={rel.model}
          partnerName={rel.partner.displayName}
        />

        {/* 상대 프로필 */}
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

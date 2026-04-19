import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { db } from '@/lib/db/client'
import { goals } from '@/lib/db/schema'
import { ensureSchema } from '@/lib/db/init'
import { PageHeader, Card, Pill } from '@/components/ui'
import { NewGoalForm } from './NewGoalForm'
import { DeprecateButton } from './DeprecateButton'
import { GOALS } from '@/lib/ontology'

export default async function GoalsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const self = await getSelf()
  if (!self) redirect('/onboarding')
  const { id } = await params
  const rel = await getRelationship(id)
  if (!rel) notFound()

  await ensureSchema()
  const active = await db
    .select()
    .from(goals)
    .where(and(eq(goals.relationshipId, id), isNull(goals.deprecatedAt)))
    .orderBy(desc(goals.createdAt))

  return (
    <>
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link
          href={`/r/${id}`}
          className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </Link>
        <PageHeader title="목표" subtitle={rel.partner.displayName} />
      </header>

      <div className="px-5 pb-10 flex-1 flex flex-col gap-5">
        <section>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">새 목표</div>
          <NewGoalForm relationshipId={id} partnerId={rel.partner.id} />
        </section>

        <section>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            활성 목표 ({active.length})
          </div>
          {active.length === 0 ? (
            <Card>
              <div className="text-sm text-muted">활성 목표 없음</div>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {active.map((g) => (
                <Card key={g.id}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Pill tone="accent">
                      {GOALS[g.category as keyof typeof GOALS]?.ko ?? g.category}
                    </Pill>
                    <Pill tone="neutral">{g.priority}</Pill>
                    <DeprecateButton goalId={g.id} />
                  </div>
                  <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                    {g.description}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

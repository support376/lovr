import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { db } from '@/lib/db/client'
import { goals } from '@/lib/db/schema'
import { ensureSchema } from '@/lib/db/init'
import { PageHeader } from '@/components/ui'
import { NewGoalForm } from './NewGoalForm'

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
  const current = active[0] ?? null

  return (
    <>
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link
          href={`/r/${id}`}
          className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </Link>
        <PageHeader title="목표 설정" subtitle={rel.partner.displayName} />
      </header>

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        <NewGoalForm
          relationshipId={id}
          partnerId={rel.partner.id}
          stage={rel.progress}
          currentGoalKey={current?.category ?? null}
        />
      </div>
    </>
  )
}

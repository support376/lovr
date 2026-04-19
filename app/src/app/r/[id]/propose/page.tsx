import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { db } from '@/lib/db/client'
import { goals } from '@/lib/db/schema'
import { ensureSchema } from '@/lib/db/init'
import { Card, Empty, PageHeader, Button } from '@/components/ui'
import { ProposeForm } from './ProposeForm'

export default async function ProposePage({
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
  const activeGoals = await db
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
        <PageHeader title="전략 제안 받기" subtitle={rel.partner.displayName} />
      </header>

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        {activeGoals.length === 0 ? (
          <Empty
            title="활성 목표 없음"
            subtitle="Goal 없이 전략 생성 불가. 먼저 목표부터."
            action={
              <Link href={`/r/${id}/goals`}>
                <Button>Goal 추가 →</Button>
              </Link>
            }
          />
        ) : (
          <>
            <Card className="!py-3">
              <div className="text-xs text-muted leading-relaxed">
                Goal 하나 고르고 지금 상황을 자연어로 적으면, 최근 Event 30개 + 자유 메모 + Insight 를
                함께 LLM에 던져서 전략 3안을 받음. 윤리 룰 통과 후 Action 레코드로 저장.
              </div>
            </Card>
            <ProposeForm relationshipId={id} goals={activeGoals} />
          </>
        )}
      </div>
    </>
  )
}

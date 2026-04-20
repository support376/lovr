import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { and, desc, eq } from 'drizzle-orm'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { db } from '@/lib/db/client'
import { actions as actionsTbl, outcomes } from '@/lib/db/schema'
import { requireUserId } from '@/lib/supabase/server'
import { Card, PageHeader, Pill } from '@/components/ui'
import { ActionControls } from './ActionControls'

export default async function ActionDetailPage({
  params,
}: {
  params: Promise<{ id: string; aid: string }>
}) {
  const self = await getSelf()
  if (!self) redirect('/onboarding')
  const { id, aid } = await params
  const rel = await getRelationship(id)
  if (!rel) notFound()

  const uid = await requireUserId()
  const [action] = await db
    .select()
    .from(actionsTbl)
    .where(and(eq(actionsTbl.id, aid), eq(actionsTbl.userId, uid)))
    .limit(1)
  if (!action) notFound()

  const out = await db
    .select()
    .from(outcomes)
    .where(and(eq(outcomes.actionId, aid), eq(outcomes.userId, uid)))
    .orderBy(desc(outcomes.createdAt))

  return (
    <>
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link
          href={`/s/${id}`}
          className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </Link>
        <PageHeader title="전략 상세" subtitle={rel.partner.displayName} />
      </header>

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        <Card className="!py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone={action.status === 'executed' ? 'good' : 'neutral'}>
              {action.status}
            </Pill>
          </div>
          <div className="mt-2 text-[11px] text-muted">
            제안: {new Date(action.proposedAt).toLocaleString('ko-KR')}
            {action.executedAt && ` · 실행: ${new Date(action.executedAt).toLocaleString('ko-KR')}`}
          </div>
        </Card>

        <Card>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">전략 내용</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{action.content}</div>
        </Card>

        <ActionControls
          actionId={aid}
          status={action.status}
          hasOutcome={out.length > 0}
          blocked={action.ethicsStatus === 'blocked'}
        />

        {out.length > 0 && (
          <section>
            <div className="text-xs text-muted uppercase tracking-wider mb-2">
              결과 분석 ({out.length})
            </div>
            {out.map((o) => (
              <Card key={o.id} className="mt-2">
                <div className="text-[11px] text-muted mb-1">
                  {new Date(o.createdAt).toLocaleString('ko-KR')}
                </div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {o.narrative}
                </div>
              </Card>
            ))}
          </section>
        )}
      </div>
    </>
  )
}

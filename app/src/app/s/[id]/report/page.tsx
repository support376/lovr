import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { and, desc, eq } from 'drizzle-orm'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { db } from '@/lib/db/client'
import { insights } from '@/lib/db/schema'
import { requireUserId } from '@/lib/supabase/server'
import { Card, PageHeader, Pill } from '@/components/ui'
import { ReportClient } from './ReportClient'

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const self = await getSelf()
  if (!self) redirect('/onboarding')
  const { id } = await params
  const rel = await getRelationship(id)
  if (!rel) notFound()

  const uid = await requireUserId()
  const activeInsights = await db
    .select()
    .from(insights)
    .where(and(eq(insights.userId, uid), eq(insights.status, 'active')))
    .orderBy(desc(insights.createdAt))

  return (
    <>
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link
          href={`/s/${id}`}
          className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </Link>
        <PageHeader title="주간 리포트" subtitle={rel.partner.displayName} />
      </header>

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        <ReportClient relationshipId={id} />

        <section>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            활성 Insight ({activeInsights.length})
          </div>
          {activeInsights.length === 0 ? (
            <Card>
              <div className="text-sm text-muted">
                아직 추출된 Insight 없음. 리포트 생성하면 자동 추가돼.
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {activeInsights.map((ins) => (
                <Card key={ins.id}>
                  <div className="flex items-center gap-2">
                    <Pill tone="accent">{ins.scope}</Pill>
                    <span className="text-[11px] text-muted">
                      {new Date(ins.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">
                    {ins.observation}
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

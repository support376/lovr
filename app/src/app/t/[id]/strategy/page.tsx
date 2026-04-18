import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import {
  getTarget,
  getTargetStrategies,
} from '@/lib/actions/targets'
import { PageHeader } from '@/components/ui'
import { StrategyView } from './StrategyView'

export default async function StrategyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const target = await getTarget(id)
  if (!target) notFound()

  const strategies = await getTargetStrategies(id)
  const latest = strategies[0] ?? null

  return (
    <>
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link
          href={`/t/${id}`}
          className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{target.alias} · 전략</h1>
          <div className="text-xs text-muted truncate">
            목표: {target.goal.description}
          </div>
        </div>
      </header>
      <div className="px-5 pb-10 flex-1">
        <StrategyView targetId={id} initial={latest} history={strategies} />
      </div>
    </>
  )
}

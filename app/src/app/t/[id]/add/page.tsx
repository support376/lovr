import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTarget } from '@/lib/actions/targets'
import { AddInteractionForm } from './AddInteractionForm'

export default async function AddInteractionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const target = await getTarget(id)
  if (!target) notFound()

  return (
    <>
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link
          href={`/t/${id}`}
          className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">기록 추가</h1>
          <div className="text-xs text-muted">{target.alias}</div>
        </div>
      </header>
      <div className="px-5 pb-10 flex-1">
        <AddInteractionForm targetId={id} />
      </div>
    </>
  )
}

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTarget } from '@/lib/actions/targets'
import { EditTargetForm } from './EditTargetForm'

export default async function EditTargetPage({
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
          <h1 className="text-xl font-bold">{target.alias} 편집</h1>
          <div className="text-xs text-muted">목표·단계·메타</div>
        </div>
      </header>
      <div className="px-5 pb-10 flex-1">
        <EditTargetForm target={target} />
      </div>
    </>
  )
}

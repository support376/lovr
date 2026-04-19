import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { PageHeader } from '@/components/ui'
import { EditRelationshipForm } from './EditForm'

export default async function EditRelationshipPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const self = await getSelf()
  if (!self) redirect('/onboarding')
  const { id } = await params
  const rel = await getRelationship(id)
  if (!rel) notFound()

  return (
    <>
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link
          href={`/r/${id}`}
          className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </Link>
        <PageHeader title="관계 편집" subtitle={rel.partner.displayName} />
      </header>
      <div className="px-5 pb-10 flex-1 flex flex-col">
        <EditRelationshipForm rel={rel} />
      </div>
    </>
  )
}

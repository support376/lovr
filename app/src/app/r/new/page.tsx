import { redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import { PageHeader } from '@/components/ui'
import { NewRelationshipForm } from './NewRelationshipForm'

export default async function NewRelationshipPage() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  return (
    <>
      <PageHeader title="새 관계" subtitle="1명 단위로 등록 · 여러 명 동시 관리 가능" />
      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        <NewRelationshipForm />
      </div>
    </>
  )
}

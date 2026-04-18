import { NewTargetForm } from './NewTargetForm'
import { PageHeader } from '@/components/ui'

export default function NewTargetPage() {
  return (
    <>
      <PageHeader title="새 상대" subtitle="기본 정보 + 목표만 먼저. 나머진 쌓이면서 추론돼." />
      <div className="px-5 pb-10 flex-1">
        <NewTargetForm />
      </div>
    </>
  )
}

import { redirect } from 'next/navigation'
import { getOrNullSelf } from '@/lib/actions/self'
import { OnboardingForm } from './OnboardingForm'
import { PageHeader } from '@/components/ui'

export default async function OnboardingPage() {
  const existing = await getOrNullSelf()
  if (existing) redirect('/')

  return (
    <>
      <PageHeader
        title="LuvOS 시작"
        subtitle="너에 대해 최소한만 알려줘. 나머진 쓰면서 배울게."
      />
      <div className="px-5 pb-10 flex-1">
        <OnboardingForm />
      </div>
    </>
  )
}

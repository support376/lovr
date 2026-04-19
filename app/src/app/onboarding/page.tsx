import { redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import { OnboardingForm } from './OnboardingForm'
import { PageHeader } from '@/components/ui'

export default async function OnboardingPage() {
  const existing = await getSelf()
  if (existing) redirect('/')

  return (
    <>
      <PageHeader
        title="LuvOS 시작"
        subtitle="1:1 코칭 엔진. 원자료 중심으로 맥락 쌓고 답 받자."
      />
      <div className="px-5 pb-10 flex-1 flex flex-col">
        <OnboardingForm />
      </div>
    </>
  )
}

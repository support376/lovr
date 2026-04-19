import { redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import { PageHeader } from '@/components/ui'
import { SelfForm } from './SelfForm'
import { BillingMock } from './Billing'

export default async function SettingsPage() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  return (
    <>
      <PageHeader title="설정" subtitle="내 정보 · 결제" />
      <div className="px-5 pb-10 flex-1 flex flex-col gap-6">
        <section>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            내 정보
          </div>
          <SelfForm initial={self} />
        </section>

        <section>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            결제
          </div>
          <BillingMock />
        </section>
      </div>
    </>
  )
}

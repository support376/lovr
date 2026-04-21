import { redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import { PageHeader } from '@/components/ui'
import { SelfForm } from './SelfForm'
import { BillingMock } from './Billing'
import { SeedControls } from './SeedControls'
import { SignOutButton } from './SignOutButton'

/**
 * MY 탭 — 나의 기본 프로필 (사실 기반) + 결제 + 행정.
 * Event 역프로파일링 결과(inferredTraits)는 SelfForm 안에서 관찰 누적으로 표시.
 */
export default async function MyPage() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  return (
    <>
      <PageHeader title="MY" subtitle="내 프로필 · 결제 · 행정" />
      <div className="px-5 pb-10 flex-1 flex flex-col gap-6">
        <section>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            내 프로필
          </div>
          <SelfForm initial={self} />
        </section>

        <section>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">결제</div>
          <BillingMock />
        </section>

        <section>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            목업 데이터 (UI 검증)
          </div>
          <SeedControls />
        </section>

        <section>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">세션</div>
          <SignOutButton />
        </section>
      </div>
    </>
  )
}

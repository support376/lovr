import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSelf } from '@/lib/actions/self'
import { Card, PageHeader } from '@/components/ui'
import { BillingMock } from './Billing'
import { SeedControls } from './SeedControls'
import { SignOutButton } from './SignOutButton'

/**
 * MY 탭 — 결제 · 행정 · 로그아웃. 프로필 편집은 관계 탭 > 내 프로필.
 */
export default async function SettingsPage() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  return (
    <>
      <PageHeader title="MY" subtitle="결제 · 행정" />
      <div className="px-5 pb-10 flex-1 flex flex-col gap-6">
        <section>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">계정</div>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{self.displayName}</div>
                <div className="text-[11px] text-muted mt-0.5">
                  프로필은 <Link href="/r/me" className="text-accent">관계 탭 → 내 프로필</Link> 에서 수정
                </div>
              </div>
            </div>
          </Card>
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

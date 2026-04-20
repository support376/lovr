import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import { Card, PageHeader } from '@/components/ui'
import { BillingMock } from './Billing'

export default async function SettingsPage() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  return (
    <>
      <PageHeader title="설정" subtitle="결제 · 앱 관리" />
      <div className="px-5 pb-10 flex-1 flex flex-col gap-5">
        <Link href="/timeline">
          <Card className="hover:border-accent/40 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">내 정보 편집</div>
                <div className="text-[11px] text-muted mt-0.5">
                  기록 탭에서 나·상대 정보 모두 설정
                </div>
              </div>
              <span className="text-accent text-sm">→</span>
            </div>
          </Card>
        </Link>

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

import { redirect } from 'next/navigation'
import { getOrNullSelf } from '@/lib/actions/self'
import { PageHeader } from '@/components/ui'
import { MeForm } from './MeForm'
import { SelfDossier } from './SelfDossier'
import { AppSettings } from './AppSettings'

export default async function MePage() {
  const self = await getOrNullSelf()
  if (!self) redirect('/onboarding')

  return (
    <>
      <PageHeader
        title="나"
        subtitle="AI 추론 프로파일 + 내 정보 + 앱 설정"
      />
      <div className="px-5 pb-10 flex-1 flex flex-col gap-8">
        <SelfDossier self={self} />

        <section className="flex flex-col gap-2">
          <div className="text-xs text-muted uppercase tracking-wider">
            앱 / 플랜
          </div>
          <AppSettings />
        </section>

        <section className="flex flex-col gap-2 pb-6">
          <div className="text-xs text-muted uppercase tracking-wider">
            내 정보 편집
          </div>
          <MeForm self={self} />
        </section>
      </div>
    </>
  )
}

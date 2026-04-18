import { redirect } from 'next/navigation'
import { getOrNullSelf } from '@/lib/actions/self'
import { PageHeader } from '@/components/ui'
import { MeForm } from './MeForm'
import { SelfDossier } from './SelfDossier'

export default async function MePage() {
  const self = await getOrNullSelf()
  if (!self) redirect('/onboarding')

  return (
    <>
      <PageHeader
        title="나"
        subtitle="AI가 추출한 너의 운영 프로파일 + 기본 설정"
      />
      <div className="px-5 pb-10 flex-1 flex flex-col gap-6">
        <SelfDossier self={self} />

        <div className="border-t border-border pt-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-3">
            기본 설정
          </div>
          <MeForm self={self} />
        </div>
      </div>
    </>
  )
}

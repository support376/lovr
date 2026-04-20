import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getSelf } from '@/lib/actions/self'
import { PageHeader } from '@/components/ui'
import { SelfForm } from './SelfForm'

export default async function MyProfilePage() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  return (
    <>
      <header className="px-5 pt-4 pb-3 flex items-center gap-3">
        <Link
          href="/r"
          className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </Link>
        <PageHeader title="내 프로필" subtitle="사실 기반 입력 · 자가진단 없음" />
      </header>
      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        <SelfForm initial={self} />
      </div>
    </>
  )
}

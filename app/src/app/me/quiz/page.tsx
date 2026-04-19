import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getSelf } from '@/lib/actions/self'
import { PageHeader } from '@/components/ui'
import { QuizClient } from './QuizClient'

export default async function QuizPage() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  return (
    <>
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link
          href="/me"
          className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </Link>
        <PageHeader title="자기 설문" subtitle="6문항 답하면 AI가 프로파일 narrative 생성" />
      </header>
      <div className="px-5 pb-10 flex-1 flex flex-col">
        <QuizClient />
      </div>
    </>
  )
}

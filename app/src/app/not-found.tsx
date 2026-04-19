import Link from 'next/link'
import { Button, Empty } from '@/components/ui'

export default function NotFound() {
  return (
    <div className="px-5 py-10 flex-1 flex flex-col">
      <Empty
        title="이 페이지 없어"
        subtitle="구조가 v1으로 바뀌었어. 홈으로 가자."
        action={
          <Link href="/">
            <Button>홈으로</Button>
          </Link>
        }
      />
    </div>
  )
}

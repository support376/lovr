'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { seedMockData, unseedMockData } from '@/lib/actions/seed'

export function SeedControls() {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const router = useRouter()

  const seed = () => {
    setMsg(null)
    start(async () => {
      try {
        const r = await seedMockData()
        setMsg(
          r.created
            ? `목업 관계 생성 · /r/${r.relationshipId.slice(0, 14)}…`
            : '이미 시드된 관계 존재 (기존 유지)'
        )
        router.refresh()
      } catch (e) {
        setMsg('실패: ' + (e as Error).message)
      }
    })
  }

  const unseed = () => {
    setMsg(null)
    start(async () => {
      try {
        const r = await unseedMockData()
        setMsg(r.removed ? '목업 관계 삭제됨' : '시드된 관계 없음')
        router.refresh()
      } catch (e) {
        setMsg('실패: ' + (e as Error).message)
      }
    })
  }

  return (
    <Card className="border-warn/30 bg-warn/5">
      <div className="text-[11px] text-muted mb-2 leading-relaxed">
        UI 전부 가득 채운 가짜 관계(서연 · 소개팅 3회차)를 만들어 모든 화면을 확인. 끝나면 삭제.
      </div>
      <div className="flex gap-2">
        <Button onClick={seed} disabled={pending} className="flex-1">
          {pending ? '…' : '목업 데이터 채우기'}
        </Button>
        <Button
          onClick={unseed}
          disabled={pending}
          variant="secondary"
          className="flex-1 !bg-bad/10 !text-bad hover:!bg-bad/20"
        >
          {pending ? '…' : '시드 제거'}
        </Button>
      </div>
      {msg && <div className="mt-2 text-xs text-center text-muted">{msg}</div>}
    </Card>
  )
}

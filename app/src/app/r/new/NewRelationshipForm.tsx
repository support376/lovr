'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, TextInput } from '@/components/ui'
import { createRelationship } from '@/lib/actions/relationships'

export function NewRelationshipForm() {
  const [name, setName] = useState('')
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const submit = () => {
    if (!name.trim()) return
    setErr(null)
    start(async () => {
      try {
        await createRelationship({ partnerName: name.trim() })
        router.push('/me?open=partner')
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-4"
    >
      <Card>
        <TextInput
          label="상대 이름/호칭"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="수진"
          required
          autoFocus
        />
        <div className="text-[11px] text-muted leading-relaxed mt-3">
          이름만 넣으면 바로 생성 후 설정 탭 편집 화면으로 이동.
          <br />
          나이·직업·상태·목적·관계 정의·메모·제약 모두 거기서 한 곳에서 관리.
        </div>
      </Card>
      {err && (
        <Card className="border-bad/40 bg-bad/5">
          <div className="text-sm text-bad">{err}</div>
        </Card>
      )}
      <Button type="submit" disabled={pending || !name.trim()}>
        {pending ? '생성 중…' : '등록 · 편집 이어서'}
      </Button>
    </form>
  )
}

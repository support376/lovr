'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSelf } from '@/lib/actions/self'
import { Button, Card, TextArea, TextInput } from '@/components/ui'

export function OnboardingForm() {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const submit = () => {
    if (!name.trim()) return
    setErr(null)
    start(async () => {
      try {
        await createSelf({
          displayName: name.trim(),
          rawNotes: notes.trim() || undefined,
        })
        router.push('/')
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
          label="이름/닉네임"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="지민"
          required
        />
      </Card>
      <Card>
        <TextArea
          label="자유 메모 (선택) — 자기 자신에 대한 맥락. 자유 서술."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          placeholder={`예시:\n- 30대 초, 회사원\n- INFP / 불안형 애착 경향 스스로 의심\n- 최근 연애는 2년 전, 이별 잘 못 매듭지음\n- 이상형은 잘 몰라, 같이 있을 때 편안한 사람`}
        />
      </Card>
      {err && (
        <Card className="border-bad/40 bg-bad/5">
          <div className="text-sm text-bad">{err}</div>
        </Card>
      )}
      <Button type="submit" disabled={pending || !name.trim()}>
        {pending ? '저장 중…' : '시작'}
      </Button>
      <div className="text-[11px] text-muted text-center leading-relaxed">
        💬 상대 등록은 홈에서 할 수 있어. 여기선 본인 맥락만 먼저.
      </div>
    </form>
  )
}

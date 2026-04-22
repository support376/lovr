'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, TextArea, TextInput } from '@/components/ui'
import { updateSelf } from '@/lib/actions/self'
import type { Actor } from '@/lib/db/schema'

/**
 * MY 프로필 — 명목 fact 만.
 * 성별은 온보딩에서 확정 — 여기서 수정 안 함 (표시만).
 */
export function SelfForm({ initial }: { initial: Actor }) {
  const [name, setName] = useState(initial.displayName)
  const [age, setAge] = useState(initial.age?.toString() ?? '')
  const [occupation, setOccupation] = useState(initial.occupation ?? '')
  const [rawNotes, setRawNotes] = useState(initial.rawNotes ?? '')

  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const router = useRouter()

  const genderLabel =
    initial.gender === 'male'
      ? '남성'
      : initial.gender === 'female'
        ? '여성'
        : '—'

  const submit = () => {
    setMsg(null)
    start(async () => {
      try {
        await updateSelf({
          displayName: name.trim() || undefined,
          age: age ? parseInt(age, 10) : null,
          occupation: occupation.trim() || null,
          rawNotes: rawNotes.trim() || null,
        })
        setMsg('저장됨')
        router.refresh()
      } catch (e) {
        setMsg('실패: ' + (e as Error).message)
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
        <div className="text-xs text-muted uppercase tracking-wider mb-3">기본</div>
        <div className="flex flex-col gap-3">
          <TextInput
            label="이름 / 닉네임"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <TextInput
              label="나이"
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              placeholder="30"
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">성별</span>
              <div className="rounded-xl bg-surface-2 border border-border px-3 py-3 text-sm text-muted">
                {genderLabel}
              </div>
            </div>
            <TextInput
              label="직업"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="회사원"
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-2">
          자유 메모 (선택)
        </div>
        <TextArea
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          rows={5}
          placeholder="필요한 맥락만 짧게. 모델은 기록(Event)으로부터 학습함."
        />
      </Card>

      {msg && <div className="text-xs text-muted text-center">{msg}</div>}

      <Button type="submit" disabled={pending}>
        {pending ? '저장 중…' : '저장'}
      </Button>
    </form>
  )
}

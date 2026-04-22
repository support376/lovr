'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, TextArea, TextInput } from '@/components/ui'
import { updateSelf } from '@/lib/actions/self'
import type { Actor } from '@/lib/db/schema'

const GENDER = [
  { v: 'male', l: '남' },
  { v: 'female', l: '여' },
]

/**
 * MY 프로필 — 명목 fact 만. 자가진단·자산·지출 없음.
 */
export function SelfForm({ initial }: { initial: Actor }) {
  const [name, setName] = useState(initial.displayName)
  const [age, setAge] = useState(initial.age?.toString() ?? '')
  const [gender, setGender] = useState(initial.gender ?? '')
  const [occupation, setOccupation] = useState(initial.occupation ?? '')
  const [rawNotes, setRawNotes] = useState(initial.rawNotes ?? '')

  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const router = useRouter()

  const submit = () => {
    setMsg(null)
    start(async () => {
      try {
        await updateSelf({
          displayName: name.trim() || undefined,
          age: age ? parseInt(age, 10) : null,
          gender: gender || null,
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
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">성별</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="rounded-xl bg-surface-2 border border-border px-2 py-3 text-sm outline-none focus:border-accent"
              >
                <option value="">-</option>
                {GENDER.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.l}
                  </option>
                ))}
              </select>
            </label>
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

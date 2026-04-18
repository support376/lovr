'use client'
import { useState, useTransition } from 'react'
import { updateSelf } from '@/lib/actions/self'
import { Button, Card, TextArea, TextInput } from '@/components/ui'
import type { Self } from '@/lib/db/schema'

export function MeForm({ self }: { self: Self }) {
  const [displayName, setDisplayName] = useState(self.displayName)
  const [age, setAge] = useState(self.age?.toString() ?? '')
  const [gender, setGender] = useState(self.gender ?? '')
  const [goal, setGoal] = useState(self.relationshipGoal ?? 'serious')
  const [tones, setTones] = useState(self.toneSamples.length ? self.toneSamples : ['', '', ''])
  const [notes, setNotes] = useState(self.notes ?? '')
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)

  const save = () => {
    start(async () => {
      await updateSelf({
        displayName,
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        relationshipGoal: goal,
        toneSamples: tones.map((s) => s.trim()).filter(Boolean),
        notes: notes || undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    })
  }

  const setTone = (i: number, v: string) => {
    const next = [...tones]
    next[i] = v
    setTones(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <TextInput
        label="이름/닉네임"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          label="나이"
          value={age}
          onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))}
          inputMode="numeric"
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">성별</span>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="rounded-xl bg-surface-2 border border-border px-3 py-3 text-sm outline-none focus:border-accent"
          >
            <option value="">선택 안함</option>
            <option value="male">남</option>
            <option value="female">여</option>
            <option value="other">기타</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">관계 지향</span>
        <select
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="rounded-xl bg-surface-2 border border-border px-3 py-3 text-sm outline-none focus:border-accent"
        >
          <option value="casual">캐주얼</option>
          <option value="serious">진지한 관계</option>
          <option value="marriage">결혼 전제</option>
          <option value="explore">일단 탐색</option>
        </select>
      </label>

      <Card>
        <div className="text-xs text-muted mb-2">대화 톤 샘플</div>
        <div className="flex flex-col gap-2">
          {tones.map((t, i) => (
            <TextInput
              key={i}
              value={t}
              onChange={(e) => setTone(i, e.target.value)}
              placeholder={`샘플 ${i + 1}`}
            />
          ))}
          <button
            type="button"
            onClick={() => setTones([...tones, ''])}
            className="self-start text-xs text-accent"
          >
            + 샘플 추가
          </button>
        </div>
      </Card>

      <TextArea
        label="자유 메모"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={5}
      />

      <Button onClick={save} disabled={pending}>
        {pending ? '저장 중…' : saved ? '저장됨 ✓' : '저장'}
      </Button>
    </div>
  )
}

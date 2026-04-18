'use client'
import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { updateSelf } from '@/lib/actions/self'
import { Button, Card, TextArea, TextInput } from '@/components/ui'
import type { Self } from '@/lib/db/schema'

const MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]

export function MeForm({ self }: { self: Self }) {
  const [displayName, setDisplayName] = useState(self.displayName)
  const [age, setAge] = useState(self.age?.toString() ?? '')
  const [gender, setGender] = useState(self.gender ?? '')
  const [goal, setGoal] = useState(self.relationshipGoal ?? 'serious')
  const [mbti, setMbti] = useState(self.mbti ?? '')
  const [strengths, setStrengths] = useState<string[]>(self.strengths ?? [])
  const [weaknesses, setWeaknesses] = useState<string[]>(self.weaknesses ?? [])
  const [dealBreakers, setDealBreakers] = useState<string[]>(self.dealBreakers ?? [])
  const [idealType, setIdealType] = useState(self.idealType ?? '')
  const [personalityNotes, setPersonalityNotes] = useState(self.personalityNotes ?? '')
  const [valuesNotes, setValuesNotes] = useState(self.valuesNotes ?? '')
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
        mbti: mbti || undefined,
        strengths,
        weaknesses,
        dealBreakers,
        idealType: idealType || undefined,
        personalityNotes: personalityNotes || undefined,
        valuesNotes: valuesNotes || undefined,
        notes: notes || undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="text-xs text-muted mb-2">기본</div>
        <div className="flex flex-col gap-3">
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
                <option value="">선택</option>
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
              <option value="explore">탐색</option>
            </select>
          </label>
        </div>
      </Card>

      <Card>
        <div className="text-xs text-muted mb-2">MBTI</div>
        <div className="grid grid-cols-4 gap-1.5">
          {MBTI_TYPES.map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMbti(mbti === m ? '' : m)}
              className={`py-2 rounded-lg text-xs font-mono border ${
                mbti === m
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-surface-2 border-border text-muted'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="text-xs text-muted mb-2">강점 (내가 잘하는 것)</div>
        <TagInput items={strengths} onChange={setStrengths} tone="good" />
      </Card>

      <Card>
        <div className="text-xs text-muted mb-2">약점 (반성하는 것)</div>
        <TagInput items={weaknesses} onChange={setWeaknesses} tone="bad" />
      </Card>

      <Card>
        <div className="text-xs text-muted mb-2">딜 브레이커</div>
        <TagInput items={dealBreakers} onChange={setDealBreakers} tone="bad" />
      </Card>

      <Card>
        <TextArea
          label="이상형"
          value={idealType}
          onChange={(e) => setIdealType(e.target.value)}
          rows={3}
        />
      </Card>
      <Card>
        <TextArea
          label="성격"
          value={personalityNotes}
          onChange={(e) => setPersonalityNotes(e.target.value)}
          rows={4}
        />
      </Card>
      <Card>
        <TextArea
          label="가치관"
          value={valuesNotes}
          onChange={(e) => setValuesNotes(e.target.value)}
          rows={4}
        />
      </Card>
      <Card>
        <TextArea
          label="기타 메모"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </Card>

      <Button onClick={save} disabled={pending}>
        {pending ? '저장 중…' : saved ? '저장됨 ✓' : '저장'}
      </Button>
    </div>
  )
}

function TagInput({
  items,
  onChange,
  tone,
}: {
  items: string[]
  onChange: (v: string[]) => void
  tone?: 'good' | 'bad' | 'neutral'
}) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (!v) return
    onChange([...items, v])
    setInput('')
  }
  const chipCls =
    tone === 'good'
      ? 'bg-good/15 text-good border-good/30'
      : tone === 'bad'
      ? 'bg-bad/15 text-bad border-bad/30'
      : 'bg-surface-2 text-muted border-border'
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          className="flex-1 rounded-xl bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 rounded-xl bg-accent/20 text-accent text-sm font-semibold"
        >
          추가
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((t, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${chipCls}`}
            >
              {t}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="opacity-60 hover:opacity-100"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

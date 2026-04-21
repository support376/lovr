'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Button, Card, TextArea, TextInput } from '@/components/ui'
import { updateSelf } from '@/lib/actions/self'
import type { Actor, InferredTrait } from '@/lib/db/schema'

const GENDER = [
  { v: 'male', l: '남' },
  { v: 'female', l: '여' },
  { v: 'other', l: '기타' },
]

/**
 * 나의 기본 프로필 — 사실(Fact) + 요약 + 딜브레이커.
 * 자가진단 없음. 실제 행동 특성은 Event 역프로파일링 결과로 하단에 노출.
 */
export function SelfForm({ initial }: { initial: Actor }) {
  const [name, setName] = useState(initial.displayName)
  const [age, setAge] = useState(initial.age?.toString() ?? '')
  const [gender, setGender] = useState(initial.gender ?? '')
  const [occupation, setOccupation] = useState(initial.occupation ?? '')

  const initialSummary = [
    initial.personalityNotes,
    initial.valuesNotes,
    initial.idealTypeNotes,
    (initial.strengths ?? []).length > 0
      ? `**강점**\n- ${(initial.strengths ?? []).join('\n- ')}`
      : '',
    (initial.weaknesses ?? []).length > 0
      ? `**약점**\n- ${(initial.weaknesses ?? []).join('\n- ')}`
      : '',
    initial.rawNotes,
  ]
    .filter((s) => s && s.trim())
    .join('\n\n')

  const [summary, setSummary] = useState(initialSummary)
  const [dealBreakers, setDealBreakers] = useState<string[]>(initial.dealBreakers ?? [])

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
          dealBreakers,
          rawNotes: summary.trim() || null,
        })
        setMsg('저장됨')
        router.refresh()
      } catch (e) {
        setMsg('실패: ' + (e as Error).message)
      }
    })
  }

  const traits: InferredTrait[] = initial.inferredTraits ?? []

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
        <div className="text-xs text-muted uppercase tracking-wider mb-2">내 요약</div>
        <div className="text-[11px] text-muted mb-2 leading-relaxed">
          성격·가치관·이상형·강점·약점을 <strong>사실(Fact)</strong> 위주로 자유 서술.
          실제 행동 특성은 아래 &ldquo;관찰 누적&rdquo;에서 Event 로부터 자동 추출.
        </div>
        <TextArea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={12}
          placeholder={`예시:\n\n내향적, 친해지면 장난 많음. 깊은 대화 선호.\n커리어 > 결혼. 정직함 최우선.\n이상형: 자기 일 열심히 하고 가족 소중히 여기는 사람.`}
        />
      </Card>

      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-2">
          딜브레이커 (경계)
        </div>
        <TagInput
          items={dealBreakers}
          onChange={setDealBreakers}
          placeholder="거짓말, 가족 험담, …"
        />
      </Card>

      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-2">
          관찰 누적 · 내 행동에서 추출
        </div>
        {traits.length === 0 ? (
          <div className="text-[11px] text-muted leading-relaxed">
            아직 충분한 Event 가 없음. 대화·사건을 기록하면 여기에 자동으로 &ldquo;이기적/관대함/진보/보수&rdquo; 같은 행동 축이 누적돼.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {traits.map((t, i) => (
              <li key={i} className="text-xs leading-relaxed">
                {t.axis ? (
                  <span className="font-semibold text-accent mr-1">
                    {t.axis}
                    {typeof t.score === 'number' ? ` ${t.score}` : ''} ·
                  </span>
                ) : '• '}
                {t.observation}
                <span className="text-muted ml-1">({t.confidenceNarrative})</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {msg && <div className="text-xs text-muted text-center">{msg}</div>}

      <Button type="submit" disabled={pending}>
        {pending ? '저장 중…' : '저장'}
      </Button>
    </form>
  )
}

function TagInput({
  items,
  onChange,
  placeholder,
}: {
  items: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (!v) return
    onChange([...items, v])
    setInput('')
  }
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))

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
          placeholder={placeholder}
          className="flex-1 rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 rounded-lg bg-accent/20 text-accent text-xs font-semibold"
        >
          추가
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border bg-bad/15 text-bad border-bad/30"
            >
              🚫 {t}
              <button
                type="button"
                onClick={() => remove(i)}
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

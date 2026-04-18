'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { bestEffortProfileSelf, createSelf } from '@/lib/actions/self'
import { Button, TextArea, TextInput } from '@/components/ui'

export function OnboardingForm() {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [goal, setGoal] = useState('serious')
  const [tone1, setTone1] = useState('')
  const [tone2, setTone2] = useState('')
  const [tone3, setTone3] = useState('')
  const [notes, setNotes] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()

  const [profiling, setProfiling] = useState(false)

  const submit = () => {
    if (!name.trim()) return
    start(async () => {
      await createSelf({
        displayName: name.trim(),
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        relationshipGoal: goal,
        toneSamples: [tone1, tone2, tone3].map((s) => s.trim()).filter(Boolean),
        notes: notes.trim() || undefined,
      })
      // 1차 Self 프로파일링 — 실패해도 흐름 막지 않음
      setProfiling(true)
      await bestEffortProfileSelf()
      setProfiling(false)
      router.push('/')
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
      <TextInput
        label="이름/닉네임"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="지민"
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          label="나이 (선택)"
          value={age}
          onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="28"
          inputMode="numeric"
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">성별 (선택)</span>
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

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted">
          내 대화 톤 샘플 3개 (상대에게 보낼 만한 메시지)
        </span>
        <TextInput
          value={tone1}
          onChange={(e) => setTone1(e.target.value)}
          placeholder='예: "오늘 뭐 먹었어요? ㅋㅋ"'
        />
        <TextInput
          value={tone2}
          onChange={(e) => setTone2(e.target.value)}
          placeholder='예: "저 그거 완전 동의해요 ㅎㅎ"'
        />
        <TextInput
          value={tone3}
          onChange={(e) => setTone3(e.target.value)}
          placeholder='예: "담 주에 시간 어때요?"'
        />
      </div>

      <TextArea
        label="자유 메모 (선택) — 중요한 맥락, 내 타입 등"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="나는 유머 많은 사람 좋아함. 일 잘하는 사람 끌림."
      />

      <Button type="submit" disabled={pending || !name.trim()}>
        {profiling ? 'AI가 너를 프로파일링 중…' : pending ? '저장 중…' : '시작하기'}
      </Button>
    </form>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSelf } from '@/lib/actions/self'
import { Button, Card, TextArea, TextInput } from '@/components/ui'

const MBTI_AXES: Array<{
  axis: number
  left: string
  right: string
  leftLabel: string
  rightLabel: string
}> = [
  { axis: 0, left: 'E', right: 'I', leftLabel: '외향 E', rightLabel: '내향 I' },
  { axis: 1, left: 'N', right: 'S', leftLabel: '직관 N', rightLabel: '감각 S' },
  { axis: 2, left: 'T', right: 'F', leftLabel: '사고 T', rightLabel: '감정 F' },
  { axis: 3, left: 'J', right: 'P', leftLabel: '판단 J', rightLabel: '인식 P' },
]

const GENDER = [
  { v: 'male', l: '남' },
  { v: 'female', l: '여' },
  { v: 'other', l: '기타' },
]

export function OnboardingForm() {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [occupation, setOccupation] = useState('')
  const [mbti, setMbti] = useState('')
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
          age: age ? parseInt(age, 10) : null,
          gender: gender || null,
          occupation: occupation.trim() || null,
          mbti: mbti || null,
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
        <div className="text-xs text-muted uppercase tracking-wider mb-3">기본</div>
        <div className="flex flex-col gap-3">
          <TextInput
            label="이름 / 닉네임"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="지민"
            required
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
              label="직업 (선택)"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="회사원"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted">MBTI (알면)</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-accent">
                  {mbti || '? ? ? ?'}
                </span>
                {mbti && (
                  <button
                    type="button"
                    onClick={() => setMbti('')}
                    className="text-[11px] text-muted hover:text-accent"
                  >
                    지우기
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {MBTI_AXES.map((ax) => {
                const curChar = mbti[ax.axis] ?? ''
                const setAxis = (ch: string) => {
                  const chars = mbti.padEnd(4, ' ').split('')
                  chars[ax.axis] = ch === chars[ax.axis] ? ' ' : ch
                  const next = chars.join('')
                  setMbti(next.trim() === '' ? '' : next)
                }
                return (
                  <div key={ax.axis} className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAxis(ax.left)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border ${
                        curChar === ax.left
                          ? 'bg-accent/15 border-accent text-accent'
                          : 'bg-surface-2 border-border text-muted'
                      }`}
                    >
                      {ax.leftLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAxis(ax.right)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border ${
                        curChar === ax.right
                          ? 'bg-accent/15 border-accent text-accent'
                          : 'bg-surface-2 border-border text-muted'
                      }`}
                    >
                      {ax.rightLabel}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <TextArea
          label="자유 메모 (선택) — 자기 자신에 대한 맥락"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          placeholder={`예시:\n- 최근 연애는 2년 전, 이별 잘 못 매듭지음\n- 불안형 애착 경향 스스로 의심\n- 이상형은 잘 몰라, 같이 있을 때 편안한 사람\n- 커리어 > 결혼`}
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
        설정 → 내 정보에서 언제든 편집 가능. 설문으로 성격 narrative 자동 채우기도 지원.
      </div>
    </form>
  )
}

'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSelf } from '@/lib/actions/self'
import { Button, Card, TextArea, TextInput } from '@/components/ui'
import { type RelationshipState } from '@/lib/db/schema'

const GENDER_OPTIONS: Array<{ v: 'male' | 'female'; l: string }> = [
  { v: 'male', l: '남자' },
  { v: 'female', l: '여자' },
]

// 온보딩에서 노출하는 4개 상태. struggling 은 /me 에서만 변경 가능.
const STATE_OPTIONS: Array<{ v: RelationshipState; l: string }> = [
  { v: 'exploring', l: '사귀기 전' },
  { v: 'dating', l: '사귀는 중' },
  { v: 'serious', l: '장기·결혼' },
  { v: 'ended', l: '헤어짐' },
]

export function OnboardingForm() {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const [state, setState] = useState<RelationshipState | null>(null)
  const [notes, setNotes] = useState('')
  const [agree, setAgree] = useState(false)
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const canSubmit =
    !!name.trim() && gender !== null && state !== null && agree && !pending

  const submit = () => {
    if (!canSubmit || gender === null || state === null) return
    setErr(null)
    start(async () => {
      try {
        await createSelf({
          displayName: name.trim(),
          gender,
          state,
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
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">내 성별</span>
          <div className="flex gap-1.5">
            {GENDER_OPTIONS.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setGender(o.v)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  gender === o.v
                    ? 'bg-accent/15 border-accent/50 text-accent'
                    : 'bg-surface-2 border-border text-muted hover:border-accent/30'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-muted">
            상대 성별은 자동으로 반대로 설정돼.
          </span>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">지금 관계 상태</span>
          <div className="grid grid-cols-2 gap-1.5">
            {STATE_OPTIONS.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setState(o.v)}
                className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  state === o.v
                    ? 'bg-accent/15 border-accent/50 text-accent'
                    : 'bg-surface-2 border-border text-muted hover:border-accent/30'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-muted">
            상태가 정해지면 목표는 루바이가 알아서 잡아.
          </span>
        </div>
      </Card>

      <Card>
        <TextArea
          label="자유 메모 (선택) — 자기 자신에 대한 맥락. 자유 서술."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder={`예시:\n- 30대 초, 회사원\n- INFP / 불안형 애착 경향 스스로 의심\n- 최근 연애는 2년 전, 이별 잘 못 매듭지음`}
        />
      </Card>

      <Card className="!p-3">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 shrink-0 w-4 h-4 rounded border-border bg-surface-2 accent-accent"
          />
          <span className="text-xs text-muted leading-relaxed">
            <Link
              href="/legal/privacy"
              target="_blank"
              className="text-accent hover:underline"
            >
              개인정보 처리방침
            </Link>
            {' · '}
            <Link
              href="/legal/terms"
              target="_blank"
              className="text-accent hover:underline"
            >
              이용약관
            </Link>
            을 확인했고 동의해.<br />
            내 데이터는 제3자에게 제공되지 않고, 언제든 삭제·내보내기 할 수 있다는 걸 이해해.
          </span>
        </label>
      </Card>

      {err && (
        <Card className="border-bad/40 bg-bad/5">
          <div className="text-sm text-bad">{err}</div>
        </Card>
      )}
      <Button type="submit" disabled={!canSubmit}>
        {pending ? '저장 중…' : '시작'}
      </Button>
      <div className="text-[11px] text-muted text-center leading-relaxed">
        💬 다음 단계에서 카톡 1건만 넣으면 루바이가 바로 코칭 시작해.
      </div>
    </form>
  )
}

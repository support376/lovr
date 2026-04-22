'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSelf } from '@/lib/actions/self'
import { Button, Card, TextInput } from '@/components/ui'

const GENDER_OPTIONS: Array<{ v: 'male' | 'female'; l: string }> = [
  { v: 'male', l: '남성' },
  { v: 'female', l: '여성' },
]

/**
 * 온보딩 — 이름 + 성별 + 약관. 끝.
 * 상태(관계 단계)는 이후 대화 중 자연스럽게 전환 (updateRelationship tool).
 * 상대는 내 성별 반대로 자동 생성 (createSelf 내부).
 */
export function OnboardingForm() {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const [agree, setAgree] = useState(false)
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const canSubmit = !!name.trim() && gender !== null && agree && !pending

  const submit = () => {
    if (!canSubmit || gender === null) return
    setErr(null)
    start(async () => {
      try {
        await createSelf({
          displayName: name.trim(),
          gender,
        })
        router.push('/onboarding/first-event')
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
            상대는 내 성별 반대로 자동 설정돼.
          </span>
        </div>
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
        다음: 대화/기록 1건만 넣으면 루바이가 바로 분석 시작.
      </div>
    </form>
  )
}

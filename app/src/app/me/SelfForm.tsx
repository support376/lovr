'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, TextArea, TextInput } from '@/components/ui'
import { updateSelf } from '@/lib/actions/self'
import type { Actor } from '@/lib/db/schema'

const GENDER = [
  { v: 'male', l: '남' },
  { v: 'female', l: '여' },
  { v: 'other', l: '기타' },
]

/**
 * MY 프로필 — 명목 fact 전용.
 * 자가진단 · 요약 · 딜브레이커 · 강점/약점 전부 제거.
 * 분석은 '분석' 탭에서 Event 기반 모델이 담당.
 */
export function SelfForm({ initial }: { initial: Actor }) {
  const [name, setName] = useState(initial.displayName)
  const [age, setAge] = useState(initial.age?.toString() ?? '')
  const [gender, setGender] = useState(initial.gender ?? '')
  const [occupation, setOccupation] = useState(initial.occupation ?? '')
  const [assets, setAssets] = useState(initial.assetsNotes ?? '')
  const [spending, setSpending] = useState(initial.spendingNotes ?? '')

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
          assetsNotes: assets.trim() || null,
          spendingNotes: spending.trim() || null,
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
        <div className="text-xs text-muted uppercase tracking-wider mb-2">재산 / 자산</div>
        <div className="text-[11px] text-muted mb-2 leading-relaxed">
          연봉대·부동산·저축·현재 자산. fact 위주. 자유 서술.
        </div>
        <TextArea
          value={assets}
          onChange={(e) => setAssets(e.target.value)}
          rows={5}
          placeholder={`예시:\n- 연봉 6000만원\n- 월세 85만원 거주\n- 저축 2천만원\n- 차 없음`}
        />
      </Card>

      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-2">
          지출 · 쓰는 것
        </div>
        <div className="text-[11px] text-muted mb-2 leading-relaxed">
          평소 어디에 돈 쓰는지. 브랜드·취미·월 지출 구조.
        </div>
        <TextArea
          value={spending}
          onChange={(e) => setSpending(e.target.value)}
          rows={5}
          placeholder={`예시:\n- 카페 월 30만원, 식비 월 60만원\n- 옷: 무신사 자주\n- 취미: 클라이밍 월 15만원\n- 소비 유형: 계획형, 반반 적금`}
        />
      </Card>

      {msg && <div className="text-xs text-muted text-center">{msg}</div>}

      <Button type="submit" disabled={pending}>
        {pending ? '저장 중…' : '저장'}
      </Button>
    </form>
  )
}

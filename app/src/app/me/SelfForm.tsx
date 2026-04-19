'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, X } from 'lucide-react'
import { Button, Card, TextArea, TextInput } from '@/components/ui'
import { updateSelf } from '@/lib/actions/self'
import type { Actor } from '@/lib/db/schema'

// MBTI 4축 토글. 각 축 미선택 시 빈 공간("?")로 노출.
const MBTI_AXES: Array<{ axis: number; left: string; right: string; leftLabel: string; rightLabel: string }> = [
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

/**
 * 요약 중심 폼. 세분 필드(personalityNotes/valuesNotes/idealTypeNotes)는
 * 설문으로만 채워지고 여기선 합친 자연어 "내 요약" 박스로만 편집.
 * 저장 시 summary 전체를 personalityNotes 에 몰아넣고 나머지는 비움.
 */
export function SelfForm({ initial }: { initial: Actor }) {
  const [name, setName] = useState(initial.displayName)
  const [mbti, setMbti] = useState(initial.mbti ?? '')
  const [age, setAge] = useState(initial.age?.toString() ?? '')
  const [gender, setGender] = useState(initial.gender ?? '')
  const [occupation, setOccupation] = useState(initial.occupation ?? '')

  // 기존 분리 필드들을 하나의 summary로 합쳐 보여줌
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
        // summary 박스는 rawNotes에만 저장. 세분 필드는 설문에서만 쓰도록 비우지 않고 유지.
        // 단 유저가 summary 박스를 직접 수정한 경우 rawNotes 가 최신 버전.
        await updateSelf({
          displayName: name.trim() || undefined,
          mbti: mbti || null,
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-4"
    >
      {/* 설문 CTA */}
      <Link href="/me/quiz">
        <Card className="border-accent/40 bg-gradient-to-br from-accent/10 via-transparent to-accent-2/10 hover:border-accent/60 transition-colors">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-accent" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">나 잘 모르겠으면 설문</div>
              <div className="text-[11px] text-muted mt-0.5">
                6문항 답하면 AI가 성격·이상형·가치관 narrative 자동 채움 → 아래 요약 박스에 반영.
              </div>
            </div>
            <span className="text-accent text-sm">→</span>
          </div>
        </Card>
      </Link>

      {/* 기본 fact */}
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

          {/* MBTI 4축 */}
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
                  setMbti(chars.join('').trim() === '' ? '' : chars.join(''))
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

      {/* 요약 서술 — 메인 */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-muted uppercase tracking-wider">
            내 요약
          </div>
          <Link href="/me/quiz" className="text-[11px] text-accent">
            ✨ 설문으로 채우기 →
          </Link>
        </div>
        <div className="text-[11px] text-muted mb-2 leading-relaxed">
          성격·가치관·이상형·강점·약점 전부 한 박스. 자유 서술.
          <br />
          <span className="text-accent">설문 돌리면 여기에 AI가 narrative 써 넣어 저장.</span>
        </div>
        <TextArea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={14}
          placeholder={`예시:\n\n내향적, 친해지면 장난 많음. 깊은 대화 선호.\n커리어 > 결혼. 정직함 최우선.\n이상형: 자기 일 열심히 하고 가족 소중히 여기는 사람.\n강점: 약속 잘 지킴, 기억력 좋음.\n약점: 답장 너무 빠름, 확정 단계 주저함.\n딜브레이커는 아래 따로.`}
        />
      </Card>

      {/* 딜브레이커 — 경계 조건이라 분리 */}
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

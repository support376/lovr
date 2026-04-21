'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button, Card, TextArea, TextInput } from '@/components/ui'
import {
  updatePartner,
  updateRelationship,
} from '@/lib/actions/relationships'
import {
  ALLOWED_GOALS_BY_STATE,
  GOAL_LABEL,
  STATE_LABEL,
  type Actor,
  type Relationship,
  type RelationshipGoal,
  type RelationshipState,
} from '@/lib/db/schema'

const GENDER = [
  { v: '', l: '-' },
  { v: 'male', l: '남' },
  { v: 'female', l: '여' },
  { v: 'other', l: '기타' },
]

const STATES: RelationshipState[] = [
  'exploring',
  'dating',
  'serious',
  'struggling',
  'ended',
]

function toInputDate(ts: Date | number | null | undefined): string {
  if (!ts) return ''
  const d = ts instanceof Date ? ts : new Date(Number(ts))
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * 현재 상대 + 관계 설정 (state/goal/날짜) 한 번에.
 * 딱 1 명 active target 모드에 맞춤.
 */
export function PartnerSettings({
  rel,
}: {
  rel: (Relationship & { partner: Actor }) | null
}) {
  const router = useRouter()

  if (!rel) {
    return (
      <Card>
        <div className="flex flex-col gap-3">
          <div className="text-[11px] text-muted leading-relaxed">
            아직 등록된 상대가 없어. 먼저 상대 하나 추가해야 모델 분석·시뮬레이션이 돌아가.
          </div>
          <Link href="/r/new">
            <Button className="w-full">
              <Plus size={14} /> 상대 추가
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  return <PartnerForm rel={rel} onSaved={() => router.refresh()} />
}

function PartnerForm({
  rel,
  onSaved,
}: {
  rel: Relationship & { partner: Actor }
  onSaved: () => void
}) {
  const [name, setName] = useState(rel.partner.displayName)
  const [age, setAge] = useState(rel.partner.age?.toString() ?? '')
  const [gender, setGender] = useState(rel.partner.gender ?? '')
  const [occupation, setOccupation] = useState(rel.partner.occupation ?? '')
  const [rawNotes, setRawNotes] = useState(rel.partner.rawNotes ?? '')
  const [constraintsText, setConstraintsText] = useState(
    (rel.partner.knownConstraints ?? []).join(', ')
  )
  const [state, setStateValue] = useState<RelationshipState>(
    (rel.state as RelationshipState) ?? 'exploring'
  )
  const [goal, setGoal] = useState<RelationshipGoal | null>(
    (rel.goal as RelationshipGoal | null) ?? null
  )
  const [description, setDescription] = useState(rel.description ?? '')
  const [firstMet, setFirstMet] = useState(toInputDate(rel.timelineStart))
  const [endedAt, setEndedAt] = useState(toInputDate(rel.timelineEnd))

  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const allowedGoals = ALLOWED_GOALS_BY_STATE[state]

  const pickState = (s: RelationshipState) => {
    setStateValue(s)
    if (goal && !ALLOWED_GOALS_BY_STATE[s].includes(goal)) {
      setGoal(null)
    }
  }

  const submit = () => {
    setMsg(null)
    start(async () => {
      try {
        await updateRelationship(rel.id, {
          state,
          goal,
          description: description.trim() || null,
          timelineStart: firstMet ? new Date(firstMet + 'T00:00:00') : null,
          timelineEnd: endedAt ? new Date(endedAt + 'T00:00:00') : null,
        } as never)
        await updatePartner(rel.partner.id, {
          displayName: name.trim() || rel.partner.displayName,
          age: age ? parseInt(age, 10) : null,
          gender: gender || null,
          occupation: occupation.trim() || null,
          rawNotes: rawNotes.trim() || null,
          knownConstraints: constraintsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        })
        setMsg('저장됨')
        onSaved()
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
      className="flex flex-col gap-3"
    >
      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-3">기본</div>
        <div className="flex flex-col gap-3">
          <TextInput
            label="이름 / 호칭"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <TextInput
              label="나이"
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              placeholder="27"
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">성별</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="rounded-xl bg-surface-2 border border-border px-2 py-3 text-sm outline-none focus:border-accent"
              >
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
              placeholder="마케터"
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-2">관계</div>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] text-muted uppercase tracking-wider">
              상태
            </span>
            <div className="flex gap-1 flex-wrap">
              {STATES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => pickState(s)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                    state === s
                      ? 'bg-accent/15 border-accent/50 text-accent'
                      : 'bg-surface-2 border-border text-muted'
                  }`}
                >
                  {STATE_LABEL[s]}
                </button>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] text-muted uppercase tracking-wider">
              목적
            </span>
            <div className="flex gap-1 flex-wrap">
              {allowedGoals.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGoal(g)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                    goal === g
                      ? 'bg-accent-2/15 border-accent-2/50 text-accent-2'
                      : 'bg-surface-2 border-border text-muted'
                  }`}
                >
                  {GOAL_LABEL[g]}
                </button>
              ))}
              {goal && (
                <button
                  type="button"
                  onClick={() => setGoal(null)}
                  className="px-2 py-1 text-[10px] text-muted hover:text-bad"
                >
                  ✕ 해제
                </button>
              )}
            </div>
          </label>

          <TextInput
            label="관계 정의 (한 줄)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="직장 후임 · 소개팅 3회차"
          />

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted uppercase tracking-wider">
                첫 만남
              </span>
              <input
                type="date"
                value={firstMet}
                onChange={(e) => setFirstMet(e.target.value)}
                className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted uppercase tracking-wider">
                종료일 (해당 시)
              </span>
              <input
                type="date"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
                className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-2">
          상세
        </div>
        <div className="flex flex-col gap-3">
          <TextInput
            label="제약 태그 (쉼표)"
            value={constraintsText}
            onChange={(e) => setConstraintsText(e.target.value)}
            placeholder="기혼, 직장 동료, 연하"
          />
          <TextArea
            label="메모 (fact)"
            rows={5}
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            placeholder="배경·가족·공통 접점·과거 이력 등 객관 사실"
          />
        </div>
      </Card>

      {msg && <div className="text-xs text-muted text-center">{msg}</div>}

      <Button type="submit" disabled={pending}>
        {pending ? '저장 중…' : '저장'}
      </Button>
    </form>
  )
}

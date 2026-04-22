'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Check, Lock } from 'lucide-react'
import { Button, Card, TextArea, TextInput } from '@/components/ui'
import {
  updatePartner,
  updateRelationship,
} from '@/lib/actions/relationships'
import { setFocusRelationship } from '@/lib/actions/focus'
import {
  STATE_LABEL,
  type Actor,
  type Relationship,
  type RelationshipState,
} from '@/lib/db/schema'
import { usePlan } from '@/lib/plan'
import { UpgradeGate } from '@/components/UpgradeGate'

const GENDER = [
  { v: '', l: '-' },
  { v: 'male', l: '남' },
  { v: 'female', l: '여' },
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

type RelWithPartner = Relationship & { partner: Actor }

/**
 * 설정 탭 > 상대 정보.
 * N 명 목록 · 현재 선택 (focus) · 추가 · 선택된 상대 편집 한 곳.
 */
export function PartnerSettings({
  all,
  current,
}: {
  all: RelWithPartner[]
  current: RelWithPartner | null
}) {
  const router = useRouter()
  const [pendingSelect, startSelect] = useTransition()
  const plan = usePlan()

  const requiresPaid = all.length >= 1 && plan === 'free'

  const pick = (id: string) => {
    if (id === current?.id) return
    startSelect(async () => {
      await setFocusRelationship(id)
      router.refresh()
    })
  }

  const goNew = () => router.push('/r/new')

  return (
    <div className="flex flex-col gap-3">
      {/* 스위처 + 추가 */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {all.map((r) => {
          const selected = r.id === current?.id
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => pick(r.id)}
              disabled={pendingSelect}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selected
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-surface-2 border-border text-muted hover:border-accent/40'
              } ${pendingSelect ? 'opacity-60' : ''}`}
            >
              {selected && <Check size={10} />}
              {r.partner.displayName}
              {r.partner.age ? (
                <span className="text-muted font-normal">({r.partner.age})</span>
              ) : null}
            </button>
          )
        })}
        {requiresPaid ? (
          <UpgradeGate feature="multi_partner" onProceed={goNew}>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border border-dashed border-accent/40 text-accent hover:border-accent"
            >
              <Lock size={10} /> 추가 (프리미엄)
            </button>
          </UpgradeGate>
        ) : (
          <Link
            href="/r/new"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border border-dashed border-border text-muted hover:text-accent hover:border-accent"
          >
            <Plus size={11} /> 추가
          </Link>
        )}
      </div>

      {!current ? (
        <Card>
          <div className="text-[11px] text-muted leading-relaxed">
            아직 등록된 상대가 없어. 위 <strong>추가</strong> 버튼으로 첫 상대 등록.
          </div>
        </Card>
      ) : (
        <PartnerForm
          key={current.id}
          rel={current}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  )
}

function PartnerForm({
  rel,
  onSaved,
}: {
  rel: RelWithPartner
  onSaved: () => void
}) {
  const [name, setName] = useState(rel.partner.displayName)
  const [age, setAge] = useState(rel.partner.age?.toString() ?? '')
  const [gender, setGender] = useState(rel.partner.gender ?? '')
  const [occupation, setOccupation] = useState(rel.partner.occupation ?? '')
  const [rawNotes, setRawNotes] = useState(rel.partner.rawNotes ?? '')
  const [state, setStateValue] = useState<RelationshipState>(
    (rel.state as RelationshipState) ?? 'exploring'
  )
  const [firstMet, setFirstMet] = useState(toInputDate(rel.timelineStart))
  const [endedAt, setEndedAt] = useState(toInputDate(rel.timelineEnd))

  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  // 종료일은 ended / struggling 상태에서만 의미
  const showEndedAt = state === 'ended' || state === 'struggling'

  const submit = () => {
    setMsg(null)
    start(async () => {
      try {
        await updateRelationship(rel.id, {
          state,
          timelineStart: firstMet ? new Date(firstMet + 'T00:00:00') : null,
          timelineEnd: showEndedAt && endedAt ? new Date(endedAt + 'T00:00:00') : null,
        } as never)
        await updatePartner(rel.partner.id, {
          displayName: name.trim() || rel.partner.displayName,
          age: age ? parseInt(age, 10) : null,
          gender: gender || null,
          occupation: occupation.trim() || null,
          rawNotes: rawNotes.trim() || null,
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
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-muted uppercase tracking-wider">
              상태
            </span>
            <div className="flex gap-1 flex-wrap">
              {STATES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStateValue(s)}
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
            <span className="text-[10px] text-muted">
              목표는 상태에서 자동 결정 — 루바이가 알아서.
            </span>
          </div>

          <div className={`grid ${showEndedAt ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
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
            {showEndedAt && (
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted uppercase tracking-wider">
                  종료일
                </span>
                <input
                  type="date"
                  value={endedAt}
                  onChange={(e) => setEndedAt(e.target.value)}
                  className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-2">
          메모
        </div>
        <TextArea
          rows={5}
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          placeholder="배경·가족·공통 접점·과거 이력 등 객관 사실. 기혼·직장동료 같은 제약도 여기 한 줄로."
        />
      </Card>

      {msg && <div className="text-xs text-muted text-center">{msg}</div>}

      <Button type="submit" disabled={pending}>
        {pending ? '저장 중…' : '저장'}
      </Button>
    </form>
  )
}

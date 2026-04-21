'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, TextArea } from '@/components/ui'
import { updatePartner, updateRelationship } from '@/lib/actions/relationships'
import type { Actor, Relationship } from '@/lib/db/schema'

const GENDER_OPTIONS = [
  { v: '', l: '-' },
  { v: 'male', l: '남' },
  { v: 'female', l: '여' },
  { v: 'other', l: '기타' },
]

function dateInputValue(ts: Date | number | null | undefined): string {
  if (!ts) return ''
  const d = ts instanceof Date ? ts : new Date(Number(ts))
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * 상대 프로필 fact 편집. 자가진단 필드 전부 제거.
 * 실제 '성향'은 ModelCard 가 Event 에서 추정.
 */
export function PartnerInlineEditor({
  rel,
  showToggleButton = false,
  open: controlledOpen,
  onOpenChange,
}: {
  rel: Relationship & { partner: Actor }
  showToggleButton?: boolean
  open?: boolean
  onOpenChange?: (v: boolean) => void
}) {
  const [innerOpen, setInnerOpen] = useState(false)
  const open = controlledOpen ?? innerOpen
  const setOpen = onOpenChange ?? setInnerOpen

  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const router = useRouter()

  const [name, setName] = useState(rel.partner.displayName)
  const [age, setAge] = useState(rel.partner.age?.toString() ?? '')
  const [gender, setGender] = useState(rel.partner.gender ?? '')
  const [occupation, setOccupation] = useState(rel.partner.occupation ?? '')
  const [rawNotes, setRawNotes] = useState(rel.partner.rawNotes ?? '')
  const [constraintsText, setConstraintsText] = useState(
    (rel.partner.knownConstraints ?? []).join(', ')
  )

  const [description, setDescription] = useState(rel.description ?? '')
  const [firstMet, setFirstMet] = useState(dateInputValue(rel.timelineStart))

  const submit = () => {
    setMsg(null)
    start(async () => {
      try {
        const timelineStart = firstMet ? new Date(firstMet + 'T00:00:00') : null
        await updateRelationship(rel.id, {
          description: description.trim() || null,
          timelineStart,
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
        setOpen(false)
        router.refresh()
      } catch (e) {
        setMsg('실패: ' + (e as Error).message)
      }
    })
  }

  const firstMetDisplay = rel.timelineStart
    ? new Date(
        rel.timelineStart instanceof Date
          ? rel.timelineStart
          : Number(rel.timelineStart)
      ).toLocaleDateString('ko-KR')
    : null
  const constraintList = rel.partner.knownConstraints ?? []

  const summary = (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-base font-bold">{rel.partner.displayName}</span>
        {rel.partner.age && (
          <span className="text-sm text-muted">{rel.partner.age}</span>
        )}
        {rel.partner.occupation && (
          <span className="text-[11px] text-muted">· {rel.partner.occupation}</span>
        )}
      </div>
      {(firstMetDisplay || constraintList.length > 0 || rel.description) && (
        <div className="flex flex-col gap-0.5 text-[11px] text-muted leading-relaxed">
          {firstMetDisplay && <div>📅 첫 만남 {firstMetDisplay}</div>}
          {rel.description && (
            <div className="whitespace-pre-wrap">💬 {rel.description}</div>
          )}
          {constraintList.length > 0 && <div>🏷 {constraintList.join(' · ')}</div>}
        </div>
      )}
    </div>
  )

  const body = (
    <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-muted uppercase tracking-wider">이름</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted uppercase tracking-wider">나이</span>
          <input
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            placeholder="27"
            className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted uppercase tracking-wider">성별</span>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent"
          >
            {GENDER_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted uppercase tracking-wider">직업</span>
          <input
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="마케터"
            className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-muted uppercase tracking-wider">
          첫 만남 날짜
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
          관계 정의 (한 줄)
        </span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="직장 후임 · 소개팅 3회차"
          className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-muted uppercase tracking-wider">
          제약 · 맥락 태그 (쉼표)
        </span>
        <input
          value={constraintsText}
          onChange={(e) => setConstraintsText(e.target.value)}
          placeholder="기혼, 직장 동료, 연하"
          className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <TextArea
        label="상대 메모 (fact)"
        rows={5}
        value={rawNotes}
        onChange={(e) => setRawNotes(e.target.value)}
        placeholder="배경·가족·공통 접점·과거 이력 등 객관 사실"
      />

      {msg && <div className="text-xs text-muted text-center">{msg}</div>}

      <Button onClick={submit} disabled={pending}>
        {pending ? '저장 중…' : '저장'}
      </Button>
    </div>
  )

  if (!showToggleButton) {
    return open ? (
      <Card>
        {summary}
        {body}
      </Card>
    ) : null
  }

  return (
    <Card>
      {summary}
      <button
        onClick={() => setOpen(!open)}
        className="mt-3 w-full text-left text-[11px] text-accent hover:underline"
      >
        {open ? '접기 ▲' : '편집 ▼'}
      </button>
      {open && body}
    </Card>
  )
}

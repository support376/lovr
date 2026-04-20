'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, TextArea } from '@/components/ui'
import {
  updatePartner,
  updateRelationship,
} from '@/lib/actions/relationships'
import type { Actor, Relationship } from '@/lib/db/schema'

const GENDER_OPTIONS = [
  { v: '', l: '-' },
  { v: 'male', l: '남' },
  { v: 'female', l: '여' },
  { v: 'other', l: '기타' },
]

const MBTI_AXES = [
  { axis: 0, left: 'E', right: 'I' },
  { axis: 1, left: 'N', right: 'S' },
  { axis: 2, left: 'T', right: 'F' },
  { axis: 3, left: 'J', right: 'P' },
]

/**
 * 관계 탭 헤더 옆 "상세" 버튼으로 열리는 인라인 편집.
 * 파트너 개인정보 전용. 관계 stage 는 메인 StagePicker 로 분리.
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

  // Partner fields
  const [name, setName] = useState(rel.partner.displayName)
  const [age, setAge] = useState(rel.partner.age?.toString() ?? '')
  const [gender, setGender] = useState(rel.partner.gender ?? '')
  const [occupation, setOccupation] = useState(rel.partner.occupation ?? '')
  const [mbti, setMbti] = useState(rel.partner.mbti ?? '')
  const [rawNotes, setRawNotes] = useState(rel.partner.rawNotes ?? '')

  // Relationship fields (partner 맥락 1줄)
  const [description, setDescription] = useState(rel.description ?? '')

  const submit = () => {
    setMsg(null)
    start(async () => {
      try {
        await updateRelationship(rel.id, {
          description: description.trim() || null,
        } as never)
        await updatePartner(rel.partner.id, {
          displayName: name.trim() || rel.partner.displayName,
          age: age ? parseInt(age, 10) : null,
          gender: gender || null,
          occupation: occupation.trim() || null,
          mbti: mbti || null,
          rawNotes: rawNotes.trim() || null,
        })
        setMsg('저장됨')
        setOpen(false)
        router.refresh()
      } catch (e) {
        setMsg('실패: ' + (e as Error).message)
      }
    })
  }

  const body = (
    <div className="mt-3 flex flex-col gap-3">
      {/* 이름 */}
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-muted">이름</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted">나이</span>
          <input
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            placeholder="27"
            className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted">성별</span>
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
          <span className="text-[10px] text-muted">직업</span>
          <input
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="마케터"
            className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted">MBTI</span>
          <span className="text-sm font-mono text-accent">
            {mbti || '? ? ? ?'}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {MBTI_AXES.map((ax) => {
            const curChar = mbti[ax.axis] ?? ' '
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
                  className={`flex-1 py-1.5 rounded-md text-xs font-mono border ${
                    curChar === ax.left
                      ? 'bg-accent/15 border-accent text-accent'
                      : 'bg-surface-2 border-border text-muted'
                  }`}
                >
                  {ax.left}
                </button>
                <button
                  type="button"
                  onClick={() => setAxis(ax.right)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-mono border ${
                    curChar === ax.right
                      ? 'bg-accent/15 border-accent text-accent'
                      : 'bg-surface-2 border-border text-muted'
                  }`}
                >
                  {ax.right}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-muted">관계 정의 (한 줄)</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="직장 후임 · 소개팅 3회차"
          className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <TextArea
        label="상대 메모"
        rows={4}
        value={rawNotes}
        onChange={(e) => setRawNotes(e.target.value)}
        placeholder="배경·성격·취향·공통 접점·과거 이력"
      />

      {msg && <div className="text-xs text-muted text-center">{msg}</div>}

      <Button onClick={submit} disabled={pending}>
        {pending ? '저장 중…' : '저장'}
      </Button>
    </div>
  )

  if (!showToggleButton) {
    return open ? <Card>{body}</Card> : null
  }

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left text-xs text-muted uppercase tracking-wider"
      >
        상세 정보 {open ? '▲' : '▼'}
      </button>
      {open && body}
    </Card>
  )
}

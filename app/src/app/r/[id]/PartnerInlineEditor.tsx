'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, TextArea } from '@/components/ui'
import {
  updatePartner,
  updateRelationship,
} from '@/lib/actions/relationships'
import type { Actor, InferredTrait, Relationship } from '@/lib/db/schema'

const GENDER_OPTIONS = [
  { v: '', l: '-' },
  { v: 'male', l: '남' },
  { v: 'female', l: '여' },
  { v: 'other', l: '기타' },
]

/**
 * 전략 탭 헤더 옆 "상세" 버튼으로 열리는 인라인 편집.
 * 관계 단계(progress)는 유저 직접 선택 X — Event 기반 derive 엔진이 기록.
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

  // Relationship fields
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

  const traits: InferredTrait[] = rel.partner.inferredTraits ?? []

  const body = (
    <div className="mt-3 flex flex-col gap-3">
      {/* 역프로파일링 요약 — Event에서 자동 추출. 읽기 전용. */}
      {traits.length > 0 && (
        <div className="rounded-lg bg-accent/5 border border-accent/20 p-2.5">
          <div className="text-[10px] text-accent uppercase tracking-wider mb-1.5">
            관찰 누적 · Event에서 추출
          </div>
          <ul className="flex flex-col gap-1">
            {traits.map((t, i) => (
              <li key={i} className="text-xs leading-relaxed">
                • {t.observation}
                <span className="text-muted ml-1">({t.confidenceNarrative})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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

      {/* MBTI는 단순 텍스트 (상대가 직접 알려준 경우만). 자가진단 토글 X. */}
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-muted">MBTI (상대가 알려준 경우만)</span>
        <input
          value={mbti}
          onChange={(e) => setMbti(e.target.value.toUpperCase().slice(0, 4))}
          placeholder="예) ENFP"
          className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm font-mono outline-none focus:border-accent"
        />
      </label>

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

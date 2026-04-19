'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, TextArea, TextInput } from '@/components/ui'
import { updatePartner, updateRelationship } from '@/lib/actions/relationships'
import type { Actor, Relationship } from '@/lib/db/schema'
import { STAGES, STAGE_ORDER, STYLES, STYLE_ORDER } from '@/lib/ontology'

const MBTI = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]
const GENDER = [
  { v: 'male', l: '남' },
  { v: 'female', l: '여' },
  { v: 'other', l: '기타' },
]

/**
 * 명목 정보만 편집. 관계 stage·dynamics는 Event 기반 자동 추론 (여기서 편집 X).
 */
export function EditRelationshipForm({
  rel,
}: {
  rel: Relationship & { partner: Actor }
}) {
  // 관계 정의
  const [description, setDescription] = useState(rel.description ?? '')
  const [stage, setStage] = useState(rel.progress)
  const [style, setStyle] = useState(rel.style ?? '')

  // 상대 명목
  const [partnerName, setPartnerName] = useState(rel.partner.displayName)
  const [age, setAge] = useState(rel.partner.age?.toString() ?? '')
  const [gender, setGender] = useState(rel.partner.gender ?? '')
  const [occupation, setOccupation] = useState(rel.partner.occupation ?? '')
  const [mbti, setMbti] = useState(rel.partner.mbti ?? '')
  const [partnerNotes, setPartnerNotes] = useState(rel.partner.rawNotes ?? '')
  const [constraints, setConstraints] = useState(
    (rel.partner.knownConstraints ?? []).join(', ')
  )

  const [status, setStatus] = useState<'active' | 'paused' | 'ended'>(
    (rel.status as 'active' | 'paused' | 'ended') ?? 'active'
  )

  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const router = useRouter()

  const submit = () => {
    setMsg(null)
    start(async () => {
      try {
        await updateRelationship(rel.id, {
          description: description.trim() || null,
          progress: stage,
          style: style || null,
          status,
        } as never)
        await updatePartner(rel.partner.id, {
          displayName: partnerName,
          age: age ? parseInt(age, 10) : null,
          gender: gender || null,
          occupation: occupation.trim() || null,
          mbti: mbti || null,
          rawNotes: partnerNotes || null,
          knownConstraints: constraints
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        })
        setMsg('저장됨')
        router.push(`/r/${rel.id}`)
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
      {/* 관계 정의 */}
      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-3">
          관계 정의
        </div>
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={`예: 직장 후임 · 소개팅 3회차 · 재연결 시도 중`}
        />
      </Card>

      {/* 단계 */}
      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-2">
          단계
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STAGE_ORDER.map((k) => {
            const s = STAGES[k]
            return (
              <button
                type="button"
                key={k}
                onClick={() => setStage(k)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-medium border ${
                  stage === k
                    ? 'bg-accent/15 border-accent/40 text-accent'
                    : 'bg-surface-2 border-border text-muted'
                }`}
                title={s.hint}
              >
                {s.ko}
              </button>
            )
          })}
        </div>
      </Card>

      {/* 답변 스타일 */}
      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-2">
          답변 스타일
        </div>
        <div className="text-[11px] text-muted mb-3 leading-relaxed">
          LuvAI·실시간 제안의 톤을 결정. 관계별로 스타일 다르게 쓸 수 있음.
          비워두면 AI가 자동 선택.
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setStyle('')}
            className={`text-left px-3 py-2 rounded-lg text-xs border ${
              !style
                ? 'bg-accent/15 border-accent/40 text-accent'
                : 'bg-surface-2 border-border text-muted'
            }`}
          >
            자동 (맥락에 맞춰 AI가 선택)
          </button>
          {STYLE_ORDER.map((k) => {
            const s = STYLES[k]
            return (
              <button
                type="button"
                key={k}
                onClick={() => setStyle(k)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  style === k
                    ? 'bg-accent/10 border-accent/40'
                    : 'bg-surface-2 border-border'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{s.ko}</span>
                  <span className="text-[10px] text-muted font-mono">{k}</span>
                </div>
                <div className="mt-1 text-[11px] text-muted leading-relaxed">
                  <div>• {s.core}</div>
                  <div>• 쓸 때: {s.useWhen}</div>
                  <div>• 실패: {s.failMode}</div>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* 상대 기본 */}
      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-3">
          상대 기본 정보
        </div>
        <div className="flex flex-col gap-3">
          <TextInput
            label="이름/호칭"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
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
              placeholder="마케터"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted">MBTI (알면)</span>
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
            <div className="grid grid-cols-4 gap-1.5">
              {MBTI.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMbti(mbti === m ? '' : m)}
                  className={`py-1.5 rounded-lg text-[11px] font-mono border ${
                    mbti === m
                      ? 'bg-accent/15 border-accent text-accent'
                      : 'bg-surface-2 border-border text-muted'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 상대 자유 메모 */}
      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-3">
          상대 자세히
        </div>
        <div className="flex flex-col gap-3">
          <TextArea
            label="배경·성격·취향·과거 이력"
            rows={8}
            value={partnerNotes}
            onChange={(e) => setPartnerNotes(e.target.value)}
            placeholder={`명목 fact만:\n- 출신·학력·가족·종교\n- 취미·관심사·가치관\n- 과거 연애 이력 흘린 말\n- 물리적 특징\n- 공통 접점\n\n관계 감정·단계는 여기 적지 마 — Event 쌓이면 AI가 자동 추출.`}
          />
          <TextInput
            label="제약/맥락 태그 (쉼표)"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="기혼, 직장 동료, 연하, …"
          />
        </div>
      </Card>

      {/* 관계 status */}
      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-2">
          관계 status
        </div>
        <div className="text-[11px] text-muted mb-3 leading-relaxed">
          활성/잠시 멈춤/종료. 활성 관계의 stage·dynamics는 자동 추론.
        </div>
        <div className="flex gap-2 text-xs">
          {(['active', 'paused', 'ended'] as const).map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setStatus(s)}
              className={`flex-1 py-2 rounded-lg border ${
                status === s
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-surface-2 border-border text-muted'
              }`}
            >
              {s === 'active' ? '활성' : s === 'paused' ? '잠시 멈춤' : '종료'}
            </button>
          ))}
        </div>
      </Card>

      {msg && <div className="text-xs text-muted text-center">{msg}</div>}

      <Button type="submit" disabled={pending}>
        {pending ? '저장 중…' : '저장'}
      </Button>
    </form>
  )
}

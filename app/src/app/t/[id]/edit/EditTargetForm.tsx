'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import {
  archiveTarget,
  deleteTarget,
  updateTargetGoal,
  updateTargetMeta,
  updateTargetStage,
} from '@/lib/actions/targets'
import { Button, Card, TextArea, TextInput, STAGE_LABEL } from '@/components/ui'
import type { Target, TargetGoal } from '@/lib/db/schema'

const MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]

const GOAL_PRESETS: Array<{ value: TargetGoal['preset']; label: string }> = [
  { value: 'explore', label: '탐색' },
  { value: 'casual', label: '캐주얼' },
  { value: 'sum_to_couple', label: '썸→연인' },
  { value: 'confirm_relationship', label: '관계확정' },
  { value: 'soft_end', label: '소프트종료' },
  { value: 'observe', label: '관찰만' },
  { value: 'custom', label: '커스텀' },
]

const STAGES: Array<Target['stage']> = [
  'matched',
  'exploring',
  'crush',
  'confirmed',
  'committed',
  'fading',
  'ended',
]

export function EditTargetForm({ target }: { target: Target }) {
  const [alias, setAlias] = useState(target.alias)
  const [age, setAge] = useState(target.age?.toString() ?? '')
  const [gender, setGender] = useState(target.gender ?? '')
  const [job, setJob] = useState(target.job ?? '')
  const [platform, setPlatform] = useState(target.matchPlatform ?? '')
  const [mbti, setMbti] = useState(target.mbti ?? '')
  const [background, setBackground] = useState(target.background ?? '')
  const [commonGround, setCommonGround] = useState(target.commonGround ?? '')
  const [physicalDescription, setPhysicalDescription] = useState(
    target.physicalDescription ?? ''
  )
  const [relationshipHistory, setRelationshipHistory] = useState(
    target.relationshipHistory ?? ''
  )
  const [interests, setInterests] = useState<string[]>(target.interests ?? [])
  const [currentSituation, setCurrentSituation] = useState(target.currentSituation ?? '')
  const [notes, setNotes] = useState(target.notes ?? '')
  const [stage, setStage] = useState<Target['stage']>(target.stage)

  const [goalPreset, setGoalPreset] = useState<TargetGoal['preset']>(target.goal.preset)
  const [goalDesc, setGoalDesc] = useState(target.goal.description)
  const [timeframe, setTimeframe] = useState(
    target.goal.timeframeWeeks?.toString() ?? ''
  )

  const [pending, start] = useTransition()
  const router = useRouter()

  const save = () => {
    start(async () => {
      await updateTargetGoal(target.id, {
        preset: goalPreset,
        description: goalDesc,
        timeframeWeeks: timeframe ? parseInt(timeframe, 10) : undefined,
      })
      if (stage !== target.stage) {
        await updateTargetStage(target.id, stage)
      }
      await updateTargetMeta(target.id, {
        alias,
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        job: job || undefined,
        matchPlatform: platform || undefined,
        mbti: mbti || undefined,
        background: background || undefined,
        commonGround: commonGround || undefined,
        physicalDescription: physicalDescription || undefined,
        relationshipHistory: relationshipHistory || undefined,
        interests,
        currentSituation: currentSituation || undefined,
        notes: notes || undefined,
      })
      router.push(`/t/${target.id}`)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <Section title="현재 진행 상황">
        <Card>
          <div className="text-[11px] text-muted mb-2">
            전략의 기준점. 지금 뭐가 어떻게 돌아가는지 자세히 써.
          </div>
          <TextArea
            value={currentSituation}
            onChange={(e) => setCurrentSituation(e.target.value)}
            rows={6}
            placeholder="썸 3주째. 주 2회 카톡. 답장 10분 내. 첫 데이트 1회…"
          />
        </Card>
        <Card>
          <div className="text-xs text-muted mb-2">현재 단계</div>
          <div className="grid grid-cols-3 gap-2">
            {STAGES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s)}
                className={`rounded-xl px-2 py-2 border text-xs ${
                  stage === s
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'bg-surface-2 border-border text-muted'
                }`}
              >
                {STAGE_LABEL[s]}
              </button>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="목표">
        <Card>
          <div className="grid grid-cols-2 gap-2">
            {GOAL_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setGoalPreset(p.value)}
                className={`rounded-xl px-3 py-2.5 border text-sm ${
                  goalPreset === p.value
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'bg-surface-2 border-border'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <TextArea
              label="구체 목표"
              value={goalDesc}
              onChange={(e) => setGoalDesc(e.target.value)}
              rows={3}
            />
          </div>
          <div className="mt-3">
            <TextInput
              label="시한 (주)"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
            />
          </div>
        </Card>
      </Section>

      <Section title="정체 / 만남">
        <Card>
          <div className="flex flex-col gap-3">
            <TextInput label="호칭" value={alias} onChange={(e) => setAlias(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="나이"
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">성별</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="rounded-xl bg-surface-2 border border-border px-3 py-3 text-sm outline-none focus:border-accent"
                >
                  <option value="">선택 안함</option>
                  <option value="female">여</option>
                  <option value="male">남</option>
                  <option value="other">기타</option>
                </select>
              </label>
            </div>
            <TextInput label="직업" value={job} onChange={(e) => setJob(e.target.value)} />
            <TextInput
              label="만남 경로"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="틴더/범블/소개/지인…"
            />
          </div>
        </Card>
      </Section>

      <Section title="성격 / 배경">
        <Card>
          <div className="text-xs text-muted mb-2">MBTI</div>
          <div className="grid grid-cols-4 gap-1.5">
            {MBTI_TYPES.map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMbti(mbti === m ? '' : m)}
                className={`py-2 rounded-lg text-xs font-mono border ${
                  mbti === m
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-surface-2 border-border text-muted'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <TextArea
            label="배경 (출신·학력·가족·종교)"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            rows={3}
          />
        </Card>
        <Card>
          <TextArea
            label="외형 / 스타일"
            value={physicalDescription}
            onChange={(e) => setPhysicalDescription(e.target.value)}
            rows={2}
          />
        </Card>
        <Card>
          <TextArea
            label="나와의 접점 / 공통점"
            value={commonGround}
            onChange={(e) => setCommonGround(e.target.value)}
            rows={3}
          />
        </Card>
        <Card>
          <TextArea
            label="상대 연애 이력 (추정)"
            value={relationshipHistory}
            onChange={(e) => setRelationshipHistory(e.target.value)}
            rows={2}
          />
        </Card>
        <Card>
          <div className="text-xs text-muted mb-1">관심사 / 취미</div>
          <TagInput items={interests} onChange={setInterests} placeholder="재즈, 러닝, 전시…" />
        </Card>
        <Card>
          <TextArea
            label="기타 메모"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </Card>
      </Section>

      <Button onClick={save} disabled={pending}>
        {pending ? '저장 중…' : '저장'}
      </Button>

      <div className="pt-4 border-t border-border flex flex-col gap-2">
        <Button
          variant="secondary"
          onClick={() =>
            start(async () => {
              await archiveTarget(target.id)
              router.push('/')
            })
          }
        >
          아카이브
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (confirm(`${target.alias}을(를) 완전 삭제? 모든 기록도 사라져.`)) {
              start(async () => {
                await deleteTarget(target.id)
                router.push('/')
              })
            }
          }}
        >
          완전 삭제
        </Button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="text-xs text-muted uppercase tracking-wider">{title}</div>
      {children}
    </section>
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
          className="flex-1 rounded-xl bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 rounded-xl bg-accent/20 text-accent text-sm font-semibold"
        >
          추가
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-accent/10 text-accent border border-accent/30"
            >
              {t}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
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

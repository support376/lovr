'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createTarget } from '@/lib/actions/targets'
import { Button, Card, TextArea, TextInput, STAGE_LABEL } from '@/components/ui'
import type { Target, TargetGoal } from '@/lib/db/schema'

const EMOJIS = ['💭', '🌸', '🔥', '⭐', '🌙', '🍀', '🎧', '🐻', '🦊', '🍷', '📚', '🏃', '☕', '🎨']

const MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]

const STAGES: Array<Target['stage']> = [
  'matched',
  'exploring',
  'crush',
  'confirmed',
  'committed',
  'fading',
]

const GOAL_PRESETS: Array<{ value: TargetGoal['preset']; label: string; hint: string }> = [
  { value: 'explore', label: '탐색', hint: '아직 판단 유보' },
  { value: 'casual', label: '캐주얼 유지', hint: '가볍게 계속' },
  { value: 'sum_to_couple', label: '썸 → 연인', hint: '관계로 전환' },
  { value: 'confirm_relationship', label: '관계 확정', hint: '확정 단계로' },
  { value: 'soft_end', label: '소프트 종료', hint: '자연스럽게 정리' },
  { value: 'observe', label: '관찰만', hint: '파악 중' },
  { value: 'custom', label: '커스텀', hint: '자유 기술' },
]

export function NewTargetForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [pending, start] = useTransition()
  const router = useRouter()

  // Step 1 — 정체 / 만남
  const [alias, setAlias] = useState('')
  const [avatar, setAvatar] = useState('🌸')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('female')
  const [job, setJob] = useState('')
  const [platform, setPlatform] = useState('')
  const [firstContact, setFirstContact] = useState('')

  // Step 2 — 배경 / 성격
  const [mbti, setMbti] = useState('')
  const [background, setBackground] = useState('')
  const [commonGround, setCommonGround] = useState('')
  const [physicalDescription, setPhysicalDescription] = useState('')
  const [relationshipHistory, setRelationshipHistory] = useState('')
  const [interests, setInterests] = useState<string[]>([])

  // Step 3 — 현재 진행 중인 관계 + 목표
  const [stage, setStage] = useState<Target['stage']>('exploring')
  const [currentSituation, setCurrentSituation] = useState('')
  const [goalPreset, setGoalPreset] = useState<TargetGoal['preset']>('sum_to_couple')
  const [goalDesc, setGoalDesc] = useState('썸 → 연인 전환')
  const [timeframe, setTimeframe] = useState('')
  const [notes, setNotes] = useState('')

  const submit = () => {
    if (!alias.trim()) return
    start(async () => {
      const t = await createTarget({
        alias: alias.trim(),
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        job: job || undefined,
        matchPlatform: platform || undefined,
        avatarEmoji: avatar,
        firstContactAt: firstContact
          ? new Date(firstContact).getTime()
          : undefined,
        mbti: mbti || undefined,
        background: background || undefined,
        commonGround: commonGround || undefined,
        physicalDescription: physicalDescription || undefined,
        relationshipHistory: relationshipHistory || undefined,
        interests,
        currentSituation: currentSituation || undefined,
        stage,
        notes: notes || undefined,
        goal: {
          preset: goalPreset,
          description: goalDesc.trim() || '일단 탐색',
          timeframeWeeks: timeframe ? parseInt(timeframe, 10) : undefined,
        },
      })
      router.push(`/t/${t.id}`)
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (step < 3) setStep((step + 1) as 2 | 3)
        else submit()
      }}
      className="flex flex-col gap-4"
    >
      <StepDots current={step} total={3} />

      {step === 1 && (
        <>
          <Card>
            <div className="text-xs text-muted mb-2">아바타</div>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setAvatar(e)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl border ${
                    avatar === e
                      ? 'bg-accent/20 border-accent'
                      : 'bg-surface-2 border-border'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-xs text-muted mb-2">정체</div>
            <div className="flex flex-col gap-3">
              <TextInput
                label="호칭 (별명도 됨, 본명 쓰고 싶으면 써도 됨)"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="유진 / 박유진 / 찐이"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="나이"
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="27"
                  inputMode="numeric"
                />
                <Select
                  label="성별"
                  value={gender}
                  onChange={setGender}
                  options={[
                    { v: 'female', l: '여' },
                    { v: 'male', l: '남' },
                    { v: 'other', l: '기타' },
                  ]}
                />
              </div>
              <TextInput
                label="직업"
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder="마케터, 간호사, 개발자…"
              />
            </div>
          </Card>

          <Card>
            <div className="text-xs text-muted mb-2">만남</div>
            <div className="flex flex-col gap-3">
              <TextInput
                label="만남 경로"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="틴더 / 범블 / 지인 소개 / 직장 / 학교 / 클럽…"
              />
              <TextInput
                label="처음 만난 날짜 (또는 매칭일)"
                value={firstContact}
                onChange={(e) => setFirstContact(e.target.value)}
                type="date"
              />
            </div>
          </Card>
        </>
      )}

      {step === 2 && (
        <>
          <Card>
            <div className="text-xs text-muted mb-2">MBTI (아는 만큼)</div>
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
            <div className="text-[11px] text-muted mt-2">
              모르면 건너뛰기. 대화로 AI가 추정해줌.
            </div>
          </Card>

          <Card>
            <TextArea
              label="배경 (출신·학력·가족·종교 등 아는 것)"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="부산 출신, 서울 4년 거주. 외동. 아버지 사업."
              rows={3}
            />
          </Card>

          <Card>
            <TextArea
              label="외형 / 스타일"
              value={physicalDescription}
              onChange={(e) => setPhysicalDescription(e.target.value)}
              placeholder="단발, 깔끔한 스타일, 운동 좋아함"
              rows={2}
            />
          </Card>

          <Card>
            <TextArea
              label="나와의 접점 / 공통점"
              value={commonGround}
              onChange={(e) => setCommonGround(e.target.value)}
              placeholder="같은 대학 선후배. 둘 다 러닝 좋아함. 친구 A 통해 아는 사이."
              rows={3}
            />
          </Card>

          <Card>
            <TextArea
              label="상대 연애 이력 (추정, 들은 정보)"
              value={relationshipHistory}
              onChange={(e) => setRelationshipHistory(e.target.value)}
              placeholder="전 남자친구 3년. 작년 초 이별. 가벼운 만남 안 한다고 함."
              rows={2}
            />
          </Card>

          <Card>
            <div className="text-xs text-muted mb-1">관심사 / 취미</div>
            <TagInput
              items={interests}
              onChange={setInterests}
              placeholder="러닝, 재즈, 와인, 전시회…"
            />
          </Card>
        </>
      )}

      {step === 3 && (
        <>
          <Card>
            <div className="text-xs text-muted mb-2">현재 관계 단계</div>
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

          <Card>
            <div className="text-xs text-muted mb-1">지금 진행 상황 ✨</div>
            <div className="text-[11px] text-muted mb-2 leading-relaxed">
              현재 뭐가 어떻게 진행되고 있는지. 이게 전략의 출발점이야.
            </div>
            <TextArea
              value={currentSituation}
              onChange={(e) => setCurrentSituation(e.target.value)}
              placeholder="썸 3주째. 주 2회 카톡. 첫 데이트 1회 (성수 카페). 상대 답장 속도 10분 내. 나는 진지하게 가고 싶은데 상대 의중 모르겠음. 이번 주말 두 번째 데이트 약속 중."
              rows={6}
            />
          </Card>

          <Card>
            <div className="text-xs text-muted mb-2">이 관계를 어디로 가져가고 싶어?</div>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => {
                    setGoalPreset(p.value)
                    if (p.value !== 'custom') setGoalDesc(p.label)
                  }}
                  className={`text-left rounded-xl px-3 py-2.5 border ${
                    goalPreset === p.value
                      ? 'bg-accent/10 border-accent'
                      : 'bg-surface-2 border-border'
                  }`}
                >
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-[11px] text-muted mt-0.5">{p.hint}</div>
                </button>
              ))}
            </div>
            <div className="mt-3">
              <TextArea
                label="구체 목표"
                value={goalDesc}
                onChange={(e) => setGoalDesc(e.target.value)}
                placeholder="4주 안에 연인 확정. 단 회피형 의심되므로 천천히."
                rows={3}
              />
            </div>
            <div className="mt-3">
              <TextInput
                label="시한 (주 단위, 선택)"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="4"
                inputMode="numeric"
              />
            </div>
          </Card>

          <Card>
            <TextArea
              label="기타 메모 (선택)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="첫인상, 느낌, 중요 맥락…"
              rows={3}
            />
          </Card>
        </>
      )}

      <div className="flex gap-2 pt-2">
        {step > 1 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep((step - 1) as 1 | 2)}
            className="flex-1"
          >
            뒤로
          </Button>
        )}
        <Button
          type="submit"
          disabled={(step === 1 && !alias.trim()) || pending}
          className="flex-1"
        >
          {pending ? '저장 중…' : step === 3 ? '등록' : '다음'}
        </Button>
      </div>
    </form>
  )
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i + 1 === current ? 'w-6 bg-accent' : 'w-1.5 bg-border'
          }`}
        />
      ))}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  options: Array<{ v: string; l: string }>
}) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs text-muted">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl bg-surface-2 border border-border px-3 py-3 text-sm outline-none focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </label>
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

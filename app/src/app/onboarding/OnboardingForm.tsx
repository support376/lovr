'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { bestEffortProfileSelf, createSelf } from '@/lib/actions/self'
import { Button, Card, TextArea, TextInput } from '@/components/ui'
import { X } from 'lucide-react'

const MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]

const EXPERIENCE = [
  { v: 'none', l: '거의 없음' },
  { v: 'some', l: '한두 번' },
  { v: 'experienced', l: '여러 번' },
  { v: 'very_experienced', l: '경험 많음' },
]

export function OnboardingForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [orientation, setOrientation] = useState('hetero')
  const [mbti, setMbti] = useState('')
  const [goal, setGoal] = useState('serious')
  const [experienceLevel, setExperienceLevel] = useState('')

  const [strengths, setStrengths] = useState<string[]>([])
  const [weaknesses, setWeaknesses] = useState<string[]>([])
  const [dealBreakers, setDealBreakers] = useState<string[]>([])
  const [idealType, setIdealType] = useState('')
  const [personalityNotes, setPersonalityNotes] = useState('')
  const [valuesNotes, setValuesNotes] = useState('')

  const [profiling, setProfiling] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  const submit = () => {
    if (!name.trim()) return
    start(async () => {
      await createSelf({
        displayName: name.trim(),
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        orientation: orientation || undefined,
        relationshipGoal: goal,
        mbti: mbti || undefined,
        strengths,
        weaknesses,
        dealBreakers,
        idealType: idealType || undefined,
        personalityNotes: personalityNotes || undefined,
        valuesNotes: valuesNotes || undefined,
        experienceLevel: experienceLevel || undefined,
      })
      setProfiling(true)
      await bestEffortProfileSelf()
      setProfiling(false)
      router.push('/')
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
            <div className="text-xs text-muted mb-2">기본 신상</div>
            <div className="flex flex-col gap-3">
              <TextInput
                label="이름/닉네임"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="지민"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="나이"
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="28"
                  inputMode="numeric"
                />
                <Select
                  label="성별"
                  value={gender}
                  onChange={setGender}
                  options={[
                    { v: '', l: '선택' },
                    { v: 'male', l: '남' },
                    { v: 'female', l: '여' },
                    { v: 'other', l: '기타' },
                  ]}
                />
              </div>
              <Select
                label="지향"
                value={orientation}
                onChange={setOrientation}
                options={[
                  { v: 'hetero', l: '이성애' },
                  { v: 'homo', l: '동성애' },
                  { v: 'bi', l: '양성애' },
                  { v: 'other', l: '기타' },
                ]}
              />
            </div>
          </Card>

          <Card>
            <div className="text-xs text-muted mb-2">MBTI (알면)</div>
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
            <div className="text-xs text-muted mb-2">연애 경험</div>
            <div className="grid grid-cols-2 gap-1.5">
              {EXPERIENCE.map((e) => (
                <button
                  type="button"
                  key={e.v}
                  onClick={() => setExperienceLevel(e.v)}
                  className={`py-2.5 rounded-lg text-sm border ${
                    experienceLevel === e.v
                      ? 'bg-accent/15 border-accent text-accent'
                      : 'bg-surface-2 border-border text-muted'
                  }`}
                >
                  {e.l}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-xs text-muted mb-2">이 앱을 쓰는 이유</div>
            <Select
              value={goal}
              onChange={setGoal}
              options={[
                { v: 'casual', l: '가볍게 만나기' },
                { v: 'serious', l: '진지한 관계 원함' },
                { v: 'marriage', l: '결혼 전제' },
                { v: 'explore', l: '아직 모르겠음' },
              ]}
            />
          </Card>
        </>
      )}

      {step === 2 && (
        <>
          <Card>
            <div className="text-xs text-muted mb-1">강점 (너가 생각하는 내 장점)</div>
            <div className="text-[11px] text-muted mb-2 leading-relaxed">
              연애·관계에서 네가 잘하는 것. 스스로 솔직하게. 데이터 쌓이면 AI가 추가
              제안해줄 거야.
            </div>
            <TagInput
              items={strengths}
              onChange={setStrengths}
              placeholder="유머 있음, 경청 잘함, 기억력 좋음…"
              tone="good"
            />
          </Card>

          <Card>
            <div className="text-xs text-muted mb-1">약점 (반성하는 패턴)</div>
            <div className="text-[11px] text-muted mb-2 leading-relaxed">
              반복되는 실수, 회피 패턴. 이걸 쓸수록 AI가 건드리지 않게 전략 짜줌.
            </div>
            <TagInput
              items={weaknesses}
              onChange={setWeaknesses}
              placeholder="확정 단계에서 주저함, 답장 너무 빠름…"
              tone="bad"
            />
          </Card>

          <Card>
            <div className="text-xs text-muted mb-1">딜 브레이커 (절대 못 견디는 것)</div>
            <TagInput
              items={dealBreakers}
              onChange={setDealBreakers}
              placeholder="거짓말, 돈 개념 없음, 가족 험담…"
              tone="bad"
            />
          </Card>
        </>
      )}

      {step === 3 && (
        <>
          <Card>
            <TextArea
              label="이상형"
              value={idealType}
              onChange={(e) => setIdealType(e.target.value)}
              placeholder="유머 많고, 자기 일 열심히 하고, 가족 소중히 여기는 사람"
              rows={3}
            />
          </Card>
          <Card>
            <TextArea
              label="성격 자유 기술"
              value={personalityNotes}
              onChange={(e) => setPersonalityNotes(e.target.value)}
              placeholder="내향적이지만 친해지면 장난 많음. 첫 만남 어색함…"
              rows={4}
            />
          </Card>
          <Card>
            <TextArea
              label="가치관 / 중요하게 여기는 것"
              value={valuesNotes}
              onChange={(e) => setValuesNotes(e.target.value)}
              placeholder="커리어 > 가족. 정직함 중요. 돈보다 성장…"
              rows={4}
            />
          </Card>
          <div className="text-[11px] text-muted text-center leading-relaxed">
            💬 내 대화 톤은 AI가 대화 기록에서 자동 학습하니까 따로 안 써도 됨.
          </div>
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
          disabled={(step === 1 && !name.trim()) || pending}
          className="flex-1"
        >
          {profiling
            ? 'AI가 너를 프로파일링…'
            : pending
            ? '저장 중…'
            : step === 3
            ? '시작하기'
            : '다음'}
        </Button>
      </div>
    </form>
  )
}

// ============================================================================
// helpers
// ============================================================================
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
  tone,
}: {
  items: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  tone?: 'good' | 'bad' | 'neutral'
}) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (!v) return
    onChange([...items, v])
    setInput('')
  }
  const remove = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i))
  }

  const chipCls =
    tone === 'good'
      ? 'bg-good/15 text-good border-good/30'
      : tone === 'bad'
      ? 'bg-bad/15 text-bad border-bad/30'
      : 'bg-surface-2 text-muted border-border'

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
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${chipCls}`}
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

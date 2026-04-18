'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTarget } from '@/lib/actions/targets'
import { Button, TextArea, TextInput } from '@/components/ui'
import type { TargetGoal } from '@/lib/db/schema'

const EMOJIS = ['💭', '🌸', '🔥', '⭐', '🌙', '🍀', '🎧', '🐻', '🦊', '🍷', '📚', '🏃']

const GOAL_PRESETS: Array<{ value: TargetGoal['preset']; label: string; hint: string }> = [
  { value: 'explore', label: '탐색', hint: '일단 알아가는 중' },
  { value: 'casual', label: '캐주얼 유지', hint: '가볍게 계속' },
  { value: 'sum_to_couple', label: '썸 → 연인', hint: '관계로 전환' },
  { value: 'confirm_relationship', label: '관계 확정', hint: '이미 좋음, 확정' },
  { value: 'soft_end', label: '소프트 종료', hint: '자연스럽게 멀어지기' },
  { value: 'observe', label: '관찰만', hint: '아직 판단 유보' },
  { value: 'custom', label: '커스텀', hint: '자유 기술' },
]

export function NewTargetForm() {
  const [alias, setAlias] = useState('')
  const [avatar, setAvatar] = useState('💭')
  const [age, setAge] = useState('')
  const [job, setJob] = useState('')
  const [platform, setPlatform] = useState('')
  const [goalPreset, setGoalPreset] = useState<TargetGoal['preset']>('explore')
  const [goalDesc, setGoalDesc] = useState('일단 탐색')
  const [timeframe, setTimeframe] = useState('')
  const [notes, setNotes] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()

  const submit = () => {
    if (!alias.trim()) return
    start(async () => {
      const t = await createTarget({
        alias: alias.trim(),
        age: age ? parseInt(age, 10) : undefined,
        job: job || undefined,
        matchPlatform: platform || undefined,
        avatarEmoji: avatar,
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
        submit()
      }}
      className="flex flex-col gap-4"
    >
      <div>
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
      </div>

      <TextInput
        label="호칭 (별명도 됨)"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        placeholder="박유진"
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
        <TextInput
          label="직업"
          value={job}
          onChange={(e) => setJob(e.target.value)}
          placeholder="마케터"
        />
      </div>

      <TextInput
        label="만남 경로"
        value={platform}
        onChange={(e) => setPlatform(e.target.value)}
        placeholder="틴더 / 소개 / 지인…"
      />

      <div className="flex flex-col gap-2">
        <div className="text-xs text-muted">목표 (AI 전략의 북극성)</div>
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
        <TextArea
          label="구체적 목표 기술"
          value={goalDesc}
          onChange={(e) => setGoalDesc(e.target.value)}
          placeholder="4주 안에 연인 확정 단계까지, 단 상대 회피형 의심되므로 천천히"
        />
        <TextInput
          label="시한 (주 단위, 선택)"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="4"
          inputMode="numeric"
        />
      </div>

      <TextArea
        label="메모 (첫인상, 중요 맥락)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="지인 소개. 조용하고 책 많이 읽는 타입. 연락 빠른 편."
      />

      <Button type="submit" disabled={pending || !alias.trim()}>
        {pending ? '저장 중…' : '등록'}
      </Button>
    </form>
  )
}

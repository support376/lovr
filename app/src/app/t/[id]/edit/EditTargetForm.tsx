'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  archiveTarget,
  deleteTarget,
  updateTargetGoal,
  updateTargetMeta,
  updateTargetStage,
} from '@/lib/actions/targets'
import { Button, TextArea, TextInput, STAGE_LABEL } from '@/components/ui'
import type { Target, TargetGoal } from '@/lib/db/schema'

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
  const [goalPreset, setGoalPreset] = useState<TargetGoal['preset']>(target.goal.preset)
  const [goalDesc, setGoalDesc] = useState(target.goal.description)
  const [timeframe, setTimeframe] = useState(
    target.goal.timeframeWeeks?.toString() ?? ''
  )
  const [stage, setStage] = useState<Target['stage']>(target.stage)
  const [alias, setAlias] = useState(target.alias)
  const [age, setAge] = useState(target.age?.toString() ?? '')
  const [job, setJob] = useState(target.job ?? '')
  const [platform, setPlatform] = useState(target.matchPlatform ?? '')
  const [notes, setNotes] = useState(target.notes ?? '')

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
        job: job || undefined,
        matchPlatform: platform || undefined,
        notes: notes || undefined,
      })
      router.push(`/t/${target.id}`)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <div className="text-xs text-muted uppercase tracking-wider">목표</div>
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
        <TextArea
          label="구체적 목표"
          value={goalDesc}
          onChange={(e) => setGoalDesc(e.target.value)}
        />
        <TextInput
          label="시한 (주)"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value.replace(/[^0-9]/g, ''))}
          inputMode="numeric"
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="text-xs text-muted uppercase tracking-wider">현재 단계</div>
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
      </section>

      <section className="flex flex-col gap-3">
        <div className="text-xs text-muted uppercase tracking-wider">기본 정보</div>
        <TextInput label="호칭" value={alias} onChange={(e) => setAlias(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="나이"
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
          />
          <TextInput label="직업" value={job} onChange={(e) => setJob(e.target.value)} />
        </div>
        <TextInput
          label="만남 경로"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        />
        <TextArea label="메모" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </section>

      <Button onClick={save} disabled={pending}>
        {pending ? '저장 중…' : '저장'}
      </Button>

      <div className="pt-6 border-t border-border flex flex-col gap-2">
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

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, TextArea, TextInput } from '@/components/ui'
import { createRelationship } from '@/lib/actions/relationships'
import { STAGES, STAGE_ORDER, type StageKey } from '@/lib/ontology'

export function NewRelationshipForm() {
  const [name, setName] = useState('')
  const [stage, setStage] = useState<StageKey>('pre_match')
  const [notes, setNotes] = useState('')
  const [constraints, setConstraints] = useState('')
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const submit = () => {
    if (!name.trim()) return
    setErr(null)
    start(async () => {
      try {
        const c = constraints
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        const { relationshipId } = await createRelationship({
          partnerName: name.trim(),
          partnerRawNotes: notes.trim() || undefined,
          partnerKnownConstraints: c.length ? c : undefined,
          progress: stage,
        })
        router.push(`/r/${relationshipId}`)
      } catch (e) {
        setErr((e as Error).message)
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
      <Card>
        <TextInput
          label="상대 이름/호칭"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="수진"
          required
        />
      </Card>

      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-2">
          현재 단계
        </div>
        <div className="text-[11px] text-muted mb-3 leading-relaxed">
          지금 이 관계가 어디쯤인지. 단계가 바뀌면 선택 가능한 목표도 달라짐.
        </div>
        <div className="flex flex-col gap-1.5">
          {STAGE_ORDER.map((k) => {
            const s = STAGES[k]
            const active = stage === k
            return (
              <button
                type="button"
                key={k}
                onClick={() => setStage(k)}
                className={`text-left p-3 rounded-xl border transition-colors ${
                  active
                    ? 'bg-accent/10 border-accent/40'
                    : 'bg-surface-2 border-border'
                }`}
              >
                <div className="text-sm font-semibold">{s.ko}</div>
                <div className="text-[11px] text-muted mt-0.5">{s.hint}</div>
              </button>
            )
          })}
        </div>
      </Card>

      <Card>
        <TextArea
          label="명목 정보 — 네가 직접 아는 사실만. 자유 서술."
          rows={8}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={`네가 관찰해서 아는 '사실'만 적어.\n\n예시:\n- 27세, 마케터\n- 회사 워크샵에서 처음 봄\n- MBTI INFJ 추정\n- 외형: 짧은 단발\n- 최근 이별한 지 6개월 얘기 흘림\n- 술 잘 마심\n- 가족 언급: 동생 있음`}
        />
      </Card>
      <Card>
        <TextInput
          label="제약/맥락 태그 (쉼표) — 중요한 경계 조건"
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          placeholder="직장 동료, 기혼, 연하, …"
        />
      </Card>
      {err && (
        <Card className="border-bad/40 bg-bad/5">
          <div className="text-sm text-bad">{err}</div>
        </Card>
      )}
      <Button type="submit" disabled={pending || !name.trim()}>
        {pending ? '생성 중…' : '등록'}
      </Button>
      <div className="text-[11px] text-muted leading-relaxed text-center">
        역학(힘의 균형·연락 패턴 등)은 Event 쌓이면 <span className="text-accent">자동 추론</span>.
        여기서는 단계만 먼저 선택.
      </div>
    </form>
  )
}

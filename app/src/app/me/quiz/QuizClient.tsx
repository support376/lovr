'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Pill, TextArea } from '@/components/ui'
import { extractSelfFromQuiz, type QuizExtracted } from '@/lib/actions/quiz'
import { updateSelf } from '@/lib/actions/self'

const QUESTIONS: string[] = [
  '가장 최근에 누구를 좋아했던 기억 한 개 떠올려봐. 그 사람의 어떤 점에 끌렸어? 3~5문장으로.',
  '연애에서 네가 반복해서 망치는 패턴이 있다면? 있으면 솔직하게, 없으면 "없음"도 OK.',
  '어떤 상대가 네 옆에 있으면 가장 편안하고 오래 만날 수 있을 것 같아? 외모 말고 관계 방식으로.',
  '"이런 거 하면 관계 끝"이라고 생각하는 딜브레이커 3개 적어봐.',
  '5년 뒤에 네가 어떤 삶을 살고 싶어? 그 그림 안에 연애·가족은 어떻게 들어가?',
  '누가 너한테 "너는 ○○한 사람이야"라고 한다면, 맞다 싶은 한 문장 적어봐. 칭찬·지적 둘 다 가능.',
]

export function QuizClient() {
  const [answers, setAnswers] = useState<string[]>(Array(QUESTIONS.length).fill(''))
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<QuizExtracted | null>(null)
  const [pending, start] = useTransition()
  const [savePending, startSave] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const current = answers[step] ?? ''
  const allAnswered = answers.every((a) => a.trim().length > 0)

  const next = () => {
    if (step < QUESTIONS.length - 1) setStep(step + 1)
  }
  const prev = () => {
    if (step > 0) setStep(step - 1)
  }
  const setAnswer = (v: string) => {
    setAnswers((prev) => {
      const n = [...prev]
      n[step] = v
      return n
    })
  }

  const analyze = () => {
    setErr(null)
    setResult(null)
    start(async () => {
      try {
        const r = await extractSelfFromQuiz(
          answers.map((a, i) => ({ question: QUESTIONS[i], answer: a }))
        )
        setResult(r)
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  const save = () => {
    if (!result) return
    setErr(null)
    startSave(async () => {
      try {
        await updateSelf({
          personalityNotes: result.personalityNotes || null,
          valuesNotes: result.valuesNotes || null,
          idealTypeNotes: result.idealTypeNotes || null,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
        })
        setSaved(true)
        setTimeout(() => router.push('/me'), 800)
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <Card className="border-good/40 bg-good/5">
          <div className="text-sm font-semibold text-good mb-2">✓ AI 분석 완료</div>
          <div className="text-xs text-muted leading-relaxed">
            저장 전 확인해봐. 저장하면 설정의 해당 필드가 이 결과로 덮어써져.
          </div>
        </Card>

        <Card>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">성격</div>
          <div className="text-sm whitespace-pre-wrap">{result.personalityNotes || '(비어있음)'}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">가치관</div>
          <div className="text-sm whitespace-pre-wrap">{result.valuesNotes || '(비어있음)'}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">이상형</div>
          <div className="text-sm whitespace-pre-wrap">{result.idealTypeNotes || '(비어있음)'}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">강점</div>
          <div className="flex flex-wrap gap-1.5">
            {result.strengths.length > 0 ? (
              result.strengths.map((s, i) => (
                <Pill key={i} tone="good">
                  {s}
                </Pill>
              ))
            ) : (
              <span className="text-xs text-muted">(없음)</span>
            )}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">약점</div>
          <div className="flex flex-wrap gap-1.5">
            {result.weaknesses.length > 0 ? (
              result.weaknesses.map((s, i) => (
                <Pill key={i} tone="bad">
                  {s}
                </Pill>
              ))
            ) : (
              <span className="text-xs text-muted">(없음)</span>
            )}
          </div>
        </Card>

        {result.rationale && (
          <Card className="!py-3">
            <div className="text-[11px] text-muted mb-1">분석 근거</div>
            <div className="text-xs whitespace-pre-wrap leading-relaxed">
              {result.rationale}
            </div>
          </Card>
        )}

        {err && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2">
            {err}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={save} disabled={savePending || saved} className="flex-1">
            {saved ? '✓ 저장됨' : savePending ? '저장 중…' : '내 설정에 저장'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setResult(null)
              setStep(0)
            }}
            className="flex-1"
          >
            다시
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full ${
              i <= step ? 'bg-accent' : 'bg-border'
            } ${answers[i]?.trim() ? 'opacity-100' : 'opacity-40'}`}
          />
        ))}
      </div>

      <Card>
        <div className="text-[11px] text-muted mb-1.5">
          {step + 1} / {QUESTIONS.length}
        </div>
        <div className="text-sm font-semibold leading-relaxed">{QUESTIONS[step]}</div>
        <TextArea
          value={current}
          onChange={(e) => setAnswer(e.target.value)}
          rows={6}
          placeholder="솔직하게. 완벽하게 쓰려 하지 마."
          className="mt-3"
        />
      </Card>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={prev}
          disabled={step === 0}
          className="flex-1"
        >
          이전
        </Button>
        {step < QUESTIONS.length - 1 ? (
          <Button
            onClick={next}
            disabled={!current.trim()}
            className="flex-1"
          >
            다음
          </Button>
        ) : (
          <Button
            onClick={analyze}
            disabled={pending || !allAnswered}
            className="flex-1"
          >
            {pending ? 'AI 분석 중 (10~20초)…' : '분석 받기'}
          </Button>
        )}
      </div>

      {err && (
        <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2">
          {err}
        </div>
      )}

      {!allAnswered && step === QUESTIONS.length - 1 && (
        <div className="text-[11px] text-muted text-center">
          아직 안 답한 문항이 있어. 이전 버튼으로 돌아가서 채우자.
        </div>
      )}
    </div>
  )
}

'use client'
import { useState, useTransition } from 'react'
import { Sparkles, Check, Copy, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'
import {
  generateStrategyAction,
  chooseStrategyOption,
  setStrategyOutcome,
} from '@/lib/actions/strategy'
import { Button, Card, Pill } from '@/components/ui'
import type { Strategy, StrategyOption } from '@/lib/db/schema'

export function StrategyView({
  targetId,
  initial,
  history,
}: {
  targetId: string
  initial: Strategy | null
  history: Strategy[]
}) {
  const [current, setCurrent] = useState<Strategy | null>(initial)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const generate = () => {
    setError(null)
    start(async () => {
      try {
        const s = await generateStrategyAction(targetId)
        setCurrent(s)
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={generate} disabled={pending}>
        <Sparkles size={16} />
        {pending ? 'AI 분석 중…' : current ? '새 전략 생성' : '전략 생성'}
      </Button>

      {error && (
        <Card className="border-bad/40">
          <div className="text-sm text-bad">
            {error.includes('ANTHROPIC_API_KEY')
              ? 'ANTHROPIC_API_KEY 를 app/.env.local 에 넣어줘.'
              : error}
          </div>
        </Card>
      )}

      {current && <StrategyCard strategy={current} />}

      {history.length > 1 && (
        <div className="mt-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            이전 전략
          </div>
          <div className="flex flex-col gap-2">
            {history.slice(1, 6).map((h) => (
              <Card key={h.id} className="!py-3">
                <div className="text-xs text-muted mb-1">
                  {new Date(h.createdAt).toLocaleString('ko-KR')}
                </div>
                <div className="text-sm line-clamp-2">{h.situationReport}</div>
                {h.chosenOptionId && (
                  <Pill tone={h.outcome === 'good' ? 'good' : h.outcome === 'bad' ? 'bad' : 'neutral'}>
                    {h.outcome ? `결과: ${h.outcome}` : '채택'}
                  </Pill>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StrategyCard({ strategy }: { strategy: Strategy }) {
  const goalAlign = strategy.goalAlignment
    ? safeJSON<{ progress: number; note: string }>(strategy.goalAlignment)
    : null
  const [chosenId, setChosenId] = useState<string | null>(strategy.chosenOptionId)
  const [outcome, setOutcome] = useState<string | null>(strategy.outcome)
  const [pending, start] = useTransition()

  const choose = (opt: StrategyOption) => {
    setChosenId(opt.id)
    start(async () => {
      await chooseStrategyOption({ strategyId: strategy.id, optionId: opt.id })
    })
  }

  const label = (v: 'good' | 'bad' | 'neutral') => {
    setOutcome(v)
    start(async () => {
      await setStrategyOutcome({ strategyId: strategy.id, outcome: v })
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="text-xs text-muted mb-1">현재 상황 진단</div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {strategy.situationReport}
        </div>
        {goalAlign && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">목표 수렴도</span>
              <span className="font-semibold text-accent">
                {Math.round(goalAlign.progress * 100)}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{ width: `${Math.round(goalAlign.progress * 100)}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-muted leading-relaxed">{goalAlign.note}</div>
          </div>
        )}
      </Card>

      <div>
        <div className="text-xs text-muted uppercase tracking-wider mb-2">
          다음 수 선택
        </div>
        <div className="flex flex-col gap-3">
          {strategy.options.map((o) => (
            <OptionCard
              key={o.id}
              option={o}
              chosen={chosenId === o.id}
              onChoose={() => choose(o)}
            />
          ))}
        </div>
      </div>

      {chosenId && (
        <Card>
          <div className="text-xs text-muted mb-2">이 수의 결과는?</div>
          <div className="flex gap-2">
            <button
              onClick={() => label('good')}
              disabled={pending}
              className={`flex-1 py-2.5 rounded-lg border flex items-center justify-center gap-1.5 text-sm ${
                outcome === 'good'
                  ? 'bg-good/15 border-good text-good'
                  : 'bg-surface-2 border-border text-muted'
              }`}
            >
              <ThumbsUp size={14} /> 잘됨
            </button>
            <button
              onClick={() => label('neutral')}
              disabled={pending}
              className={`flex-1 py-2.5 rounded-lg border flex items-center justify-center gap-1.5 text-sm ${
                outcome === 'neutral'
                  ? 'bg-warn/15 border-warn text-warn'
                  : 'bg-surface-2 border-border text-muted'
              }`}
            >
              <Minus size={14} /> 모호
            </button>
            <button
              onClick={() => label('bad')}
              disabled={pending}
              className={`flex-1 py-2.5 rounded-lg border flex items-center justify-center gap-1.5 text-sm ${
                outcome === 'bad'
                  ? 'bg-bad/15 border-bad text-bad'
                  : 'bg-surface-2 border-border text-muted'
              }`}
            >
              <ThumbsDown size={14} /> 망함
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}

function OptionCard({
  option,
  chosen,
  onChoose,
}: {
  option: StrategyOption
  chosen: boolean
  onChoose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (option.messageDraft) {
      navigator.clipboard.writeText(option.messageDraft)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <Card
      className={`${
        chosen ? 'border-accent bg-accent/5' : ''
      } transition-colors`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-sm">{option.label}</div>
        {option.timing && (
          <Pill tone="neutral">⏱ {option.timing}</Pill>
        )}
      </div>

      <div className="mt-2 text-sm leading-relaxed">{option.action}</div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="bg-surface-2 rounded-lg p-2">
          <div className="text-muted">Risk</div>
          <div className="mt-0.5 text-bad">{option.risk}</div>
        </div>
        <div className="bg-surface-2 rounded-lg p-2">
          <div className="text-muted">Reward</div>
          <div className="mt-0.5 text-good">{option.reward}</div>
        </div>
      </div>

      <div className="mt-3 text-xs text-muted leading-relaxed">
        <span className="text-text">왜:</span> {option.rationale}
      </div>

      {option.messageDraft && (
        <div className="mt-3">
          <div className="text-xs text-muted mb-1">메시지 초안</div>
          <div className="relative rounded-xl bg-surface-2 border border-border p-3 text-sm whitespace-pre-wrap">
            {option.messageDraft}
            <button
              onClick={copy}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-bg/60 text-muted hover:text-text"
              aria-label="복사"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={onChoose}
        className={`mt-3 w-full py-2.5 rounded-xl text-sm font-semibold ${
          chosen
            ? 'bg-accent/20 text-accent'
            : 'bg-surface-2 text-text hover:bg-surface-2/70'
        }`}
      >
        {chosen ? '이 수 채택됨 ✓' : '이 수 채택'}
      </button>
    </Card>
  )
}

function safeJSON<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

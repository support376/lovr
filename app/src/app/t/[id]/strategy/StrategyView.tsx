'use client'
import { useState, useTransition } from 'react'
import {
  Sparkles,
  Check,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ListTodo,
  Plus,
} from 'lucide-react'
import {
  generateStrategyAction,
  chooseStrategyOption,
  setStrategyOutcome,
  toggleStrategyTodo,
  addCustomTodo,
} from '@/lib/actions/strategy'
import { Button, Card, Pill } from '@/components/ui'
import type { Strategy, StrategyOption, StrategyTodo } from '@/lib/db/schema'

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

      {current && <TodoSection strategy={current} />}
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

// ============================================================================
// TODO 체크리스트
// ============================================================================
function TodoSection({ strategy }: { strategy: Strategy }) {
  const [todos, setTodos] = useState<StrategyTodo[]>(strategy.todos ?? [])
  const [pending, start] = useTransition()
  const [newText, setNewText] = useState('')
  const [newWhen, setNewWhen] = useState('')

  if (todos.length === 0 && !newText) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-sm">
          <ListTodo size={16} className="text-accent" />
          <span className="font-semibold">할 일</span>
          <span className="text-xs text-muted">— 없음</span>
        </div>
        <AddTodo
          value={newText}
          onChange={setNewText}
          when={newWhen}
          setWhen={setNewWhen}
          onAdd={() => {
            const text = newText.trim()
            if (!text) return
            const when = newWhen.trim() || '언제든'
            setNewText('')
            setNewWhen('')
            start(async () => {
              await addCustomTodo({ strategyId: strategy.id, text, when })
              setTodos((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  text,
                  when,
                  priority: 'medium',
                  done: false,
                },
              ])
            })
          }}
        />
      </Card>
    )
  }

  const toggle = (id: string, done: boolean) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done, doneAt: done ? Date.now() : undefined } : t))
    )
    start(async () => {
      try {
        await toggleStrategyTodo({ strategyId: strategy.id, todoId: id, done })
      } catch (e) {
        // rollback
        setTodos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, done: !done } : t))
        )
        alert((e as Error).message)
      }
    })
  }

  const sorted = [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })

  const doneCount = todos.filter((t) => t.done).length

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm">
          <ListTodo size={16} className="text-accent" />
          <span className="font-semibold">할 일</span>
          <span className="text-xs text-muted">
            {doneCount}/{todos.length}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {sorted.map((t) => (
          <TodoRow key={t.id} todo={t} onToggle={toggle} disabled={pending} />
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-border">
        <AddTodo
          value={newText}
          onChange={setNewText}
          when={newWhen}
          setWhen={setNewWhen}
          onAdd={() => {
            const text = newText.trim()
            if (!text) return
            const when = newWhen.trim() || '언제든'
            setNewText('')
            setNewWhen('')
            start(async () => {
              await addCustomTodo({ strategyId: strategy.id, text, when })
              setTodos((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  text,
                  when,
                  priority: 'medium',
                  done: false,
                },
              ])
            })
          }}
        />
      </div>
    </Card>
  )
}

function TodoRow({
  todo,
  onToggle,
  disabled,
}: {
  todo: StrategyTodo
  onToggle: (id: string, done: boolean) => void
  disabled: boolean
}) {
  const tone =
    todo.priority === 'high' ? 'text-bad' : todo.priority === 'low' ? 'text-muted' : 'text-warn'
  return (
    <label
      className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
        todo.done
          ? 'bg-surface-2/40 border-border/50 opacity-60'
          : 'bg-surface-2 border-border hover:border-accent/40'
      }`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(todo.id, !todo.done)}
        className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center mt-0.5 ${
          todo.done
            ? 'bg-accent border-accent text-white'
            : 'bg-bg border-border'
        }`}
      >
        {todo.done && <Check size={13} strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm leading-snug ${todo.done ? 'line-through' : ''}`}
        >
          {todo.text}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px]">
          <span className={tone}>● {todo.priority}</span>
          <span className="text-muted">· {todo.when}</span>
        </div>
      </div>
    </label>
  )
}

function AddTodo({
  value,
  onChange,
  when,
  setWhen,
  onAdd,
}: {
  value: string
  onChange: (v: string) => void
  when: string
  setWhen: (v: string) => void
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onAdd()
          }
        }}
        placeholder="할 일 직접 추가"
        className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex gap-2">
        <input
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          placeholder="언제까지 (예: 오늘 저녁)"
          className="flex-1 rounded-lg bg-surface-2 border border-border px-3 py-2 text-xs outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={!value.trim()}
          className="px-3 rounded-lg bg-accent/20 text-accent text-xs font-semibold disabled:opacity-40"
        >
          <Plus size={14} className="inline" /> 추가
        </button>
      </div>
    </div>
  )
}

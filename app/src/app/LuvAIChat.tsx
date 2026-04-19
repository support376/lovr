'use client'

import { useRef, useEffect, useState, useTransition } from 'react'
import { Send } from 'lucide-react'
import { askLuvAI, type LuvAIMessage } from '@/lib/actions/luvai'
import { Card, Pill } from '@/components/ui'
import { LiveMic } from '@/components/LiveMic'

export type ChatApi = {
  submitText: (text: string) => void
}

export function LuvAIChat({
  targetAlias,
  messages,
  setMessages,
  apiRef,
}: {
  targetAlias: string | null
  messages: LuvAIMessage[]
  setMessages: (fn: (prev: LuvAIMessage[]) => LuvAIMessage[]) => void
  apiRef?: React.MutableRefObject<ChatApi | null>
}) {
  const [input, setInput] = useState('')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pending])

  const submit = (textOverride?: string) => {
    const text = (textOverride ?? input).trim()
    if (!text) return
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setError(null)
    start(async () => {
      try {
        const history: LuvAIMessage[] = [...messages, { role: 'user', content: text }]
        const { reply } = await askLuvAI(history)
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  if (apiRef) {
    apiRef.current = {
      submitText: (text: string) => submit(text),
    }
  }

  const quickPrompts = targetAlias
    ? [
        '지금 상황 한 줄 요약',
        '지금 당장 뭐 하면 좋을까',
        '오늘 뭐 하지 말라고 경고해줘',
        '다음 메시지 초안 좀',
      ]
    : ['연애 전반 고민 있어', '첫 상대 등록하고 싶은데']

  const empty = messages.length === 0

  return (
    <Card className="flex flex-col gap-3 flex-1 min-h-[360px]">
      {targetAlias && (
        <div className="flex items-center shrink-0">
          <Pill tone="accent">{targetAlias}</Pill>
        </div>
      )}

      {/* 메시지 영역 — quickPrompts도 이 안에 두어 입력칸 위치 고정 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col gap-2 px-0.5"
      >
        {empty && (
          <>
            <div className="text-xs text-muted leading-relaxed py-4 text-center">
              {targetAlias
                ? `${targetAlias}에 대한 지금 상황·고민·메시지 초안 뭐든 물어봐.`
                : '연애 고민 뭐든 물어봐. 상대 등록하면 훨씬 맥락 있게 답해.'}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => submit(p)}
                  disabled={pending}
                  className="text-xs px-2.5 py-1.5 rounded-full bg-surface-2 border border-border text-muted hover:border-accent/40"
                >
                  {p}
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'self-end bg-accent/15 text-text'
                : 'self-start bg-surface-2 text-text'
            }`}
          >
            {m.content}
          </div>
        ))}
        {pending && (
          <div className="self-start rounded-2xl px-3 py-2 text-sm bg-surface-2 text-muted">
            <span className="inline-block animate-pulse">LuvAI 생각 중…</span>
          </div>
        )}
        {error && (
          <div className="self-center text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* 입력 바 — 고정 */}
      <div className="shrink-0 flex gap-2 pt-1 items-end">
        <LiveMic />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="지금 어떤 도움을 드릴까요?"
          rows={1}
          className="flex-1 rounded-xl bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none focus:border-accent resize-none min-h-[40px] max-h-[120px]"
        />
        <button
          onClick={() => submit()}
          disabled={pending || !input.trim()}
          className="shrink-0 w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center disabled:opacity-40"
          aria-label="전송"
        >
          <Send size={16} />
        </button>
      </div>
    </Card>
  )
}

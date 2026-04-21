'use client'

import { useRef, useEffect, useState, useTransition } from 'react'
import { Send, Sparkles, MessageSquare } from 'lucide-react'
import { askLuvAI, type LuvAIMessage } from '@/lib/actions/luvai'
import { simulateResponseAction } from '@/lib/actions/model'
import { Card, Pill } from '@/components/ui'

export type ChatApi = {
  submitText: (text: string) => void
}

export function LuvAIChat({
  targetAlias,
  relationshipId,
  hasModel,
  messages,
  setMessages,
  apiRef,
}: {
  targetAlias: string | null
  relationshipId: string | null
  hasModel: boolean
  messages: LuvAIMessage[]
  setMessages: (fn: (prev: LuvAIMessage[]) => LuvAIMessage[]) => void
  apiRef?: React.MutableRefObject<ChatApi | null>
}) {
  const [input, setInput] = useState('')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'chat' | 'simulate'>('chat')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, pending])

  const submit = (textOverride?: string) => {
    const text = (textOverride ?? input).trim()
    if (!text) return

    const userMsg: LuvAIMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setError(null)

    start(async () => {
      try {
        if (mode === 'simulate') {
          if (!relationshipId) {
            setError('시뮬레이션은 상대를 먼저 선택해야 해.')
            return
          }
          if (!hasModel) {
            setError(
              '아직 모델이 없어. 분석 탭에서 "모델 추출" 먼저 돌려줘.'
            )
            return
          }
          const r = await simulateResponseAction(relationshipId, text)
          if (!r.ok) {
            setError(r.error)
            return
          }
          setMessages((prev) => [...prev, { role: 'assistant', content: r.markdown }])
        } else {
          const history: LuvAIMessage[] = [...messages, userMsg]
          const { reply } = await askLuvAI(history)
          setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
        }
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  if (apiRef) {
    apiRef.current = { submitText: (t) => submit(t) }
  }

  const empty = messages.length === 0
  const quickPrompts =
    mode === 'simulate'
      ? [
          '"주말에 와인바 갈래?" 이거 보내면?',
          '48시간 무응답 하면 어떻게 반응할까',
          '솔직하게 감정 털어놓으면?',
        ]
      : targetAlias
      ? [
          '지금 상황 한 줄 요약',
          '지금 당장 뭐 하면 좋을까',
          '오늘 뭐 하지 말라고 경고해줘',
          '다음 메시지 초안 좀',
        ]
      : ['연애 전반 고민 있어', '첫 상대 등록하고 싶은데']

  return (
    <Card className="flex flex-col gap-3 flex-1 min-h-0">
      {/* 모드 토글 */}
      {targetAlias && (
        <div className="flex items-center gap-2 shrink-0">
          <Pill tone="accent">{targetAlias}</Pill>
          <div className="ml-auto flex gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setMode('chat')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                mode === 'chat'
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-surface-2 border-border text-muted'
              }`}
            >
              <MessageSquare size={10} /> 대화
            </button>
            <button
              type="button"
              onClick={() => setMode('simulate')}
              disabled={!hasModel}
              title={!hasModel ? '먼저 분석 탭에서 모델 추출' : ''}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border disabled:opacity-40 ${
                mode === 'simulate'
                  ? 'bg-accent-2/15 border-accent-2/40 text-accent-2'
                  : 'bg-surface-2 border-border text-muted'
              }`}
            >
              <Sparkles size={10} /> 시뮬
            </button>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 px-0.5"
      >
        {empty && (
          <>
            <div className="text-xs text-muted leading-relaxed py-4 text-center">
              {mode === 'simulate'
                ? `"이 행동 X 하면 ${targetAlias} 어떻게 반응할까?" — 모델 기반 예측.`
                : targetAlias
                ? `${targetAlias}에 대한 상황·고민·메시지 초안 뭐든 물어봐.`
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
            <span className="inline-block animate-pulse">
              {mode === 'simulate' ? '시뮬레이션 중…' : 'LuvAI 생각 중…'}
            </span>
          </div>
        )}
        {error && (
          <div className="self-center text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2 whitespace-pre-wrap">
            {error}
          </div>
        )}
      </div>

      <div className="shrink-0 flex gap-2 pt-1 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={
            mode === 'simulate'
              ? '이 X 를 하면? (행동·메시지 서술)'
              : '지금 어떤 도움을 드릴까요?'
          }
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

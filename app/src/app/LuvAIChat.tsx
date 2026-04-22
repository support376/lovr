'use client'

import { useRef, useEffect, useState, useTransition } from 'react'
import { Send, RotateCcw, Save, ChevronDown, Trash2, Lock } from 'lucide-react'
import { askLuvAI, type LuvAIMessage } from '@/lib/actions/luvai'
import {
  archiveChat,
  deleteConversation,
  getConversation,
} from '@/lib/actions/conversations'
import { usePlan } from '@/lib/plan'
import { UpgradeGate } from '@/components/UpgradeGate'

type Archive = {
  id: string
  title: string
  updatedAt: number
  messageCount: number
  relationshipId: string | null
}

/**
 * 홈 AI 채팅 — 메모리 전용. 한 세션 = 한 대화.
 * - 저장 버튼: 현재 세션 통째로 archiveChat 으로 conversations 테이블에 박음.
 * - 리셋: 저장 안 하고 날림.
 * - 분석 업데이트 감지 (modelUpdatedAt 변화): "저장하고 리셋" 배너.
 * - 하단 이전 대화 리스트: 클릭 시 읽기전용 뷰. 삭제 가능.
 */
export function LuvAIChat({
  relationshipId,
  modelUpdatedAt,
  archives: initialArchives,
  initialOpeningMessage,
}: {
  relationshipId: string | null
  modelUpdatedAt: number | null
  archives: Archive[]
  initialOpeningMessage?: string | null
}) {
  const [messages, setMessages] = useState<LuvAIMessage[]>(
    initialOpeningMessage
      ? [{ role: 'assistant', content: initialOpeningMessage }]
      : []
  )
  const [input, setInput] = useState('')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [archives, setArchives] = useState<Archive[]>(initialArchives)
  const [openArchive, setOpenArchive] = useState(false)
  const [readonlyView, setReadonlyView] = useState<{
    title: string
    messages: LuvAIMessage[]
  } | null>(null)
  const [analysisBanner, setAnalysisBanner] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sessionStartModelAtRef = useRef<number | null>(modelUpdatedAt)
  const plan = usePlan()
  const saveRequiresPaid = archives.length >= 3 && plan === 'free'

  useEffect(() => {
    if (
      modelUpdatedAt != null &&
      sessionStartModelAtRef.current != null &&
      modelUpdatedAt !== sessionStartModelAtRef.current &&
      messages.length > 0
    ) {
      setAnalysisBanner(true)
    }
  }, [modelUpdatedAt, messages.length])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, pending])

  const submit = () => {
    const text = input.trim()
    if (!text) return
    if (readonlyView) setReadonlyView(null)
    const userMsg: LuvAIMessage = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setError(null)
    start(async () => {
      try {
        const { reply } = await askLuvAI(next)
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  const reset = () => {
    setMessages(
      initialOpeningMessage
        ? [{ role: 'assistant', content: initialOpeningMessage }]
        : []
    )
    setError(null)
    setAnalysisBanner(false)
    sessionStartModelAtRef.current = modelUpdatedAt
  }

  const save = () => {
    if (messages.length === 0) {
      setNotice('저장할 내용 없음')
      return
    }
    start(async () => {
      const r = await archiveChat({ relationshipId, messages })
      if (!r.ok) {
        setError(r.error)
        return
      }
      setArchives((prev) => [
        {
          id: r.id,
          title: r.title,
          updatedAt: Date.now(),
          messageCount: messages.length,
          relationshipId,
        },
        ...prev,
      ])
      setNotice('저장됨')
      setTimeout(() => setNotice(null), 2000)
    })
  }

  const saveAndReset = () => {
    if (messages.length === 0) {
      reset()
      return
    }
    start(async () => {
      const r = await archiveChat({ relationshipId, messages })
      if (!r.ok) {
        setError(r.error)
        return
      }
      setArchives((prev) => [
        {
          id: r.id,
          title: r.title,
          updatedAt: Date.now(),
          messageCount: messages.length,
          relationshipId,
        },
        ...prev,
      ])
      reset()
    })
  }

  const openArchived = (id: string) => {
    start(async () => {
      const c = await getConversation(id)
      if (!c) {
        setError('대화를 찾을 수 없어')
        return
      }
      setReadonlyView({
        title: c.title,
        messages: (c.messages ?? []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      })
      setOpenArchive(false)
    })
  }

  const removeArchived = (id: string) => {
    if (!confirm('이 대화 삭제?')) return
    start(async () => {
      await deleteConversation(id)
      setArchives((prev) => prev.filter((a) => a.id !== id))
      if (readonlyView) setReadonlyView(null)
    })
  }

  const viewMessages = readonlyView?.messages ?? messages

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {analysisBanner && (
        <div className="shrink-0 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs flex items-start gap-2">
          <div className="flex-1 leading-snug">
            <strong>분석이 업데이트됐어.</strong>
            <br />
            새로 물어보면 지금 대화가 지워져. 저장할래?
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={saveAndReset}
              disabled={pending}
              className="px-2 py-1 rounded-md bg-accent text-white text-[11px] font-medium disabled:opacity-40"
            >
              저장 후 리셋
            </button>
            <button
              onClick={reset}
              disabled={pending}
              className="px-2 py-1 rounded-md bg-surface-2 text-muted text-[11px] disabled:opacity-40"
            >
              그냥 리셋
            </button>
          </div>
        </div>
      )}

      {readonlyView && (
        <div className="shrink-0 rounded-xl bg-surface-2 border border-border px-3 py-2 text-xs flex items-center gap-2">
          <span className="text-muted">보기:</span>
          <span className="flex-1 font-medium truncate">{readonlyView.title}</span>
          <button
            onClick={() => setReadonlyView(null)}
            className="text-muted hover:text-text text-[11px]"
          >
            닫기
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0"
      >
        {viewMessages.map((m, i) => (
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
        {pending && !readonlyView && (
          <div className="self-start rounded-2xl px-3 py-2 text-sm bg-surface-2 text-muted">
            <span className="inline-block animate-pulse">LuvAI 생각 중…</span>
          </div>
        )}
        {error && (
          <div className="self-center text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2 max-w-full break-words">
            {error}
          </div>
        )}
        {notice && (
          <div className="self-center text-[11px] text-muted">{notice}</div>
        )}
      </div>

      {!readonlyView && (
        <div className="shrink-0 flex gap-1.5 items-end">
          {messages.length > 0 && (
            <>
              {saveRequiresPaid ? (
                <UpgradeGate feature="unlimited_archive" onProceed={save}>
                  <button
                    disabled={pending}
                    className="shrink-0 w-9 h-9 rounded-xl bg-surface-2 border border-accent/40 text-accent flex items-center justify-center disabled:opacity-40"
                    aria-label="저장 (프리미엄)"
                    title="아카이브 3개 초과 — 프리미엄"
                  >
                    <Lock size={12} />
                  </button>
                </UpgradeGate>
              ) : (
                <button
                  onClick={save}
                  disabled={pending}
                  className="shrink-0 w-9 h-9 rounded-xl bg-surface-2 border border-border text-muted hover:text-accent flex items-center justify-center disabled:opacity-40"
                  aria-label="저장"
                  title="대화 저장"
                >
                  <Save size={14} />
                </button>
              )}
              <button
                onClick={reset}
                disabled={pending}
                className="shrink-0 w-9 h-9 rounded-xl bg-surface-2 border border-border text-muted hover:text-bad flex items-center justify-center disabled:opacity-40"
                aria-label="리셋"
                title="리셋 (저장 안 됨)"
              >
                <RotateCcw size={14} />
              </button>
            </>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="질문 뭐든."
            rows={1}
            className="flex-1 rounded-xl bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none focus:border-accent resize-none min-h-[40px] max-h-[140px]"
          />
          <button
            onClick={submit}
            disabled={pending || !input.trim()}
            className="shrink-0 w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center disabled:opacity-40"
            aria-label="전송"
          >
            <Send size={16} />
          </button>
        </div>
      )}

      {archives.length > 0 && (
        <div className="shrink-0 border-t border-border pt-2 -mx-1 px-1">
          <button
            onClick={() => setOpenArchive((v) => !v)}
            className="w-full flex items-center gap-1.5 text-[11px] text-muted hover:text-text py-1"
          >
            <ChevronDown
              size={12}
              className={`transition-transform ${openArchive ? '' : '-rotate-90'}`}
            />
            이전 대화 ({archives.length})
          </button>
          {openArchive && (
            <ul className="flex flex-col gap-1 mt-1 max-h-[140px] overflow-y-auto">
              {archives.map((a) => (
                <li
                  key={a.id}
                  className="group flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px]"
                >
                  <button
                    onClick={() => openArchived(a.id)}
                    className="flex-1 min-w-0 text-left hover:text-accent"
                  >
                    <div className="truncate font-medium">{a.title}</div>
                    <div className="text-muted text-[10px]">
                      {a.messageCount}개 · {timeAgo(a.updatedAt)}
                    </div>
                  </button>
                  <button
                    onClick={() => removeArchived(a.id)}
                    disabled={pending}
                    className="shrink-0 text-muted hover:text-bad opacity-0 group-hover:opacity-100 disabled:opacity-40"
                    aria-label="삭제"
                  >
                    <Trash2 size={11} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}일 전`
  return new Date(ts).toLocaleDateString('ko-KR')
}

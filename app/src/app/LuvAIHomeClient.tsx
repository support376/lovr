'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, History, ChevronDown, Trash2 } from 'lucide-react'
import { LuvAIChat, type ChatApi } from './LuvAIChat'
import type { LuvAIMessage } from '@/lib/actions/luvai'
import {
  appendConversationMessage,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
} from '@/lib/actions/conversations'

type ConvMeta = {
  id: string
  title: string
  updatedAt: number
  messageCount: number
  relationshipId: string | null
}

export function LuvAIClientShell({
  targetAlias,
  relationshipId,
  hasModel,
}: {
  targetAlias: string | null
  relationshipId: string | null
  hasModel: boolean
}) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<LuvAIMessage[]>([])
  const [list, setList] = useState<ConvMeta[]>([])
  const [openHistory, setOpenHistory] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const apiRef = useRef<ChatApi | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    ;(async () => {
      try {
        const items = await listConversations(20, relationshipId)
        setList(items)
        if (items.length > 0) {
          await loadConversation(items[0].id)
        } else {
          const c = await createConversation({ relationshipId })
          setConversationId(c.id)
          setMessages([])
          setList([
            {
              id: c.id,
              title: c.title,
              updatedAt: Date.now(),
              messageCount: 0,
              relationshipId: c.relationshipId ?? null,
            },
          ])
        }
      } catch (e) {
        console.error('[LuvAI init]', e)
        setInitError((e as Error).message || String(e))
      }
    })()
  }, [relationshipId])

  async function loadConversation(id: string) {
    const c = await getConversation(id)
    if (!c) return
    setConversationId(c.id)
    setMessages(
      (c.messages ?? []).map((m) => ({ role: m.role, content: m.content }))
    )
    setOpenHistory(false)
  }

  async function startNew() {
    const c = await createConversation({ relationshipId })
    setConversationId(c.id)
    setMessages([])
    const items = await listConversations(20, relationshipId)
    setList(items)
    setOpenHistory(false)
  }

  async function removeConversation(id: string) {
    if (!confirm('이 대화 삭제?')) return
    await deleteConversation(id)
    const items = await listConversations(20, relationshipId)
    setList(items)
    if (conversationId === id) {
      if (items[0]) {
        await loadConversation(items[0].id)
      } else {
        await startNew()
      }
    }
  }

  const onMessageAppended = async (msg: LuvAIMessage) => {
    if (!conversationId) return
    try {
      await appendConversationMessage({
        id: conversationId,
        role: msg.role,
        content: msg.content,
      })
      const items = await listConversations(20, relationshipId)
      setList(items)
    } catch {}
  }

  const setMessagesWithPersist = (
    fn: (prev: LuvAIMessage[]) => LuvAIMessage[]
  ) => {
    setMessages((prev) => {
      const next = fn(prev)
      if (next.length > prev.length) {
        const added = next.slice(prev.length)
        for (const m of added) onMessageAppended(m)
      }
      return next
    })
  }

  const currentMeta = list.find((l) => l.id === conversationId)

  return (
    <>
      {initError && (
        <div className="px-5 pt-2">
          <div className="text-[11px] text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2 whitespace-pre-wrap">
            대화 초기화 실패: {initError}
          </div>
        </div>
      )}
      <div className="px-5 pt-3 pb-2 flex items-center gap-2">
        <div className="text-[11px] text-muted flex-1 truncate">
          {currentMeta?.title ?? '새 대화'}
        </div>
        <button
          onClick={() => setOpenHistory((v) => !v)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium border bg-surface-2 border-border text-muted hover:border-accent/40"
        >
          <History size={11} />
          이어하기
          <ChevronDown size={10} className={openHistory ? 'rotate-180' : ''} />
        </button>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium border bg-accent/10 border-accent/40 text-accent hover:bg-accent/15"
        >
          <Plus size={11} />새로
        </button>
      </div>

      {openHistory && (
        <div className="px-5 pb-2">
          <div className="rounded-xl border border-border bg-surface max-h-56 overflow-y-auto">
            {list.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted text-center">
                이력 없음
              </div>
            ) : (
              list.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 px-3 py-2 border-b border-border last:border-b-0 ${
                    item.id === conversationId ? 'bg-accent/5' : ''
                  }`}
                >
                  <button
                    onClick={() => loadConversation(item.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-xs font-medium truncate">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-muted">
                      {new Date(item.updatedAt).toLocaleString('ko-KR')} ·{' '}
                      {item.messageCount}개
                    </div>
                  </button>
                  <button
                    onClick={() => removeConversation(item.id)}
                    className="shrink-0 p-1 text-muted hover:text-bad"
                    aria-label="삭제"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="px-5 pb-5 flex-1 min-h-0 flex flex-col">
        <LuvAIChat
          targetAlias={targetAlias}
          relationshipId={relationshipId}
          hasModel={hasModel}
          messages={messages}
          setMessages={setMessagesWithPersist}
          apiRef={apiRef}
        />
      </div>
    </>
  )
}

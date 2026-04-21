'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, X, Save } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import {
  deleteEvent,
  updateEvent,
  type EventType,
  type EventSender,
} from '@/lib/actions/events'
import type { Event } from '@/lib/db/schema'

const TYPE_LABEL: Record<string, string> = {
  message: '카톡',
  call: '통화',
  meeting: '만남',
  conversation: '대화',
  note: '메모',
  milestone: '이벤트',
  conflict: '갈등',
  recovery: '회복',
  external_info: '외부',
}

const EDIT_TYPES: Array<{ v: EventType; l: string; sender: boolean }> = [
  { v: 'message', l: '카톡', sender: true },
  { v: 'call', l: '통화', sender: true },
  { v: 'note', l: '메모', sender: false },
]

function fmtDate(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
function fmtDateFull(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate()
  ).padStart(2, '0')}`
}
function toInputDate(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function SenderBadge({ sender }: { sender: EventSender }) {
  if (!sender) return null
  const label = sender === 'me' ? '나' : '상대'
  const cls =
    sender === 'me'
      ? 'bg-accent-2/15 text-accent-2 border-accent-2/30'
      : 'bg-accent/15 text-accent border-accent/30'
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cls}`}>
      {label}
    </span>
  )
}

export function EventCard({ e }: { e: Event }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(e.content)
  const [why, setWhy] = useState(e.selfNote ?? '')
  const [type, setType] = useState<EventType>(e.type as EventType)
  const [sender, setSender] = useState<EventSender>((e.sender as EventSender) ?? 'me')
  const [date, setDate] = useState(
    toInputDate(e.timestamp instanceof Date ? e.timestamp.getTime() : Number(e.timestamp))
  )
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const ts = e.timestamp instanceof Date ? e.timestamp.getTime() : Number(e.timestamp)
  const eventSender = (e.sender ?? null) as EventSender

  const titleMatch = e.content.match(/^\*\*(.+?)\*\*/)
  const summary = titleMatch
    ? titleMatch[1]
    : e.content.split('\n')[0].slice(0, 50)

  const currentType = EDIT_TYPES.find((o) => o.v === type)
  const senderApplicable = currentType?.sender ?? false

  const save = () => {
    if (!content.trim()) return
    setErr(null)
    const newTs = new Date(date + 'T12:00').getTime()
    start(async () => {
      try {
        await updateEvent({
          id: e.id,
          content: content.trim(),
          selfNote: why.trim() ? why.trim() : null,
          type,
          timestamp: newTs,
          sender: senderApplicable ? sender : null,
        })
        setEditing(false)
        router.refresh()
      } catch (err) {
        setErr((err as Error).message)
      }
    })
  }

  const remove = () => {
    if (!confirm('이 기록 삭제할까?')) return
    start(async () => {
      try {
        await deleteEvent(e.id)
        router.refresh()
      } catch (err) {
        setErr((err as Error).message)
      }
    })
  }

  if (editing) {
    return (
      <Card className="border-accent/40">
        <div className="flex gap-1.5 mb-2">
          {EDIT_TYPES.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setType(o.v)}
              className={`flex-1 py-1.5 rounded text-[11px] border ${
                type === o.v
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-surface-2 border-border text-muted'
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>

        {senderApplicable && (
          <div className="flex gap-1.5 mb-2">
            <div className="shrink-0 py-1 px-1 text-[10px] text-muted">발신</div>
            {(['me', 'partner'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSender(s)}
                className={`flex-1 py-1 rounded text-[11px] border ${
                  sender === s
                    ? s === 'me'
                      ? 'bg-accent-2/15 border-accent-2/40 text-accent-2'
                      : 'bg-accent/15 border-accent/40 text-accent'
                    : 'bg-surface-2 border-border text-muted'
                }`}
              >
                {s === 'me' ? '나' : '상대'}
              </button>
            ))}
          </div>
        )}

        <input
          type="date"
          value={date}
          onChange={(ev) => setDate(ev.target.value)}
          className="w-full rounded-lg bg-surface-2 border border-border px-3 py-1.5 text-xs outline-none focus:border-accent mb-2"
        />
        <div className="text-[11px] text-muted px-0.5 mb-1">사실</div>
        <textarea
          value={content}
          onChange={(ev) => setContent(ev.target.value)}
          rows={6}
          className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent resize-y"
        />
        <div className="text-[11px] text-muted px-0.5 mt-2 mb-1">왜 (선택)</div>
        <textarea
          value={why}
          onChange={(ev) => setWhy(ev.target.value)}
          rows={2}
          placeholder="너의 해석·맥락"
          className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent resize-y"
        />
        {err && (
          <div className="mt-2 text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2">
            {err}
          </div>
        )}
        <div className="mt-2 flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setEditing(false)
              setContent(e.content)
              setWhy(e.selfNote ?? '')
              setType(e.type as EventType)
              setSender((e.sender as EventSender) ?? 'me')
              setDate(toInputDate(ts))
            }}
            disabled={pending}
            className="flex-1"
          >
            <X size={14} /> 취소
          </Button>
          <Button onClick={save} disabled={pending || !content.trim()} className="flex-1">
            <Save size={14} /> {pending ? '저장 중…' : '저장'}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="!py-2.5 !px-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 text-left"
      >
        <span className="px-1.5 py-0.5 rounded bg-surface-2 text-[11px] text-muted shrink-0">
          {TYPE_LABEL[e.type] ?? e.type}
        </span>
        <SenderBadge sender={eventSender} />
        <span className="flex-1 min-w-0 text-sm truncate">{summary}</span>
        <span className="text-[11px] text-muted shrink-0">{fmtDate(ts)}</span>
      </button>

      {expanded && (
        <div className="mt-2.5 pt-2.5 border-t border-border">
          <div className="text-[11px] text-muted mb-2">{fmtDateFull(ts)}</div>
          <div className="text-[11px] text-muted mb-1">사실</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed mb-3">
            {e.content}
          </div>
          {e.selfNote && (
            <>
              <div className="text-[11px] text-muted mb-1">왜</div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed mb-3 text-muted italic">
                {e.selfNote}
              </div>
            </>
          )}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setEditing(true)}
              className="flex-1"
            >
              편집
            </Button>
            <Button
              variant="secondary"
              onClick={remove}
              disabled={pending}
              className="flex-1 !bg-bad/10 !text-bad hover:!bg-bad/20"
            >
              <Trash2 size={14} /> 삭제
            </Button>
          </div>
          {err && (
            <div className="mt-2 text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2">
              {err}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

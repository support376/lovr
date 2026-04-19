'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { addEvent, type EventType } from '@/lib/actions/events'

const TYPE_OPTIONS: Array<{ v: EventType; l: string }> = [
  { v: 'message', l: '카톡 대화' },
  { v: 'call', l: '통화' },
  { v: 'note', l: '사건 · 메모' },
]

function toLocalDate(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function AddEventForm({ relationshipId }: { relationshipId: string }) {
  const [type, setType] = useState<EventType>('message')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [dateStr, setDateStr] = useState(toLocalDate(Date.now()))
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const submit = () => {
    if (!title.trim() && !content.trim()) return
    setErr(null)
    const ts = new Date(dateStr + 'T12:00').getTime()
    // 제목이 있으면 content 맨 앞에 합침
    const finalContent = title.trim()
      ? content.trim()
        ? `**${title.trim()}**\n\n${content.trim()}`
        : `**${title.trim()}**`
      : content.trim()
    start(async () => {
      try {
        await addEvent({
          relationshipId,
          type,
          content: finalContent,
          timestamp: ts,
        })
        setTitle('')
        setContent('')
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <Card>
      <div className="flex flex-col gap-2.5">
        {/* 타입 3개 */}
        <div className="flex gap-1.5">
          {TYPE_OPTIONS.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setType(o.v)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border ${
                type === o.v
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-surface-2 border-border text-muted'
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>

        {/* 제목 + 날짜 한 줄 */}
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="flex-1 rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        {/* 본문 (선택) */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="내용 (선택 · 카톡 원문·상세)"
          className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent resize-y min-h-[80px]"
        />

        {err && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2">
            {err}
          </div>
        )}

        <Button onClick={submit} disabled={pending || (!title.trim() && !content.trim())}>
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </Card>
  )
}

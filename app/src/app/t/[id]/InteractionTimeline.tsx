import type { Interaction } from '@/lib/db/schema'
import { Card, Empty } from '@/components/ui'

export function InteractionTimeline({ items }: { items: Interaction[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          아직 기록이 없음. 메시지/데이트/메모를 넣으면 여기 쌓임.
        </div>
      </Card>
    )
  }

  // items are desc; render as-is (최신 먼저)
  return (
    <div className="flex flex-col gap-2">
      {items.map((it) => (
        <InteractionRow key={it.id} item={it} />
      ))}
    </div>
  )
}

function InteractionRow({ item }: { item: Interaction }) {
  const t = formatTime(item.occurredAt.getTime())
  const p = item.payload

  if (p.kind === 'message') {
    const me = p.sender === 'me'
    return (
      <div className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
            me
              ? 'bg-accent/20 border border-accent/30 rounded-br-md'
              : 'bg-surface-2 border border-border rounded-bl-md'
          }`}
        >
          <div className="whitespace-pre-wrap break-words leading-relaxed">
            {p.text}
          </div>
          <div className="mt-1 text-[10px] text-muted">{t}</div>
        </div>
      </div>
    )
  }

  if (p.kind === 'note') {
    return (
      <Card className="!py-3">
        <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
          메모 · {t}
        </div>
        <div className="text-sm whitespace-pre-wrap">{p.text}</div>
      </Card>
    )
  }

  if (p.kind === 'date') {
    return (
      <Card className="!py-3">
        <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
          데이트 · {t}
        </div>
        <div className="text-sm">
          {p.venue ?? '장소 미기재'}
          {p.mood && ` — 분위기 ${p.mood}`}
          {p.durationMinutes && ` · ${p.durationMinutes}분`}
        </div>
        {p.note && <div className="mt-1 text-xs text-muted">{p.note}</div>}
      </Card>
    )
  }

  if (p.kind === 'status_change') {
    return (
      <div className="text-center text-xs text-muted py-2">
        단계 변화: {p.fromStage} → {p.toStage}
        {p.reason && ` (${p.reason})`} · {t}
      </div>
    )
  }

  if (p.kind === 'outcome') {
    const tone =
      p.label === 'good' ? 'text-good' : p.label === 'bad' ? 'text-bad' : 'text-warn'
    return (
      <div className={`text-center text-xs ${tone} py-2`}>
        결과: {p.label.toUpperCase()}
        {p.note && ` — ${p.note}`} · {t}
      </div>
    )
  }

  return null
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const today = new Date()
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return `오늘 ${time}`
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}.${dd} ${time}`
}

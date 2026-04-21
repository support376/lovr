'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { addEvent, type EventType } from '@/lib/actions/events'

const TYPE_OPTIONS: Array<{ v: EventType; l: string; hint: string }> = [
  { v: 'chat', l: '대화', hint: '카톡 덩어리 · 메시지 원문' },
  { v: 'event', l: '사건', hint: '만남 · 전화 · 전략 결과' },
  { v: 'note', l: '메모', hint: '내 해석 · 생각' },
]

function toLocalDate(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * 기록 폼 — 단순 3타입.
 *   - 날짜 없음 (덩어리 대화) 체크 시 timestamp null 로 저장.
 *   - 발신 구별 없음. 대화 덩어리는 원문 그대로 붙여넣음.
 *   - 카톡 캡쳐 업로드는 Phase B.
 */
export function AddEventForm({ relationshipId }: { relationshipId: string }) {
  const [type, setType] = useState<EventType>('chat')
  const [content, setContent] = useState('')
  const [dateStr, setDateStr] = useState(toLocalDate(Date.now()))
  const [noDate, setNoDate] = useState(false)
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const submit = () => {
    if (!content.trim()) return
    setErr(null)
    const ts = noDate ? null : new Date(dateStr + 'T12:00').getTime()
    start(async () => {
      try {
        await addEvent({
          relationshipId,
          type,
          content: content.trim(),
          timestamp: ts,
        })
        setContent('')
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  const currentHint = TYPE_OPTIONS.find((o) => o.v === type)?.hint

  return (
    <Card>
      <div className="flex flex-col gap-2.5">
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
        {currentHint && (
          <div className="text-[10px] text-muted px-0.5">{currentHint}</div>
        )}

        {/* 날짜 */}
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            disabled={noDate}
            className={`rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent ${
              noDate ? 'opacity-50' : ''
            }`}
          />
          <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={noDate}
              onChange={(e) => setNoDate(e.target.checked)}
            />
            날짜 불명 (덩어리 대화)
          </label>
        </div>

        {/* 내용 */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={type === 'chat' ? 8 : 4}
          placeholder={
            type === 'chat'
              ? '카톡 원문 그대로 붙여넣기. 발신 구별 없이 시간순으로.'
              : type === 'event'
              ? '예) 3/15 저녁 와인바에서 만남. 전략 X 실행 → 상대 반응 Y.'
              : '예) 최근 답장 간격 늘어남. 스트레스 많아 보임.'
          }
          className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent resize-y min-h-[100px]"
        />

        {err && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2">
            {err}
          </div>
        )}

        <Button onClick={submit} disabled={pending || !content.trim()}>
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </Card>
  )
}

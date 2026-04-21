'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Mic, Loader2 } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { addEvent, type EventType } from '@/lib/actions/events'
import { detectFirstTimestamp, extractFromFile } from '@/lib/actions/transcribe'

const TYPE_OPTIONS: Array<{ v: EventType; l: string; hint: string }> = [
  {
    v: 'note',
    l: '메모',
    hint: '내 관찰·행동·감정. 일방적인 기록',
  },
  {
    v: 'event',
    l: '사건',
    hint: '만남·전화·실제 사건',
  },
  {
    v: 'chat',
    l: '대화',
    hint: '카톡·DM 원문 덩어리',
  },
]

const PLACEHOLDER: Record<EventType, string> = {
  note: `예)
- 인스타 스토리 3번 염탐함. 지난 주 같이 간 카페 사진 올렸더라
- 친구 A 한테 들음: 걔가 "요즘 만나는 사람 있어?" 물었다고
- 답장 간격이 길어짐 — 평소 30분 → 6시간
- 읽씹 당함. 내가 먼저 감정 드러낸 직후`,
  event: `예)
- 3/15 금 저녁 7시 와인바 만남. 2시간 대화 주도권 내가 70%.
  헤어질 때 먼저 안아달라 함 → 짧게 허그 후 돌아섰음.
- 4/2 전화 45분. 직장 스트레스 얘기 털어냄.
  다음 주 같이 영화 보자고 먼저 제안함.`,
  chat: `카톡 원문 그대로 붙여넣기. 발신 구별·시간 포함된 원문 가능.

예)
2024. 3. 15. 오후 3:14, 서연 : 뭐해?
2024. 3. 15. 오후 3:17, 나 : 집에서 쉬는중. 너는?
2024. 3. 15. 오후 4:02, 서연 : ㅋㅋ 나도. 저녁에 시간돼?
...`,
}

function toLocal(ts: number): { date: string; time: string } {
  const d = new Date(ts)
  const p = (n: number) => n.toString().padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
  }
}

export function AddEventForm({ relationshipId }: { relationshipId: string }) {
  const [type, setType] = useState<EventType>('note')
  const [content, setContent] = useState('')
  const initial = toLocal(Date.now())
  const [dateStr, setDateStr] = useState(initial.date)
  const [timeStr, setTimeStr] = useState(initial.time)
  const [noDate, setNoDate] = useState(false)
  const [pending, start] = useTransition()
  const [uploading, setUploading] = useState<null | 'kakao' | 'audio'>(null)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const router = useRouter()
  const kakaoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  const currentHint = TYPE_OPTIONS.find((o) => o.v === type)?.hint

  const onFile = async (kind: 'kakao' | 'audio', file: File) => {
    setErr(null)
    setInfo(null)
    setUploading(kind)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await extractFromFile(fd)
      if (!r.ok) {
        setErr(r.error)
        return
      }
      // content 에 기존 내용 있으면 뒤에 append
      setContent((prev) => (prev ? prev + '\n\n' + r.text : r.text))
      // 카톡 파일이면 타입 자동 전환 + 첫 timestamp 탐지
      if (r.kind === 'kakao') {
        setType('chat')
        const d = await detectFirstTimestamp(r.text)
        if (d.ts) {
          const t = toLocal(d.ts)
          setDateStr(t.date)
          setTimeStr(t.time)
          setNoDate(false)
          setInfo(`카톡 파일 처리됨 · 첫 메시지 시각 자동 반영`)
        } else {
          setInfo(`카톡 파일 처리됨 · 시각 탐지 실패 → 직접 입력`)
        }
      } else {
        setType('event')
        setInfo('음성 변환 완료 (Whisper)')
      }
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setUploading(null)
    }
  }

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (!pasted || pasted.length < 20) return
    // 시간 형식 감지되면 auto-fill
    detectFirstTimestamp(pasted).then((d) => {
      if (d.ts) {
        const t = toLocal(d.ts)
        setDateStr(t.date)
        setTimeStr(t.time)
        setNoDate(false)
      }
    })
  }

  const submit = () => {
    if (!content.trim()) return
    setErr(null)
    const ts = noDate
      ? null
      : new Date(`${dateStr}T${timeStr || '12:00'}`).getTime()
    start(async () => {
      try {
        await addEvent({
          relationshipId,
          type,
          content: content.trim(),
          timestamp: ts,
        })
        setContent('')
        setInfo(null)
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <Card>
      <div className="flex flex-col gap-2.5">
        {/* 타입 */}
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

        {/* 날짜 + 시간 */}
        <div className="flex gap-1.5 items-center flex-wrap">
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            disabled={noDate}
            className={`rounded-lg bg-surface-2 border border-border px-2 py-2 text-sm outline-none focus:border-accent ${
              noDate ? 'opacity-50' : ''
            }`}
          />
          <input
            type="time"
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
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
            시각 불명
          </label>
        </div>

        {/* 내용 */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={onPaste}
          rows={type === 'chat' ? 8 : 5}
          placeholder={PLACEHOLDER[type]}
          className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent resize-y min-h-[120px] whitespace-pre-wrap"
        />

        {/* 업로드 도우미 */}
        <div className="flex gap-1.5 flex-wrap">
          <input
            ref={kakaoInputRef}
            type="file"
            accept=".txt,.csv,.md,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile('kakao', f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => kakaoInputRef.current?.click()}
            disabled={uploading !== null}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border text-[11px] text-muted hover:border-accent hover:text-accent disabled:opacity-40"
          >
            {uploading === 'kakao' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <FileText size={12} />
            )}
            카톡 .txt 파일
          </button>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.webm"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile('audio', f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            disabled={uploading !== null}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border text-[11px] text-muted hover:border-accent hover:text-accent disabled:opacity-40"
          >
            {uploading === 'audio' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Mic size={12} />
            )}
            음성 파일 (전화녹음)
          </button>
        </div>

        {info && (
          <div className="text-[11px] text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
            ✓ {info}
          </div>
        )}
        {err && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2 whitespace-pre-wrap">
            {err}
          </div>
        )}

        <Button
          onClick={submit}
          disabled={pending || uploading !== null || !content.trim()}
        >
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </Card>
  )
}

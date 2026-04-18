'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addBulkMessages,
  addInteraction,
} from '@/lib/actions/interactions'
import { Button, Card, TextArea } from '@/components/ui'

type Tab = 'bulk' | 'single' | 'note' | 'date'

export function AddInteractionForm({ targetId }: { targetId: string }) {
  const [tab, setTab] = useState<Tab>('bulk')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5">
        {(['bulk', 'single', 'note', 'date'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg ${
              tab === t
                ? 'bg-accent/15 text-accent'
                : 'bg-surface-2 text-muted'
            }`}
          >
            {t === 'bulk' && '대화 붙여넣기'}
            {t === 'single' && '한 줄'}
            {t === 'note' && '메모'}
            {t === 'date' && '데이트'}
          </button>
        ))}
      </div>
      {tab === 'bulk' && <BulkMessages targetId={targetId} />}
      {tab === 'single' && <SingleMessage targetId={targetId} />}
      {tab === 'note' && <NoteForm targetId={targetId} />}
      {tab === 'date' && <DateForm targetId={targetId} />}
    </div>
  )
}

// ============================================================================
// 대화 붙여넣기 — "나: / 상대: " prefix로 파싱, 혹은 줄마다 sender 토글
// ============================================================================
function BulkMessages({ targetId }: { targetId: string }) {
  const [raw, setRaw] = useState('')
  const [defaultSender, setDefaultSender] = useState<'me' | 'them'>('them')
  const [pending, start] = useTransition()
  const router = useRouter()

  const parse = (): Array<{ sender: 'me' | 'them'; text: string }> => {
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
    const out: Array<{ sender: 'me' | 'them'; text: string }> = []
    let lastSender: 'me' | 'them' = defaultSender
    for (const line of lines) {
      const m = line.match(/^(나|me|나는|내가|상대|them|Them|그|그녀|너)\s*[:：]\s*(.*)$/i)
      if (m) {
        const tag = m[1].toLowerCase()
        const sender: 'me' | 'them' =
          ['나', 'me', '나는', '내가'].includes(m[1]) || tag === 'me' ? 'me' : 'them'
        lastSender = sender
        if (m[2]) out.push({ sender, text: m[2] })
      } else {
        out.push({ sender: lastSender, text: line })
      }
    }
    return out
  }

  const parsed = parse()

  const submit = () => {
    if (parsed.length === 0) return
    start(async () => {
      try {
        await addBulkMessages({
          targetId,
          messages: parsed,
          triggerProfileUpdate: true,
        })
        router.push(`/t/${targetId}`)
      } catch (e) {
        alert((e as Error).message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="!py-3">
        <div className="text-xs text-muted leading-relaxed">
          대화 여러 줄 붙여넣기. 줄 시작이 <code className="text-text">나:</code> 또는{' '}
          <code className="text-text">상대:</code> 로 시작하면 화자 자동 인식.
          prefix 없으면 아래 "기본 화자"로 처리됨.
        </div>
      </Card>
      <div className="flex gap-2 items-center text-xs">
        <span className="text-muted">기본 화자:</span>
        {(['me', 'them'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setDefaultSender(s)}
            className={`px-3 py-1 rounded-full border ${
              defaultSender === s
                ? 'bg-accent/15 border-accent text-accent'
                : 'bg-surface-2 border-border text-muted'
            }`}
          >
            {s === 'me' ? '나' : '상대'}
          </button>
        ))}
      </div>
      <TextArea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={10}
        placeholder={`상대: 오늘 뭐 했어요?\n나: 오후에 러닝 갔다왔어요 ㅎㅎ\n상대: 와 운동 좋아하시나 봐요`}
        className="!min-h-[240px] font-mono text-xs"
      />
      <div className="text-xs text-muted">
        파싱 결과: {parsed.length}줄
      </div>
      <Button onClick={submit} disabled={pending || parsed.length === 0}>
        {pending ? '저장 + 프로파일 업데이트 중…' : `${parsed.length}줄 저장 & 재분석`}
      </Button>
    </div>
  )
}

// ============================================================================
// 한 줄씩
// ============================================================================
function SingleMessage({ targetId }: { targetId: string }) {
  const [sender, setSender] = useState<'me' | 'them'>('them')
  const [text, setText] = useState('')
  const [andAnalyze, setAndAnalyze] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  const submit = () => {
    if (!text.trim()) return
    start(async () => {
      try {
        await addInteraction({
          targetId,
          payload: { kind: 'message', sender, text: text.trim() },
          triggerProfileUpdate: andAnalyze,
        })
        router.push(`/t/${targetId}`)
      } catch (e) {
        alert((e as Error).message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {(['me', 'them'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSender(s)}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm border ${
              sender === s
                ? 'bg-accent/15 border-accent text-accent'
                : 'bg-surface-2 border-border text-muted'
            }`}
          >
            {s === 'me' ? '내가 보냄' : '상대가 보냄'}
          </button>
        ))}
      </div>
      <TextArea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="메시지 내용"
      />
      <label className="flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={andAnalyze}
          onChange={(e) => setAndAnalyze(e.target.checked)}
        />
        저장 후 프로파일 재분석도 돌리기
      </label>
      <Button onClick={submit} disabled={pending || !text.trim()}>
        {pending ? '저장 중…' : '저장'}
      </Button>
    </div>
  )
}

// ============================================================================
// 메모
// ============================================================================
function NoteForm({ targetId }: { targetId: string }) {
  const [text, setText] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()

  const submit = () => {
    if (!text.trim()) return
    start(async () => {
      await addInteraction({
        targetId,
        payload: { kind: 'note', text: text.trim() },
      })
      router.push(`/t/${targetId}`)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <TextArea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="오늘 만난 인상, 떠오른 생각, 맥락…"
      />
      <Button onClick={submit} disabled={pending || !text.trim()}>
        {pending ? '저장 중…' : '저장'}
      </Button>
    </div>
  )
}

// ============================================================================
// 데이트 기록
// ============================================================================
function DateForm({ targetId }: { targetId: string }) {
  const [venue, setVenue] = useState('')
  const [mood, setMood] = useState<'great' | 'good' | 'neutral' | 'awkward' | 'bad'>(
    'good'
  )
  const [duration, setDuration] = useState('')
  const [note, setNote] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()

  const submit = () => {
    start(async () => {
      await addInteraction({
        targetId,
        payload: {
          kind: 'date',
          venue: venue || undefined,
          mood,
          durationMinutes: duration ? parseInt(duration, 10) : undefined,
          note: note || undefined,
        },
      })
      router.push(`/t/${targetId}`)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">장소</span>
        <input
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          className="rounded-xl bg-surface-2 border border-border px-3 py-3 text-sm outline-none focus:border-accent"
          placeholder="성수 00카페"
        />
      </label>

      <div>
        <div className="text-xs text-muted mb-1.5">분위기</div>
        <div className="grid grid-cols-5 gap-1.5">
          {(['great', 'good', 'neutral', 'awkward', 'bad'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMood(m)}
              className={`py-2 rounded-lg text-xs border ${
                mood === m
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-surface-2 border-border text-muted'
              }`}
            >
              {m === 'great' && '최고'}
              {m === 'good' && '좋음'}
              {m === 'neutral' && '보통'}
              {m === 'awkward' && '어색'}
              {m === 'bad' && '나쁨'}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">지속 시간 (분)</span>
        <input
          value={duration}
          onChange={(e) => setDuration(e.target.value.replace(/[^0-9]/g, ''))}
          className="rounded-xl bg-surface-2 border border-border px-3 py-3 text-sm outline-none focus:border-accent"
          placeholder="120"
          inputMode="numeric"
        />
      </label>

      <TextArea
        label="메모"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="인상적인 대화, 관찰, 분위기…"
      />

      <Button onClick={submit} disabled={pending}>
        {pending ? '저장 중…' : '저장'}
      </Button>
    </div>
  )
}

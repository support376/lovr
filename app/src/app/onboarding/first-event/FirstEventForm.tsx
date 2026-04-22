'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ImageIcon, Loader2, ArrowRight } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { addEvent } from '@/lib/actions/events'
import { generateOpeningMessage } from '@/lib/actions/luvai'
import { detectFirstTimestamp, extractFromFile } from '@/lib/actions/transcribe'

/**
 * 온보딩 직후 — 첫 기록 1건 입력.
 * 제출하면 같은 화면에서 루바이 응답 인라인 표시 → "계속 대화 →" 로 홈 이동.
 */
export function FirstEventForm({ relationshipId }: { relationshipId: string }) {
  const [content, setContent] = useState('')
  const [detectedTs, setDetectedTs] = useState<number | null>(null)
  const [pending, start] = useTransition()
  const [uploading, setUploading] = useState<null | 'text' | 'image'>(null)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [reply, setReply] = useState<string | null>(null)
  const router = useRouter()
  const textInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const onFile = async (kind: 'text' | 'image', file: File) => {
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
      setContent((prev) => (prev ? prev + '\n\n' + r.text : r.text))
      const d = await detectFirstTimestamp(r.text)
      if (d.ts) {
        setDetectedTs(d.ts)
        setInfo(
          kind === 'image'
            ? '✓ OCR 완료 · 첫 메시지 시각 자동 반영'
            : '✓ 텍스트 처리됨 · 첫 메시지 시각 자동 반영'
        )
      } else {
        setInfo(
          kind === 'image'
            ? '✓ OCR 완료'
            : '✓ 텍스트 처리됨'
        )
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
    detectFirstTimestamp(pasted).then((d) => {
      if (d.ts) setDetectedTs(d.ts)
    })
  }

  const submit = () => {
    if (!content.trim()) return
    setErr(null)
    start(async () => {
      try {
        await addEvent({
          relationshipId,
          type: 'chat',
          content: content.trim(),
          timestamp: detectedTs,
        })
        const opening = await generateOpeningMessage()
        if (opening) setReply(opening)
        else {
          // 응답 실패해도 일단 홈으로 — 홈에서도 opening 재시도함
          router.push('/')
        }
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  // 응답 받은 후 — 루바이 메시지 + 계속 대화 CTA
  if (reply) {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-[11px] text-muted px-1">
          루바이가 네 기록을 봤어.
        </div>
        <Card className="border-accent/30 bg-accent/5">
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {reply}
          </div>
        </Card>
        <Button onClick={() => router.push('/')} className="gap-2">
          계속 대화하기
          <ArrowRight size={16} />
        </Button>
        <div className="text-[11px] text-muted text-center leading-relaxed">
          정보 더 주면 더 정확해져 — 대화 중에 루바이가 알아서 물어볼게.
        </div>
      </div>
    )
  }

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={onPaste}
          rows={10}
          placeholder={`카톡 원문 그대로 붙여넣기 OR 한 줄 메모. 길수록 좋아.

예)
2024. 3. 15. 오후 3:14, 서연 : 뭐해?
2024. 3. 15. 오후 3:17, 나 : 집에서 쉬는중. 너는?
2024. 3. 15. 오후 4:02, 서연 : ㅋㅋ 나도. 저녁에 시간돼?
...

또는 그냥:
"3일 전에 매달렸는데 답이 없었음. 어떻게 해야 할지 모르겠음."`}
          className="rounded-lg bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none focus:border-accent resize-y min-h-[200px] whitespace-pre-wrap"
        />

        <div className="flex gap-1.5 flex-wrap">
          <input
            ref={textInputRef}
            type="file"
            accept=".txt,.csv,.md,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile('text', f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => textInputRef.current?.click()}
            disabled={uploading !== null}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border text-[11px] text-muted hover:border-accent hover:text-accent disabled:opacity-40"
          >
            {uploading === 'text' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <FileText size={12} />
            )}
            텍스트 파일 (.txt)
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile('image', f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading !== null}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border text-[11px] text-muted hover:border-accent hover:text-accent disabled:opacity-40"
          >
            {uploading === 'image' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ImageIcon size={12} />
            )}
            카톡 캡쳐 OCR
          </button>
        </div>

        {info && (
          <div className="text-[11px] text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
            {info}
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
          {pending ? '루바이가 읽는 중…' : '받아보기'}
        </Button>
        <div className="text-[11px] text-muted text-center leading-relaxed">
          일단 한 건만 넣어봐. 더 넣을수록 정확해지지만 시작은 이거 하나면 돼.
        </div>
      </div>
    </Card>
  )
}

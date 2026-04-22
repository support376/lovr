'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ImageIcon, Loader2 } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { addEvent } from '@/lib/actions/events'
import { detectFirstTimestamp, extractFromFile } from '@/lib/actions/transcribe'

/**
 * 온보딩 직후 — 첫 기록 1건 강제 입력.
 * 이거 있어야 루바이가 첫 메시지 만들 재료가 생김.
 *
 * AddEventForm 의 미니멀 버전:
 *   - type 선택 없음 (항상 'chat' 으로 저장)
 *   - 날짜 입력 UI 없음. OCR/텍스트에서 자동 감지된 timestamp 만 사용.
 */
export function FirstEventForm({ relationshipId }: { relationshipId: string }) {
  const [content, setContent] = useState('')
  const [detectedTs, setDetectedTs] = useState<number | null>(null)
  const [pending, start] = useTransition()
  const [uploading, setUploading] = useState<null | 'text' | 'image'>(null)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
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
            : '✓ 텍스트 파일 처리됨 · 첫 메시지 시각 자동 반영'
        )
      } else {
        setInfo(
          kind === 'image'
            ? '✓ OCR 완료 · 시각 탐지 못 함 (그래도 OK, 그냥 제출)'
            : '✓ 텍스트 처리됨 · 시각 탐지 못 함 (그래도 OK, 그냥 제출)'
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
        router.push('/')
      } catch (e) {
        setErr((e as Error).message)
      }
    })
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

        {/* 업로드 도우미 */}
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
          {pending ? '저장 중…' : '루바이 시작'}
        </Button>
      </div>
    </Card>
  )
}

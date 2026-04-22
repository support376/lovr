'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ImageIcon, Loader2 } from 'lucide-react'
import { addEvent } from '@/lib/actions/events'
import { createRelationship } from '@/lib/actions/relationships'
import { updateSelf } from '@/lib/actions/self'
import { detectFirstTimestamp, extractFromFile } from '@/lib/actions/transcribe'
import { STATE_LABEL, type RelationshipState } from '@/lib/db/schema'

const GENDER_OPTIONS: Array<{ v: 'male' | 'female'; l: string }> = [
  { v: 'male', l: '남성' },
  { v: 'female', l: '여성' },
]

// 4개 상태 노출. struggling 은 /me 에서만.
const STATE_OPTIONS: RelationshipState[] = [
  'exploring',
  'dating',
  'serious',
  'ended',
]

/**
 * 앱 전역 루트 오버레이 — self 있는 유저가 아직 gender/rel/events 중 하나라도 없으면
 * 이 모달이 떠서 3개 (내 성별 + 관계상태 + 카톡 1건) 만 받고 닫힘.
 * 나머지 모든 정보 (상대 이름·나이·직업 등) 는 '상대' placeholder 로 비어있는 상태에서 시작.
 *
 * 기존 탭/페이지 UI 는 손대지 않음. 이 모달만 오버레이.
 */
export function FirstSetupModal({
  needsGender,
  needsRelationship,
  needsFirstEvent,
  existingRelationshipId,
}: {
  needsGender: boolean
  needsRelationship: boolean
  needsFirstEvent: boolean
  existingRelationshipId: string | null
}) {
  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const [state, setState] = useState<RelationshipState | null>(null)
  const [content, setContent] = useState('')
  const [detectedTs, setDetectedTs] = useState<number | null>(null)
  const [pending, start] = useTransition()
  const [uploading, setUploading] = useState<null | 'text' | 'image'>(null)
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()
  const textInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const needsAny = needsGender || needsRelationship || needsFirstEvent
  if (!needsAny) return null

  const canSubmit =
    (!needsGender || gender !== null) &&
    (!needsRelationship || state !== null) &&
    (!needsFirstEvent || content.trim().length > 0) &&
    !pending

  const onFile = async (kind: 'text' | 'image', file: File) => {
    setErr(null)
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
      if (d.ts) setDetectedTs(d.ts)
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
    if (!canSubmit) return
    setErr(null)
    start(async () => {
      try {
        // 1. self.gender 업데이트
        if (needsGender && gender) {
          await updateSelf({ gender })
        }

        // 2. 관계 생성 (없으면) · 내 성별 반대 자동, partner 이름은 '상대' placeholder
        let relId = existingRelationshipId
        if (needsRelationship && state) {
          const r = await createRelationship({
            partnerName: '상대',
            state,
          })
          relId = r.relationshipId
        }

        // 3. 첫 기록 (카톡) 추가
        if (needsFirstEvent && relId && content.trim()) {
          await addEvent({
            relationshipId: relId,
            type: 'chat',
            content: content.trim(),
            timestamp: detectedTs,
          })
        }

        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-5 my-4 flex flex-col gap-4">
        <div>
          <div className="text-lg font-bold">시작 전에 3가지만</div>
          <div className="text-[11px] text-muted mt-1 leading-relaxed">
            이거 넣으면 루바이가 바로 분석 시작해. 상대 이름·나이·직업 같은 건 나중에 대화하면서 알아서 채워져.
          </div>
        </div>

        {needsGender && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">내 성별</span>
            <div className="flex gap-1.5">
              {GENDER_OPTIONS.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setGender(o.v)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    gender === o.v
                      ? 'bg-accent/15 border-accent/50 text-accent'
                      : 'bg-surface-2 border-border text-muted hover:border-accent/30'
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-muted">
              상대는 내 성별 반대로 자동.
            </span>
          </div>
        )}

        {needsRelationship && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">지금 관계 상태</span>
            <div className="grid grid-cols-2 gap-1.5">
              {STATE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setState(s)}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    state === s
                      ? 'bg-accent/15 border-accent/50 text-accent'
                      : 'bg-surface-2 border-border text-muted hover:border-accent/30'
                  }`}
                >
                  {STATE_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {needsFirstEvent && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">카톡 대화 1건</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={onPaste}
              rows={7}
              placeholder={`카톡 원문 그대로 붙여넣기 OR 한 줄 상황 설명. 길수록 좋아.

예) "3일 전 매달렸는데 답 없음" 또는 카톡 원문.`}
              className="rounded-lg bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none focus:border-accent resize-y min-h-[140px] whitespace-pre-wrap"
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
                텍스트 파일
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
          </div>
        )}

        {err && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2 whitespace-pre-wrap">
            {err}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="w-full rounded-xl bg-accent text-white py-3 text-sm font-semibold disabled:opacity-40"
        >
          {pending ? '저장 중…' : '루바이 시작'}
        </button>
      </div>
    </div>
  )
}

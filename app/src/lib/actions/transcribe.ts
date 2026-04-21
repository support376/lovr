'use server'

/**
 * 파일 → 텍스트 변환 서버 액션.
 *
 * 1. 텍스트 (.txt/.csv/.md): 그대로 읽어 반환.
 * 2. 이미지 (.png/.jpg/.webp/.gif): Claude Vision 으로 OCR.
 *    카톡·DM 캡쳐에서 발화·시간 그대로 추출.
 */

import { anthropic, FAST_MODEL } from '../ai/client'
import { requireUserId } from '../supabase/server'

const TEXT_TYPES = ['text/plain', 'text/csv', 'text/markdown']
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // Claude Vision 5MB 한도
const MAX_TEXT_BYTES = 5 * 1024 * 1024

export type ExtractResult =
  | { ok: true; kind: 'text' | 'image'; text: string }
  | { ok: false; error: string }

export async function extractFromFile(formData: FormData): Promise<ExtractResult> {
  try {
    await requireUserId()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return { ok: false, error: '파일이 없어' }
    }

    const mime = file.type || ''
    const size = file.size

    if (isImageMime(mime) || isImageExt(file.name)) {
      if (size > MAX_IMAGE_BYTES) {
        return {
          ok: false,
          error: `이미지가 너무 커 (${(size / 1024 / 1024).toFixed(1)}MB). 5MB 이하로 줄여봐.`,
        }
      }
      return await ocrImage(file, mime)
    }

    if (isTextMime(mime) || isTextExt(file.name)) {
      if (size > MAX_TEXT_BYTES) {
        return {
          ok: false,
          error: '텍스트 파일이 너무 커 (5MB 초과).',
        }
      }
      const text = await file.text()
      return { ok: true, kind: 'text', text }
    }

    return {
      ok: false,
      error: `지원 안 되는 형식 (${mime || '알 수 없음'}). .txt (카톡) · .png/.jpg (캡쳐) 만.`,
    }
  } catch (e) {
    console.error('[extractFromFile]', e)
    return { ok: false, error: (e as Error).message ?? 'unknown' }
  }
}

async function ocrImage(file: File, mime: string): Promise<ExtractResult> {
  const buf = Buffer.from(await file.arrayBuffer())
  const base64 = buf.toString('base64')

  // Claude Vision 이 허용하는 mime 로 정규화
  const mediaType = normalizeImageMime(mime, file.name)
  if (!mediaType) {
    return { ok: false, error: '이미지 포맷 불명' }
  }

  const client = anthropic()
  const res = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: 'text',
            text: `이 이미지에서 텍스트를 그대로 추출해. 카톡·DM·문자 캡쳐면 아래 규칙:

1. 발화자(화자 이름)가 보이면 각 메시지 앞에 표기: "화자이름 : 메시지"
2. 시간이 보이면 각 메시지 뒤에 그대로: "메시지 (2024. 3. 15. 오후 3:14)"
3. 시간 순서대로 위→아래. 읽은 표시·인원수 등 UI 장식은 빼라.
4. 원문 그대로. 의역·요약 금지.
5. 이모지·!?·ㅋㅋ 그대로 보존.

화자 이름이나 시간이 안 보이면 빼고 본문만.
순수 텍스트만. 앞뒤 설명·코드펜스 금지.`,
          },
        ],
      },
    ],
  })

  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()

  if (!text) {
    return { ok: false, error: 'OCR 결과가 비어 — 텍스트가 안 보이거나 모델이 인식 못 함' }
  }
  return { ok: true, kind: 'image', text }
}

function isImageMime(mime: string): boolean {
  if (IMAGE_TYPES.includes(mime)) return true
  if (mime.startsWith('image/')) return true
  return false
}
function isTextMime(mime: string): boolean {
  return TEXT_TYPES.includes(mime) || mime.startsWith('text/')
}
function isImageExt(name: string): boolean {
  return /\.(png|jpg|jpeg|webp|gif)$/i.test(name)
}
function isTextExt(name: string): boolean {
  return /\.(txt|csv|md)$/i.test(name)
}

function normalizeImageMime(
  mime: string,
  name: string
): 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' | null {
  const m = mime.toLowerCase()
  if (m === 'image/png' || /\.png$/i.test(name)) return 'image/png'
  if (m === 'image/jpeg' || m === 'image/jpg' || /\.(jpg|jpeg)$/i.test(name))
    return 'image/jpeg'
  if (m === 'image/webp' || /\.webp$/i.test(name)) return 'image/webp'
  if (m === 'image/gif' || /\.gif$/i.test(name)) return 'image/gif'
  return null
}

/**
 * 붙여넣은 텍스트에서 첫 timestamp 추출.
 */
export async function detectFirstTimestamp(
  text: string
): Promise<{ ts: number | null }> {
  const t = text.slice(0, 3000)

  // 2024. 3. 15. 오후 3:14
  const m1 = t.match(
    /(\d{4})[.년/ -]+(\d{1,2})[.월/ -]+(\d{1,2})[.일 ]*(오전|오후)?[ ]?(\d{1,2}):(\d{2})/
  )
  if (m1) {
    let h = parseInt(m1[5], 10)
    const ap = m1[4]
    if (ap === '오후' && h < 12) h += 12
    if (ap === '오전' && h === 12) h = 0
    const d = new Date(
      parseInt(m1[1], 10),
      parseInt(m1[2], 10) - 1,
      parseInt(m1[3], 10),
      h,
      parseInt(m1[6], 10)
    )
    if (!isNaN(d.getTime())) return { ts: d.getTime() }
  }

  // 2024-03-15 15:14 or 2024/03/15 15:14
  const m2 = t.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})/)
  if (m2) {
    const d = new Date(
      parseInt(m2[1], 10),
      parseInt(m2[2], 10) - 1,
      parseInt(m2[3], 10),
      parseInt(m2[4], 10),
      parseInt(m2[5], 10)
    )
    if (!isNaN(d.getTime())) return { ts: d.getTime() }
  }

  return { ts: null }
}

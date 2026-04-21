'use server'

/**
 * 파일 → 텍스트 변환 서버 액션.
 *
 * 1. 카톡 내보내기 .txt 파일: 그대로 읽어 텍스트 반환.
 * 2. 음성 파일 (.mp3/.m4a/.wav/.webm): OpenAI Whisper API 로 STT.
 *
 * Whisper 사용에는 OPENAI_API_KEY 환경변수 필요.
 * 없으면 명확한 에러로 유저에게 설정하라고 안내.
 */

import { requireUserId } from '../supabase/server'

const AUDIO_TYPES = [
  'audio/mpeg', // mp3
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4', // m4a
  'audio/x-m4a',
  'audio/webm',
  'audio/ogg',
]
const TEXT_TYPES = ['text/plain', 'text/csv', 'text/markdown']
const MAX_AUDIO_BYTES = 25 * 1024 * 1024 // Whisper API limit
const MAX_TEXT_BYTES = 5 * 1024 * 1024

export type ExtractResult =
  | { ok: true; kind: 'kakao' | 'audio'; text: string }
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

    if (isAudioMime(mime) || isAudioExt(file.name)) {
      if (size > MAX_AUDIO_BYTES) {
        return {
          ok: false,
          error: `음성 파일이 너무 커 (${(size / 1024 / 1024).toFixed(1)}MB). Whisper API 한도 25MB.`,
        }
      }
      return await transcribeAudio(file)
    }

    if (isTextMime(mime) || isTextExt(file.name)) {
      if (size > MAX_TEXT_BYTES) {
        return {
          ok: false,
          error: '텍스트 파일이 너무 커 (5MB 초과). 쪼개서 붙여넣어.',
        }
      }
      const text = await file.text()
      return { ok: true, kind: 'kakao', text }
    }

    return {
      ok: false,
      error: `지원 안 되는 형식 (${mime || '알 수 없음'}). .txt (카톡) · .mp3/.m4a/.wav (음성) 만.`,
    }
  } catch (e) {
    console.error('[extractFromFile]', e)
    return { ok: false, error: (e as Error).message ?? 'unknown' }
  }
}

async function transcribeAudio(file: File): Promise<ExtractResult> {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return {
      ok: false,
      error:
        '음성 변환용 OPENAI_API_KEY 환경변수가 서버에 없어. Vercel 환경변수에 추가 후 다시 배포해야 STT 동작.',
    }
  }

  const fd = new FormData()
  fd.append('file', file)
  fd.append('model', 'whisper-1')
  fd.append('language', 'ko')
  fd.append('response_format', 'text')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return {
      ok: false,
      error: `Whisper API 실패 (${res.status}): ${body.slice(0, 300)}`,
    }
  }

  const text = (await res.text()).trim()
  if (!text) {
    return { ok: false, error: '변환 결과가 비어 — 음성 인식 실패' }
  }
  return { ok: true, kind: 'audio', text }
}

function isAudioMime(mime: string): boolean {
  if (AUDIO_TYPES.includes(mime)) return true
  if (mime.startsWith('audio/')) return true
  return false
}
function isTextMime(mime: string): boolean {
  return TEXT_TYPES.includes(mime) || mime.startsWith('text/')
}
function isAudioExt(name: string): boolean {
  return /\.(mp3|m4a|wav|webm|ogg|aac|mp4)$/i.test(name)
}
function isTextExt(name: string): boolean {
  return /\.(txt|csv|md)$/i.test(name)
}

/**
 * 붙여넣은 카톡 원문에서 첫 timestamp 추출.
 * 여러 포맷 지원.
 */
export async function detectFirstTimestamp(
  text: string
): Promise<{ ts: number | null }> {
  const t = text.slice(0, 3000) // 앞부분만 탐색

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

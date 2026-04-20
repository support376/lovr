'use server'

import 'server-only'
import { anthropic, FAST_MODEL, MID_MODEL } from '../ai/client'
import { buildContext } from '../engine/context'
import {
  realtimeFastPrompt,
  realtimeMidPrompt,
  tenMinReportPrompt,
} from '../prompts/loader'
import { addEvent } from './events'
import { getCurrentRelationship } from './relationships'
import { requireUserId } from '../supabase/server'

export async function askFast(input: {
  chunk: string
  contextSummary?: string
}): Promise<{ tag: string }> {
  const client = anthropic()
  const sys = realtimeFastPrompt()
  const res = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 30,
    system: [{ type: 'text', text: sys, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: `## [최근 transcript 청크]\n${input.chunk}`,
      },
    ],
  })
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()
  return { tag: text || '[중립]' }
}

export async function askMid(input: {
  transcript: string
  relationshipId?: string
}): Promise<{ markdown: string }> {
  const uid = await requireUserId()
  let ctxMd = '(관계 맥락 미지정)'
  if (input.relationshipId) {
    const ctx = await buildContext(uid, input.relationshipId, 8)
    ctxMd = ctx.markdown
  }
  const client = anthropic()
  const res = await client.messages.create({
    model: MID_MODEL,
    max_tokens: 300,
    system: [
      { type: 'text', text: realtimeMidPrompt(), cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: `## [누적 transcript]\n${input.transcript}\n\n## [맥락]\n${ctxMd}`,
      },
    ],
  })
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()
  return { markdown: text }
}

export type TurnRole = 'me' | 'partner' | 'unknown'
export type Turn = { role: TurnRole; text: string; at?: number }

/**
 * 10분 단위 중간 리포트. 유저가 설정한 모드·지금까지 turns·관계 맥락을 받아
 * "나는 뭐 했고 / 상대는 어떻고 / 다음 10분 뭐할지" 3섹션 markdown.
 */
export async function askTenMinReport(input: {
  turns: Turn[]
  elapsedMin: number
  mode?: string
  relationshipId?: string
}): Promise<{ markdown: string }> {
  const uid = await requireUserId()
  let ctxMd = '(관계 맥락 미지정)'
  if (input.relationshipId) {
    const ctx = await buildContext(uid, input.relationshipId, 5)
    ctxMd = ctx.markdown
  }

  const mine = input.turns
    .filter((t) => t.role === 'me')
    .map((t) => `- ${t.text}`)
    .join('\n')
  const theirs = input.turns
    .filter((t) => t.role === 'partner')
    .map((t) => `- ${t.text}`)
    .join('\n')
  const unknown = input.turns
    .filter((t) => t.role === 'unknown')
    .map((t) => `- ${t.text}`)
    .join('\n')

  const userMsg = `## [대화 경과]
${input.elapsedMin}분

## [맥락]
${ctxMd}

## [내 발언]
${mine || '(없음)'}

## [상대 발언]
${theirs || '(없음)'}

${unknown ? `## [화자 미상]\n${unknown}` : ''}`.trim()

  const client = anthropic()
  const res = await client.messages.create({
    model: MID_MODEL,
    max_tokens: 800,
    system: [
      {
        type: 'text',
        text: tenMinReportPrompt(),
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMsg }],
  })
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()
  return { markdown: text }
}

/**
 * Meeting 종료 시 Event(type=meeting) 로 transcript 저장.
 */
export async function saveMeetingEvent(input: {
  transcript: string
  relationshipId?: string
}): Promise<{ eventId: string; relationshipId: string }> {
  let relId = input.relationshipId
  if (!relId) {
    const cur = await getCurrentRelationship()
    if (!cur) throw new Error('현재 활성 관계가 없어 meeting event 저장 불가')
    relId = cur.id
  }
  const { eventId } = await addEvent({
    relationshipId: relId,
    type: 'meeting',
    content: `## 실시간 음성 transcript\n\n${input.transcript}`,
    transcript: input.transcript,
    timestamp: Date.now(),
  })
  return { eventId, relationshipId: relId }
}

'use server'

import 'server-only'
import { anthropic, FAST_MODEL } from '../ai/client'
import { buildContext } from '../engine/context'
import { luvaiCorePrompt } from '../prompts/loader'
import { getCurrentRelationship } from './relationships'
import { requireUserId } from '../supabase/server'

export type LuvAIMessage = {
  role: 'user' | 'assistant'
  content: string
}

// 200k context 폭주 방지 — 최근 N턴 만 모델에 보냄.
// 20 = user/assistant 각 10회 정도. 유저 처음 질문이 필요하면 별도로 고려.
const MAX_HISTORY_MESSAGES = 20

export async function askLuvAI(history: LuvAIMessage[]): Promise<{
  reply: string
  partnerName: string | null
}> {
  const uid = await requireUserId()
  const cur = await getCurrentRelationship()
  const ctxMd = cur
    ? (await buildContext(uid, cur.id, 12)).markdown
    : '(현재 활성 관계 없음. 관계·상대 아직 등록 안 함.)'

  const system = `${luvaiCorePrompt()}

---

${ctxMd}`

  const trimmed = history.slice(-MAX_HISTORY_MESSAGES)

  const client = anthropic()
  let res
  try {
    res = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 800,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
    })
  } catch (e) {
    const msg = (e as { message?: string })?.message ?? ''
    if (msg.includes('prompt is too long')) {
      throw new Error(
        '기록·대화가 너무 길어서 모델 한도(200k) 초과. 이전 대화 "리셋" 한 번 누르고 다시 시도해줘.'
      )
    }
    throw e
  }

  const reply = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()

  return { reply, partnerName: cur?.partner.displayName ?? null }
}

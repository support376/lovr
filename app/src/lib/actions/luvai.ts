'use server'

import 'server-only'
import { anthropic, FAST_MODEL } from '../ai/client'
import { buildContext } from '../engine/context'
import { realtimeCorePrompt } from '../prompts/loader'
import { getCurrentRelationship } from './relationships'

export type LuvAIMessage = {
  role: 'user' | 'assistant'
  content: string
}

export async function askLuvAI(history: LuvAIMessage[]): Promise<{
  reply: string
  partnerName: string | null
}> {
  const cur = await getCurrentRelationship()
  const ctxMd = cur
    ? (await buildContext(cur.id, 15)).markdown
    : '(현재 활성 관계 없음. 관계·상대 아직 등록 안 함.)'

  const system = `${realtimeCorePrompt()}

---

${ctxMd}`

  const client = anthropic()
  const res = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 800,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  })

  const reply = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()

  return { reply, partnerName: cur?.partner.displayName ?? null }
}

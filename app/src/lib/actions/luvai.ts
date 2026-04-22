'use server'

import 'server-only'
import type Anthropic from '@anthropic-ai/sdk'
import { anthropic, FAST_MODEL } from '../ai/client'
import { buildContext } from '../engine/context'
import { luvaiCorePrompt } from '../prompts/loader'
import { getCurrentRelationship } from './relationships'
import { requireUserId } from '../supabase/server'
import { luvaiTools, executeTool, type ToolExecutionContext } from '../ai/tools'

export type LuvAIMessage = {
  role: 'user' | 'assistant'
  content: string
}

// 200k context 폭주 방지 — 최근 N턴 만 모델에 보냄.
const MAX_HISTORY_MESSAGES = 20
// tool_use 무한 루프 방어.
const MAX_TOOL_TURNS = 4

async function buildSystemAndCtx(uid: string) {
  const cur = await getCurrentRelationship()
  const ctxPack = cur ? await buildContext(uid, cur.id, 12) : null
  const ctxMd = ctxPack
    ? ctxPack.markdown
    : '(현재 활성 관계 없음. 관계·상대 아직 등록 안 함.)'
  const system = `${luvaiCorePrompt()}\n\n---\n\n${ctxMd}`
  const toolCtx: ToolExecutionContext | null =
    cur && ctxPack && ctxPack.partner && ctxPack.relationship
      ? {
          uid,
          relationshipId: cur.id,
          partner: ctxPack.partner,
          relationship: ctxPack.relationship,
        }
      : null
  return { system, cur, toolCtx }
}

function extractText(blocks: Anthropic.Messages.ContentBlock[]): string {
  return blocks
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
}

/**
 * Anthropic tool 루프 — tool_use 가 있으면 실행해서 tool_result 로 다시 호출.
 * MAX_TOOL_TURNS 초과 시 마지막 응답 그대로 반환.
 */
async function runWithTools(args: {
  system: string
  initialMessages: Anthropic.Messages.MessageParam[]
  toolCtx: ToolExecutionContext | null
  maxTokens: number
}): Promise<{ reply: string }> {
  const client = anthropic()
  const messages = [...args.initialMessages]
  const tools = args.toolCtx ? luvaiTools : undefined

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const res = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: args.maxTokens,
      system: [
        { type: 'text', text: args.system, cache_control: { type: 'ephemeral' } },
      ],
      messages,
      ...(tools ? { tools } : {}),
    })

    if (res.stop_reason !== 'tool_use' || !args.toolCtx) {
      return { reply: extractText(res.content) }
    }

    // assistant tool_use 블록 그대로 push
    messages.push({ role: 'assistant', content: res.content })

    // 모든 tool_use 실행 → tool_result 모아서 한 번에 user 메시지로
    const results: Anthropic.Messages.ToolResultBlockParam[] = []
    for (const block of res.content) {
      if (block.type !== 'tool_use') continue
      const r = await executeTool(
        block.name,
        block.input as Record<string, unknown>,
        args.toolCtx
      )
      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(r),
        is_error: !r.ok,
      })
    }
    messages.push({ role: 'user', content: results })
  }

  // MAX_TOOL_TURNS 초과 — tools 빼고 한 번 더 강제 종료 호출
  const finalRes = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: args.maxTokens,
    system: [
      { type: 'text', text: args.system, cache_control: { type: 'ephemeral' } },
    ],
    messages,
  })
  return { reply: extractText(finalRes.content) }
}

export async function askLuvAI(history: LuvAIMessage[]): Promise<{
  reply: string
  partnerName: string | null
}> {
  const uid = await requireUserId()
  const { system, cur, toolCtx } = await buildSystemAndCtx(uid)

  const trimmed = history.slice(-MAX_HISTORY_MESSAGES)
  const initialMessages: Anthropic.Messages.MessageParam[] = trimmed.map(
    (m) => ({ role: m.role, content: m.content })
  )

  try {
    const { reply } = await runWithTools({
      system,
      initialMessages,
      toolCtx,
      maxTokens: 600,
    })
    return { reply, partnerName: cur?.partner.displayName ?? null }
  } catch (e) {
    const msg = (e as { message?: string })?.message ?? ''
    if (msg.includes('prompt is too long')) {
      throw new Error(
        '기록·대화가 너무 길어서 모델 한도(200k) 초과. 이전 대화 "리셋" 한 번 누르고 다시 시도해줘.'
      )
    }
    throw e
  }
}

/**
 * 채팅 진입 시 루바이가 먼저 보내는 첫 메시지.
 * 사용자 입력 없이 context (self·partner·events) 만으로 4박자 응답 생성.
 *
 * tool 호출 안 함 — 첫 메시지에서는 정보 추출 불필요 (events 이미 사용자가 직접 넣음).
 */
export async function generateOpeningMessage(): Promise<string | null> {
  try {
    const uid = await requireUserId()
    const { system, cur } = await buildSystemAndCtx(uid)
    if (!cur) return null

    const trigger: Anthropic.Messages.MessageParam[] = [
      {
        role: 'user',
        content:
          '[시스템 트리거: 첫 진입] 루바이, 첫 인사야. ' +
          '자기소개 1줄("나는 너의 연애 코치 루바이야. 같이 가자.") 로 시작. ' +
          '그 다음 4요소 포맷 — ' +
          '① 이름 + 상대 스타일/상황 1줄 (Events 근거) ' +
          '② 이유 반 문장 ' +
          '③ 구체 행동 + 시간 ' +
          '④ 체크인 (3일 이내). ' +
          '총 3~4문장. 장황 금지.',
      },
    ]

    const client = anthropic()
    const res = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 400,
      system: [
        { type: 'text', text: system, cache_control: { type: 'ephemeral' } },
      ],
      messages: trigger,
    })
    return extractText(res.content) || null
  } catch (e) {
    console.error('[generateOpeningMessage]', e)
    return null
  }
}

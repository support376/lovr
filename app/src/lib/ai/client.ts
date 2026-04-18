import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

// Vercel Hobby 플랜의 함수 10초 제한 때문에 Haiku를 기본으로. Pro로 올라가면 Sonnet 전환 권장.
export const MODEL = 'claude-haiku-4-5-20251001'
export const FAST_MODEL = 'claude-haiku-4-5-20251001'
export const DEEP_MODEL = 'claude-sonnet-4-6' // 추후 옵션 제공용

let _client: Anthropic | null = null

export function anthropic() {
  if (_client) return _client
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error(
      'ANTHROPIC_API_KEY 환경변수가 없습니다. app/.env.local 에 설정하세요.'
    )
  }
  _client = new Anthropic({ apiKey: key })
  return _client
}

export type ToolCall<T> = {
  name: string
  input: T
}

/**
 * Tool use를 강제해 LLM이 지정된 JSON shape로만 응답하도록 함.
 * Anthropic tool_choice: { type: 'tool', name } 로 specific tool 강제.
 */
export async function callWithTool<T>(args: {
  model?: string
  system: string
  messages: Anthropic.Messages.MessageParam[]
  tool: {
    name: string
    description: string
    input_schema: Anthropic.Messages.Tool.InputSchema
  }
  maxTokens?: number
  cacheSystem?: boolean
}): Promise<T> {
  const client = anthropic()
  const systemBlocks: Anthropic.Messages.TextBlockParam[] = args.cacheSystem
    ? [
        {
          type: 'text',
          text: args.system,
          cache_control: { type: 'ephemeral' },
        },
      ]
    : [{ type: 'text', text: args.system }]

  const res = await client.messages.create({
    model: args.model ?? MODEL,
    max_tokens: args.maxTokens ?? 2000,
    system: systemBlocks,
    messages: args.messages,
    tools: [args.tool],
    tool_choice: { type: 'tool', name: args.tool.name },
  })

  const toolBlock = res.content.find((b) => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('LLM이 tool_use를 반환하지 않았습니다')
  }
  return toolBlock.input as T
}

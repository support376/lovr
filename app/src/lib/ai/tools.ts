import 'server-only'
import type Anthropic from '@anthropic-ai/sdk'
import { addEvent } from '../actions/events'
import {
  updatePartner as updatePartnerAction,
  updateRelationship as updateRelationshipAction,
} from '../actions/relationships'
import type { Actor, Relationship } from '../db/schema'

/**
 * 루바이가 대화 중 자동 호출하는 tool 들.
 *
 * 원칙: 대화 본문(text 응답)은 4박자 그대로 유지하고,
 *       사용자가 새로 흘린 정보는 조용히 DB 에 박는다.
 *       "기록했어" "저장했어" 같은 표현은 프롬프트에서 금지.
 */
export const luvaiTools: Anthropic.Messages.Tool[] = [
  {
    name: 'addEvent',
    description:
      '★ 루프 데이터화의 핵심. 다음 상황에서 반드시 호출:\n' +
      '1) 유저가 체크인 보고할 때: "안 보냈어", "운동했어", "72시간 참음" 등 실행 여부 보고 → type="note" 또는 "event"\n' +
      '2) 유저가 새 사건 언급: "어제 만났어", "오늘 답 왔어" → type="event"\n' +
      '3) 유저가 상대 발언 전달: "걔가 이렇게 말했대" → type="chat"\n' +
      '4) 유저의 감정/관찰 메모: "오늘 SNS 3번 확인함" → type="note"\n' +
      '이 기록이 다음 대화의 근거가 됨. 응답 본문에는 "기록했어/저장했어" 언급 금지 — 조용히.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['chat', 'event', 'note'],
          description:
            'chat=상대 발언 인용·카톡 / event=만남·전화·실제 사건 / note=내 관찰·감정 메모',
        },
        content: {
          type: 'string',
          description: '한국어 1~3문장 요약 또는 원문 인용',
        },
        timestamp_iso: {
          type: 'string',
          description:
            '사건 시각 ISO8601 형식 (예: 2026-04-22T15:30:00). 모르면 이 필드 생략.',
        },
      },
      required: ['type', 'content'],
    },
  },
  {
    name: 'updatePartner',
    description:
      '대화에서 새로 알게 된 상대 정보(이름·나이·직업·메모)를 partner actor 에 반영. ' +
      '실수해도 후속 입력으로 덮을 수 있으니 적극적으로 호출. ' +
      '아무 새 정보도 없으면 호출하지 마.',
    input_schema: {
      type: 'object',
      properties: {
        displayName: {
          type: 'string',
          description: '상대 이름/호칭. 새로 알았을 때만.',
        },
        age: { type: 'integer', description: '상대 나이.' },
        occupation: { type: 'string', description: '상대 직업.' },
        rawNotesAppend: {
          type: 'string',
          description:
            '기존 메모 뒤에 append 할 새 fact 한 줄. 예: "취미 등산", "가족 부산 거주".',
        },
      },
    },
  },
  {
    name: 'updateRelationship',
    description:
      '관계 자체에 변화 있을 때만 호출. ' +
      'state 변경(예: dating → ended), 또는 description 한 줄 정의 추가/수정.',
    input_schema: {
      type: 'object',
      properties: {
        state: {
          type: 'string',
          enum: ['exploring', 'dating', 'serious', 'struggling', 'ended'],
          description: '관계 상태 변경.',
        },
        description: {
          type: 'string',
          description: '"직장 후임", "소개팅 3회차" 같은 한 줄 정의.',
        },
      },
    },
  },
]

export type ToolExecutionContext = {
  uid: string
  relationshipId: string
  partner: Actor
  relationship: Relationship
}

type ToolResult = { ok: boolean; detail?: string; error?: string }

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'addEvent': {
        const type = input.type as 'chat' | 'event' | 'note'
        const content = String(input.content ?? '').trim()
        if (!content) return { ok: false, error: 'empty content' }
        const tsIso = input.timestamp_iso as string | undefined
        const ts = tsIso ? new Date(tsIso).getTime() : null
        const r = await addEvent({
          relationshipId: ctx.relationshipId,
          type,
          content,
          timestamp: Number.isFinite(ts) ? ts : null,
        })
        return { ok: true, detail: `event ${r.eventId}` }
      }
      case 'updatePartner': {
        const patch: {
          displayName?: string
          age?: number | null
          occupation?: string | null
          rawNotes?: string | null
        } = {}
        if (typeof input.displayName === 'string' && input.displayName.trim()) {
          patch.displayName = input.displayName.trim()
        }
        if (typeof input.age === 'number') patch.age = input.age
        if (typeof input.occupation === 'string' && input.occupation.trim()) {
          patch.occupation = input.occupation.trim()
        }
        if (
          typeof input.rawNotesAppend === 'string' &&
          input.rawNotesAppend.trim()
        ) {
          const prior = ctx.partner.rawNotes ?? ''
          patch.rawNotes =
            prior + (prior ? '\n' : '') + input.rawNotesAppend.trim()
        }
        if (Object.keys(patch).length === 0) {
          return { ok: false, error: 'no fields to update' }
        }
        await updatePartnerAction(ctx.partner.id, patch)
        return { ok: true, detail: Object.keys(patch).join(',') }
      }
      case 'updateRelationship': {
        const patch: { state?: string; description?: string } = {}
        if (typeof input.state === 'string') patch.state = input.state
        if (typeof input.description === 'string' && input.description.trim()) {
          patch.description = input.description.trim()
        }
        if (Object.keys(patch).length === 0) {
          return { ok: false, error: 'no fields to update' }
        }
        await updateRelationshipAction(ctx.relationshipId, patch as never)
        return { ok: true, detail: Object.keys(patch).join(',') }
      }
      default:
        return { ok: false, error: `unknown tool: ${name}` }
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

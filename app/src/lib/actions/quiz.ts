'use server'

import 'server-only'
import { anthropic, MID_MODEL } from '../ai/client'
import { selfQuizPrompt } from '../prompts/loader'

export type QuizAnswer = { question: string; answer: string }

export type QuizExtracted = {
  personalityNotes: string
  valuesNotes: string
  idealTypeNotes: string
  strengths: string[]
  weaknesses: string[]
  rationale: string
}

/** 설문 답변들을 Sonnet 에 던져 자연어 프로파일 narrative 추출. */
export async function extractSelfFromQuiz(
  answers: QuizAnswer[]
): Promise<QuizExtracted> {
  const content = answers
    .map((a, i) => `## Q${i + 1}: ${a.question}\nA: ${a.answer || '(답 안 함)'}`)
    .join('\n\n')

  const client = anthropic()
  const res = await client.messages.create({
    model: MID_MODEL,
    max_tokens: 2000,
    system: [
      {
        type: 'text',
        text: selfQuizPrompt(),
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content }],
  })

  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()

  let parsed: Partial<QuizExtracted> = {}
  try {
    const jsonStr = extractJson(text)
    parsed = JSON.parse(jsonStr) as QuizExtracted
  } catch (err) {
    throw new Error(`설문 LLM JSON 파싱 실패: ${(err as Error).message}\n\n${text.slice(0, 500)}`)
  }

  return {
    personalityNotes: (parsed.personalityNotes ?? '').trim(),
    valuesNotes: (parsed.valuesNotes ?? '').trim(),
    idealTypeNotes: (parsed.idealTypeNotes ?? '').trim(),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    rationale: (parsed.rationale ?? '').trim(),
  }
}

function extractJson(s: string): string {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) return fence[1].trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) return s.slice(start, end + 1)
  return s
}

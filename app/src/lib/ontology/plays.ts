/**
 * Play 카탈로그 — stage × goal 조합별 전형 전략 시드.
 *
 * 온톨로지 재정의로 기존 플레이북은 무효. 타입 + 헬퍼만 stub 로 유지.
 * 새 카탈로그는 후속에 재정의.
 */

import type { StageKey } from './stages'
import type { GoalKey } from './goals'

export type Play = {
  id: string
  triggers: {
    stage: StageKey[]
    goal: GoalKey[]
    partnerHints?: { trait?: string[]; mbtiPattern?: string }
  }
  title: string
  rationale: string
  steps: string[]
  timing: string
  messageDraftHint?: string
  successSignals: string[]
  failSignals: string[]
  risks: string[]
}

export const PLAYS: Play[] = []

export function findPlays(_params: {
  stage?: StageKey | string | null
  goal?: GoalKey | string | null
}): Play[] {
  return []
}

export function playsPromptBlock(_plays: Play[]): string {
  return ''
}

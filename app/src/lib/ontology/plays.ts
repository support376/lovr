/**
 * Play 카탈로그 — stage × goal 조합별 전형 전략 시드.
 *
 * 온톨로지 재정의로 기존 플레이북은 모두 무효화됨 (old stage/goal 키 사용).
 * 여기서는 타입과 헬퍼만 유지해 프롬프트 파이프라인이 계속 compile 되도록 함.
 * 새 카탈로그는 이후 stage-별로 다시 채워넣는다.
 */

import type { StageKey } from './stages'
import type { GoalKey } from './goals'
import type { StyleKey } from './styles'

export type Play = {
  id: string
  triggers: {
    stage: StageKey[]
    goal: GoalKey[]
    style?: StyleKey[]
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
  style?: StyleKey | string | null
}): Play[] {
  return []
}

export function playsPromptBlock(_plays: Play[]): string {
  return ''
}

export * from './stages'
export * from './goals'
export * from './plays'

import { STAGES, type StageKey } from './stages'
import { GOALS, type GoalKey } from './goals'

/**
 * 프롬프트 주입용 블록 생성 — stage + goal 맥락.
 * 과거 style 축은 제거됨 (UI·백엔드 공통으로 드롭).
 */
export function promptContextBlock(params: {
  stage?: StageKey | string | null
  goal?: GoalKey | string | null
}): string {
  const lines: string[] = []

  if (params.stage && params.stage in STAGES) {
    const s = STAGES[params.stage as StageKey]
    lines.push(`## [관계 단계]`)
    lines.push(`${s.ko} — ${s.hint}`)
  }

  if (params.goal && params.goal in GOALS) {
    const g = GOALS[params.goal as GoalKey]
    lines.push('')
    lines.push(`## [현재 목적]`)
    lines.push(`${g.ko} — ${g.hint}`)
    lines.push(`플레이북: ${g.playbook}`)
  }

  return lines.join('\n')
}

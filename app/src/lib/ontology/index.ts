export * from './stages'
export * from './goals'
export * from './styles'
export * from './plays'

import { STAGES, type StageKey } from './stages'
import { GOALS, type GoalKey } from './goals'
import { STYLES, type StyleKey } from './styles'

/**
 * 프롬프트 주입용 블록 생성 — stage + goal + style 맥락을 한 번에.
 */
export function promptContextBlock(params: {
  stage?: StageKey | string | null
  goal?: GoalKey | string | null
  style?: StyleKey | string | null
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

  if (params.style && params.style in STYLES) {
    const st = STYLES[params.style as StyleKey]
    lines.push('')
    lines.push(`## [답변 스타일 — 반드시 이 톤 유지]`)
    lines.push(`${st.ko} (${st.tagline})`)
    lines.push(`- 핵심: ${st.core}`)
    lines.push(`- 언어: ${st.language}`)
    lines.push(`- 쓸 때: ${st.useWhen}`)
    lines.push(`- ⚠️ 실패 모드: ${st.failMode}`)
  }

  return lines.join('\n')
}

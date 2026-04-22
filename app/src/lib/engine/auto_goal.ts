import type { RelationshipState, RelationshipGoal } from '../db/schema'

/**
 * 상태가 정해지면 목표는 자동.
 * 사용자는 상태만 선택. 목표는 코드가 정함.
 *
 * UI 노출은 4개 상태 (exploring/dating/struggling/ended).
 * serious(장기·결혼) 은 레거시 DB 호환용 — dating 과 동일 처리.
 */
export const STATE_TO_AUTO_GOAL: Record<RelationshipState, RelationshipGoal> = {
  exploring: 'advance',          // 사귀기까지
  dating: 'deepen',              // 주도권 + 안정
  serious: 'deepen',             // dating 과 동일
  struggling: 'heal',            // 갈등 회복
  ended: 'reconnect_try',        // 재시도
}

/**
 * 루바이 프롬프트 주입용 한국어 지령 (짧은 버전).
 * 실제 상세 방법 원칙은 LUVAI_CORE "상태별 매뉴얼" 섹션에서 LLM 이 참조.
 * 이 지령은 "현재 state 가 무엇이다" 를 context 에 한 줄로 박는 신호.
 */
export const STATE_TO_DIRECTIVE: Record<RelationshipState, string> = {
  exploring:
    '목적=호감 형성·사귀기로 진입. 매뉴얼 exploring 블록 적용.',
  dating:
    '목적=주도권 확보·친밀 유지. 매뉴얼 dating 블록 적용.',
  serious:
    '목적=주도권 유지·안정. 매뉴얼 dating 블록 적용 (serious 포함).',
  struggling:
    '목적=회복 vs 정리 분기 결정. 매뉴얼 struggling 블록 적용.',
  ended:
    '목적=재회 시도 or 깔끔한 정리. 매뉴얼 ended 블록 적용.',
}

/** rel.goal 이 null 이면 상태에서 자동 도출. */
export function deriveGoal(
  state: RelationshipState,
  current: RelationshipGoal | null
): RelationshipGoal {
  return current ?? STATE_TO_AUTO_GOAL[state]
}

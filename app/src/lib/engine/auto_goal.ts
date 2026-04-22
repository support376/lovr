import type { RelationshipState, RelationshipGoal } from '../db/schema'

/**
 * 상태가 정해지면 목표는 자동.
 * 사용자는 상태만 선택. 목표는 코드가 정함.
 *
 * Why: 루바이 = PT 트레이너 모델. "재회할래 사귈래?" 같은 양자택일 안 물음.
 *      상태 = 목표. 사용자 결정 부담 ↓, time-to-AI ↓.
 */
export const STATE_TO_AUTO_GOAL: Record<RelationshipState, RelationshipGoal> = {
  exploring: 'advance',          // 사귀기까지
  dating: 'deepen',              // 가까워지기 (실 의미: 주도권 + 안정)
  serious: 'maintain',           // 안정 유지
  struggling: 'heal',            // 갈등 회복
  ended: 'reconnect_try',        // 재시도
}

/**
 * 루바이 프롬프트 주입용 한국어 지령.
 * context.ts 가 [관계 맥락] 섹션에 박아 넣음.
 *
 * Why: enum 라벨("가까워지기")만 보여주면 모델이 약하게 해석. 명령형 한 줄로 의도 못 박음.
 */
export const STATE_TO_DIRECTIVE: Record<RelationshipState, string> = {
  exploring:
    '사귀기로 진입. 상대로부터 호감·관심·시간을 끌어내도록 사용자 행동 지시.',
  dating:
    '관계 내 주도권 강화 + 안정화. 상대에게 휘둘리지 않으면서 친밀도 유지.',
  serious:
    '안정 유지 + 권태 방지. 일상 패턴·신뢰 점검에 집중.',
  struggling:
    '회복 또는 정리 결정. 양자택일 강제 말고 분기점 명확히 짚기.',
  ended:
    '재회 시도 위주. 무연락 기간·재접근 타이밍·내 상태 회복 순서.',
}

/** rel.goal 이 null 이면 상태에서 자동 도출. */
export function deriveGoal(
  state: RelationshipState,
  current: RelationshipGoal | null
): RelationshipGoal {
  return current ?? STATE_TO_AUTO_GOAL[state]
}

/**
 * Goal category 온톨로지 — 10종. Goal.category 값으로 저장.
 * 같은 상황도 어느 goal이냐에 따라 전략이 완전히 달라진다.
 */

export type GoalKey =
  | 'build_interest'
  | 'build_chemistry'
  | 'qualify'
  | 'escalate_to_meet'
  | 'escalate_physical'
  | 'create_distance'
  | 'repair'
  | 'deepen_commitment'
  | 'clarify_intent'
  | 'graceful_exit'

export const GOALS: Record<
  GoalKey,
  { ko: string; hint: string; playbook: string }
> = {
  build_interest: {
    ko: '관심 유발',
    hint: '아직 관심이 약할 때 끌어오기',
    playbook:
      '호기심 자극 · 본인 매력 슬쩍 · 의외의 관점 · 답장 간격 여유 · 너무 적극은 금물',
  },
  build_chemistry: {
    ko: '케미 / 긴장 빌드업',
    hint: '호감은 있고, 긴장감을 쌓아 당길 때',
    playbook:
      '은근한 암시 · 짧은 응답 · 여백 · 상상 여지 · 직설 피하기 · 밤 대화',
  },
  qualify: {
    ko: '진지한 상대 판별',
    hint: '러브바밍·허세·가치관 검증',
    playbook:
      '가치관 질문 · 과거 이력 살짝 탐색 · 반응 관찰 · 본인은 정직하게 · 플러팅 자제',
  },
  escalate_to_meet: {
    ko: '대면 만남 제안',
    hint: '온라인 → 오프라인 전환',
    playbook:
      '구체 일시·장소 제시 · 짧은 플랜 · 부담 낮은 1차 제안 · 거절 대응 준비',
  },
  escalate_physical: {
    ko: '스킨십 / 진도',
    hint: '물리적 친밀 단계 올리기',
    playbook:
      '상대 편안함 최우선 · 상호 신호 확인 · 단계적 · 되돌아갈 여지 · 직전 대화의 흐름 유지',
  },
  create_distance: {
    ko: '밀당 / 후퇴',
    hint: '희소성 만들기, 열기 내리기',
    playbook:
      '답장 늦추기 · 짧게 · 본인 일상 강조 · 상대가 먼저 묻게 · 완전 잠수는 X',
  },
  repair: {
    ko: '갈등 회복',
    hint: '싸움·오해 후 복구',
    playbook:
      '책임 인정 · 변명 금지 · 상대 감정 먼저 · 구체 행동 변화 제안 · 시간 두기',
  },
  deepen_commitment: {
    ko: '관계 심화',
    hint: '안정기에서 더 깊게',
    playbook:
      '미래 그림 · 취약성 공개 · 상대 세계에 진입 (가족/친구) · 일상 공유',
  },
  clarify_intent: {
    ko: '상대 의도 파악',
    hint: '얘 진심인가? 확인',
    playbook:
      '직접 묻지 말고 행동 관찰 · 선택지 주고 반응 · 비용 드는 제안 테스트',
  },
  graceful_exit: {
    ko: '깔끔한 종료',
    hint: '질질 끌지 말고 정리',
    playbook:
      '단호하되 존중 · 명확한 이유 1줄 · 재진입 여지 안 주기 · 미련 최소화',
  },
}

export const GOAL_ORDER: GoalKey[] = [
  'build_interest',
  'build_chemistry',
  'qualify',
  'escalate_to_meet',
  'escalate_physical',
  'create_distance',
  'clarify_intent',
  'deepen_commitment',
  'repair',
  'graceful_exit',
]

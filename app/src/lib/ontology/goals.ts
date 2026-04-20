/**
 * Goal 온톨로지 — stage-scoped.
 *
 * 핵심 원칙: 목표는 stage 에 종속된다.
 *   같은 "상대 의도 파악"이라도 pre_match 단계(추진 가치 판단)와
 *   stable 단계(결혼 적합성)는 완전히 다른 전략.
 *
 * Goal.category = GoalKey 값으로 저장.
 */

import type { StageKey } from './stages'

export type GoalKey =
  // ── pre_match (탐색 중 / 미접촉) ─────────────
  | 'pursuit_worth'         // 추진 가치 판단
  | 'first_approach'        // 첫 접근 전략
  | 'early_rule_out'        // 조기 배제
  // ── early_dating (초기 데이팅) ─────────────
  | 'longterm_potential'    // 장기잠재력 평가
  | 'redflag_scan'          // 레드플래그 스캔
  | 'casual_enjoy'          // 가볍게 즐기기
  | 'pattern_warning'       // 패턴 반복 경고
  // ── stable (안정 관계) ─────────────────────
  | 'conflict_resolve'      // 갈등 해소
  | 'deepen'                // 깊이 쌓기
  | 'marriage_fit'          // 결혼 적합성
  // ── long_term (장기 / 결혼) ───────────────
  | 'boredom_recovery'      // 권태 회복
  | 'lifeplan_fit'          // 라이프플랜 정합성
  | 'divorce_predict'       // 이혼 예측 / 준비
  // ── post_breakup (이별 후) ────────────────
  | 'self_diagnosis'        // 자기 진단
  | 'pattern_analysis'      // 패턴 분석
  | 'recovery_strategy'     // 복구 전략

export const GOALS: Record<
  GoalKey,
  { ko: string; hint: string; playbook: string; stage: StageKey }
> = {
  // ── pre_match ─────────────────────────────
  pursuit_worth: {
    ko: '추진 가치 판단',
    hint: '이 사람 밀 만한가. 감정·투자 비용 대비 현실성 판단.',
    playbook:
      '프로필·공통 접점·제약(기혼·거리·생활 패턴) 체크 · 최소 2개 긍정 신호 요구 · 감정 투자 전에 cold 판단 · 애매하면 보류',
    stage: 'pre_match',
  },
  first_approach: {
    ko: '첫 접근 전략',
    hint: '어떻게 말 걸지. 첫 접촉 설계.',
    playbook:
      '흔한 인사 금지 · 상대 프로필에서 특이점 1개 집어 짧게 · 자기 소개 최소 · 답장 유도 질문 · 첫 24h 내 적정 간격 유지',
    stage: 'pre_match',
  },
  early_rule_out: {
    ko: '조기 배제',
    hint: '초기에 걸러낸다. 딜브레이커·허세·감정노동형.',
    playbook:
      '본인 딜브레이커 기준 재확인 · 2-3회 대화 내 가치관 프로브 1개 · 허세 vs 사실 구분 · 미련 없이 페이드',
    stage: 'pre_match',
  },

  // ── early_dating ──────────────────────────
  longterm_potential: {
    ko: '장기잠재력 평가',
    hint: '연인 → 이후까지 갈 사람인지. 가치관·라이프스타일 정합 체크.',
    playbook:
      '가족·돈·커리어·미래 관련 소재 자연스레 꺼내기 · 답변의 구체성 관찰 · 3-5회 만남 후 종합 · 설렘과 분리해서 판단',
    stage: 'early_dating',
  },
  redflag_scan: {
    ko: '레드플래그 스캔',
    hint: '가스라이팅·러브바밍·중독·통제 경향 조기 포착.',
    playbook:
      '감정 기복·경계 침범 관찰 · 본인 주변 지인 평 크로스체크 · "전 연인 다 이상했다" 서사 주의 · 느낌 이상하면 거리 두고 검증',
    stage: 'early_dating',
  },
  casual_enjoy: {
    ko: '가볍게 즐기기',
    hint: '진지 전환 없이 현재를 즐김. 서로 합의된 라이트 관계.',
    playbook:
      '기대치 명시 · 장기 플래닝 자제 · 상대도 같은 톤 확인 · 감정 기울면 즉시 대화 or 정리',
    stage: 'early_dating',
  },
  pattern_warning: {
    ko: '패턴 반복 경고',
    hint: '과거 연애와 유사한 상대·역학 반복 중. 브레이크 걸기.',
    playbook:
      '지난 관계들과 공통 분모 글로 적어보기 · 이번에 다른 행동 1개 강제 · 과몰입 트리거 인식 · 믿을 지인 1명에 체크',
    stage: 'early_dating',
  },

  // ── stable ────────────────────────────────
  conflict_resolve: {
    ko: '갈등 해소',
    hint: '반복되는 다툼·오해 구조 해체.',
    playbook:
      '감정 식힌 후 대화 · 책임 인정 · 구체 행동 변화 제시 · 같은 주제 3번 이상 반복이면 구조 문제로 메타 대화',
    stage: 'stable',
  },
  deepen: {
    ko: '깊이 쌓기',
    hint: '친밀도·신뢰 심화. 루틴화된 관계를 한 단계 더.',
    playbook:
      '취약성 공유 · 상대 세계(가족·친구) 진입 · 공동 프로젝트·경험 1개 · 일상의 짧은 관심 고강도 반복',
    stage: 'stable',
  },
  marriage_fit: {
    ko: '결혼 적합성',
    hint: '결혼까지 갈 상대인지 실사. 감정 아닌 구조 체크.',
    playbook:
      '돈관·가족관·육아관·성 관련 직설 대화 · 싸움 복구 속도 관찰 · 양가 만남 반응 · 감정 절정이 아닌 평상시 기준으로 판단',
    stage: 'stable',
  },

  // ── long_term ─────────────────────────────
  boredom_recovery: {
    ko: '권태 회복',
    hint: '루틴화된 안정기 끝에 온 무감각·무미건조 회복.',
    playbook:
      '루틴 파괴 이벤트 1개 · 각자 시간 확보 후 재결합 · 서로 최근 관심사 재학습 · 의무적 섹스/데이트 금지',
    stage: 'long_term',
  },
  lifeplan_fit: {
    ko: '라이프플랜 정합성',
    hint: '커리어·이사·출산·노후 등 장기 플랜 합의.',
    playbook:
      '5년 · 10년 뷰 각자 작성 · 충돌 포인트 명시 · 타협 가능 / 불가능 분리 · 1년 단위 재점검 약속',
    stage: 'long_term',
  },
  divorce_predict: {
    ko: '이혼 예측 / 준비',
    hint: '관계 붕괴 조기 진단, 필요 시 법·재정·감정 준비.',
    playbook:
      '4 Horsemen(비판·경멸·방어·담쌓기) 빈도 체크 · 상담 시도 여부 · 재정·주거 현실 파악 · 미련 vs 두려움 분리',
    stage: 'long_term',
  },

  // ── post_breakup ──────────────────────────
  self_diagnosis: {
    ko: '자기 진단',
    hint: '이별에서 나의 몫 정리. 피해자화 금지.',
    playbook:
      '상대 탓 목록 / 내 몫 목록 분리 작성 · 반복 행동 1-2개 명명 · 감정 일기 2주 · 상대 비난 SNS 금지',
    stage: 'post_breakup',
  },
  pattern_analysis: {
    ko: '패턴 분석',
    hint: '과거 관계 전체에서 반복된 구조 도출.',
    playbook:
      '최근 3-5건 연애 타임라인 작성 · 시작·절정·끝 공통점 체크 · 끌리는 타입 / 피해야 할 타입 재정의 · 코칭 or 상담 고려',
    stage: 'post_breakup',
  },
  recovery_strategy: {
    ko: '복구 전략',
    hint: '생활·사회·새 관계 단계적 재구축.',
    playbook:
      '3개월 연락 차단 · 일상 앵커 3개(운동·일·친구) 재가동 · 이성 접촉 재개 전 기준 재설정 · 복기 완료 후 다음 관계',
    stage: 'post_breakup',
  },
}

/** Stage → 허용 goals */
export const ALLOWED_GOALS_BY_STAGE: Record<StageKey, GoalKey[]> = {
  pre_match: ['pursuit_worth', 'first_approach', 'early_rule_out'],
  early_dating: [
    'longterm_potential',
    'redflag_scan',
    'casual_enjoy',
    'pattern_warning',
  ],
  stable: ['conflict_resolve', 'deepen', 'marriage_fit'],
  long_term: ['boredom_recovery', 'lifeplan_fit', 'divorce_predict'],
  post_breakup: ['self_diagnosis', 'pattern_analysis', 'recovery_strategy'],
}

export const GOAL_ORDER: GoalKey[] = [
  ...ALLOWED_GOALS_BY_STAGE.pre_match,
  ...ALLOWED_GOALS_BY_STAGE.early_dating,
  ...ALLOWED_GOALS_BY_STAGE.stable,
  ...ALLOWED_GOALS_BY_STAGE.long_term,
  ...ALLOWED_GOALS_BY_STAGE.post_breakup,
]

/** 임의 문자열이 현재 GoalKey 인지 판정 (legacy category 필터링용) */
export function isValidGoalKey(v: string | null | undefined): v is GoalKey {
  return !!v && (GOALS as Record<string, unknown>)[v] !== undefined
}

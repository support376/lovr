/**
 * 관계 stage 온톨로지 — 5종. Relationship.progress 값으로 저장.
 * 각 stage 가 어떤 goal 을 고를 수 있는지는 goals.ts ALLOWED_GOALS_BY_STAGE 참고.
 */

export type StageKey =
  | 'pre_match'
  | 'early_dating'
  | 'stable'
  | 'long_term'
  | 'post_breakup'

export const STAGES: Record<StageKey, { ko: string; hint: string }> = {
  pre_match: {
    ko: '탐색 중 / 미접촉',
    hint: '아직 매칭 안 됐거나, 관심 있지만 본격 접촉 전.',
  },
  early_dating: {
    ko: '초기 데이팅',
    hint: '썸 ~ 사귀는 초반. 상대 판별 + 방향 결정 국면.',
  },
  stable: {
    ko: '안정 관계',
    hint: '연인 관계 확정, 일상 루틴화. 갈등·심화·결혼 여부 판단.',
  },
  long_term: {
    ko: '장기 / 결혼',
    hint: '장기 동반·결혼. 권태·라이프플랜·이별 리스크 관리.',
  },
  post_breakup: {
    ko: '이별 후',
    hint: '끝난 직후 ~ 회복기. 패턴 복기·재구축.',
  },
}

export const STAGE_ORDER: StageKey[] = [
  'pre_match',
  'early_dating',
  'stable',
  'long_term',
  'post_breakup',
]

/** DB 의 legacy progress 값을 새 StageKey 로 안전하게 매핑 */
export const LEGACY_STAGE_MAP: Record<string, StageKey> = {
  // 구버전 1 (2024 draft)
  unknown: 'pre_match',
  observing: 'pre_match',
  approaching: 'pre_match',
  exploring: 'early_dating',
  exclusive: 'stable',
  committed: 'long_term',
  decayed: 'post_breakup',
  ended: 'post_breakup',
  // 구버전 2 (7-stage)
  first_contact: 'pre_match',
  sseom: 'early_dating',
  dating_early: 'early_dating',
  dating_stable: 'stable',
  conflict: 'stable',
  reconnection: 'post_breakup',
}

/** 임의 문자열을 StageKey 로 정규화 (항상 유효한 StageKey 반환) */
export function normalizeStage(value: string | null | undefined): StageKey {
  if (!value) return 'pre_match'
  if ((STAGES as Record<string, unknown>)[value]) return value as StageKey
  return LEGACY_STAGE_MAP[value] ?? 'pre_match'
}

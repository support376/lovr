/**
 * 관계 stage 온톨로지 — 7종.
 * LuvOS Relationship.progress 값으로 저장.
 */

export type StageKey =
  | 'pre_match'
  | 'first_contact'
  | 'sseom'
  | 'dating_early'
  | 'dating_stable'
  | 'conflict'
  | 'reconnection'

export const STAGES: Record<StageKey, { ko: string; hint: string }> = {
  pre_match: {
    ko: '프리매치',
    hint: '아직 매칭 안 됨. 프로필만 보고 있음.',
  },
  first_contact: {
    ko: '첫 연락',
    hint: '첫 메시지 ~ 첫 만남 전.',
  },
  sseom: {
    ko: '썸',
    hint: '만났고 관심은 있지만 미정.',
  },
  dating_early: {
    ko: '연애 초반',
    hint: '사귀는 초반 1~3개월.',
  },
  dating_stable: {
    ko: '안정기',
    hint: '서로 편하고 일상 루틴화.',
  },
  conflict: {
    ko: '갈등 중',
    hint: '싸움 있음, 회복 필요.',
  },
  reconnection: {
    ko: '재연결',
    hint: '전 연인 재시도 / 식은 관계 되살리기.',
  },
}

export const STAGE_ORDER: StageKey[] = [
  'pre_match',
  'first_contact',
  'sseom',
  'dating_early',
  'dating_stable',
  'conflict',
  'reconnection',
]

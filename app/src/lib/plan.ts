'use client'

/**
 * Paywall 상태 — 로컬스토리지 기반 CTA-only.
 *
 * 진짜 PG 연결 전까지 "이 액션은 유료" 게이트를 유저가 볼 수 있게 하기 위함.
 * "업그레이드" 누르면 즉시 plan='paid' 로 전환 (서버 검증 없음).
 * PG 붙이면 이 파일을 server-side plan 조회로 교체.
 */

import { useSyncExternalStore } from 'react'

export type Plan = 'free' | 'paid'

const KEY = 'luvos_plan'
const EVENT = 'luvos_plan_change'

// SSR safe default
const getServerSnapshot = (): Plan => 'free'

function subscribe(cb: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

function getSnapshot(): Plan {
  if (typeof window === 'undefined') return 'free'
  const v = localStorage.getItem(KEY)
  return v === 'paid' ? 'paid' : 'free'
}

export function getPlan(): Plan {
  return getSnapshot()
}

export function setPlan(p: Plan) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, p)
  window.dispatchEvent(new Event(EVENT))
}

/**
 * 훅 — 컴포넌트에서 현 플랜 구독.
 */
export function usePlan(): Plan {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * 각 게이트별 feature 키. CTA 문구·이유를 한 곳에서 관리.
 */
export type GateFeature =
  | 'multi_partner' // 2번째 이상 상대 등록
  | 'unlimited_extract' // 모델 재추출 무제한
  | 'unlimited_chat' // AI 채팅 무제한
  | 'unlimited_archive' // 대화 아카이브 무제한
  | 'deep_compat' // 심화 케미 분석
  | 'weekly_report' // 주간 리포트
  | 'simulation' // 시뮬레이션

export const FEATURE_META: Record<
  GateFeature,
  { title: string; rationale: string; icon?: string }
> = {
  multi_partner: {
    title: '2명 이상 상대 관리',
    rationale: '유료 플랜으로 여러 관계를 동시에 추적할 수 있어.',
  },
  unlimited_extract: {
    title: '모델 재추출 무제한',
    rationale: '무료는 월 1회. 유료는 언제든 재분석.',
  },
  unlimited_chat: {
    title: 'AI 채팅 무제한',
    rationale: '무료는 일 5회. 유료는 무제한.',
  },
  unlimited_archive: {
    title: '대화 아카이브 무제한',
    rationale: '무료는 3개까지. 유료는 무제한 저장.',
  },
  deep_compat: {
    title: '심화 케미 분석',
    rationale: '잘·안 맞는 점 상세 풀이 · 주간 변화 추적.',
  },
  weekly_report: {
    title: '주간 리포트',
    rationale: '매주 관계 변화 요약 · 패턴 경고.',
  },
  simulation: {
    title: '반응 시뮬레이션',
    rationale: '"이 말을 하면 상대가 어떻게 반응할까?" — 모델 기반 예측.',
  },
}

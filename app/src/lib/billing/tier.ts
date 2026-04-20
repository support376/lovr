/**
 * Tier gating — Phase B 에서 실제 결제 연동 전 임시 플래그.
 * 지금은 모두 Free 고정. Deep-tier 피처 입구만 gated 로 노출.
 */

export type Tier = 'free' | 'essential' | 'deep'

export function getCurrentTier(): Tier {
  // TODO(phase-B): 유저 세션/결제 상태에서 조회
  return 'free'
}

export function canAccessMultiTargetReport(tier: Tier): boolean {
  return tier === 'deep'
}

export function canAccessSelfDiagnostic(tier: Tier): boolean {
  return tier === 'deep'
}

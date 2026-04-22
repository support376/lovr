import { redirect } from 'next/navigation'
import { getSelf } from '@/lib/actions/self'
import {
  ensureDefaultRelationship,
  getCurrentRelationship,
} from '@/lib/actions/relationships'

/**
 * 분석 탭 루트 — 현재 상대의 모델 화면으로 자동 이동.
 * self 있는데 relationship 없으면 자동 복구.
 */
export default async function AnalysisIndex() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  let cur = await getCurrentRelationship()
  if (!cur) {
    await ensureDefaultRelationship()
    cur = await getCurrentRelationship()
  }
  if (cur) redirect(`/r/${cur.id}`)
  // cur 끝까지 null 이면 (이례적) 홈으로 — 홈에서 재복구 시도
  redirect('/')
}

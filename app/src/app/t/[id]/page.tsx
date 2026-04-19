import { redirect } from 'next/navigation'

export default function LegacyTargetDetail() {
  // 구 Target.id ≠ 신 Relationship.id. 매핑 불가 — 관계 목록으로.
  redirect('/r')
}

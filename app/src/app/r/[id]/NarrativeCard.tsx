import type { Actor, Goal, Relationship } from '@/lib/db/schema'
import { GOALS, STAGES, normalizeStage, type GoalKey } from '@/lib/ontology'

type Props = {
  rel: Relationship & { partner: Actor }
  primaryGoal: Goal | null
}

/**
 * 관계 상태 서술 카드.
 *   "[상대]와 [날짜]부터 N일째.
 *    현재 [stage.ko] — [stage.hint].
 *    목표 [goal.ko] — 전략: [goal.playbook]."
 *
 * 정보 부족 시 라인 생략.
 */
export function NarrativeCard({ rel, primaryGoal }: Props) {
  const stage = STAGES[normalizeStage(rel.progress)]
  const partner = rel.partner.displayName
  const firstMetTs = rel.timelineStart
    ? rel.timelineStart instanceof Date
      ? rel.timelineStart.getTime()
      : Number(rel.timelineStart)
    : null

  const daysSinceFirstMet = firstMetTs
    ? Math.max(0, Math.floor((Date.now() - firstMetTs) / 86400000))
    : null
  const firstMetKo = firstMetTs
    ? new Date(firstMetTs).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : null

  const openingLine = firstMetKo
    ? `${partner}와 ${firstMetKo} 첫 만남. ${daysSinceFirstMet}일째 ${stage.ko} 단계.`
    : `${partner} · 지금 ${stage.ko} 단계.`

  const stageLine = stage.hint

  const goal =
    primaryGoal && primaryGoal.category in GOALS
      ? GOALS[primaryGoal.category as GoalKey]
      : null

  const goalLine = goal
    ? `목표: ${goal.ko}. 전략: ${goal.playbook}`
    : `목표가 아직 없음 — 위 배지에서 선택.`

  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-4 flex flex-col gap-2.5 leading-relaxed">
      <div className="text-[13px]">
        <span className="text-[11px] text-muted uppercase tracking-wider mr-1.5">
          지금
        </span>
        {openingLine}
      </div>
      <div className="text-xs text-muted">{stageLine}</div>
      <div className="pt-2 border-t border-border text-[13px]">
        <span
          className={`text-[11px] uppercase tracking-wider mr-1.5 ${
            goal ? 'text-accent' : 'text-muted'
          }`}
        >
          전략
        </span>
        {goalLine}
      </div>
    </div>
  )
}

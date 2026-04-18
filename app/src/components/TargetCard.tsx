import Link from 'next/link'
import type { Target } from '@/lib/db/schema'
import { Card, Pill, STAGE_LABEL, STAGE_TONE, GOAL_LABEL } from './ui'

export function TargetCard({ target }: { target: Target }) {
  const stats = target.stats ?? {
    messageCount: 0,
    myMessageCount: 0,
    theirMessageCount: 0,
    totalChars: 0,
    lastInteractionAt: null,
  }
  const goal = target.goal ?? { preset: 'explore', description: '일단 탐색' }
  const last = stats.lastInteractionAt
  const lastStr = last ? relativeTime(last) : '기록 없음'

  return (
    <Link href={`/t/${target.id}`}>
      <Card className="hover:border-accent/60 transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-2xl shrink-0">
            {target.avatarEmoji ?? '💭'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-semibold truncate">{target.alias}</div>
              <Pill tone={STAGE_TONE[target.stage] ?? 'neutral'}>
                {STAGE_LABEL[target.stage] ?? target.stage}
              </Pill>
            </div>
            <div className="mt-1 text-xs text-muted truncate">
              목표: {goal.description || GOAL_LABEL[goal.preset] || '탐색'}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted">
              <span>💬 {stats.messageCount}</span>
              <span>·</span>
              <span>{lastStr}</span>
            </div>
          </div>
        </div>

        {target.profile?.summary && (
          <div className="mt-3 text-xs text-muted line-clamp-2 leading-relaxed">
            {target.profile.summary}
          </div>
        )}
      </Card>
    </Link>
  )
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  return `${d}일 전`
}

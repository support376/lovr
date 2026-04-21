import type { Outcome } from '@/lib/db/schema'
import { Card } from '@/components/ui'

type Props = {
  outcomes: Outcome[]
}

/**
 * 먹힘 / 안 먹힘 2-컬럼 축약 리포트.
 *   advanced → 먹힘
 *   regressed → 안 먹힘
 *   stagnant / unclear → 기타 (하단 접힘)
 */
export function OutcomeHistory({ outcomes }: Props) {
  if (outcomes.length === 0) return null

  const worked = outcomes.filter((o) => o.goalProgress === 'advanced')
  const flopped = outcomes.filter((o) => o.goalProgress === 'regressed')
  const neutral = outcomes.filter(
    (o) => o.goalProgress !== 'advanced' && o.goalProgress !== 'regressed'
  )

  return (
    <section>
      <div className="text-xs text-muted uppercase tracking-wider mb-2">
        결과 이력 ({outcomes.length})
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Column
          tone="good"
          label="먹힘"
          count={worked.length}
          outcomes={worked}
        />
        <Column
          tone="bad"
          label="안 먹힘"
          count={flopped.length}
          outcomes={flopped}
        />
      </div>

      {neutral.length > 0 && (
        <details className="mt-2 group">
          <summary className="cursor-pointer text-[11px] text-muted flex items-center gap-1 hover:text-accent">
            <span className="group-open:rotate-90 transition-transform">▸</span>
            정체·불명 {neutral.length}개
          </summary>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {neutral.slice(0, 5).map((o) => (
              <MiniRow key={o.id} o={o} tone="neutral" />
            ))}
          </div>
        </details>
      )}
    </section>
  )
}

function Column({
  tone,
  label,
  count,
  outcomes,
}: {
  tone: 'good' | 'bad'
  label: string
  count: number
  outcomes: Outcome[]
}) {
  const cls =
    tone === 'good'
      ? 'border-good/40 bg-good/5'
      : 'border-bad/40 bg-bad/5'
  const dotCls = tone === 'good' ? 'text-good' : 'text-bad'

  return (
    <Card className={`!py-2.5 ${cls}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`text-xs font-bold ${dotCls}`}>{label}</span>
        <span className="text-[10px] text-muted">({count})</span>
      </div>
      {count === 0 ? (
        <div className="text-[10px] text-muted">없음</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {outcomes.slice(0, 3).map((o) => (
            <MiniRow key={o.id} o={o} tone={tone} />
          ))}
          {count > 3 && (
            <div className="text-[10px] text-muted">+{count - 3}개 더</div>
          )}
        </div>
      )}
    </Card>
  )
}

function MiniRow({ o, tone }: { o: Outcome; tone: 'good' | 'bad' | 'neutral' }) {
  const date = new Date(
    o.createdAt instanceof Date ? o.createdAt : Number(o.createdAt)
  ).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
  const color =
    tone === 'good'
      ? 'text-good'
      : tone === 'bad'
      ? 'text-bad'
      : 'text-muted'
  // narrative 앞 1-2 줄 발췌
  const snippet = (o.narrative ?? '')
    .replace(/^\*\*[^*]+\*\*\s*/g, '')
    .replace(/---/g, ' · ')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 80)
  return (
    <div className="text-[11px] leading-snug">
      <span className={`text-[9px] font-mono ${color} mr-1`}>{date}</span>
      <span className="text-text/80">{snippet}{snippet.length >= 80 ? '…' : ''}</span>
    </div>
  )
}

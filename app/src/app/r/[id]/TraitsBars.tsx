import type { InferredTrait } from '@/lib/db/schema'
import { Card } from '@/components/ui'

type Props = {
  traits: InferredTrait[]
  title: string
  tone?: 'accent' | 'accent-2'
}

/**
 * Trait 시각화 — axis/score 있는 trait 은 수평 바, 나머지는 bullet.
 */
export function TraitsBars({ traits, title, tone = 'accent' }: Props) {
  const scored = traits.filter(
    (t) => typeof t.axis === 'string' && typeof t.score === 'number'
  )
  const narrative = traits.filter(
    (t) => !(typeof t.axis === 'string' && typeof t.score === 'number')
  )

  const borderClass = tone === 'accent' ? 'border-accent/30' : 'border-accent-2/30'
  const bgClass = tone === 'accent' ? 'bg-accent/5' : 'bg-accent-2/5'
  const headerClass = tone === 'accent' ? 'text-accent' : 'text-accent-2'
  const barClass = tone === 'accent' ? 'bg-accent' : 'bg-accent-2'

  if (traits.length === 0) {
    return (
      <Card className={`${borderClass} ${bgClass}`}>
        <div className={`text-xs font-semibold mb-2 ${headerClass}`}>{title}</div>
        <div className="text-[11px] text-muted leading-relaxed">
          아직 관찰 없음. 기록 쌓고 재분석 눌러.
        </div>
      </Card>
    )
  }

  // 그룹별 묶기 (axis 그룹: personality / attachment / communication / 기타)
  const groups = new Map<string, InferredTrait[]>()
  for (const t of scored) {
    const g = t.group || '기타'
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(t)
  }
  const groupOrder = ['personality', 'attachment', 'communication', '기타']
  const sortedGroups = Array.from(groups.keys()).sort(
    (a, b) => groupOrder.indexOf(a) - groupOrder.indexOf(b)
  )
  const GROUP_LABEL: Record<string, string> = {
    personality: '성격',
    attachment: '애착',
    communication: '소통',
    기타: '기타',
  }

  return (
    <Card className={`${borderClass} ${bgClass}`}>
      <div className={`text-xs font-semibold mb-3 ${headerClass}`}>{title}</div>

      {/* 축 점수 바 */}
      {scored.length > 0 && (
        <div className="flex flex-col gap-3 mb-3">
          {sortedGroups.map((g) => (
            <div key={g} className="flex flex-col gap-1.5">
              <div className="text-[10px] text-muted uppercase tracking-wider">
                {GROUP_LABEL[g] ?? g}
              </div>
              {groups.get(g)!.map((t, i) => {
                const pct = Math.max(0, Math.min(100, t.score ?? 0))
                return (
                  <div key={`${g}-${i}`} className="flex flex-col gap-0.5">
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span className="font-medium">{t.axis}</span>
                      <span className="text-muted font-mono">{pct}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className={barClass}
                        style={{ width: `${pct}%`, height: '100%' }}
                      />
                    </div>
                    {t.observation && (
                      <div className="text-[10px] text-muted leading-relaxed mt-0.5">
                        {t.observation}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* narrative 관찰 (bullet) */}
      {narrative.length > 0 && (
        <div className={`${scored.length > 0 ? 'border-t border-border pt-2.5' : ''}`}>
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1.5">
            자유 관찰
          </div>
          <ul className="flex flex-col gap-1">
            {narrative.map((t, i) => (
              <li key={i} className="text-xs leading-relaxed">
                • {t.observation}
                <span className="text-muted ml-1">({t.confidenceNarrative})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

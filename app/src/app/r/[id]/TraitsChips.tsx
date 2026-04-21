import type { InferredTrait } from '@/lib/db/schema'
import { Card } from '@/components/ui'

/**
 * 관계 분석 헤드라인 — 나 vs 상대를 **짧은 태그 칩** 으로 한 눈에.
 *   나: 주도적 · 관대 · 논리적
 *   상대: 회피형 · 보수 · 단답
 *
 * 각 trait 에 axis 있으면 axis 사용, 없으면 observation 에서 키워드 2-3 단어 추출.
 */
export function TraitsChips({
  selfName,
  partnerName,
  selfTraits,
  partnerTraits,
}: {
  selfName: string
  partnerName: string
  selfTraits: InferredTrait[]
  partnerTraits: InferredTrait[]
}) {
  const selfChips = toChips(selfTraits)
  const partnerChips = toChips(partnerTraits)

  if (selfChips.length === 0 && partnerChips.length === 0) {
    return null
  }

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <Row label={`나 · ${selfName}`} chips={selfChips} tone="accent-2" />
        <Row
          label={`상대 · ${partnerName}`}
          chips={partnerChips}
          tone="accent"
        />
      </div>
    </Card>
  )
}

function Row({
  label,
  chips,
  tone,
}: {
  label: string
  chips: Array<{ word: string; intensity: number }>
  tone: 'accent' | 'accent-2'
}) {
  const bg = tone === 'accent' ? 'bg-accent/10' : 'bg-accent-2/10'
  const color = tone === 'accent' ? 'text-accent' : 'text-accent-2'
  const border = tone === 'accent' ? 'border-accent/30' : 'border-accent-2/30'

  if (chips.length === 0) {
    return (
      <div>
        <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
          {label}
        </div>
        <div className="text-[11px] text-muted">(아직 관찰 없음)</div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-[10px] text-muted uppercase tracking-wider mb-1.5">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${bg} ${color} ${border}`}
            style={{
              opacity: 0.55 + Math.min(0.45, (c.intensity ?? 0) / 100 * 0.45),
            }}
          >
            {c.word}
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------
// 키워드 추출
// ---------------------------------------------------------

function toChips(
  traits: InferredTrait[]
): Array<{ word: string; intensity: number }> {
  const chips: Array<{ word: string; intensity: number }> = []
  const seen = new Set<string>()

  for (const t of traits) {
    // 1) axis 가 있으면 그대로 사용 (score 비례 강도)
    if (typeof t.axis === 'string' && t.axis.trim()) {
      const word = t.axis.trim()
      if (!seen.has(word)) {
        seen.add(word)
        chips.push({ word, intensity: t.score ?? 50 })
      }
      continue
    }

    // 2) axis 없음 → observation 에서 짧은 키워드 추출
    const kws = extractKeywords(t.observation)
    for (const kw of kws) {
      if (!seen.has(kw)) {
        seen.add(kw)
        chips.push({ word: kw, intensity: 50 })
      }
    }
  }

  return chips.slice(0, 8)
}

function extractKeywords(s: string): string[] {
  if (!s) return []
  // "— 구체 예" 앞쪽 첫 구절만. 한/영 10글자 이하 토큰으로.
  const head = s.split(/[—\-:·()\n]/)[0].trim()
  const tokens = head
    .split(/[\s,·\/+|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 12)
  // 불용어 제거
  const STOP = new Set([
    '경향',
    '있음',
    '없음',
    '할',
    '되는',
    '같음',
    '것',
    '하는',
    '적',
    '형',
  ])
  return tokens.filter((t) => !STOP.has(t)).slice(0, 3)
}

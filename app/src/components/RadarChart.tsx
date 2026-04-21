import { AXES, type Axis } from '@/lib/db/schema'

const AXIS_LABEL: Record<Axis, string> = {
  proximity_push: '접근',
  proximity_pull: '거리두기',
  emotion_open: '감정 공개',
  emotion_hide: '감정 숨김',
  commit_push: '관계 격상',
  commit_hold: '현상 유지',
  conflict_press: '갈등 표출',
  conflict_soothe: '갈등 완화',
}

/**
 * 8축 레이더 · 의존성 0 SVG.
 * 입력 scores: Record<Axis, 0~100>.
 * 12시 방향 proximity_push 부터 시계방향 AXES 순서.
 */
export function RadarChart({
  scores,
  size = 260,
  tone = 'accent',
}: {
  scores: Record<Axis, number>
  size?: number
  tone?: 'accent' | 'accent-2'
}) {
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 40 // 라벨 여유

  const axisCount = AXES.length // 8
  const angleOf = (i: number) => -Math.PI / 2 + (i / axisCount) * Math.PI * 2

  const point = (i: number, value: number) => {
    const r = (radius * Math.max(0, Math.min(100, value))) / 100
    const a = angleOf(i)
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const
  }

  const axisEnd = (i: number) => point(i, 100)
  const labelPos = (i: number) => {
    const r = radius + 20
    const a = angleOf(i)
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const
  }

  // 5단 동심 팔각형
  const gridPolys = [20, 40, 60, 80, 100].map((level) =>
    AXES.map((_, i) => {
      const [x, y] = point(i, level)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  )

  // 점수 polygon
  const scorePath = AXES.map((ax, i) => {
    const [x, y] = point(i, scores[ax] ?? 0)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const fillColor =
    tone === 'accent'
      ? 'var(--color-accent, #b14dff)'
      : 'var(--color-accent-2, #ff4d7d)'

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[300px] mx-auto select-none"
      role="img"
      aria-label="8축 성향 레이더"
    >
      {gridPolys.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={1}
          className="text-muted"
        />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = axisEnd(i)
        return (
          <line
            key={`ax-${i}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth={1}
            className="text-muted"
          />
        )
      })}
      <polygon
        points={scorePath}
        fill={fillColor}
        fillOpacity={0.25}
        stroke={fillColor}
        strokeWidth={1.5}
      />
      {AXES.map((ax, i) => {
        const [x, y] = point(i, scores[ax] ?? 0)
        return <circle key={`pt-${i}`} cx={x} cy={y} r={2.5} fill={fillColor} />
      })}
      {AXES.map((ax, i) => {
        const [x, y] = labelPos(i)
        const a = angleOf(i)
        const cos = Math.cos(a)
        const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end'
        const label = AXIS_LABEL[ax]
        const value = scores[ax] ?? 0
        return (
          <g key={`lb-${i}`} textAnchor={anchor}>
            <text
              x={x}
              y={y}
              dominantBaseline="middle"
              className="fill-muted"
              fontSize={11}
            >
              {label}
            </text>
            <text
              x={x}
              y={y + 12}
              dominantBaseline="middle"
              className="fill-text/60"
              fontSize={10}
              fontWeight={600}
            >
              {value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

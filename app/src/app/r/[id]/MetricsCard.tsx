import type { Event } from '@/lib/db/schema'
import { Card } from '@/components/ui'

type Props = {
  events: Event[]
  partnerName: string
}

function tsOf(e: Event): number {
  return e.timestamp instanceof Date ? e.timestamp.getTime() : Number(e.timestamp)
}

function fmtDuration(ms: number): string {
  if (!isFinite(ms) || ms < 0) return '-'
  const min = ms / 60000
  if (min < 1) return '1분 이내'
  if (min < 60) return `${Math.round(min)}분`
  const hr = min / 60
  if (hr < 24) return `${hr.toFixed(1)}시간`
  const day = hr / 24
  return `${day.toFixed(1)}일`
}

/**
 * 관계 메트릭스 — 대화 주도율 · 평균 응답 시간 · 기록 건수.
 * sender 가 채워진 message/call event 만 대상.
 */
export function MetricsCard({ events, partnerName }: Props) {
  const messageEvents = events.filter(
    (e) => (e.type === 'message' || e.type === 'call') && (e.sender === 'me' || e.sender === 'partner')
  )
  const totalMsg = messageEvents.length
  const mine = messageEvents.filter((e) => e.sender === 'me').length
  const theirs = messageEvents.filter((e) => e.sender === 'partner').length
  const initiationRate = totalMsg > 0 ? Math.round((mine / totalMsg) * 100) : null

  // 응답 시간 — 오래된→최근 순으로 본 뒤 sender switch 시 diff 모음
  const sorted = [...messageEvents].sort((a, b) => tsOf(a) - tsOf(b))
  const myReplyGaps: number[] = []
  const theirReplyGaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const cur = sorted[i]
    if (prev.sender === cur.sender) continue
    const gap = tsOf(cur) - tsOf(prev)
    if (gap <= 0) continue
    if (cur.sender === 'me') myReplyGaps.push(gap)
    else theirReplyGaps.push(gap)
  }
  const avgMine =
    myReplyGaps.length > 0
      ? myReplyGaps.reduce((s, n) => s + n, 0) / myReplyGaps.length
      : null
  const avgTheirs =
    theirReplyGaps.length > 0
      ? theirReplyGaps.reduce((s, n) => s + n, 0) / theirReplyGaps.length
      : null

  // 최근 7일 건수
  const weekCutoff = Date.now() - 7 * 86400000
  const recent7 = events.filter((e) => tsOf(e) >= weekCutoff).length

  if (messageEvents.length === 0) {
    return (
      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-1">
          대화 메트릭스
        </div>
        <div className="text-[11px] text-muted leading-relaxed">
          아직 계산할 데이터 없음. 기록 탭에서 카톡·통화를 추가할 때 <span className="text-accent-2">나</span> /
          <span className="text-accent"> 상대</span> 발신을 지정하면 자동 집계.
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="text-xs text-muted uppercase tracking-wider mb-3">
        대화 메트릭스 ({totalMsg}건)
      </div>

      {/* 주도율 바 */}
      {initiationRate !== null && (
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[11px] text-muted">대화 주도율</span>
            <span className="text-sm font-mono">
              <span className="text-accent-2 font-semibold">나 {initiationRate}%</span>
              <span className="text-muted"> · {partnerName} {100 - initiationRate}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden flex">
            <div
              className="bg-accent-2"
              style={{ width: `${initiationRate}%` }}
            />
            <div
              className="bg-accent"
              style={{ width: `${100 - initiationRate}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-muted">
            나 발신 {mine}건 · 상대 발신 {theirs}건
          </div>
        </div>
      )}

      {/* 응답 시간 */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="rounded-lg bg-surface-2 p-2.5">
          <div className="text-[10px] text-muted uppercase tracking-wider">내 평균 응답</div>
          <div className="text-lg font-bold mt-0.5">
            {avgMine !== null ? fmtDuration(avgMine) : '-'}
          </div>
          <div className="text-[10px] text-muted">{myReplyGaps.length}회 기준</div>
        </div>
        <div className="rounded-lg bg-surface-2 p-2.5">
          <div className="text-[10px] text-muted uppercase tracking-wider">
            {partnerName} 평균 응답
          </div>
          <div className="text-lg font-bold mt-0.5">
            {avgTheirs !== null ? fmtDuration(avgTheirs) : '-'}
          </div>
          <div className="text-[10px] text-muted">{theirReplyGaps.length}회 기준</div>
        </div>
      </div>

      <div className="text-[10px] text-muted">
        · 최근 7일 기록 {recent7}건
      </div>
    </Card>
  )
}

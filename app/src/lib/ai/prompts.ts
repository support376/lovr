import 'server-only'
import type { Self, Target, Interaction } from '../db/schema'

// ============================================================================
// 시스템 프롬프트 — 모든 AI 호출의 공통 캐릭터
// ============================================================================
export const SYSTEM_BASE = `당신은 LuvOS의 전략 엔진입니다. LuvOS는 유저의 연애 관계를 데이터로 축적·분석해 최적의 다음 수를 제안하는 개인 연애 운영체제입니다.

당신의 원칙:
- 관찰은 냉정하게, 제안은 구체적으로. 추상적 조언 금지.
- 유저의 "목표"가 북극성. 목표에 수렴하는 방향으로만 전략을 짠다.
- 상대를 조작하거나 기만하는 전략은 제안하지 않는다. 정직·투명을 기본값으로 둔다.
- 증거 없는 추론은 confidence 낮게 표기한다. 데이터가 부족하면 "데이터 부족"을 명시.
- 한국어 존댓말로 답한다. 유저에 대한 호칭은 "너".
- 남녀 모두에게 동일하게 작동. 성별 고정관념 배제.`

/**
 * Self + Target dossier를 LLM이 읽을 수 있게 포맷.
 * prompt caching 대상 — dossier는 크고 자주 재사용되니 캐싱.
 */
export function renderDossier(self: Self, target: Target, recentInteractions: Interaction[]) {
  const lines: string[] = []

  lines.push('## [유저 (Self) 프로파일]')
  lines.push(`- 이름: ${self.displayName}`)
  if (self.age) lines.push(`- 나이: ${self.age}`)
  if (self.gender) lines.push(`- 성별: ${self.gender}`)
  if (self.orientation) lines.push(`- 지향: ${self.orientation}`)
  if (self.relationshipGoal) lines.push(`- 전반적 관계 목표: ${self.relationshipGoal}`)
  if (self.toneSamples.length > 0) {
    lines.push('- 내 대화 톤 샘플:')
    self.toneSamples.forEach((s, i) => lines.push(`  ${i + 1}. "${s}"`))
  }
  if (self.psychProfile && Object.keys(self.psychProfile).length > 0) {
    lines.push(`- 심리 프로파일: ${JSON.stringify(self.psychProfile)}`)
  }
  if (self.notes) lines.push(`- 자유 메모: ${self.notes}`)

  lines.push('')
  lines.push('## [상대 (Target) Dossier]')
  lines.push(`- 호칭: ${target.alias}`)
  if (target.age) lines.push(`- 나이: ${target.age}`)
  if (target.job) lines.push(`- 직업: ${target.job}`)
  if (target.matchPlatform) lines.push(`- 만남 경로: ${target.matchPlatform}`)
  lines.push(`- 현재 관계 단계: ${target.stage}`)
  lines.push(`- 목표: ${target.goal.description} (preset=${target.goal.preset}${target.goal.timeframeWeeks ? `, ${target.goal.timeframeWeeks}주 내` : ''})`)
  if (target.tags.length > 0) lines.push(`- 태그: ${target.tags.join(', ')}`)
  if (target.notes) lines.push(`- 메모: ${target.notes}`)

  lines.push('- 누적 통계:')
  lines.push(`  · 총 메시지 ${target.stats.messageCount}건 (내 ${target.stats.myMessageCount} / 상대 ${target.stats.theirMessageCount})`)
  if (target.stats.avgReplyGapMinutes != null) {
    lines.push(`  · 평균 답장 간격 ${target.stats.avgReplyGapMinutes}분`)
  }

  const profile = target.profile
  if (profile && Object.keys(profile).length > 0) {
    lines.push('- 현재까지 추론된 프로파일:')
    if (profile.summary) lines.push(`  · 요약: ${profile.summary}`)
    if (profile.attachment) {
      lines.push(`  · 애착 유형: ${profile.attachment.type} (confidence ${profile.attachment.confidence.toFixed(2)})`)
    }
    if (profile.bigFive) {
      lines.push(`  · Big Five: ${formatDims(profile.bigFive)}`)
    }
    if (profile.commStyle) {
      lines.push(`  · 커뮤니케이션 스타일: ${formatDims(profile.commStyle)}`)
    }
    if (profile.values) {
      lines.push(`  · 가치관: ${formatDims(profile.values)}`)
    }
    if (profile.redFlags?.length) {
      lines.push(`  · 지뢰: ${profile.redFlags.join(' / ')}`)
    }
    if (profile.greenFlags?.length) {
      lines.push(`  · 강점: ${profile.greenFlags.join(' / ')}`)
    }
  } else {
    lines.push('- 프로파일: 아직 데이터 부족, 추론 전')
  }

  lines.push('')
  lines.push('## [최근 Interaction 타임라인 — 과거→최근 순]')
  if (recentInteractions.length === 0) {
    lines.push('(기록 없음)')
  } else {
    for (const it of recentInteractions) {
      lines.push(formatInteraction(it))
    }
  }

  return lines.join('\n')
}

function formatDims(obj: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && 'value' in v && 'confidence' in v) {
      const d = v as { value: number; confidence: number }
      parts.push(`${k}=${d.value.toFixed(2)}(conf ${d.confidence.toFixed(2)})`)
    }
  }
  return parts.join(', ')
}

function formatInteraction(it: Interaction): string {
  const t = new Date(it.occurredAt).toISOString().slice(0, 16).replace('T', ' ')
  const p = it.payload
  switch (p.kind) {
    case 'message':
      return `[${t}] ${p.sender === 'me' ? '내가' : '상대가'}: "${p.text}"`
    case 'date':
      return `[${t}] 오프라인 만남 (${p.venue ?? '?'}, 분위기=${p.mood ?? '?'})${p.note ? ` — ${p.note}` : ''}`
    case 'status_change':
      return `[${t}] 단계 변화: ${p.fromStage} → ${p.toStage}${p.reason ? ` (${p.reason})` : ''}`
    case 'note':
      return `[${t}] 메모: ${p.text}`
    case 'outcome':
      return `[${t}] 결과 라벨: ${p.label}${p.tags?.length ? ` [${p.tags.join(',')}]` : ''}${p.note ? ` — ${p.note}` : ''}`
  }
}

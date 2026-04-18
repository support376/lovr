import 'server-only'
import type { Self, Target, Interaction } from '../db/schema'

// ============================================================================
// 시스템 프롬프트
// ============================================================================
export const SYSTEM_BASE = `당신은 LuvOS의 전략 엔진입니다. LuvOS는 유저의 연애 관계를 데이터로 축적·분석해 최적의 다음 수를 제안하는 개인 연애 운영체제입니다.

당신의 원칙:
- 관찰은 냉정하게, 제안은 구체적으로. 추상적 조언 금지.
- 유저의 "목표"가 북극성. 목표에 수렴하는 방향으로만 전략을 짠다.
- "현재 진행 상황"(currentSituation)은 가장 중요한 출발점. 이걸 무시하고 원칙론 펴지 말 것.
- 유저가 선언한 강점/약점/딜브레이커를 존중. 무시하거나 반박 금지.
- 상대를 조작하거나 기만하는 전략은 제안하지 않는다. 정직·투명을 기본값으로 둔다.
- 증거 없는 추론은 confidence 낮게 표기한다. 데이터가 부족하면 "데이터 부족"을 명시.
- 한국어 존댓말로 답한다. 유저에 대한 호칭은 "너".
- 남녀 모두에게 동일하게 작동. 성별 고정관념 배제.`

export function renderDossier(self: Self, target: Target, recentInteractions: Interaction[]) {
  const lines: string[] = []

  const strengths = self.strengths ?? []
  const weaknesses = self.weaknesses ?? []
  const dealBreakers = self.dealBreakers ?? []
  const toneSamples = self.toneSamples ?? []

  // ========== Self ==========
  lines.push('## [유저 (Self) 프로파일]')
  lines.push(`- 이름: ${self.displayName}`)
  if (self.age) lines.push(`- 나이: ${self.age}`)
  if (self.gender) lines.push(`- 성별: ${self.gender}`)
  if (self.orientation) lines.push(`- 지향: ${self.orientation}`)
  if (self.mbti) lines.push(`- MBTI: ${self.mbti}`)
  if (self.experienceLevel) lines.push(`- 연애 경험: ${self.experienceLevel}`)
  if (self.relationshipGoal) lines.push(`- 전반적 관계 목표: ${self.relationshipGoal}`)

  if (strengths.length > 0)
    lines.push(`- 자가 선언 강점: ${strengths.join(' / ')}`)
  if (weaknesses.length > 0)
    lines.push(`- 자가 선언 약점: ${weaknesses.join(' / ')}`)
  if (dealBreakers.length > 0)
    lines.push(`- 딜 브레이커: ${dealBreakers.join(' / ')}`)
  if (self.idealType) lines.push(`- 이상형: ${self.idealType}`)
  if (self.personalityNotes) lines.push(`- 성격: ${self.personalityNotes}`)
  if (self.valuesNotes) lines.push(`- 가치관: ${self.valuesNotes}`)
  if (self.notes) lines.push(`- 기타 메모: ${self.notes}`)

  if (toneSamples.length > 0) {
    lines.push('- 과거 톤 샘플(legacy):')
    toneSamples.forEach((s, i) => lines.push(`  ${i + 1}. "${s}"`))
  }
  if (self.psychProfile && Object.keys(self.psychProfile).length > 0) {
    lines.push(`- AI가 추론한 심리 프로파일: ${JSON.stringify(self.psychProfile)}`)
  }

  // ========== Target ==========
  lines.push('')
  lines.push('## [상대 (Target) Dossier]')
  lines.push(`- 호칭: ${target.alias}`)
  if (target.age) lines.push(`- 나이: ${target.age}`)
  if (target.gender) lines.push(`- 성별: ${target.gender}`)
  if (target.job) lines.push(`- 직업: ${target.job}`)
  if (target.mbti) lines.push(`- MBTI (유저 입력): ${target.mbti}`)
  if (target.matchPlatform) lines.push(`- 만남 경로: ${target.matchPlatform}`)
  if (target.firstContactAt) {
    lines.push(`- 처음 접촉: ${target.firstContactAt.toISOString().slice(0, 10)}`)
  }
  if (target.physicalDescription) lines.push(`- 외형: ${target.physicalDescription}`)
  if (target.background) lines.push(`- 배경: ${target.background}`)
  if (target.commonGround) lines.push(`- 나와의 접점: ${target.commonGround}`)
  if (target.relationshipHistory) lines.push(`- 상대 연애 이력: ${target.relationshipHistory}`)
  const targetInterests = target.interests ?? []
  if (targetInterests.length > 0) lines.push(`- 관심사: ${targetInterests.join(', ')}`)
  if (target.notes) lines.push(`- 메모: ${target.notes}`)

  lines.push(`- 현재 단계: ${target.stage}`)
  if (target.currentSituation) {
    lines.push('')
    lines.push('### [현재 진행 상황 — 유저 기술] ★ 전략의 최우선 컨텍스트')
    lines.push(target.currentSituation)
  }
  lines.push('')
  lines.push(`### [목표]`)
  const goal = target.goal ?? { preset: 'explore', description: '일단 탐색' }
  lines.push(
    `${goal.description} (preset=${goal.preset}${goal.timeframeWeeks ? `, ${goal.timeframeWeeks}주 내` : ''})`
  )

  const targetTags = target.tags ?? []
  if (targetTags.length > 0) lines.push(`- 태그: ${targetTags.join(', ')}`)

  lines.push('')
  lines.push('### [누적 통계]')
  const stats = target.stats ?? {
    messageCount: 0,
    myMessageCount: 0,
    theirMessageCount: 0,
    totalChars: 0,
    lastInteractionAt: null,
  }
  lines.push(
    `총 메시지 ${stats.messageCount}건 (내 ${stats.myMessageCount} / 상대 ${stats.theirMessageCount})`
  )
  if (stats.avgReplyGapMinutes != null) {
    lines.push(`평균 답장 간격 ${stats.avgReplyGapMinutes}분`)
  }

  const profile = target.profile
  if (profile && Object.keys(profile).length > 0) {
    lines.push('')
    lines.push('### [AI가 지금까지 추론한 상대 프로파일]')
    if (profile.summary) lines.push(`요약: ${profile.summary}`)
    if (profile.attachment) {
      lines.push(`애착 유형: ${profile.attachment.type} (confidence ${profile.attachment.confidence.toFixed(2)})`)
    }
    if (profile.bigFive) {
      lines.push(`Big Five: ${formatDims(profile.bigFive)}`)
    }
    if (profile.commStyle) {
      lines.push(`커뮤니케이션 스타일: ${formatDims(profile.commStyle)}`)
    }
    if (profile.values) {
      lines.push(`가치관: ${formatDims(profile.values)}`)
    }
    if (profile.redFlags?.length) {
      lines.push(`지뢰: ${profile.redFlags.join(' / ')}`)
    }
    if (profile.greenFlags?.length) {
      lines.push(`강점: ${profile.greenFlags.join(' / ')}`)
    }
  }

  // ========== Interactions ==========
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

'use server'

import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db/client'
import {
  actors,
  actions as actionsTbl,
  events,
  goals,
  insights,
  outcomes,
  relationships,
  type InferredTrait,
} from '../db/schema'
import { ensureSchema } from '../db/init'
import { getSelfOrThrow } from './self'

/**
 * 목업 데이터 시드 — UI 검증용. 한 번 호출하면:
 *   - Self actor에 inferredTraits 채움
 *   - "서연 · 회사 후배"라는 파트너 1명 생성 (이미 있으면 skip)
 *   - Relationship 생성 (진행·dynamics 자연어 채움, partner traits)
 *   - Event 5개 (Fact/Why)
 *   - Action 1개 + Outcome 1개
 *   - Insight 2개 (active)
 *
 * 멱등성: 이미 "mock-partner" id 존재하면 그 관계 id 반환하고 재생성 스킵.
 */
export async function seedMockData(): Promise<{ relationshipId: string; created: boolean }> {
  await ensureSchema()
  const self = await getSelfOrThrow()

  const partnerId = 'mock-partner-seoyeon'
  const [existingPartner] = await db
    .select()
    .from(actors)
    .where(eq(actors.id, partnerId))
    .limit(1)

  if (existingPartner) {
    const [existingRel] = await db
      .select()
      .from(relationships)
      .where(eq(relationships.partnerId, partnerId))
      .limit(1)
    if (existingRel) {
      return { relationshipId: existingRel.id, created: false }
    }
  }

  // 1. Self inferredTraits 채우기 (관찰 누적 UI 검증)
  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000
  const selfTraits: InferredTrait[] = [
    {
      observation: '갈등 시 먼저 사과하는 관대함 경향',
      evidenceEventIds: [],
      confidenceNarrative: '중간 · 3회 관찰',
      firstObserved: now - 14 * DAY,
      lastUpdated: now,
    },
    {
      observation: '답장 속도 빠름 — 상대 관심 신호에 민감',
      evidenceEventIds: [],
      confidenceNarrative: '높음',
      firstObserved: now - 21 * DAY,
      lastUpdated: now,
    },
    {
      observation: '가치관 진보적 — 결혼·가족 규범에 유연',
      evidenceEventIds: [],
      confidenceNarrative: '낮음 · 관찰 2회',
      firstObserved: now - 7 * DAY,
      lastUpdated: now,
    },
  ]
  await db.update(actors).set({ inferredTraits: selfTraits }).where(eq(actors.id, self.id))

  // 2. Partner 생성
  const partnerTraits: InferredTrait[] = [
    {
      observation: '보수적 가치관 — 가족·결혼 화제 자주 꺼냄',
      evidenceEventIds: [],
      confidenceNarrative: '중간',
      firstObserved: now - 10 * DAY,
      lastUpdated: now,
    },
    {
      observation: '주도형 — 약속 잡기와 장소 결정 먼저 꺼냄',
      evidenceEventIds: [],
      confidenceNarrative: '높음',
      firstObserved: now - 14 * DAY,
      lastUpdated: now,
    },
    {
      observation: '이기적 경향 낮음 — 내 피곤 챙겨서 먼저 끊어줌',
      evidenceEventIds: [],
      confidenceNarrative: '낮음',
      firstObserved: now - 3 * DAY,
      lastUpdated: now,
    },
  ]
  if (!existingPartner) {
    await db.insert(actors).values({
      id: partnerId,
      role: 'partner',
      displayName: '서연',
      rawNotes: '회사 2년차 후배. 친해진 건 프로젝트 끝날 때쯤.',
      knownConstraints: ['직장 동료'],
      inferredTraits: partnerTraits,
      age: 27,
      gender: 'female',
      occupation: '마케터',
      mbti: 'ENFJ',
      strengths: [],
      weaknesses: [],
      dealBreakers: [],
    })
  }

  // 3. Relationship
  const relId = `rel-${randomUUID()}`
  await db.insert(relationships).values({
    id: relId,
    partnerId,
    progress: 'exploring',
    exclusivity: 'unknown',
    conflictState: 'healthy',
    description: '직장 후임 · 소개팅 3회차',
    powerBalance: '약간 상대 우세 — 다음 만남 주도권 상대에게 넘어감',
    communicationPattern: '평균 응답 20분, 저녁 집중형',
    investmentAsymmetry: '내가 조금 더 투자 중 (선물·장소 결정)',
    escalationSpeed: '2회차 만남 후 호감 급가속',
    status: 'active',
  })

  // 4. Events — Fact/Why 5개
  const mkEvent = (offsetDays: number, type: string, fact: string, why: string | null) => ({
    id: `evt-${randomUUID()}`,
    relationshipId: relId,
    timestamp: new Date(now - offsetDays * DAY),
    type,
    content: fact,
    selfNote: why,
    attachments: [],
    contextTags: [],
  })
  await db.insert(events).values([
    mkEvent(
      14,
      'message',
      '**소개팅 직후 첫 카톡**\n\n나: 오늘 즐거웠어요 ㅎㅎ\n서연: 저도요! 조만간 또 봬요',
      '답장 톤 밝았음 — 긍정적'
    ),
    mkEvent(
      10,
      'meeting',
      '**2번째 만남 · 홍대**\n\n2시간 와인바. 가족 얘기 오래 — 3남매 중 둘째, 독립 원함.',
      '가족 얘기 꺼낸 쪽은 상대 → 관계 진지 신호?'
    ),
    mkEvent(
      6,
      'message',
      '**주중 늦은 답장**\n\n내가 먼저 던짐. 읽고 3시간 후 답장. 단답.',
      '관심 식었나 걱정 — 근데 평소보다 야근 많다 했으니 과해석 금지'
    ),
    mkEvent(
      3,
      'meeting',
      '**3번째 만남 · 성수동 데이트**\n\n저녁 먹고 야경 보며 2시간 산책. 손 처음 잡음 (상대 먼저).\n헤어질 때 "다음주 또 볼래?" 상대 먼저.',
      '스킨십·다음 약속 둘 다 상대 주도 — 파워 역전'
    ),
    mkEvent(
      1,
      'call',
      '**어제 밤 15분 통화**\n\n일상·회사 사람들 얘기. 웃음 많음.',
      '통화 자연스러워진 단계'
    ),
  ])

  // 5. Goal auto (legacy FK 호환)
  const goalId = `goal-${randomUUID()}`
  await db.insert(goals).values({
    id: goalId,
    relationshipId: relId,
    category: 'auto',
    description: '(mock seed placeholder)',
    priority: 'primary',
    ethicsStatus: 'ok',
    ethicsReasons: [],
    applicableLaws: [],
  })

  // 6. Action + Outcome
  const actionId = `act-${randomUUID()}`
  const actionMd = `## 지금 상황
3회차 만남 지나면서 상대가 주도권을 가져감 (손 먼저·다음 약속 먼저). 내가 조금 뒤로 빠지는 타이밍이 유리.

### 1. 다음 연락은 네가 먼저 하지 마라
근거: 3회차 만남에서 상대가 다음 약속 먼저 꺼냄. 지금 연락을 네가 먼저 하면 투자 비대칭이 더 벌어짐.
왜: 균형을 되찾는 가장 저위험 방법. 48시간 안에 상대에게서 먼저 연락 올 확률 높음.

### 2. 답장은 30분~1시간 두고 해라
근거: 네가 평균 5분 안에 답장 — 상대의 빠른 관심 신호에 매번 즉각 반응.
왜: 가용성 너무 명확하면 매력 희소성 감소. 일·일상 톤 유지.

### 3. 다음 만남은 활동 기반으로 꺼내라
근거: 저녁·산책 패턴 반복. 새 맥락에서 상대 행동 폭 관찰 필요.
왜: 공연·전시·운동 같은 활동에서 가치관·에너지가 더 드러남.`

  await db.insert(actionsTbl).values({
    id: actionId,
    relationshipId: relId,
    goalId,
    source: 'ai_proposed',
    content: actionMd,
    status: 'executed',
    executedAt: new Date(now - 1 * DAY),
    ethicsStatus: 'ok',
    ethicsReasons: [],
  })

  await db.insert(outcomes).values({
    id: `out-${randomUUID()}`,
    actionId,
    observedSignals: '최근 1일 이벤트: 어제 밤 15분 통화 (자연스러움)',
    relatedEventIds: [],
    goalProgress: 'advanced',
    surpriseLevel: 'expected',
    narrative:
      '**유저 메모:**\n이틀 정도 연락 안 하니 상대가 먼저 전화 걸어옴. 통화 15분.\n\n---\n\n**분석:**\n전략 1(연락 자제)이 먹힘. 상대 주도 유지됨. 전략 2(답장 지연)는 다음 단계에서 유지. 전략 3(활동 기반 제안)은 이번 통화에서 꺼내지 않음 → 다음 기회.',
    lessons: [],
    triggeredActionIds: [],
  })

  // 7. Insight 2개 (active)
  await db.insert(insights).values([
    {
      id: `ins-${randomUUID()}`,
      scope: 'self_pattern',
      relationshipId: null,
      observation: '답장 빠른 내 패턴이 3회차 이후 투자 비대칭의 주 원인.',
      supportingOutcomeIds: [],
      supportingEventIds: [],
      status: 'active',
    },
    {
      id: `ins-${randomUUID()}`,
      scope: 'relationship_specific',
      relationshipId: relId,
      observation:
        '상대가 가족 화제를 2번째 만남에 꺼냄 — 단기 캐주얼보다 진지한 관계 탐색 신호.',
      supportingOutcomeIds: [],
      supportingEventIds: [],
      status: 'active',
    },
  ])

  revalidatePath('/')
  revalidatePath('/timeline')
  revalidatePath('/r')
  revalidatePath(`/r/${relId}`)
  revalidatePath('/me')
  return { relationshipId: relId, created: true }
}

/**
 * 시드 데이터 제거 — 파트너 id 기준으로 관계·events·actions·outcomes·goals 모두 cascade.
 */
export async function unseedMockData(): Promise<{ removed: boolean }> {
  await ensureSchema()
  const partnerId = 'mock-partner-seoyeon'
  const [partner] = await db.select().from(actors).where(eq(actors.id, partnerId)).limit(1)
  if (!partner) return { removed: false }

  // actor 삭제 시 relationships cascade → events/actions/goals/outcomes/insights cascade
  await db.delete(actors).where(eq(actors.id, partnerId))

  revalidatePath('/')
  revalidatePath('/timeline')
  revalidatePath('/r')
  revalidatePath('/me')
  return { removed: true }
}

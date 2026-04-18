import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ============================================================================
// Self — 유저 본인 (single-user MVP에서는 row 하나)
// ============================================================================
export const selves = sqliteTable('selves', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  displayName: text('display_name').notNull(),
  gender: text('gender'), // 'male' | 'female' | 'other' | null
  orientation: text('orientation'), // 'hetero' | 'homo' | 'bi' | 'other' | null
  age: integer('age'),

  // 관계 목표 유형
  relationshipGoal: text('relationship_goal'), // 'casual' | 'serious' | 'marriage' | 'explore'

  // 대화 톤 샘플 (JSON string[] — 최대 ~5개)
  toneSamples: text('tone_samples', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),

  // Self 심리 프로파일 (축소판 Big Five + Attachment + 기타)
  // 온보딩에서 일부만 채우고 이후 점진 보강
  psychProfile: text('psych_profile', { mode: 'json' })
    .$type<SelfPsychProfile>()
    .notNull()
    .default(sql`'{}'`),

  // 자유 기술 노트 (자기소개, 중요 맥락)
  notes: text('notes'),
})

// ============================================================================
// Target — 유저가 관리하는 상대 Entity
// ============================================================================
export const targets = sqliteTable('targets', {
  id: text('id').primaryKey(),
  selfId: text('self_id')
    .notNull()
    .references(() => selves.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  alias: text('alias').notNull(), // 상대 호칭 (실명 or 닉네임)
  age: integer('age'),
  job: text('job'),
  matchPlatform: text('match_platform'), // 'tinder' | 'bumble' | 'offline' | 'intro' | ...
  firstContactAt: integer('first_contact_at', { mode: 'timestamp_ms' }),
  avatarEmoji: text('avatar_emoji').default('💭'),

  // 현재 관계 단계
  stage: text('stage').notNull().default('matched'),
  // 'matched' | 'exploring' | 'crush' | 'confirmed' | 'committed' | 'fading' | 'ended'

  // 목표값 — AI가 전략 짤 때 북극성
  goal: text('goal', { mode: 'json' })
    .$type<TargetGoal>()
    .notNull()
    .default(sql`'{"preset":"explore","description":"일단 탐색"}'`),

  // Latest profile snapshot 역정규화 (최신 스냅샷 FK + payload 캐시)
  latestProfileSnapshotId: text('latest_profile_snapshot_id'),
  profile: text('profile', { mode: 'json' })
    .$type<TargetProfile>()
    .notNull()
    .default(sql`'{}'`),

  // 누적 행동 통계
  stats: text('stats', { mode: 'json' })
    .$type<TargetStats>()
    .notNull()
    .default(sql`'{"messageCount":0,"myMessageCount":0,"theirMessageCount":0,"totalChars":0,"lastInteractionAt":null}'`),

  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  notes: text('notes'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
})

// ============================================================================
// Interaction — Timeline 이벤트
// ============================================================================
export const interactions = sqliteTable('interactions', {
  id: text('id').primaryKey(),
  targetId: text('target_id')
    .notNull()
    .references(() => targets.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),

  type: text('type').notNull(),
  // 'message' | 'date' | 'status_change' | 'note' | 'outcome'

  // payload는 type별로 다른 shape
  payload: text('payload', { mode: 'json' })
    .$type<InteractionPayload>()
    .notNull(),

  // LLM이 이 Interaction에서 뽑은 신호 (없을 수도 있음)
  extracted: text('extracted', { mode: 'json' }).$type<{
    sentiment?: number // -1..1
    topics?: string[]
    evidence?: string[] // 프로파일 근거
  } | null>(),

  // 프로파일링에 이미 반영됐는지
  analyzed: integer('analyzed', { mode: 'boolean' }).notNull().default(false),
})

// ============================================================================
// ProfileSnapshot — Target 프로파일 진화 히스토리
// ============================================================================
export const profileSnapshots = sqliteTable('profile_snapshots', {
  id: text('id').primaryKey(),
  targetId: text('target_id')
    .notNull()
    .references(() => targets.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  // 이 스냅샷이 반영한 interaction 수 (몇 번째 데이터 포인트)
  basedOnInteractionCount: integer('based_on_interaction_count').notNull(),

  profile: text('profile', { mode: 'json' }).$type<TargetProfile>().notNull(),

  // 이 스냅샷이 직전 대비 업데이트한 근거
  rationale: text('rationale'),
})

// ============================================================================
// StrategyRecommendation — AI가 생성한 전략
// ============================================================================
export const strategies = sqliteTable('strategies', {
  id: text('id').primaryKey(),
  targetId: text('target_id')
    .notNull()
    .references(() => targets.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  // 입력 스냅샷 (어떤 상태에서 뽑은 건지)
  snapshotContext: text('snapshot_context', { mode: 'json' }).$type<{
    goal: TargetGoal
    stage: string
    interactionCount: number
    profileSnapshotId: string | null
  }>(),

  situationReport: text('situation_report').notNull(),
  goalAlignment: text('goal_alignment'), // 현재 상태가 목표까지 얼마나 왔는지 (0~1 + 설명)

  options: text('options', { mode: 'json' })
    .$type<StrategyOption[]>()
    .notNull(),

  // 유저가 택한 옵션 id (나중 outcome 연결용)
  chosenOptionId: text('chosen_option_id'),
  outcome: text('outcome'), // 'good' | 'bad' | 'neutral' | null
  outcomeNote: text('outcome_note'),
})

// ============================================================================
// 타입 정의 (JSON 컬럼들)
// ============================================================================

// 차원별 value + confidence (재사용)
type _Dim = { value: number; confidence: number }

export type SelfPsychProfile = {
  bigFive?: {
    openness?: _Dim
    conscientiousness?: _Dim
    extraversion?: _Dim
    agreeableness?: _Dim
    neuroticism?: _Dim
  }
  attachment?: {
    type: 'secure' | 'anxious' | 'avoidant' | 'disorganized' | 'unknown'
    confidence: number
  }
  commStyle?: {
    directness?: _Dim
    emotionalExpressiveness?: _Dim
    humor?: _Dim
    formality?: _Dim
  }
  values?: {
    achievement?: _Dim
    benevolence?: _Dim
    hedonism?: _Dim
    security?: _Dim
    tradition?: _Dim
    selfDirection?: _Dim
  }
  // 강점 — 연애 운영에서 유저가 잘하는 것
  strengths?: string[]
  // 약점 — 반복되는 실수, 회피 패턴
  weaknesses?: string[]
  // 반복 패턴 — "3주차에 모멘텀 잃음" 같은 발견
  patterns?: string[]
  // Playbook — 특정 상대 유형에 어떤 전략이 잘 통했는지
  playbook?: Array<{
    when: string // "회피형 상대 + 썸 단계"
    strategy: string // "거리감 존중하며 간헐 강화"
    evidence: string // "3번 시도 중 2번 긍정 outcome"
    confidence: number
  }>
  // 종합 요약
  summary?: string
  // 이번 프로파일이 뭘 기반으로 만들어졌는지
  basedOn?: {
    toneSampleCount: number
    totalInteractions: number
    totalStrategies: number
    totalTargets: number
  }
  lastProfiledAt?: number
}

export type TargetGoal = {
  preset:
    | 'casual' // 캐주얼 유지
    | 'sum_to_couple' // 썸 → 연인 전환
    | 'confirm_relationship' // 관계 확정
    | 'soft_end' // 소프트 종료
    | 'observe' // 관찰만
    | 'explore' // 일단 탐색
    | 'custom'
  description: string // 자유 기술
  timeframeWeeks?: number // 목표 시한
}

// 차원별로 value(0~1) + confidence(0~1). confidence는 데이터 쌓일수록 증가.
type Dim = { value: number; confidence: number }

export type TargetProfile = {
  bigFive?: {
    openness?: Dim
    conscientiousness?: Dim
    extraversion?: Dim
    agreeableness?: Dim
    neuroticism?: Dim
  }
  attachment?: {
    type: 'secure' | 'anxious' | 'avoidant' | 'disorganized' | 'unknown'
    confidence: number
  }
  commStyle?: {
    directness?: Dim
    emotionalExpressiveness?: Dim
    humor?: Dim
    formality?: Dim
  }
  values?: {
    achievement?: Dim
    benevolence?: Dim
    hedonism?: Dim
    security?: Dim
    tradition?: Dim
    selfDirection?: Dim
  }
  // LLM이 추출한 원문 근거 (최근 20개만 유지)
  evidence?: Array<{
    claim: string
    source: string // interaction id
    at: number
  }>
  // 지뢰/강점 요약
  redFlags?: string[]
  greenFlags?: string[]
  // LLM 요약 (매 업데이트마다 갱신)
  summary?: string
}

export type TargetStats = {
  messageCount: number
  myMessageCount: number
  theirMessageCount: number
  totalChars: number
  lastInteractionAt: number | null
  avgReplyGapMinutes?: number
}

export type MessagePayload = {
  kind: 'message'
  sender: 'me' | 'them'
  text: string
  platform?: string // 'kakao' | 'tinder_chat' | 'sms' | ...
}

export type DatePayload = {
  kind: 'date'
  venue?: string
  durationMinutes?: number
  mood?: 'great' | 'good' | 'neutral' | 'awkward' | 'bad'
  note?: string
}

export type StatusChangePayload = {
  kind: 'status_change'
  fromStage: string
  toStage: string
  reason?: string
}

export type NotePayload = {
  kind: 'note'
  text: string
}

export type OutcomePayload = {
  kind: 'outcome'
  label: 'good' | 'bad' | 'neutral'
  tags?: string[]
  note?: string
}

export type InteractionPayload =
  | MessagePayload
  | DatePayload
  | StatusChangePayload
  | NotePayload
  | OutcomePayload

export type StrategyOption = {
  id: string
  label: string // 짧은 이름 (예: "적극 어필")
  action: string // 구체 행동 (예: "주말 계획 먼저 제안")
  rationale: string // 왜 이 수
  risk: string
  reward: string
  messageDraft?: string // 바로 쓸 수 있는 초안
  timing?: string // "오늘 저녁 안에" 같은 타이밍 조언
}

// ============================================================================
// Type exports for app code
// ============================================================================
export type Self = typeof selves.$inferSelect
export type NewSelf = typeof selves.$inferInsert
export type Target = typeof targets.$inferSelect
export type NewTarget = typeof targets.$inferInsert
export type Interaction = typeof interactions.$inferSelect
export type NewInteraction = typeof interactions.$inferInsert
export type ProfileSnapshot = typeof profileSnapshots.$inferSelect
export type NewProfileSnapshot = typeof profileSnapshots.$inferInsert
export type Strategy = typeof strategies.$inferSelect
export type NewStrategy = typeof strategies.$inferInsert

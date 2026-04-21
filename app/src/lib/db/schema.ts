/**
 * LuvOS · Supabase Postgres 스키마 (Drizzle).
 *
 * 핵심 개념:
 *   Y = aX + b — 각 상대마다 stimulus-response 모델.
 *   X 는 내 행동/말, Y 는 상대 반응.
 *   a = X→Y 규칙 집합, b = 상대 baseline.
 *
 * 저장 위치:
 *   relationships.model jsonb = { rules, baseline, updatedAt, evidenceCount }
 *   events = X/Y 원자료 (append-only, 재분석시 reads 전체)
 *
 * actors.role: 'self' | 'partner'. user_id uuid partitioning + RLS.
 */

import { pgTable, text, integer, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ============================================================================
// Actor — 사람. self(유저 본인) + partner N명.
// ============================================================================
export const actors = pgTable('actors', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),

  role: text('role').notNull(), // 'self' | 'partner' | ...
  displayName: text('display_name').notNull(),

  /** 자유 메모 — 상대에 대한 사실. self 는 사용 안 함. */
  rawNotes: text('raw_notes'),

  /** 알려진 제약 — "기혼", "직장 동료" 같은 태그. */
  knownConstraints: jsonb('known_constraints')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),

  // ========== 명목 fact ==========
  age: integer('age'),
  gender: text('gender'),
  occupation: text('occupation'),
})

// ============================================================================
// Relationship — self ↔ partner 한 줄기.
// model 이 이 row 의 핵심. 나머지는 메타.
// ============================================================================
export const relationships = pgTable('relationships', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),

  partnerId: text('partner_id')
    .notNull()
    .references(() => actors.id, { onDelete: 'cascade' }),

  /** 5개 state enum 중 하나. 유저 수동 선택. model_spec.md 참고. */
  state: text('state').notNull().default('exploring'),
  /** state 에 종속된 goal enum. null 가능 (state 바뀔 때 초기화). */
  goal: text('goal'),

  /** "직장 후임" 같은 한 줄 관계 정의. */
  description: text('description'),

  /** Y = aX + b 모델. 8축 기반. docs/model_spec.md. */
  model: jsonb('model')
    .$type<RelationshipModel | null>()
    .default(sql`null`),

  timelineStart: timestamp('timeline_start', { withTimezone: true, mode: 'date' }),
  /** state 가 ended/struggling 일 때만 의미. */
  timelineEnd: timestamp('timeline_end', { withTimezone: true, mode: 'date' }),
  status: text('status').notNull().default('active'),
})

// ============================================================================
// State / Goal taxonomy — docs/model_spec.md 참고.
// ============================================================================
export type RelationshipState =
  | 'exploring'   // 탐색·썸 (사귄 적 없음)
  | 'dating'      // 사귀는 중
  | 'serious'     // 장기·결혼·동거
  | 'struggling'  // 갈등 중·이별 직전
  | 'ended'       // 이별 후 (재연결 시도 포함)

export type RelationshipGoal =
  // exploring
  | 'qualify'
  | 'advance'
  | 'early_exit'
  // dating
  | 'deepen'
  | 'clarify'
  | 'resolve_conflict'
  | 'pace'
  // serious
  | 'maintain'
  | 'revive'
  | 'marriage_prep'
  | 'check_fit'
  // struggling
  | 'heal'
  | 'clarify_future'
  | 'graceful_exit'
  // ended
  | 'closure'
  | 'reconnect_try'
  | 'learn_pattern'

export const ALLOWED_GOALS_BY_STATE: Record<
  RelationshipState,
  readonly RelationshipGoal[]
> = {
  exploring: ['qualify', 'advance', 'early_exit'],
  dating: ['deepen', 'clarify', 'resolve_conflict', 'pace'],
  serious: ['maintain', 'revive', 'marriage_prep', 'check_fit'],
  struggling: ['heal', 'clarify_future', 'graceful_exit'],
  ended: ['closure', 'reconnect_try', 'learn_pattern'],
}

export const STATE_LABEL: Record<RelationshipState, string> = {
  exploring: '탐색·썸',
  dating: '사귀는 중',
  serious: '장기·결혼',
  struggling: '갈등·위기',
  ended: '이별 후',
}

export const GOAL_LABEL: Record<RelationshipGoal, string> = {
  qualify: '판별',
  advance: '사귀기까지',
  early_exit: '조기 정리',
  deepen: '가까워지기',
  clarify: '진심 확인',
  resolve_conflict: '갈등 해소',
  pace: '진도 조율',
  maintain: '안정 유지',
  revive: '권태 극복',
  marriage_prep: '결혼 준비',
  check_fit: '장기 적합성',
  heal: '갈등 회복',
  clarify_future: '계속 여부 결정',
  graceful_exit: '정리 준비',
  closure: '감정 정리',
  reconnect_try: '재시도',
  learn_pattern: '패턴 분석',
}

/**
 * 관계 모델 8축 — X (내 행동) 와 Y (상대 반응) 가 공유하는 고정 taxonomy.
 * 새 축 추가 금지 (있으면 docs/model_spec.md 도 같이 업데이트).
 */
export type Axis =
  | 'proximity_push'   // 접근·적극 연락·만남 제안
  | 'proximity_pull'   // 거리두기·무응답·뜸
  | 'emotion_open'     // 감정·취약성 공개
  | 'emotion_hide'     // 감정 숨김·농담 전환
  | 'commit_push'      // 관계 격상·미래 제안
  | 'commit_hold'      // 현상 유지
  | 'conflict_press'   // 갈등 표출·추궁
  | 'conflict_soothe'  // 갈등 완화·사과

export const AXES: readonly Axis[] = [
  'proximity_push',
  'proximity_pull',
  'emotion_open',
  'emotion_hide',
  'commit_push',
  'commit_hold',
  'conflict_press',
  'conflict_soothe',
] as const

/**
 * "내가 xAxis 에 해당하는 X 했더니 상대가 yAxis 방향으로 intensity 만큼 반응"
 */
export type RelationshipRule = {
  xAxis: Axis
  yAxis: Axis
  /** -100 ~ +100. +는 yAxis 쪽으로 강하게, -는 yAxis 반대 방향. */
  intensity: number
  /** 관찰 횟수 */
  observations: number
  /** 0~100 신뢰도 */
  confidence: number
  /** 구체 사례 원문 조각 2~3개 */
  examplesX: string[]
  examplesY: string[]
  /** 지지 event ids */
  evidenceEventIds: string[]
  lastUpdated: number
}

/**
 * X 무관 상대 baseline 성향.
 * axes: 8축 각각 0~100 점수 (상대 평상시 해당 행동 축 기울기).
 * narrative: 수치로 안 잡히는 톤·맥락 3~5 문장.
 */
export type RelationshipBaseline = {
  axes: Record<Axis, number>
  narrative: string
}

export type RelationshipModel = {
  rules: RelationshipRule[]
  baseline: RelationshipBaseline
  /** 이 버전 모델 추출에 쓴 event id 목록. 다음 증분 업데이트 기준점. */
  lastEventIds: string[]
  /** 증분마다 +1 */
  version: number
  evidenceCount: number
  /** 0~100 전체 신뢰도 */
  confidenceOverall: number
  updatedAt: number
  /** LLM 주입용 3~5 문장 축약 */
  narrative: string
}

// ============================================================================
// Event — X / Y 원자료. append-only.
// ============================================================================
export const events = pgTable('events', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),

  /** 실제 발생 시각. null 이면 '시간 불명 — 덩어리 대화'. */
  timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }),

  relationshipId: text('relationship_id')
    .notNull()
    .references(() => relationships.id, { onDelete: 'cascade' }),

  /**
   * 'chat' — 카톡 덩어리 or 단일 메시지
   * 'event' — 실제 사건 (만남·이벤트·전략결과)
   * 'note'  — 내 메모
   */
  type: text('type').notNull(),

  content: text('content').notNull(),

  /**
   * 첨부 파일 URL 배열 (Supabase Storage screenshots bucket).
   * 카톡 캡쳐 업로드.
   */
  attachments: jsonb('attachments')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),

  contextTags: jsonb('context_tags')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
})

// ============================================================================
// Action — AI 제안 행동. 결과 시뮬레이션 / 실행 로그.
// ============================================================================
export const actions = pgTable('actions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),

  relationshipId: text('relationship_id')
    .notNull()
    .references(() => relationships.id, { onDelete: 'cascade' }),

  source: text('source').notNull(), // 'ai_proposed' | 'self_initiated'
  proposedAt: timestamp('proposed_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  executedAt: timestamp('executed_at', { withTimezone: true, mode: 'date' }),

  /** 전략 전체 markdown. */
  content: text('content').notNull(),
  status: text('status').notNull().default('proposed'),
})

// ============================================================================
// Outcome — Action 실행 결과.
// ============================================================================
export const outcomes = pgTable('outcomes', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),

  actionId: text('action_id')
    .notNull()
    .references(() => actions.id, { onDelete: 'cascade' }),

  narrative: text('narrative').notNull(),
  goalProgress: text('goal_progress').notNull(), // advanced | stagnant | regressed | unclear
})

// ============================================================================
// Insight — cross-relationship 패턴 (Phase B).
// ============================================================================
export const insights = pgTable('insights', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),

  scope: text('scope').notNull(), // 'relationship_specific' | 'self_pattern' | 'cross_relationship'
  relationshipId: text('relationship_id').references(() => relationships.id, {
    onDelete: 'cascade',
  }),
  observation: text('observation').notNull(),
  status: text('status').notNull().default('active'),
})

// ============================================================================
// Conversation — LuvAI 대화 이력.
// ============================================================================
export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),

  relationshipId: text('relationship_id'),
  title: text('title').notNull().default('새 대화'),
  messages: jsonb('messages')
    .$type<Array<{ role: 'user' | 'assistant'; content: string; at: number }>>()
    .notNull()
    .default(sql`'[]'::jsonb`),
})

// ============================================================================
// Type exports
// ============================================================================
export type Actor = typeof actors.$inferSelect
export type NewActor = typeof actors.$inferInsert
export type Relationship = typeof relationships.$inferSelect
export type NewRelationship = typeof relationships.$inferInsert
export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
export type Action = typeof actions.$inferSelect
export type NewAction = typeof actions.$inferInsert
export type Outcome = typeof outcomes.$inferSelect
export type NewOutcome = typeof outcomes.$inferInsert
export type Insight = typeof insights.$inferSelect
export type NewInsight = typeof insights.$inferInsert
export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert

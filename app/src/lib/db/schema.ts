/**
 * LuvOS v1 schema — relationship-coaching-ontology.md 기반.
 *
 * 원칙:
 *   - Append-only 원자료 (Event는 수정/삭제 금지)
 *   - 수치화 최소화 (15축 점수 저장 안 함)
 *   - raw markdown 그대로 저장
 *   - 해석은 쿼리 시점 LLM에서
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ============================================================================
// User — 로그인 계정. Auth.js 세션과 매핑.
// ⚠ 현재는 신설 테이블만 있고 데이터 레이어는 아직 userId로 파티셔닝하지 않음.
// 로그인 활성화 + per-user Turso DB 전환 시 FK 연결 예정.
// ============================================================================
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  email: text('email').notNull().unique(),
  provider: text('provider').notNull(), // 'google' | 'kakao' | …
  providerAccountId: text('provider_account_id').notNull(),
  displayName: text('display_name'),
  imageUrl: text('image_url'),

  /** 이 유저가 매핑된 self Actor id. 온보딩 완료 시 연결. */
  selfActorId: text('self_actor_id'),

  /** per-user Turso DB url (2단계에서 활용). null이면 공용 DB. */
  tursoDbUrl: text('turso_db_url'),
  tursoAuthToken: text('turso_auth_token'),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// ============================================================================
// Actor — 사람. self 1명 고정 + partner N명.
// ============================================================================
export const actors = sqliteTable('actors', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  role: text('role').notNull(), // 'self' | 'partner' | 'ex' | 'competitor' | 'gatekeeper' | 'friend' | 'family'
  displayName: text('display_name').notNull(),

  /** 자유 서술 메모 (markdown). 수정 가능. */
  rawNotes: text('raw_notes'),

  /** 알려진 제약 — "기혼", "직장 동료" 같은 short 태그 배열. JSON. */
  knownConstraints: text('known_constraints', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),

  /** 관찰 누적. 자연어 + 근거 event id. 15축 점수 아님. */
  inferredTraits: text('inferred_traits', { mode: 'json' })
    .$type<InferredTrait[]>()
    .notNull()
    .default(sql`'[]'`),

  // ========== 명목 fact (유저가 직접 아는 것만. 없으면 null) ==========
  mbti: text('mbti'),
  age: integer('age'),
  gender: text('gender'), // 'male' | 'female' | 'other'
  orientation: text('orientation'), // 'hetero' | 'homo' | 'bi' | 'other'
  experienceLevel: text('experience_level'), // 'none' | 'some' | 'experienced' | 'very_experienced'
  occupation: text('occupation'),

  // ========== 자가선언 / 설문 추출 (자연어 + 배열) ==========
  strengths: text('strengths', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  weaknesses: text('weaknesses', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  dealBreakers: text('deal_breakers', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  idealTypeNotes: text('ideal_type_notes'), // 이상형 자유 서술
  personalityNotes: text('personality_notes'), // 성격 자유 서술
  valuesNotes: text('values_notes'), // 가치관 자유 서술
})

export type InferredTrait = {
  observation: string
  evidenceEventIds: string[]
  confidenceNarrative: string // "확신 낮음, 3회 관찰"
  firstObserved: number
  lastUpdated: number
}

// ============================================================================
// Relationship — self ↔ partner 한 줄기.
// ============================================================================
export const relationships = sqliteTable('relationships', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  partnerId: text('partner_id')
    .notNull()
    .references(() => actors.id, { onDelete: 'cascade' }),

  /** 다축 stage — 단일 스칼라 아님. */
  progress: text('progress').notNull().default('observing'),
  // 'unknown'|'observing'|'approaching'|'exploring'|'exclusive'|'committed'|'decayed'|'ended'
  exclusivity: text('exclusivity').notNull().default('unknown'),
  // 'unknown'|'open'|'exclusive'|'married'
  conflictState: text('conflict_state').notNull().default('healthy'),
  // 'healthy'|'tension'|'conflict'|'recovery'

  /** 관계 정의 (자유 서술) — "직장 후임 · 소개팅 3회차" 같은 유저 명시 */
  description: text('description'),

  /** 답변 스타일 (ontology/styles.ts StyleKey) — LLM 프롬프트 톤 제어 */
  style: text('style'),

  /** dynamics — 전부 자연어. */
  powerBalance: text('power_balance'),
  communicationPattern: text('communication_pattern'),
  investmentAsymmetry: text('investment_asymmetry'),
  escalationSpeed: text('escalation_speed'),

  timelineStart: integer('timeline_start', { mode: 'timestamp_ms' }),
  status: text('status').notNull().default('active'), // 'active' | 'paused' | 'ended'
})

// ============================================================================
// Event — 원자료. append-only. raw markdown.
// ============================================================================
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  /** 실제 발생 시각. 유저가 과거 소급 입력 가능. */
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),

  relationshipId: text('relationship_id')
    .notNull()
    .references(() => relationships.id, { onDelete: 'cascade' }),

  /** 'message' | 'conversation' | 'meeting' | 'call' | 'milestone' | 'conflict' | 'recovery' | 'external_info' */
  type: text('type').notNull(),

  /** 대화 로그 / 메모 / transcript 전문. markdown. */
  content: text('content').notNull(),

  /** 음성 transcript가 별도 보관될 경우. */
  transcript: text('transcript'),

  /** 첨부 파일 경로 배열. */
  attachments: text('attachments', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),

  /** 유저의 주관적 해석. 선택. */
  selfNote: text('self_note'),

  /** 자유 태그. */
  contextTags: text('context_tags', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
})

// ============================================================================
// Goal — 관계에서 달성하려는 것. 시기별 갱신.
// ============================================================================
export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  deprecatedAt: integer('deprecated_at', { mode: 'timestamp_ms' }),

  relationshipId: text('relationship_id')
    .notNull()
    .references(() => relationships.id, { onDelete: 'cascade' }),

  /** 'serious_commitment' | 'sexual_connection' | 'status_elevation' | 'power_positioning' |
   *  'emotional_repair' | 'exit' | 'exploration' */
  category: text('category').notNull(),

  description: text('description').notNull(),
  priority: text('priority').notNull().default('primary'), // 'primary' | 'secondary'

  /** 윤리 룰 엔진 결과. rules/ethics.ts 에서 채움. */
  ethicsStatus: text('ethics_status').notNull().default('ok'), // 'ok'|'warning'|'blocked'
  ethicsReasons: text('ethics_reasons', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  applicableLaws: text('applicable_laws', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
})

// ============================================================================
// Action — AI 제안 or 유저가 실행한 행동 단위.
// ============================================================================
export const actions = sqliteTable('actions', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  relationshipId: text('relationship_id')
    .notNull()
    .references(() => relationships.id, { onDelete: 'cascade' }),

  goalId: text('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),

  source: text('source').notNull(), // 'ai_proposed' | 'self_initiated' | 'hybrid'
  proposedAt: integer('proposed_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  executedAt: integer('executed_at', { mode: 'timestamp_ms' }),

  /** 전체 content를 markdown으로. title/rationale/steps/timing/신호/리스크/대안 전부 한 문서. */
  content: text('content').notNull(),

  status: text('status').notNull().default('proposed'),
  // 'proposed'|'accepted'|'executed'|'cancelled'|'stalled'

  /** 윤리 재검증 결과 (Goal과 별개로 Action 단위 재검사). */
  ethicsStatus: text('ethics_status').notNull().default('ok'),
  ethicsReasons: text('ethics_reasons', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
})

// ============================================================================
// Outcome — Action 실행 결과.
// ============================================================================
export const outcomes = sqliteTable('outcomes', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  actionId: text('action_id')
    .notNull()
    .references(() => actions.id, { onDelete: 'cascade' }),

  observedSignals: text('observed_signals').notNull(), // markdown
  relatedEventIds: text('related_event_ids', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),

  /** 'advanced'|'stagnant'|'regressed'|'unclear' */
  goalProgress: text('goal_progress').notNull(),
  /** 'expected'|'mild_surprise'|'major_surprise' */
  surpriseLevel: text('surprise_level').notNull(),

  narrative: text('narrative').notNull(), // markdown — 뭐 맞았고 뭐 어긋났는지

  lessons: text('lessons', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),

  triggeredActionIds: text('triggered_action_ids', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
})

// ============================================================================
// Insight — 반복 패턴 학습 단위. 주간 보고서에서 생성/갱신.
// ============================================================================
export const insights = sqliteTable('insights', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  /** 'relationship_specific' | 'self_pattern' | 'partner_pattern' | 'cross_relationship' */
  scope: text('scope').notNull(),

  /** 개인 패턴이면 null. 관계 특정이면 FK. */
  relationshipId: text('relationship_id').references(() => relationships.id, {
    onDelete: 'cascade',
  }),

  observation: text('observation').notNull(), // markdown

  supportingOutcomeIds: text('supporting_outcome_ids', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  supportingEventIds: text('supporting_event_ids', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),

  status: text('status').notNull().default('active'), // 'active'|'invalidated'|'superseded'
})

// ============================================================================
// Conversation — LuvAI 대화 이력 영속 저장
// ============================================================================
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  /** 관계 맥락과 연결 (현재 active relationship) — 없으면 general */
  relationshipId: text('relationship_id'),

  /** 첫 user 메시지에서 자동 생성되는 타이틀 */
  title: text('title').notNull().default('새 대화'),

  /** 메시지 이력 JSON — [{role:'user'|'assistant', content:string, at:number}] */
  messages: text('messages', { mode: 'json' })
    .$type<Array<{ role: 'user' | 'assistant'; content: string; at: number }>>()
    .notNull()
    .default(sql`'[]'`),
})

export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert

// ============================================================================
// 타입 exports
// ============================================================================
export type Actor = typeof actors.$inferSelect
export type NewActor = typeof actors.$inferInsert
export type Relationship = typeof relationships.$inferSelect
export type NewRelationship = typeof relationships.$inferInsert
export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
export type Goal = typeof goals.$inferSelect
export type NewGoal = typeof goals.$inferInsert
export type Action = typeof actions.$inferSelect
export type NewAction = typeof actions.$inferInsert
export type Outcome = typeof outcomes.$inferSelect
export type NewOutcome = typeof outcomes.$inferInsert
export type Insight = typeof insights.$inferSelect
export type NewInsight = typeof insights.$inferInsert

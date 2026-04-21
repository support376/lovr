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

  // ========== 명목 fact (fact only) ==========
  age: integer('age'),
  gender: text('gender'),
  occupation: text('occupation'),

  /** self 전용: 재산/자산 자유서술. */
  assetsNotes: text('assets_notes'),
  /** self 전용: 지출 패턴·쓰는 것. */
  spendingNotes: text('spending_notes'),
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

  /** 관계 단계 (유저 자율 태그, 추론 안 함). */
  progress: text('progress').notNull().default('observing'),

  /** "직장 후임" 같은 한 줄 관계 정의. */
  description: text('description'),

  /**
   * Y = aX + b 모델.
   * rules: "내가 X → 상대가 Y" 조건부 규칙들 (= a)
   * baseline: X 무관 상대 디폴트 톤 (= b)
   * confidence: 증거 수 기반 0~100
   */
  model: jsonb('model')
    .$type<RelationshipModel | null>()
    .default(sql`null`),

  timelineStart: timestamp('timeline_start', { withTimezone: true, mode: 'date' }),
  status: text('status').notNull().default('active'), // 'active' | 'paused' | 'ended'
})

export type RelationshipRule = {
  /** 내가 하는 행동/말 */
  x: string
  /** 상대의 전형적 반응 */
  y: string
  /** 관찰 횟수 (evidence count) */
  observations: number
  /** 0~100 신뢰도 (증거/일관성 기반) */
  confidence: number
  /** 지지하는 event id 목록 */
  evidenceEventIds: string[]
  /** 마지막 갱신 시각 (ms) */
  lastUpdated: number
}

export type RelationshipModel = {
  rules: RelationshipRule[]
  /** 상대 baseline — 자연어 2~4 문장. X 무관 디폴트 경향. */
  baseline: string
  /** 모델 전체 신뢰도 (evidence count 기반 0~100) */
  confidence: number
  updatedAt: number
  /** 모델 추출에 쓴 event 개수 */
  evidenceCount: number
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

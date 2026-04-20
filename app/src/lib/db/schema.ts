/**
 * LuvOS · Supabase Postgres 스키마 (Drizzle).
 *
 * 6노드 온톨로지:
 *   User · Target · Conversation · Event · Relationship State · Outcome.
 *
 * 모든 user-scoped 테이블은 `user_id uuid references auth.users(id) on delete cascade`.
 * RLS는 SQL 스크립트(`docs/supabase_setup.sql`)에서 처리 — Drizzle 레벨에서는 타입만.
 *
 * actions.goalId는 레거시 호환용 placeholder (ontology 정리 후 엔진이 관계당 1개 "auto" goal을 조용히 생성).
 */

import { pgTable, text, integer, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ============================================================================
// Actor — 사람. role='self'(유저 본인 1명) + 'partner' N명. user_id로 파티션.
// ============================================================================
export const actors = pgTable('actors', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),

  role: text('role').notNull(), // 'self' | 'partner' | 'ex' | 'competitor' | 'gatekeeper' | 'friend' | 'family'
  displayName: text('display_name').notNull(),

  rawNotes: text('raw_notes'),

  knownConstraints: jsonb('known_constraints')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),

  inferredTraits: jsonb('inferred_traits')
    .$type<InferredTrait[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),

  mbti: text('mbti'),
  age: integer('age'),
  gender: text('gender'),
  orientation: text('orientation'),
  experienceLevel: text('experience_level'),
  occupation: text('occupation'),

  strengths: jsonb('strengths')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  weaknesses: jsonb('weaknesses')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  dealBreakers: jsonb('deal_breakers')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  idealTypeNotes: text('ideal_type_notes'),
  personalityNotes: text('personality_notes'),
  valuesNotes: text('values_notes'),
})

export type InferredTrait = {
  observation: string
  evidenceEventIds: string[]
  confidenceNarrative: string
  firstObserved: number
  lastUpdated: number
}

// ============================================================================
// Relationship — self ↔ partner.
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

  progress: text('progress').notNull().default('observing'),
  exclusivity: text('exclusivity').notNull().default('unknown'),
  conflictState: text('conflict_state').notNull().default('healthy'),

  description: text('description'),
  style: text('style'),

  powerBalance: text('power_balance'),
  communicationPattern: text('communication_pattern'),
  investmentAsymmetry: text('investment_asymmetry'),
  escalationSpeed: text('escalation_speed'),

  timelineStart: timestamp('timeline_start', { withTimezone: true, mode: 'date' }),
  status: text('status').notNull().default('active'),
})

// ============================================================================
// Event — 원자료. append-only. raw markdown.
// ============================================================================
export const events = pgTable('events', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),

  timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).notNull(),

  relationshipId: text('relationship_id')
    .notNull()
    .references(() => relationships.id, { onDelete: 'cascade' }),

  type: text('type').notNull(),
  content: text('content').notNull(),
  transcript: text('transcript'),

  attachments: jsonb('attachments')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),

  selfNote: text('self_note'),

  contextTags: jsonb('context_tags')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
})

// ============================================================================
// Goal — 레거시 placeholder. UI에는 노출 안 되고 엔진이 관계당 1개 'auto' 유지.
// ============================================================================
export const goals = pgTable('goals', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  deprecatedAt: timestamp('deprecated_at', { withTimezone: true, mode: 'date' }),

  relationshipId: text('relationship_id')
    .notNull()
    .references(() => relationships.id, { onDelete: 'cascade' }),

  category: text('category').notNull(),
  description: text('description').notNull(),
  priority: text('priority').notNull().default('primary'),

  ethicsStatus: text('ethics_status').notNull().default('ok'),
  ethicsReasons: jsonb('ethics_reasons')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  applicableLaws: jsonb('applicable_laws')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
})

// ============================================================================
// Action — AI 제안 or 유저 실행 행동 단위.
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

  goalId: text('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),

  source: text('source').notNull(),
  proposedAt: timestamp('proposed_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  executedAt: timestamp('executed_at', { withTimezone: true, mode: 'date' }),

  content: text('content').notNull(),
  status: text('status').notNull().default('proposed'),

  ethicsStatus: text('ethics_status').notNull().default('ok'),
  ethicsReasons: jsonb('ethics_reasons')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
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

  observedSignals: text('observed_signals').notNull(),
  relatedEventIds: jsonb('related_event_ids')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),

  goalProgress: text('goal_progress').notNull(),
  surpriseLevel: text('surprise_level').notNull(),

  narrative: text('narrative').notNull(),

  lessons: jsonb('lessons')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),

  triggeredActionIds: jsonb('triggered_action_ids')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
})

// ============================================================================
// Insight — 반복 패턴 학습 단위.
// ============================================================================
export const insights = pgTable('insights', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),

  scope: text('scope').notNull(),
  relationshipId: text('relationship_id').references(() => relationships.id, {
    onDelete: 'cascade',
  }),

  observation: text('observation').notNull(),

  supportingOutcomeIds: jsonb('supporting_outcome_ids')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  supportingEventIds: jsonb('supporting_event_ids')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),

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

export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
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

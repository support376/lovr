import 'server-only'
import { db } from './client'
import { sql } from 'drizzle-orm'
import { LEGACY_STAGE_MAP } from '../ontology/stages'
import { isValidGoalKey } from '../ontology/goals'

let initialized = false

/**
 * v1 스키마 부트스트랩. drizzle-kit 마이그 대신 런타임 CREATE TABLE IF NOT EXISTS.
 * 기존 DB에 구버전 테이블 있으면 그대로 두고 신규 테이블만 추가 — 유저가 원하면 수동 wipe.
 */
export async function ensureSchema() {
  if (initialized) return
  initialized = true

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS actors (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      role TEXT NOT NULL,
      display_name TEXT NOT NULL,
      raw_notes TEXT,
      known_constraints TEXT NOT NULL DEFAULT '[]',
      inferred_traits TEXT NOT NULL DEFAULT '[]',
      mbti TEXT,
      age INTEGER,
      gender TEXT,
      orientation TEXT,
      experience_level TEXT,
      occupation TEXT,
      strengths TEXT NOT NULL DEFAULT '[]',
      weaknesses TEXT NOT NULL DEFAULT '[]',
      deal_breakers TEXT NOT NULL DEFAULT '[]',
      ideal_type_notes TEXT,
      personality_notes TEXT,
      values_notes TEXT
    )
  `)

  // 기존 DB 대응 — idempotent ALTER
  await tryAdd('actors', 'mbti', 'TEXT')
  await tryAdd('actors', 'age', 'INTEGER')
  await tryAdd('actors', 'gender', 'TEXT')
  await tryAdd('actors', 'orientation', 'TEXT')
  await tryAdd('actors', 'experience_level', 'TEXT')
  await tryAdd('actors', 'occupation', 'TEXT')
  await tryAdd('actors', 'strengths', "TEXT NOT NULL DEFAULT '[]'")
  await tryAdd('actors', 'weaknesses', "TEXT NOT NULL DEFAULT '[]'")
  await tryAdd('actors', 'deal_breakers', "TEXT NOT NULL DEFAULT '[]'")
  await tryAdd('actors', 'ideal_type_notes', 'TEXT')
  await tryAdd('actors', 'personality_notes', 'TEXT')
  await tryAdd('actors', 'values_notes', 'TEXT')

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      partner_id TEXT NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
      description TEXT,
      style TEXT,
      progress TEXT NOT NULL DEFAULT 'pre_match',
      exclusivity TEXT NOT NULL DEFAULT 'unknown',
      conflict_state TEXT NOT NULL DEFAULT 'healthy',
      power_balance TEXT,
      communication_pattern TEXT,
      investment_asymmetry TEXT,
      escalation_speed TEXT,
      timeline_start INTEGER,
      status TEXT NOT NULL DEFAULT 'active'
    )
  `)
  await tryAdd('relationships', 'description', 'TEXT')
  await tryAdd('relationships', 'style', 'TEXT')

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      timestamp INTEGER NOT NULL,
      relationship_id TEXT NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      transcript TEXT,
      attachments TEXT NOT NULL DEFAULT '[]',
      self_note TEXT,
      context_tags TEXT NOT NULL DEFAULT '[]'
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      deprecated_at INTEGER,
      relationship_id TEXT NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'primary',
      ethics_status TEXT NOT NULL DEFAULT 'ok',
      ethics_reasons TEXT NOT NULL DEFAULT '[]',
      applicable_laws TEXT NOT NULL DEFAULT '[]'
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      relationship_id TEXT NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
      goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      source TEXT NOT NULL,
      proposed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      executed_at INTEGER,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'proposed',
      ethics_status TEXT NOT NULL DEFAULT 'ok',
      ethics_reasons TEXT NOT NULL DEFAULT '[]'
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS outcomes (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      action_id TEXT NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
      observed_signals TEXT NOT NULL,
      related_event_ids TEXT NOT NULL DEFAULT '[]',
      goal_progress TEXT NOT NULL,
      surprise_level TEXT NOT NULL,
      narrative TEXT NOT NULL,
      lessons TEXT NOT NULL DEFAULT '[]',
      triggered_action_ids TEXT NOT NULL DEFAULT '[]'
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      scope TEXT NOT NULL,
      relationship_id TEXT REFERENCES relationships(id) ON DELETE CASCADE,
      observation TEXT NOT NULL,
      supporting_outcome_ids TEXT NOT NULL DEFAULT '[]',
      supporting_event_ids TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active'
    )
  `)

  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_events_rel_ts ON events(relationship_id, timestamp)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_actions_rel ON actions(relationship_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_actions_goal ON actions(goal_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_goals_rel ON goals(relationship_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_outcomes_action ON outcomes(action_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_insights_rel ON insights(relationship_id)`)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      relationship_id TEXT,
      title TEXT NOT NULL DEFAULT '새 대화',
      messages TEXT NOT NULL DEFAULT '[]'
    )
  `)
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC)`
  )

  await migrateOntologyV2()
}

/**
 * v2 온톨로지 마이그레이션 — 기존 DB 의 legacy stage/goal 값을 새 enum 으로 정규화.
 *   - relationships.progress: legacy 7-stage + 8-state → 5-stage (StageKey)
 *   - goals.category: legacy 10-goal → 구버전 카테고리는 모두 deprecated 처리
 *
 * idempotent. 이미 새 값으로 정규화된 row 는 건드리지 않는다.
 */
async function migrateOntologyV2() {
  // relationships.progress 정규화
  const rels = await db.all<{ id: string; progress: string }>(
    sql`SELECT id, progress FROM relationships`
  )
  for (const r of rels as Array<{ id: string; progress: string }>) {
    const current = r.progress
    // 이미 새 StageKey 인지 확인
    const isNewKey =
      current === 'pre_match' ||
      current === 'early_dating' ||
      current === 'stable' ||
      current === 'long_term' ||
      current === 'post_breakup'
    if (isNewKey) continue

    const mapped = LEGACY_STAGE_MAP[current] ?? 'pre_match'
    await db.run(
      sql`UPDATE relationships SET progress = ${mapped} WHERE id = ${r.id}`
    )
  }

  // goals.category — legacy 카테고리는 모두 deprecated 처리 (유저가 새로 설정하도록)
  const goalsRows = await db.all<{ id: string; category: string; deprecated_at: number | null }>(
    sql`SELECT id, category, deprecated_at FROM goals`
  )
  const nowMs = Date.now()
  for (const g of goalsRows as Array<{ id: string; category: string; deprecated_at: number | null }>) {
    if (g.deprecated_at) continue
    if (isValidGoalKey(g.category)) continue
    await db.run(
      sql`UPDATE goals SET deprecated_at = ${nowMs} WHERE id = ${g.id}`
    )
  }
}

async function tryAdd(table: string, column: string, type: string) {
  try {
    await db.run(sql.raw(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`))
  } catch {
    // 이미 존재하면 무시
  }
}

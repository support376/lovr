import 'server-only'
import { db } from './client'
import { sql } from 'drizzle-orm'

// 최초 실행 시 스키마를 DB에 적용 (dev 편의용 — prod는 drizzle-kit push 사용)
let initialized = false

export async function ensureSchema() {
  if (initialized) return
  initialized = true

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS selves (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      display_name TEXT NOT NULL,
      gender TEXT,
      orientation TEXT,
      age INTEGER,
      relationship_goal TEXT,
      tone_samples TEXT NOT NULL DEFAULT '[]',
      psych_profile TEXT NOT NULL DEFAULT '{}',
      notes TEXT
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS targets (
      id TEXT PRIMARY KEY,
      self_id TEXT NOT NULL REFERENCES selves(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      alias TEXT NOT NULL,
      age INTEGER,
      job TEXT,
      match_platform TEXT,
      first_contact_at INTEGER,
      avatar_emoji TEXT DEFAULT '💭',
      stage TEXT NOT NULL DEFAULT 'matched',
      goal TEXT NOT NULL DEFAULT '{"preset":"explore","description":"일단 탐색"}',
      latest_profile_snapshot_id TEXT,
      profile TEXT NOT NULL DEFAULT '{}',
      stats TEXT NOT NULL DEFAULT '{"messageCount":0,"myMessageCount":0,"theirMessageCount":0,"totalChars":0,"lastInteractionAt":null}',
      tags TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      archived INTEGER NOT NULL DEFAULT 0
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      target_id TEXT NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      occurred_at INTEGER NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      extracted TEXT,
      analyzed INTEGER NOT NULL DEFAULT 0
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS profile_snapshots (
      id TEXT PRIMARY KEY,
      target_id TEXT NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      based_on_interaction_count INTEGER NOT NULL,
      profile TEXT NOT NULL,
      rationale TEXT
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS strategies (
      id TEXT PRIMARY KEY,
      target_id TEXT NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      snapshot_context TEXT,
      situation_report TEXT NOT NULL,
      goal_alignment TEXT,
      options TEXT NOT NULL,
      chosen_option_id TEXT,
      outcome TEXT,
      outcome_note TEXT
    )
  `)

  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_interactions_target ON interactions(target_id, occurred_at)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_snapshots_target ON profile_snapshots(target_id, created_at)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_strategies_target ON strategies(target_id, created_at)`)
}

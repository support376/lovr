import { createClient } from '@libsql/client'
import { sql } from 'drizzle-orm'

const client = createClient({ url: 'file:./luvos.db' })

// minimal schema init
async function run(q) {
  await client.execute(q)
}

await run(`CREATE TABLE IF NOT EXISTS selves (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  display_name TEXT NOT NULL,
  gender TEXT, orientation TEXT, age INTEGER,
  relationship_goal TEXT,
  tone_samples TEXT NOT NULL DEFAULT '[]',
  mbti TEXT,
  strengths TEXT NOT NULL DEFAULT '[]',
  weaknesses TEXT NOT NULL DEFAULT '[]',
  deal_breakers TEXT NOT NULL DEFAULT '[]',
  ideal_type TEXT, personality_notes TEXT, values_notes TEXT,
  experience_level TEXT,
  psych_profile TEXT NOT NULL DEFAULT '{}',
  notes TEXT
)`)

await run(`CREATE TABLE IF NOT EXISTS targets (
  id TEXT PRIMARY KEY,
  self_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  alias TEXT NOT NULL, age INTEGER, gender TEXT, job TEXT,
  match_platform TEXT, first_contact_at INTEGER,
  avatar_emoji TEXT DEFAULT '💭', mbti TEXT,
  background TEXT, common_ground TEXT, relationship_history TEXT,
  physical_description TEXT,
  interests TEXT NOT NULL DEFAULT '[]',
  current_situation TEXT,
  stage TEXT NOT NULL DEFAULT 'matched',
  goal TEXT NOT NULL DEFAULT '{"preset":"explore","description":"일단 탐색"}',
  latest_profile_snapshot_id TEXT,
  profile TEXT NOT NULL DEFAULT '{}',
  stats TEXT NOT NULL DEFAULT '{"messageCount":0,"myMessageCount":0,"theirMessageCount":0,"totalChars":0,"lastInteractionAt":null}',
  tags TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  archived INTEGER NOT NULL DEFAULT 0
)`)

await run(`CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  occurred_at INTEGER NOT NULL,
  type TEXT NOT NULL, payload TEXT NOT NULL,
  extracted TEXT, analyzed INTEGER NOT NULL DEFAULT 0
)`)

await run(`CREATE TABLE IF NOT EXISTS profile_snapshots (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  based_on_interaction_count INTEGER NOT NULL,
  profile TEXT NOT NULL, rationale TEXT
)`)

await run(`CREATE TABLE IF NOT EXISTS strategies (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  snapshot_context TEXT, situation_report TEXT NOT NULL,
  goal_alignment TEXT, options TEXT NOT NULL,
  todos TEXT NOT NULL DEFAULT '[]',
  chosen_option_id TEXT, outcome TEXT, outcome_note TEXT
)`)

// Insert self
await client.execute({
  sql: `INSERT OR REPLACE INTO selves (id, display_name, age, gender, orientation, relationship_goal, mbti, strengths, weaknesses, deal_breakers, ideal_type, personality_notes, values_notes, experience_level, tone_samples, psych_profile, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  args: [
    'self-singleton', '지민', 28, 'male', 'hetero', 'serious', 'ENFP',
    JSON.stringify(['유머', '경청']),
    JSON.stringify(['답장 빠름']),
    JSON.stringify(['거짓말']),
    '자기 일 열심히',
    '내향',
    '성장 중요',
    'some',
    '[]',
    '{}',
    null,
  ],
})

// Insert target with rich data
const TID = 'test-target-123'
await client.execute({
  sql: `INSERT OR REPLACE INTO targets (id, self_id, alias, age, gender, job, match_platform, avatar_emoji, first_contact_at, mbti, background, common_ground, relationship_history, physical_description, interests, current_situation, stage, goal, profile, stats, tags, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  args: [
    TID, 'self-singleton', '유진', 27, 'female', '마케터', '틴더', '🌸',
    new Date('2024-03-15').getTime(),
    'INFJ', '서울 출신', '같은 대학', '전남친 3년', '단발',
    JSON.stringify(['러닝', '재즈']),
    '썸 3주째. 주 2회 카톡.',
    'exploring',
    JSON.stringify({ preset: 'sum_to_couple', description: '썸→연인', timeframeWeeks: 4 }),
    '{}',
    JSON.stringify({
      messageCount: 0,
      myMessageCount: 0,
      theirMessageCount: 0,
      totalChars: 0,
      lastInteractionAt: null,
    }),
    '[]',
    '조용한 타입',
  ],
})

console.log('SEEDED. Target URL: http://localhost:3000/t/' + TID)

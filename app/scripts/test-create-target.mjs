process.env.DATABASE_URL = 'file:./test.db'
process.env.ANTHROPIC_API_KEY = 'sk-test'

// Need 'server-only' bypass
process.env.NEXT_RUNTIME = ''

import { createClient } from '@libsql/client'

// First check what happens via raw Drizzle — mimic createTarget step-by-step
const c = createClient({ url: 'file:./test.db' })

// cleanup + schema
try { await c.execute('DROP TABLE IF EXISTS selves') } catch {}
try { await c.execute('DROP TABLE IF EXISTS targets') } catch {}

await c.execute(`CREATE TABLE selves (
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

await c.execute(`CREATE TABLE targets (
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
  goal TEXT NOT NULL DEFAULT '{}',
  latest_profile_snapshot_id TEXT,
  profile TEXT NOT NULL DEFAULT '{}',
  stats TEXT NOT NULL DEFAULT '{}',
  tags TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  archived INTEGER NOT NULL DEFAULT 0
)`)

// Insert self using same approach as createSelf action
await c.execute({
  sql: `INSERT INTO selves (id, display_name, age, gender, orientation, relationship_goal, tone_samples, mbti, strengths, weaknesses, deal_breakers, ideal_type, personality_notes, values_notes, experience_level, psych_profile, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  args: ['self-singleton', '지민', 28, 'male', 'hetero', 'serious',
    '[]', 'ENFP',
    JSON.stringify(['유머']), JSON.stringify([]), JSON.stringify([]),
    null, null, null, 'some', '{}', null],
})

// Now try createTarget-equivalent
const TID = crypto.randomUUID()
try {
  await c.execute({
    sql: `INSERT INTO targets (id, self_id, alias, age, gender, job, match_platform, avatar_emoji, goal, notes, first_contact_at, mbti, background, common_ground, relationship_history, physical_description, interests, current_situation, stage, profile, stats, tags) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      TID, 'self-singleton',
      '유진', 27, 'female', '마케터', '틴더', '🌸',
      JSON.stringify({ preset: 'sum_to_couple', description: '썸→연인', timeframeWeeks: 4 }),
      null,
      new Date('2024-03-15').getTime(),
      'INFJ', '서울 출신', '같은 대학', '전남친 3년', '단발',
      JSON.stringify(['러닝', '재즈']),
      '썸 3주째',
      'exploring',
      '{}',
      JSON.stringify({ messageCount: 0, myMessageCount: 0, theirMessageCount: 0, totalChars: 0, lastInteractionAt: null }),
      '[]',
    ],
  })
  console.log('INSERT OK id=', TID)
} catch (e) {
  console.error('INSERT FAILED:', e.message)
}

// Read back
const res = await c.execute({ sql: 'SELECT * FROM targets WHERE id = ?', args: [TID] })
console.log('Read back cols:', Object.keys(res.rows[0]))
console.log('Sample row:', JSON.stringify(res.rows[0], null, 2).slice(0, 800))

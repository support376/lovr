import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { sql, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import * as schema from '../src/lib/db/schema.ts'

process.env.DATABASE_URL = 'file:./repro.db'

const client = createClient({ url: 'file:./repro.db' })
const db = drizzle(client, { schema })

// 1) Init schema
await db.run(sql`
  CREATE TABLE IF NOT EXISTS selves (
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
  )
`)
await db.run(sql`
  CREATE TABLE IF NOT EXISTS targets (
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
  )
`)

// 2) Create self
await db.insert(schema.selves).values({
  id: 'self-singleton',
  displayName: '지민',
  age: 28,
  gender: 'male',
  orientation: 'hetero',
  relationshipGoal: 'serious',
  mbti: 'ENFP',
  strengths: ['유머 있음', '경청'],
  weaknesses: ['답장 빠름'],
  dealBreakers: ['거짓말'],
  idealType: '자기일 열심히',
  personalityNotes: '내향적',
  valuesNotes: '성장 중요',
  experienceLevel: 'some',
  toneSamples: [],
  psychProfile: {},
})

console.log('SELF CREATED')

// 3) Create target with full data
const tid = randomUUID()
await db.insert(schema.targets).values({
  id: tid,
  selfId: 'self-singleton',
  alias: '유진',
  age: 27,
  gender: 'female',
  job: '마케터',
  matchPlatform: '틴더',
  avatarEmoji: '🌸',
  firstContactAt: new Date('2024-03-15'),
  mbti: 'INFJ',
  background: '서울 출신',
  commonGround: '같은 대학',
  relationshipHistory: '전남친 3년',
  physicalDescription: '단발',
  interests: ['러닝', '재즈'],
  currentSituation: '썸 3주째',
  stage: 'exploring',
  goal: { preset: 'sum_to_couple', description: '썸→연인', timeframeWeeks: 4 },
  notes: '조용한 타입',
  tags: [],
  profile: {},
  stats: {
    messageCount: 0,
    myMessageCount: 0,
    theirMessageCount: 0,
    totalChars: 0,
    lastInteractionAt: null,
  },
})

console.log('TARGET INSERTED id=', tid)

// 4) Read back
const [target] = await db.select().from(schema.targets).where(eq(schema.targets.id, tid))
console.log('TARGET READ BACK:')
console.log(JSON.stringify(target, null, 2))

// 5) Test access
console.log('goal.description:', target.goal.description)
console.log('goal.preset:', target.goal.preset)
console.log('interests:', target.interests)
console.log('stats.messageCount:', target.stats.messageCount)
console.log('firstContactAt type:', typeof target.firstContactAt, target.firstContactAt)

console.log('OK')

-- ============================================================================
-- LuvOS · Supabase Postgres 초기 설정 (1회만 실행)
--
-- 사용법:
--   1. Supabase 프로젝트 > SQL Editor > "New query"
--   2. 이 파일 전체 복사 → 붙여넣기 → Run
--   3. Vercel에 env 4개 설정:
--        NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
--        NEXT_PUBLIC_SUPABASE_ANON_KEY=<Settings > API > anon public>
--        SUPABASE_SERVICE_ROLE_KEY=<Settings > API > service_role>  -- (현재 미사용, 나중 확장용)
--        DATABASE_URL=<Settings > Database > Connection string > URI (Session pooler 권장)>
--   4. Authentication > Providers > Google 활성화 + redirect URLs 추가:
--        https://<your-vercel-domain>/auth/callback
--        http://localhost:3000/auth/callback (로컬 개발)
-- ============================================================================

-- 테이블 전부 drop (마이그레이션이 아니라 fresh install 전제. 기존 데이터 보존 필요시 주의.)
drop table if exists insights cascade;
drop table if exists outcomes cascade;
drop table if exists actions cascade;
drop table if exists goals cascade;
drop table if exists events cascade;
drop table if exists relationships cascade;
drop table if exists actors cascade;
drop table if exists conversations cascade;

-- ----------------------------------------------------------------------------
-- actors
-- ----------------------------------------------------------------------------
create table actors (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  role text not null,
  display_name text not null,
  raw_notes text,
  known_constraints jsonb not null default '[]'::jsonb,
  inferred_traits jsonb not null default '[]'::jsonb,
  mbti text,
  age integer,
  gender text,
  orientation text,
  experience_level text,
  occupation text,
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  deal_breakers jsonb not null default '[]'::jsonb,
  ideal_type_notes text,
  personality_notes text,
  values_notes text
);
create index on actors(user_id);
create index on actors(user_id, role);

-- ----------------------------------------------------------------------------
-- relationships
-- ----------------------------------------------------------------------------
create table relationships (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  partner_id text not null references actors(id) on delete cascade,
  progress text not null default 'observing',
  exclusivity text not null default 'unknown',
  conflict_state text not null default 'healthy',
  description text,
  style text,
  power_balance text,
  communication_pattern text,
  investment_asymmetry text,
  escalation_speed text,
  timeline_start timestamptz,
  status text not null default 'active'
);
create index on relationships(user_id);
create index on relationships(user_id, status);

-- ----------------------------------------------------------------------------
-- events
-- ----------------------------------------------------------------------------
create table events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  timestamp timestamptz not null,
  relationship_id text not null references relationships(id) on delete cascade,
  type text not null,
  content text not null,
  transcript text,
  attachments jsonb not null default '[]'::jsonb,
  self_note text,
  context_tags jsonb not null default '[]'::jsonb
);
create index on events(user_id);
create index on events(relationship_id, timestamp desc);

-- ----------------------------------------------------------------------------
-- goals (legacy placeholder — ontology 제거 후 엔진이 'auto' 1개 자동 생성)
-- ----------------------------------------------------------------------------
create table goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  deprecated_at timestamptz,
  relationship_id text not null references relationships(id) on delete cascade,
  category text not null,
  description text not null,
  priority text not null default 'primary',
  ethics_status text not null default 'ok',
  ethics_reasons jsonb not null default '[]'::jsonb,
  applicable_laws jsonb not null default '[]'::jsonb
);
create index on goals(user_id);
create index on goals(relationship_id);

-- ----------------------------------------------------------------------------
-- actions
-- ----------------------------------------------------------------------------
create table actions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  relationship_id text not null references relationships(id) on delete cascade,
  goal_id text not null references goals(id) on delete cascade,
  source text not null,
  proposed_at timestamptz not null default now(),
  executed_at timestamptz,
  content text not null,
  status text not null default 'proposed',
  ethics_status text not null default 'ok',
  ethics_reasons jsonb not null default '[]'::jsonb
);
create index on actions(user_id);
create index on actions(relationship_id);

-- ----------------------------------------------------------------------------
-- outcomes
-- ----------------------------------------------------------------------------
create table outcomes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  action_id text not null references actions(id) on delete cascade,
  observed_signals text not null,
  related_event_ids jsonb not null default '[]'::jsonb,
  goal_progress text not null,
  surprise_level text not null,
  narrative text not null,
  lessons jsonb not null default '[]'::jsonb,
  triggered_action_ids jsonb not null default '[]'::jsonb
);
create index on outcomes(user_id);
create index on outcomes(action_id);

-- ----------------------------------------------------------------------------
-- insights
-- ----------------------------------------------------------------------------
create table insights (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  scope text not null,
  relationship_id text references relationships(id) on delete cascade,
  observation text not null,
  supporting_outcome_ids jsonb not null default '[]'::jsonb,
  supporting_event_ids jsonb not null default '[]'::jsonb,
  status text not null default 'active'
);
create index on insights(user_id);
create index on insights(user_id, status);

-- ----------------------------------------------------------------------------
-- conversations
-- ----------------------------------------------------------------------------
create table conversations (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  relationship_id text,
  title text not null default '새 대화',
  messages jsonb not null default '[]'::jsonb
);
create index on conversations(user_id);
create index on conversations(user_id, updated_at desc);

-- ============================================================================
-- RLS — 유저는 자기 user_id 행만 접근.
-- (서버액션이 postgres-js 직결이라 application-layer 필터도 있지만
--  이중 방어 + Supabase 대시보드·Realtime 호환을 위해 RLS도 켠다.)
-- ============================================================================
alter table actors enable row level security;
alter table relationships enable row level security;
alter table events enable row level security;
alter table goals enable row level security;
alter table actions enable row level security;
alter table outcomes enable row level security;
alter table insights enable row level security;
alter table conversations enable row level security;

-- generic policy helper (모든 테이블 동일 패턴)
create policy "own rows" on actors
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on relationships
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on actions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on outcomes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on insights
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

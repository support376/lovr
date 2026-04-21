-- ============================================================================
-- LuvOS · Supabase Postgres 초기 설정 (fresh install)
--
-- 기존 배포 DB 는 docs/migration_v2_model.sql 로 in-place 마이그레이션.
--
-- 사용법:
--   1. Supabase 프로젝트 > SQL Editor > "New query"
--   2. 이 파일 전체 복사 → 붙여넣기 → Run
--   3. Vercel env:
--        NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
--        SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, ANTHROPIC_API_KEY
--   4. Authentication > Providers > Google 활성화 + redirect URLs:
--        https://<your-vercel-domain>/auth/callback
--        http://localhost:3000/auth/callback
--   5. Storage > New bucket: "screenshots" (public 또는 private + policy)
-- ============================================================================

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
  age integer,
  gender text,
  occupation text,
  assets_notes text,
  spending_notes text
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
  description text,
  model jsonb,
  timeline_start timestamptz,
  status text not null default 'active'
);
create index on relationships(user_id);
create index on relationships(user_id, status);

-- ----------------------------------------------------------------------------
-- events — X/Y raw
-- ----------------------------------------------------------------------------
create table events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  timestamp timestamptz,
  relationship_id text not null references relationships(id) on delete cascade,
  type text not null,
  content text not null,
  attachments jsonb not null default '[]'::jsonb,
  context_tags jsonb not null default '[]'::jsonb
);
create index on events(user_id);
create index on events(relationship_id, timestamp desc nulls last);

-- ----------------------------------------------------------------------------
-- actions
-- ----------------------------------------------------------------------------
create table actions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  relationship_id text not null references relationships(id) on delete cascade,
  source text not null,
  proposed_at timestamptz not null default now(),
  executed_at timestamptz,
  content text not null,
  status text not null default 'proposed'
);
create index on actions(relationship_id, created_at desc);

-- ----------------------------------------------------------------------------
-- outcomes
-- ----------------------------------------------------------------------------
create table outcomes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  action_id text not null references actions(id) on delete cascade,
  narrative text not null,
  goal_progress text not null
);
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
  status text not null default 'active'
);
create index on insights(user_id);

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
create index on conversations(user_id, updated_at desc);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table actors enable row level security;
alter table relationships enable row level security;
alter table events enable row level security;
alter table actions enable row level security;
alter table outcomes enable row level security;
alter table insights enable row level security;
alter table conversations enable row level security;

-- user_id 매칭만 허용 (auth.uid() = user_id)
do $$ declare t text; begin
  for t in select unnest(array['actors','relationships','events','actions','outcomes','insights','conversations'])
  loop
    execute format('create policy "%s_rls" on %I using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
  end loop;
end $$;

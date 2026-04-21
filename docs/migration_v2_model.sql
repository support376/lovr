-- ============================================================================
-- LuvOS v2 — Y = aX + b model pivot 마이그레이션
-- 기존 배포 DB 에만 실행. fresh install 은 supabase_setup.sql 사용.
-- Idempotent — 여러 번 실행해도 안전.
-- ============================================================================

-- ---- actors: 자가진단 필드 drop + fact 필드 add ----------------------------
alter table actors drop column if exists mbti;
alter table actors drop column if exists orientation;
alter table actors drop column if exists experience_level;
alter table actors drop column if exists inferred_traits;
alter table actors drop column if exists strengths;
alter table actors drop column if exists weaknesses;
alter table actors drop column if exists deal_breakers;
alter table actors drop column if exists ideal_type_notes;
alter table actors drop column if exists personality_notes;
alter table actors drop column if exists values_notes;

alter table actors add column if not exists assets_notes text;
alter table actors add column if not exists spending_notes text;

-- ---- relationships: dynamics 4축 + style drop, model jsonb add --------------
alter table relationships drop column if exists style;
alter table relationships drop column if exists exclusivity;
alter table relationships drop column if exists conflict_state;
alter table relationships drop column if exists power_balance;
alter table relationships drop column if exists communication_pattern;
alter table relationships drop column if exists investment_asymmetry;
alter table relationships drop column if exists escalation_speed;
alter table relationships drop column if exists stage_history;

alter table relationships add column if not exists model jsonb;

-- ---- events: sender drop, timestamp nullable -------------------------------
alter table events drop column if exists sender;
alter table events drop column if exists transcript;
alter table events drop column if exists self_note;
alter table events alter column timestamp drop not null;

-- ---- actions: 정리 ----------------------------------------------------------
alter table actions drop column if exists goal_id;
alter table actions drop column if exists ethics_status;
alter table actions drop column if exists ethics_reasons;

-- ---- outcomes: 정리 ---------------------------------------------------------
alter table outcomes drop column if exists observed_signals;
alter table outcomes drop column if exists related_event_ids;
alter table outcomes drop column if exists surprise_level;
alter table outcomes drop column if exists lessons;
alter table outcomes drop column if exists triggered_action_ids;

-- ---- goals 테이블 전체 drop (legacy placeholder) ----------------------------
drop table if exists goals cascade;

-- ---- 재인덱싱 ---------------------------------------------------------------
drop index if exists events_relationship_id_timestamp_idx;
create index if not exists events_rel_ts_idx
  on events(relationship_id, timestamp desc nulls last);

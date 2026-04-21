-- ============================================================================
-- LuvOS v3 — 8축 모델 + state/goal 전환
-- idempotent.
-- ============================================================================

-- actors: self 자산/지출 필드 drop (fact only 원칙)
alter table actors drop column if exists assets_notes;
alter table actors drop column if exists spending_notes;

-- relationships: state / goal / timeline_end 추가, model null 화
alter table relationships add column if not exists state text;
update relationships set state = 'exploring'
  where state is null or state = '' or state = 'observing' or state = 'approaching'
        or state = 'exploring' or state = 'unknown' or state = 'pre_match'
        or state = 'first_contact';
update relationships set state = 'dating'
  where state in ('sseom', 'dating_early', 'exclusive', 'committed');
update relationships set state = 'serious'
  where state in ('dating_stable');
update relationships set state = 'struggling'
  where state in ('conflict', 'decayed');
update relationships set state = 'ended'
  where state in ('reconnection', 'ended');
alter table relationships alter column state set default 'exploring';
alter table relationships alter column state set not null;

alter table relationships add column if not exists goal text;
alter table relationships add column if not exists timeline_end timestamptz;

-- 기존 progress 컬럼 drop (state 로 대체)
alter table relationships drop column if exists progress;

-- 8축 스키마 다르므로 기존 model null
update relationships set model = null;

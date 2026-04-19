-- ============================================================
-- LeaseUp Bulldog — Migration 004: Follow-Up Tasks
-- Run AFTER sql/003_ai_config.sql
-- ============================================================

create table if not exists follow_up_tasks (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  lead_id           uuid not null references leads(id) on delete cascade,
  property_id       uuid not null references properties(id) on delete cascade,

  -- Scheduling
  scheduled_for     timestamptz not null,
  trigger_reason    text not null,
  -- 'first_contact' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3' | 'follow_up_final'
  attempt_number    smallint not null default 1,

  -- Execution state
  status            text not null default 'pending'
                      check (status in ('pending', 'executing', 'completed', 'cancelled', 'failed')),

  -- Result (set on completion)
  executed_at       timestamptz,
  result_message    text,
  twilio_sid        text,
  error_message     text,

  -- Cancellation (set when a stop condition fires)
  cancelled_at      timestamptz,
  cancelled_reason  text
  -- 'opted_out' | 'human_takeover' | 'lease_signed' | 'manual_pause' | 'lead_lost' | 'replied'
);

create index if not exists follow_up_tasks_lead_id_idx       on follow_up_tasks (lead_id);
create index if not exists follow_up_tasks_property_id_idx   on follow_up_tasks (property_id);
create index if not exists follow_up_tasks_scheduled_for_idx on follow_up_tasks (scheduled_for);
-- Cron query: pending tasks due now
create index if not exists follow_up_tasks_pending_due_idx
  on follow_up_tasks (scheduled_for)
  where status = 'pending';

create trigger trg_follow_up_tasks_updated_at
  before update on follow_up_tasks
  for each row execute function set_updated_at();

-- ============================================================
-- 007_advanced_intelligence.sql
-- Advanced intelligence, orchestration, and autonomy layer
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Offer Lab ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS offer_lab_runs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       uuid        REFERENCES properties(id) ON DELETE CASCADE,
  operator_id       uuid        REFERENCES operators(id)  ON DELETE CASCADE,
  campaign_name     text,
  special_offer     text        NOT NULL,
  target_renter     text,
  budget_cents      integer,
  campaign_goal     text,
  selected_images   text[]      DEFAULT '{}',
  status            text        NOT NULL DEFAULT 'pending',  -- pending | completed | failed
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offer_scores (
  id                          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                      uuid  NOT NULL REFERENCES offer_lab_runs(id) ON DELETE CASCADE,
  offer_strength_score        integer CHECK (offer_strength_score        BETWEEN 0 AND 100),
  market_competitiveness_score integer CHECK (market_competitiveness_score BETWEEN 0 AND 100),
  lead_attraction_score       integer CHECK (lead_attraction_score       BETWEEN 0 AND 100),
  conversion_potential_score  integer CHECK (conversion_potential_score  BETWEEN 0 AND 100),
  overall_score               integer CHECK (overall_score               BETWEEN 0 AND 100),
  explanation                 text,
  created_at                  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offer_recommendations (
  id                       uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                   uuid  NOT NULL REFERENCES offer_lab_runs(id) ON DELETE CASCADE,
  improved_special         text,
  improved_messaging_angle text,
  suggested_positioning    text,
  reasoning                text,
  created_at               timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offer_simulations (
  id                               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                           uuid    NOT NULL REFERENCES offer_lab_runs(id) ON DELETE CASCADE,
  user_expected_lead_increase_pct  numeric,
  user_expected_application_rate_pct numeric,
  user_expected_lease_conversion_pct numeric,
  user_estimated_occupancy_impact  numeric,
  ai_expected_lead_increase_pct    numeric,
  ai_expected_application_rate_pct numeric,
  ai_expected_lease_conversion_pct numeric,
  ai_estimated_occupancy_impact    numeric,
  confidence_score                 integer CHECK (confidence_score BETWEEN 0 AND 100),
  comparison_summary               text,
  created_at                       timestamptz DEFAULT now()
);

-- ── Media Intelligence ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media_analysis (
  id             uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    uuid  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  image_url      text  NOT NULL,
  category       text,  -- exterior | kitchen | bedroom | bathroom | amenities | neighborhood
  quality_score  integer CHECK (quality_score BETWEEN 0 AND 100),
  detected_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_recommendations (
  id                       uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id              uuid    REFERENCES properties(id) ON DELETE CASCADE,
  campaign_id              uuid    REFERENCES campaigns(id)  ON DELETE SET NULL,
  recommended_image_urls   text[]  DEFAULT '{}',
  missing_categories       text[]  DEFAULT '{}',
  flags                    text[]  DEFAULT '{}',
  reasoning                text,
  created_at               timestamptz DEFAULT now()
);

-- ── Lead Intelligence ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_scores (
  id                       uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                  uuid    NOT NULL REFERENCES leads(id) ON DELETE CASCADE UNIQUE,
  intent_score             integer CHECK (intent_score BETWEEN 0 AND 100),
  urgency_level            text,   -- low | medium | high
  price_sensitivity        text,   -- low | medium | high
  likelihood_to_apply      numeric CHECK (likelihood_to_apply BETWEEN 0 AND 1),
  likelihood_to_lease      numeric CHECK (likelihood_to_lease  BETWEEN 0 AND 1),
  follow_up_recommendation text,   -- aggressive | normal | nurture
  reasoning                text,
  scored_at                timestamptz DEFAULT now()
);

-- ── Conversion Analytics ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS funnel_events (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid  NOT NULL REFERENCES leads(id)      ON DELETE CASCADE,
  property_id  uuid  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  from_stage   text  NOT NULL,
  to_stage     text  NOT NULL,
  event_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funnel_events_property_idx ON funnel_events(property_id, event_at DESC);

CREATE TABLE IF NOT EXISTS conversion_metrics (
  id                          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id                 uuid  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  period_start                date  NOT NULL,
  period_end                  date  NOT NULL,
  new_to_reply_rate           numeric,
  reply_to_tour_rate          numeric,
  tour_to_application_rate    numeric,
  application_to_lease_rate   numeric,
  biggest_drop_off_stage      text,
  total_leads                 integer DEFAULT 0,
  calculated_at               timestamptz DEFAULT now()
);

-- ── Occupancy Prediction ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS occupancy_forecasts (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           uuid    NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  forecast_date         date    NOT NULL DEFAULT CURRENT_DATE,
  current_occupancy_pct numeric,
  forecast_7d_pct       numeric,
  forecast_14d_pct      numeric,
  forecast_30d_pct      numeric,
  risk_level            text,   -- low | medium | high | critical
  confidence_score      integer CHECK (confidence_score BETWEEN 0 AND 100),
  reasoning             text,
  created_at            timestamptz DEFAULT now()
);

-- ── Vacancy Intervention ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intervention_events (
  id                   uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id          uuid  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  trigger_reason       text  NOT NULL,
  risk_score           integer,
  recommended_actions  jsonb DEFAULT '[]',
  status               text  NOT NULL DEFAULT 'pending',  -- pending | acknowledged | resolved
  acknowledged_at      timestamptz,
  resolved_at          timestamptz,
  created_at           timestamptz DEFAULT now()
);

-- ── Strategic Insights ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS insights (
  id                 uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id        uuid  REFERENCES properties(id) ON DELETE CASCADE,
  operator_id        uuid  REFERENCES operators(id)  ON DELETE CASCADE,
  title              text  NOT NULL,
  explanation        text,
  impact_level       text,  -- low | medium | high | critical
  recommended_action text,
  category           text,  -- response_time | offer_quality | campaign_performance | lead_behavior | conversion
  dismissed_at       timestamptz,
  created_at         timestamptz DEFAULT now()
);

-- ── Closed-Loop Learning ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_patterns (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id         uuid    REFERENCES operators(id)  ON DELETE CASCADE,
  property_id         uuid    REFERENCES properties(id) ON DELETE CASCADE,
  pattern_type        text    NOT NULL,  -- offer_type | channel | messaging_angle | renter_type
  pattern_value       text    NOT NULL,
  avg_lead_quality    numeric DEFAULT 0,
  avg_conversion_rate numeric DEFAULT 0,
  lease_count         integer DEFAULT 0,
  sample_size         integer DEFAULT 0,
  confidence_score    integer DEFAULT 0,
  updated_at          timestamptz DEFAULT now()
);

-- ── Orchestration ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orchestration_runs (
  id               uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id      uuid  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  summary          text,
  risk_level       text,  -- low | medium | high | critical
  confidence_score integer,
  issues           jsonb DEFAULT '[]',
  opportunities    jsonb DEFAULT '[]',
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orchestration_findings (
  id            uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid  NOT NULL REFERENCES orchestration_runs(id) ON DELETE CASCADE,
  finding_type  text  NOT NULL,  -- issue | opportunity
  title         text  NOT NULL,
  description   text,
  impact_level  text,
  data          jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orchestration_actions (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid    REFERENCES orchestration_runs(id) ON DELETE SET NULL,
  property_id     uuid    NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  action_type     text    NOT NULL,
  title           text    NOT NULL,
  description     text,
  risk_level      text    NOT NULL DEFAULT 'low',  -- low | medium | high
  status          text    NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | executed | failed
  auto_executable boolean NOT NULL DEFAULT false,
  reasoning       text,
  result          jsonb,
  approved_by     text,
  approved_at     timestamptz,
  executed_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- ── Autonomy Settings ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS property_autonomy_settings (
  id                     uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id            uuid    NOT NULL REFERENCES properties(id) ON DELETE CASCADE UNIQUE,
  autonomy_mode          text    NOT NULL DEFAULT 'manual',  -- manual | assisted | autonomous
  allowed_auto_actions   text[]  DEFAULT '{}',
  budget_change_limit_pct integer DEFAULT 20,
  updated_at             timestamptz DEFAULT now()
);

-- ── Optimize Property ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS optimize_property_runs (
  id                    uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           uuid  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  orchestration_run_id  uuid  REFERENCES orchestration_runs(id) ON DELETE SET NULL,
  plan                  jsonb DEFAULT '[]',
  status                text  NOT NULL DEFAULT 'pending',  -- pending | in_progress | completed
  created_at            timestamptz DEFAULT now()
);

-- ── Narrative Intelligence ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS insights_narratives (
  id                 uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id        uuid  REFERENCES properties(id) ON DELETE CASCADE,
  operator_id        uuid  REFERENCES operators(id)  ON DELETE CASCADE,
  narrative_type     text  NOT NULL,  -- property | portfolio | weekly
  headline           text  NOT NULL,
  explanation        text,
  recommended_action text,
  impact_level       text,
  period_start       date,
  period_end         date,
  created_at         timestamptz DEFAULT now()
);

-- ── What-If Simulations ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS what_if_runs (
  id                               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id                      uuid    NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  scenario_description             text    NOT NULL,
  scenario_input                   jsonb   NOT NULL DEFAULT '{}',
  estimated_lead_impact_pct        numeric,
  estimated_application_impact_pct numeric,
  estimated_lease_impact_pct       numeric,
  estimated_occupancy_impact_pct   numeric,
  estimated_cost_impact_cents      integer,
  confidence_score                 integer CHECK (confidence_score BETWEEN 0 AND 100),
  reasoning                        text,
  created_at                       timestamptz DEFAULT now()
);

-- ── Cross-Property Insights ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cross_property_insights (
  id                  uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id         uuid  NOT NULL REFERENCES operators(id)  ON DELETE CASCADE,
  source_property_id  uuid  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  target_property_id  uuid  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  insight_type        text  NOT NULL,  -- offer_transfer | channel_transfer | messaging_transfer
  description         text  NOT NULL,
  confidence_score    integer,
  created_at          timestamptz DEFAULT now()
);

-- ── Weekly Digests ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weekly_digests (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id             uuid    REFERENCES properties(id) ON DELETE CASCADE,
  operator_id             uuid    REFERENCES operators(id)  ON DELETE CASCADE,
  digest_type             text    NOT NULL,  -- property | portfolio
  week_start              date    NOT NULL,
  week_end                date    NOT NULL,
  leads_generated         integer DEFAULT 0,
  avg_response_time_min   numeric,
  tours_booked            integer DEFAULT 0,
  applications_started    integer DEFAULT 0,
  leases_signed           integer DEFAULT 0,
  performance_fees_cents  integer DEFAULT 0,
  biggest_problem         text,
  biggest_opportunity     text,
  recommended_next_move   text,
  created_at              timestamptz DEFAULT now()
);

-- ── Action Queue ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS action_queue (
  id                uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       uuid  REFERENCES properties(id) ON DELETE CASCADE,
  operator_id       uuid  REFERENCES operators(id)  ON DELETE CASCADE,
  action_type       text  NOT NULL,
  title             text  NOT NULL,
  reason            text,
  urgency           text  NOT NULL DEFAULT 'medium',  -- low | medium | high | critical
  recommended_owner text,  -- ai | human | manager
  approval_status   text  NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | auto_approved
  auto_executable   boolean NOT NULL DEFAULT false,
  source_type       text,  -- orchestration | intervention | lead_priority | campaign | follow_up
  source_id         uuid,
  explanation       text,
  executed_at       timestamptz,
  dismissed_at      timestamptz,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS action_queue_property_urgency_idx ON action_queue(property_id, urgency, created_at DESC) WHERE dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS action_queue_operator_idx         ON action_queue(operator_id, approval_status) WHERE dismissed_at IS NULL;

-- ── Media Intelligence ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media_analysis (
  id                  uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         uuid  UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  total_images        integer NOT NULL DEFAULT 0,
  categorized         jsonb   NOT NULL DEFAULT '{}',
  missing_categories  text[]  DEFAULT '{}',
  recommendations     text[]  DEFAULT '{}',
  coverage_score      integer CHECK (coverage_score BETWEEN 0 AND 100),
  analyzed_at         timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_recommendations (
  id                  uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid  REFERENCES campaigns(id) ON DELETE CASCADE,
  property_id         uuid  REFERENCES properties(id) ON DELETE CASCADE,
  recommended_images  text[] DEFAULT '{}',
  reasoning           text,
  created_at          timestamptz DEFAULT now()
);

-- ── Campaign Optimization ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_optimization_actions (
  id                uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       uuid  REFERENCES campaigns(id) ON DELETE CASCADE,
  property_id       uuid  REFERENCES properties(id) ON DELETE CASCADE,
  action_type       text  NOT NULL,
  title             text  NOT NULL,
  description       text,
  expected_impact   text,
  auto_executable   boolean NOT NULL DEFAULT false,
  execution_status  text  NOT NULL DEFAULT 'pending',  -- pending | approved | executed | dismissed
  executed_at       timestamptz,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_opt_actions_campaign_idx ON campaign_optimization_actions(campaign_id, execution_status);

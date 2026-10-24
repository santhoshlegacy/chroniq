-- ============================================================
-- Migration: 001_initial_schema.sql
-- Chroniq — Initial database schema
-- ============================================================
-- Run order: 1st
-- Idempotent: YES (uses IF NOT EXISTS, CREATE OR REPLACE)
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- pg_cron and pg_net are enabled via Supabase Dashboard, not here.

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_result AS ENUM (
    'pending', 'sent', 'failed', 'skipped', 'no_tasks', 'expired_sub'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── profiles ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  timezone     TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: owner read" ON public.profiles;
CREATE POLICY "profiles: owner read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: owner update" ON public.profiles;
CREATE POLICY "profiles: owner update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: owner insert" ON public.profiles;
CREATE POLICY "profiles: owner insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── tasks ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tasks (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                        TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  description                  TEXT,
  priority                     task_priority NOT NULL DEFAULT 'medium',
  status                       task_status NOT NULL DEFAULT 'pending',
  scheduled_date               DATE,                   -- local calendar date (no timezone)
  due_at                       TIMESTAMPTZ,            -- exact deadline (UTC)
  estimated_duration_minutes   INT CHECK (estimated_duration_minutes > 0),
  completed_at                 TIMESTAMPTZ,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at                  TIMESTAMPTZ,
  carried_from_date            DATE,                   -- original date if carried forward
  category                     TEXT
);

CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS tasks_scheduled_date_idx ON public.tasks (user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks (user_id, status);
CREATE INDEX IF NOT EXISTS tasks_due_at_idx ON public.tasks (user_id, due_at) WHERE due_at IS NOT NULL;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks: owner all" ON public.tasks;
CREATE POLICY "tasks: owner all"
  ON public.tasks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_set_updated_at ON public.tasks;
CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── notification_preferences ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled                 BOOLEAN NOT NULL DEFAULT false,
  timezone                TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  reminder_start_time     TEXT NOT NULL DEFAULT '09:00',  -- HH:MM 24-hour
  reminder_end_time       TEXT NOT NULL DEFAULT '21:00',  -- HH:MM 24-hour
  interval_minutes        INT NOT NULL DEFAULT 180 CHECK (interval_minutes >= 30),
  suppress_when_no_tasks  BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_prefs: owner all" ON public.notification_preferences;
CREATE POLICY "notif_prefs: owner all"
  ON public.notification_preferences
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS notif_prefs_set_updated_at ON public.notification_preferences;
CREATE TRIGGER notif_prefs_set_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── push_subscriptions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint                     TEXT NOT NULL,
  p256dh                       TEXT NOT NULL,
  auth                         TEXT NOT NULL,
  device_label                 TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_successful_delivery_at  TIMESTAMPTZ,
  revoked_at                   TIMESTAMPTZ,

  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subs: owner all" ON public.push_subscriptions;
CREATE POLICY "push_subs: owner all"
  ON public.push_subscriptions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS push_subs_set_updated_at ON public.push_subscriptions;
CREATE TRIGGER push_subs_set_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── notification_events ──────────────────────────────────────────────────────
-- Atomic reminder claiming via UNIQUE (schedule_occurrence_key).
-- INSERT ... ON CONFLICT DO NOTHING RETURNING id guarantees exactly-once processing.

CREATE TABLE IF NOT EXISTS public.notification_events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_occurrence_key TEXT NOT NULL,
  scheduled_at            TIMESTAMPTZ NOT NULL,
  attempted_at            TIMESTAMPTZ,
  result                  notification_result NOT NULL DEFAULT 'pending',
  error_category          TEXT,
  task_count_snapshot     INT,
  push_status_code        INT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_occurrence UNIQUE (schedule_occurrence_key)
);

CREATE INDEX IF NOT EXISTS notif_events_user_id_idx
  ON public.notification_events (user_id, scheduled_at DESC);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_events: owner read" ON public.notification_events;
CREATE POLICY "notif_events: owner read"
  ON public.notification_events FOR SELECT
  USING (auth.uid() = user_id);

-- Cron function inserts via service role — no RLS bypass needed for SELECT
-- Edge Function uses service role for INSERT/UPDATE (bypasses RLS intentionally)

-- ─── daily_summaries ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.daily_summaries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date           DATE NOT NULL,
  completed_count      INT NOT NULL DEFAULT 0,
  remaining_count      INT NOT NULL DEFAULT 0,
  overdue_count        INT NOT NULL DEFAULT 0,
  completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_daily_summary UNIQUE (user_id, local_date)
);

CREATE INDEX IF NOT EXISTS daily_summaries_user_date_idx
  ON public.daily_summaries (user_id, local_date DESC);

ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_summaries: owner all" ON public.daily_summaries;
CREATE POLICY "daily_summaries: owner all"
  ON public.daily_summaries
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

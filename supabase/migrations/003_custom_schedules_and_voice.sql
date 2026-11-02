-- ============================================================
-- Migration: 003_custom_schedules_and_voice.sql
-- Chroniq — Advanced schedules, custom reminder slots, quiet hours,
-- and secure voice / telephony reminder preferences.
-- ============================================================
-- Run order: 3rd (after 001_initial_schema.sql and 002_cron_scheduler.sql)
-- Idempotent: YES
-- ============================================================

-- ─── 1. Extend profiles with user metadata ──────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- ─── 2. Extend notification_preferences with customizable schedules ────────
-- Default schedule: 09:00, 12:00, 15:00, 18:00, 21:00
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS custom_slots TEXT[] NOT NULL DEFAULT ARRAY['09:00', '12:00', '15:00', '18:00', '21:00']::TEXT[],
  ADD COLUMN IF NOT EXISTS active_slots TEXT[] NOT NULL DEFAULT ARRAY['09:00', '12:00', '15:00', '18:00', '21:00']::TEXT[],
  ADD COLUMN IF NOT EXISTS active_days INT[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 7]::INT[],
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS eligible_task_types TEXT NOT NULL DEFAULT 'all_pending',
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.notification_preferences
    ADD CONSTRAINT check_eligible_task_types
    CHECK (eligible_task_types IN ('all_pending', 'due_today_or_overdue', 'urgent_only'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. Dedicated voice & telephony preferences table ───────────────────────
CREATE TABLE IF NOT EXISTS public.voice_reminder_preferences (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  speech_enabled           BOOLEAN NOT NULL DEFAULT true,
  speech_rate              NUMERIC(3,2) NOT NULL DEFAULT 1.0 CHECK (speech_rate >= 0.5 AND speech_rate <= 2.0),
  speech_pitch             NUMERIC(3,2) NOT NULL DEFAULT 1.0 CHECK (speech_pitch >= 0.5 AND speech_pitch <= 2.0),
  speech_voice             TEXT NOT NULL DEFAULT 'natural',
  phone_call_enabled       BOOLEAN NOT NULL DEFAULT false,
  phone_number             TEXT,
  phone_country_code       TEXT NOT NULL DEFAULT '+1',
  phone_verified           BOOLEAN NOT NULL DEFAULT false,
  phone_consent_given_at   TIMESTAMPTZ,
  provider_preference      TEXT NOT NULL DEFAULT 'twilio' CHECK (provider_preference IN ('twilio', 'vonage', 'mock')),
  max_calls_per_day        INT NOT NULL DEFAULT 3 CHECK (max_calls_per_day >= 1 AND max_calls_per_day <= 10),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_prefs_user_id_idx ON public.voice_reminder_preferences (user_id);

ALTER TABLE public.voice_reminder_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voice_prefs: owner select" ON public.voice_reminder_preferences;
CREATE POLICY "voice_prefs: owner select"
  ON public.voice_reminder_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_prefs: owner insert" ON public.voice_reminder_preferences;
CREATE POLICY "voice_prefs: owner insert"
  ON public.voice_reminder_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_prefs: owner update" ON public.voice_reminder_preferences;
CREATE POLICY "voice_prefs: owner update"
  ON public.voice_reminder_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_prefs: owner delete" ON public.voice_reminder_preferences;
CREATE POLICY "voice_prefs: owner delete"
  ON public.voice_reminder_preferences FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS voice_prefs_set_updated_at ON public.voice_reminder_preferences;
CREATE TRIGGER voice_prefs_set_updated_at
  BEFORE UPDATE ON public.voice_reminder_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 4. Extend notification_events for multi-modal delivery tracking ────────
ALTER TABLE public.notification_events
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT NOT NULL DEFAULT 'push',
  ADD COLUMN IF NOT EXISTS telephony_call_id TEXT,
  ADD COLUMN IF NOT EXISTS telephony_provider TEXT,
  ADD COLUMN IF NOT EXISTS telephony_status TEXT,
  ADD COLUMN IF NOT EXISTS telephony_duration_seconds INT,
  ADD COLUMN IF NOT EXISTS telephony_cost_estimate NUMERIC(8,4);

-- ─── 5. Update user creation trigger to create voice preferences ─────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, avatar_url, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now();

  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.voice_reminder_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


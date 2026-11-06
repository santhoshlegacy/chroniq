-- ─── 006: Fix notification_preferences schema and columns ───────────────────
-- Resolves: "Could not find the 'overdue_alert_enabled' column of 'notification_preferences' in the schema cache"

-- 1. Ensure notification_preferences exists
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                      UUID DEFAULT gen_random_uuid(),
  user_id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled                 BOOLEAN NOT NULL DEFAULT true,
  timezone                TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  reminder_start_time     TEXT NOT NULL DEFAULT '09:00',
  reminder_end_time       TEXT NOT NULL DEFAULT '21:00',
  interval_minutes        INT NOT NULL DEFAULT 180,
  suppress_when_no_tasks  BOOLEAN NOT NULL DEFAULT true,
  custom_slots            TEXT[] NOT NULL DEFAULT ARRAY['09:00', '12:00', '15:00', '18:00', '21:00']::TEXT[],
  active_slots            TEXT[] NOT NULL DEFAULT ARRAY['09:00', '12:00', '15:00', '18:00', '21:00']::TEXT[],
  active_days             INT[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 7]::INT[],
  quiet_hours_enabled     BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start       TEXT NOT NULL DEFAULT '22:00',
  quiet_hours_end         TEXT NOT NULL DEFAULT '08:00',
  eligible_task_types     TEXT NOT NULL DEFAULT 'all_pending',
  push_enabled            BOOLEAN NOT NULL DEFAULT true,
  voice_enabled           BOOLEAN NOT NULL DEFAULT false,
  advance_warnings_enabled BOOLEAN NOT NULL DEFAULT true,
  warning_10m_enabled     BOOLEAN NOT NULL DEFAULT true,
  overdue_alert_enabled   BOOLEAN NOT NULL DEFAULT true,
  recurring_3h_enabled    BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add any missing columns to existing tables safely
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS overdue_alert_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS advance_warnings_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS warning_10m_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS recurring_3h_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_slots TEXT[] NOT NULL DEFAULT ARRAY['09:00', '12:00', '15:00', '18:00', '21:00']::TEXT[],
  ADD COLUMN IF NOT EXISTS active_slots TEXT[] NOT NULL DEFAULT ARRAY['09:00', '12:00', '15:00', '18:00', '21:00']::TEXT[],
  ADD COLUMN IF NOT EXISTS active_days INT[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 7]::INT[],
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS eligible_task_types TEXT NOT NULL DEFAULT 'all_pending',
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN NOT NULL DEFAULT false;

-- 3. Ensure user_id has unique constraint so onConflict: 'user_id' works
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_user_id_key'
  ) THEN
    ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 5. Strict User Isolation RLS Policies
DROP POLICY IF EXISTS "notif_prefs: owner all" ON public.notification_preferences;
CREATE POLICY "notif_prefs: owner all"
  ON public.notification_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Trigger schema cache reload for PostgREST
NOTIFY pgrst, 'reload schema';


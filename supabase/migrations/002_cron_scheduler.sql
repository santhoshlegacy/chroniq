-- ============================================================
-- Migration: 002_cron_scheduler.sql
-- Chroniq — pg_cron job setup for reminder processing
-- ============================================================
-- Run order: 2nd (after 001_initial_schema.sql)
-- Prerequisites:
--   1. pg_cron extension enabled (Supabase Dashboard → Database → Extensions)
--   2. pg_net extension enabled (Supabase Dashboard → Database → Extensions)
--   3. Vault secrets set in Supabase SQL Editor:
--      SELECT vault.create_secret('https://YOUR-PROJECT-REF.supabase.co', 'chroniq_project_url');
--      SELECT vault.create_secret('YOUR_RANDOM_CRON_SECRET', 'chroniq_cron_secret');
-- ============================================================

-- ─── Idempotent Job Registration ──────────────────────────────────────────────
-- Safely unschedule if previously registered to prevent duplicate job errors on rerun
DO $$
BEGIN
  PERFORM cron.unschedule('chroniq-process-reminders');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Schedule the 1-minute reminder check.
-- This invokes the Edge Function `process-reminders` every minute via pg_net.
-- The function evaluates which user slots are due in the current 1-minute window.
SELECT cron.schedule(
  'chroniq-process-reminders',   -- job name (unique)
  '* * * * *',                   -- every 1 minute
  $$
  DO $cron_body$
  DECLARE
    v_url TEXT;
    v_secret TEXT;
  BEGIN
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'chroniq_project_url' LIMIT 1;
    SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'chroniq_cron_secret' LIMIT 1;

    -- Only dispatch when project URL and cron secret are populated in Vault
    IF v_url IS NOT NULL AND v_secret IS NOT NULL THEN
      PERFORM net.http_post(
        url     := rtrim(v_url, '/') || '/functions/v1/process-reminders',
        headers := jsonb_build_object(
          'Content-Type',    'application/json',
          'x-chroniq-secret', v_secret
        ),
        body    := jsonb_build_object('triggered_at', now()::text)
      );
    END IF;
  END $cron_body$;
  $$
);

-- ─── Verification & Monitoring Helpers ────────────────────────────────────────
-- To verify the job is scheduled and active:
-- SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'chroniq-process-reminders';

-- To inspect recent pg_cron run results:
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'chroniq-process-reminders') ORDER BY start_time DESC LIMIT 10;

-- To unschedule (remove) the job:
-- SELECT cron.unschedule('chroniq-process-reminders');

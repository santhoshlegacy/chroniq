-- ============================================================
-- Migration: 002_cron_scheduler.sql
-- Chroniq — pg_cron job setup for reminder processing
-- ============================================================
-- Run order: 2nd (after 001_initial_schema.sql)
-- Prerequisites:
--   1. pg_cron extension enabled (Supabase Dashboard → Database → Extensions)
--   2. pg_net extension enabled (same)
--   3. Vault secrets set:
--      chroniq_project_url = 'https://YOUR-PROJECT-REF.supabase.co'
--      chroniq_cron_secret = 'a long random secret string'
-- ============================================================

-- Schedule the 1-minute reminder check.
-- This calls the Edge Function `process-reminders` every minute.
-- The function itself determines which users have a slot due right now.
-- A 1-minute schedule does NOT send notifications every minute —
-- it only processes reminder slots that fall within this 1-minute window.

SELECT cron.schedule(
  'chroniq-process-reminders',   -- job name (unique)
  '* * * * *',                   -- every 1 minute
  $$
  SELECT net.http_post(
    url     := (
                 SELECT decrypted_secret
                 FROM vault.decrypted_secrets
                 WHERE name = 'chroniq_project_url'
               ) || '/functions/v1/process-reminders',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-chroniq-secret', (
                            SELECT decrypted_secret
                            FROM vault.decrypted_secrets
                            WHERE name = 'chroniq_cron_secret'
                          )
    ),
    body    := jsonb_build_object('triggered_at', now()::text)
  );
  $$
);

-- To verify the job is scheduled:
-- SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'chroniq-process-reminders';

-- To remove the job (e.g., for testing):
-- SELECT cron.unschedule('chroniq-process-reminders');

-- ─── Reconcile stale 'pending' events ────────────────────────────────────────
-- If the Edge Function crashes after claiming a slot but before updating its result,
-- this query can be run to identify them. We do NOT auto-retry to avoid duplicates.
-- Run manually or via a separate monitoring job:
--
-- SELECT id, user_id, schedule_occurrence_key, created_at
-- FROM public.notification_events
-- WHERE result = 'pending'
--   AND created_at < now() - interval '5 minutes';
--
-- Mark them as failed (manual remediation):
-- UPDATE public.notification_events
-- SET result = 'failed', error_category = 'scheduler_crash_recovery'
-- WHERE result = 'pending'
--   AND created_at < now() - interval '5 minutes';

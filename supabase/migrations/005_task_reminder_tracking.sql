-- ============================================================
-- Migration: 005_task_reminder_tracking.sql
-- Chroniq — Add tracking columns for task reminder notifications
-- ============================================================
-- Run order: 5th
-- Idempotent: YES (ADD COLUMN IF NOT EXISTS)
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS warning_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS overdue_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ DEFAULT now();

-- Partial indexes to optimize reminder queries in process-reminders Edge Function
CREATE INDEX IF NOT EXISTS tasks_warning_pending_idx 
  ON public.tasks (user_id, due_at) 
  WHERE status != 'completed' AND archived_at IS NULL AND warning_sent = false AND due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_overdue_pending_idx 
  ON public.tasks (user_id, due_at) 
  WHERE status != 'completed' AND archived_at IS NULL AND overdue_sent = false AND due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_recurring_remind_idx
  ON public.tasks (user_id, last_reminded_at)
  WHERE status != 'completed' AND archived_at IS NULL;


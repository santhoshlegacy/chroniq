-- ============================================================
-- Migration: add_task_rate_limit.sql
-- Chroniq — Database-level task creation rate limiting
-- ============================================================
-- Run order: 4th
-- Idempotent: YES (CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS)
-- ============================================================

-- Function to enforce rate limiting on task creation (max 30 tasks per minute per user)
CREATE OR REPLACE FUNCTION public.check_task_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  recent_task_count INT;
  target_user_id UUID;
BEGIN
  -- Determine the user ID to check: prefer auth.uid(), fallback to NEW.user_id
  target_user_id := COALESCE(auth.uid(), NEW.user_id);

  IF target_user_id IS NOT NULL THEN
    -- Count how many tasks the user has created in the last 1 minute
    SELECT COUNT(*)
    INTO recent_task_count
    FROM public.tasks
    WHERE user_id = target_user_id
      AND created_at >= (now() - INTERVAL '1 minute');

    -- If count is 30 or more (rate limit exceeded), raise custom exception
    IF recent_task_count >= 30 THEN
      RAISE EXCEPTION 'Rate limit exceeded. Please wait a minute before adding more tasks.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if it already exists to guarantee idempotency
DROP TRIGGER IF EXISTS tasks_check_rate_limit ON public.tasks;
DROP TRIGGER IF EXISTS trg_check_task_rate_limit ON public.tasks;

-- Create BEFORE INSERT trigger on the tasks table
CREATE TRIGGER tasks_check_rate_limit
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_task_rate_limit();


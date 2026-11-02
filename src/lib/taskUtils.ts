/**
 * taskUtils.ts
 *
 * Pure functions for task filtering, overdue detection, and dashboard calculations.
 * No I/O — fully unit-testable.
 */

import {
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  endOfDay,
} from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { Task, DashboardStats } from '@/types'

// ─── Eligibility ──────────────────────────────────────────────────────────────

/**
 * Returns true if the task is not completed, not archived, and visible today.
 * "Visible today" means: scheduled_date is null OR scheduled_date <= localToday.
 */
export function isTaskEligibleToday(task: Task, localToday: string): boolean {
  if (task.status === 'completed') return false
  if (task.archived_at !== null) return false
  if (task.scheduled_date !== null && task.scheduled_date > localToday) return false
  return true
}

/**
 * Returns true if the task is overdue:
 * - Not completed
 * - Not archived
 * - Has a due_at date that is in the past
 */
export function isTaskOverdue(task: Task, nowUtc: Date): boolean {
  if (task.status === 'completed') return false
  if (task.archived_at !== null) return false
  if (task.due_at === null) return false
  return isBefore(parseISO(task.due_at), nowUtc)
}

/**
 * Returns true if the task was completed today (in the given timezone).
 */
export function isCompletedToday(task: Task, timezone: string, referenceDate?: Date): boolean {
  if (task.status !== 'completed' || task.completed_at === null) return false
  const completedLocal = toZonedTime(parseISO(task.completed_at), timezone)
  const ref = referenceDate ? toZonedTime(referenceDate, timezone) : new Date()
  return format(completedLocal, 'yyyy-MM-dd') === format(ref, 'yyyy-MM-dd')
}

// ─── Filtering ────────────────────────────────────────────────────────────────

export function filterTodayTasks(tasks: Task[], localToday: string): Task[] {
  return tasks.filter((t) => isTaskEligibleToday(t, localToday))
}

export function filterOverdueTasks(tasks: Task[], nowUtc: Date): Task[] {
  return tasks.filter((t) => isTaskOverdue(t, nowUtc))
}

export function filterCompletedToday(tasks: Task[], timezone: string, referenceDate?: Date): Task[] {
  return tasks.filter((t) => isCompletedToday(t, timezone, referenceDate))
}

export function filterUpcoming(tasks: Task[], localToday: string): Task[] {
  return tasks.filter(
    (t) =>
      t.status !== 'completed' &&
      t.archived_at === null &&
      t.scheduled_date !== null &&
      t.scheduled_date > localToday,
  )
}

// ─── Dashboard Calculations ───────────────────────────────────────────────────

/**
 * Calculate all dashboard statistics.
 *
 * The denominator for completion percentage is:
 *   tasks scheduled for today (scheduled_date === localToday) OR tasks with no date.
 *
 * Avoids division by zero by returning 0% when there are no eligible tasks.
 */
export function calculateDashboardStats(
  allTasks: Task[],
  nowUtc: Date,
  timezone: string,
  options: {
    nextReminderAt: Date | null
    lastReminderResult: 'pending' | 'sent' | 'failed' | 'skipped' | 'no_tasks' | 'expired_sub' | null
    lastReminderAt: Date | null
  },
): DashboardStats {
  const localToday = format(toZonedTime(nowUtc, timezone), 'yyyy-MM-dd')

  const todayTasks = filterTodayTasks(allTasks, localToday)
  const completedToday = filterCompletedToday(allTasks, timezone, nowUtc)
  const overdueTasks = filterOverdueTasks(allTasks, nowUtc)

  const totalToday = todayTasks.length + completedToday.filter(
    (t) => t.scheduled_date === null || t.scheduled_date === localToday
  ).length

  const completedCount = completedToday.filter(
    (t) => t.scheduled_date === null || t.scheduled_date === localToday
  ).length

  const remainingCount = todayTasks.filter((t) => t.status !== 'completed').length
  const overdueCount = overdueTasks.length

  const urgentPending = todayTasks.filter(
    (t) => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed',
  ).length

  const completionPercentage =
    totalToday === 0 ? 0 : Math.round((completedCount / totalToday) * 100)

  return {
    totalToday,
    completedToday: completedCount,
    remainingToday: remainingCount,
    overdueCount,
    urgentPending,
    completionPercentage,
    nextReminderAt: options.nextReminderAt,
    lastReminderResult: options.lastReminderResult,
    lastReminderAt: options.lastReminderAt,
  }
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<Task['priority'], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function sortTasksByPriorityThenDue(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (pDiff !== 0) return pDiff
    // Both have due_at or neither
    if (a.due_at && b.due_at) {
      return parseISO(a.due_at).getTime() - parseISO(b.due_at).getTime()
    }
    if (a.due_at) return -1
    if (b.due_at) return 1
    return parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime()
  })
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function getLocalToday(nowUtc: Date, timezone: string): string {
  return format(toZonedTime(nowUtc, timezone), 'yyyy-MM-dd')
}

export function getLocalStartOfDay(localDate: string, timezone: string): Date {
  return fromZonedTime(`${localDate}T00:00:00`, timezone)
}

export function getLocalEndOfDay(localDate: string, timezone: string): Date {
  return fromZonedTime(`${localDate}T23:59:59`, timezone)
}

export { format, parseISO, isAfter, isBefore, startOfDay, endOfDay }

/**
 * reminderUtils.ts
 *
 * Pure functions for computing reminder schedule slots.
 * These have no I/O dependencies — they are fully unit-testable with simulated time.
 *
 * Key design decisions:
 * - All inputs are explicit; no implicit `new Date()` inside functions.
 * - Slot times are represented in the user's local timezone using date-fns-tz.
 * - schedule_occurrence_key format: "<userId>:<YYYY-MM-DD>T<HH:MM>" (local time)
 * - Start and end times are both INCLUSIVE.
 */

import { addMinutes, format, isBefore, isEqual, parseISO, setHours, setMinutes, setSeconds } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { ReminderSlot } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReminderScheduleConfig {
  /** IANA timezone string, e.g. 'Asia/Kolkata' */
  timezone: string
  /** 'HH:MM' 24-hour, e.g. '09:00' */
  reminderStartTime: string
  /** 'HH:MM' 24-hour, e.g. '21:00' */
  reminderEndTime: string
  /** Minutes between reminders, e.g. 180 */
  intervalMinutes: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseHHMM(hhmm: string): { hours: number; minutes: number } {
  const [h, m] = hhmm.split(':').map(Number)
  if (h === undefined || m === undefined || isNaN(h) || isNaN(m)) {
    throw new Error(`Invalid HH:MM string: ${hhmm}`)
  }
  return { hours: h, minutes: m }
}

/**
 * Build a Date in the user's local timezone for a given HH:MM on a given local date.
 * `localDate` should be a Date that, when viewed in `timezone`, gives the correct day.
 */
function localSlotTime(localDate: Date, hhmm: string, timezone: string): Date {
  const { hours, minutes } = parseHHMM(hhmm)
  let d = new Date(localDate)
  d = setHours(d, 0)
  d = setMinutes(d, 0)
  d = setSeconds(d, 0)
  // Construct the local datetime in the given timezone, then convert to UTC
  const localIso = format(d, 'yyyy-MM-dd') + `T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
  return fromZonedTime(localIso, timezone)
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Enumerate all scheduled reminder slots for a given local day.
 *
 * @param nowUtc         - The current time (UTC). Pass a fixed value in tests.
 * @param config         - Schedule configuration.
 * @returns Array of ReminderSlot objects for today in the user's timezone.
 */
export function getTodayReminderSlots(
  nowUtc: Date,
  config: ReminderScheduleConfig,
): ReminderSlot[] {
  const { timezone, reminderStartTime, reminderEndTime, intervalMinutes } = config

  // Convert now to local timezone
  const nowLocal = toZonedTime(nowUtc, timezone)
  const localDate = nowLocal // same calendar date

  const start = localSlotTime(localDate, reminderStartTime, timezone)
  const end = localSlotTime(localDate, reminderEndTime, timezone)

  const slots: ReminderSlot[] = []
  let current = start
  let foundNext = false

  while (isBefore(current, end) || isEqual(current, end)) {
    const slotKey = buildOccurrenceKey('__placeholder__', current, timezone)
    const isPast = isBefore(current, nowUtc)
    const isNext = !isPast && !foundNext
    if (isNext) foundNext = true

    slots.push({
      localTime: current,
      slotKey,
      isPast,
      isNext,
    })

    current = addMinutes(current, intervalMinutes)
  }

  return slots
}

/**
 * Returns the next upcoming reminder slot after `nowUtc`, or null if none today.
 */
export function getNextReminderSlot(
  nowUtc: Date,
  config: ReminderScheduleConfig,
): Date | null {
  const slots = getTodayReminderSlots(nowUtc, config)
  const next = slots.find((s) => s.isNext)
  return next?.localTime ?? null
}

/**
 * Determines whether a reminder slot at `slotUtcTime` should fire given `nowUtc`.
 *
 * A slot is "due" if:
 *   slotUtcTime <= nowUtc < slotUtcTime + intervalMinutes
 *
 * This 1-minute scheduler window guarantees each slot is only triggered once.
 * With a 1-minute cron and this check, each slot has exactly one trigger window.
 */
export function isSlotDue(slotUtcTime: Date, nowUtc: Date, intervalMinutes: number): boolean {
  const windowEnd = addMinutes(slotUtcTime, intervalMinutes)
  return (
    (isEqual(slotUtcTime, nowUtc) || isBefore(slotUtcTime, nowUtc)) &&
    isBefore(nowUtc, windowEnd)
  )
}

/**
 * Build the unique schedule_occurrence_key for a given user and slot time.
 *
 * Format: "<userId>:<YYYY-MM-DD>T<HH:MM>" (local timezone)
 *
 * This key is used as the UNIQUE constraint in notification_events to prevent
 * duplicate processing. Two concurrent scheduler invocations will both attempt
 * INSERT ... ON CONFLICT DO NOTHING, and exactly one will proceed.
 */
export function buildOccurrenceKey(userId: string, slotUtcTime: Date, timezone: string): string {
  const local = toZonedTime(slotUtcTime, timezone)
  const dateStr = format(local, 'yyyy-MM-dd')
  const timeStr = format(local, 'HH:mm')
  return `${userId}:${dateStr}T${timeStr}`
}

/**
 * Parse an ISO HH:MM string to total minutes from midnight.
 */
export function hhmmToMinutes(hhmm: string): number {
  const { hours, minutes } = parseHHMM(hhmm)
  return hours * 60 + minutes
}

/**
 * Convert total minutes from midnight to HH:MM.
 */
export function minutesToHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Compute the countdown (in seconds) until the next reminder slot.
 * Returns null if no more reminders today.
 */
export function secondsUntilNextReminder(nowUtc: Date, config: ReminderScheduleConfig): number | null {
  const next = getNextReminderSlot(nowUtc, config)
  if (!next) return null
  const diff = next.getTime() - nowUtc.getTime()
  return Math.max(0, Math.floor(diff / 1000))
}

/**
 * Format seconds as "Xh Ym" or "Ym" or "Xs".
 */
export function formatCountdown(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m`
  }
  return `${seconds}s`
}

/**
 * Check whether `nowUtc` falls within the reminder window for the given config.
 */
export function isWithinReminderWindow(nowUtc: Date, config: ReminderScheduleConfig): boolean {
  const { timezone, reminderStartTime, reminderEndTime } = config
  const nowLocal = toZonedTime(nowUtc, timezone)
  const start = localSlotTime(nowLocal, reminderStartTime, timezone)
  const end = localSlotTime(nowLocal, reminderEndTime, timezone)
  return (
    (isEqual(nowUtc, start) || isBefore(start, nowUtc)) &&
    (isBefore(nowUtc, end) || isEqual(nowUtc, end))
  )
}

/** @internal — for testing only */
export function _parseISO(s: string): Date {
  return parseISO(s)
}

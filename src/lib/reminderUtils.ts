/**
 * reminderUtils.ts
 *
 * Pure functions for computing reminder schedules, custom slots, quiet hours,
 * day-of-week active windows, and countdowns.
 *
 * Fully deterministic & unit-testable.
 */

import { addMinutes, format, isBefore, isEqual } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { ReminderSlot } from '@/types'

// ─── Default 5-slot schedule (9:00 AM, 12:00 PM, 3:00 PM, 6:00 PM, 9:00 PM) ───
export const DEFAULT_REMINDER_SLOTS: string[] = ['09:00', '12:00', '15:00', '18:00', '21:00']

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReminderScheduleConfig {
  timezone: string
  reminderStartTime: string
  reminderEndTime: string
  intervalMinutes: number
}

export interface CustomScheduleConfig {
  timezone: string
  customSlots: string[]
  activeSlots: string[]
  activeDays: number[] // 1=Mon ... 7=Sun (ISO weekday)
  quietHoursEnabled: boolean
  quietHoursStart: string // 'HH:MM'
  quietHoursEnd: string   // 'HH:MM'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function parseHHMM(hhmm: string): { hours: number; minutes: number } {
  const parts = hhmm.split(':').map(Number)
  const h = parts[0]
  const m = parts[1]
  if (h === undefined || m === undefined || isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error(`Invalid HH:MM string: ${hhmm}`)
  }
  return { hours: h, minutes: m }
}

export function hhmmToMinutes(hhmm: string): number {
  const { hours, minutes } = parseHHMM(hhmm)
  return hours * 60 + minutes
}

export function minutesToHHMM(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  const h = Math.floor(normalized / 60)
  const m = normalized % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Build a Date in the user's local timezone for a given HH:MM on a given local date.
 */
export function localSlotTimeToUtc(localDate: Date, hhmm: string, timezone: string): Date {
  const { hours, minutes } = parseHHMM(hhmm)
  const localIso =
    format(toZonedTime(localDate, timezone), 'yyyy-MM-dd') +
    `T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
  return fromZonedTime(localIso, timezone)
}

/**
 * Evaluates whether quiet hours are active at the given local time.
 * Handles quiet hours that cross midnight (e.g. 22:00 -> 08:00).
 */
export function isQuietHoursActive(
  nowDate: Date,
  quietHours: { enabled: boolean; start: string; end: string },
  timezone: string = 'UTC',
): boolean {
  if (!quietHours.enabled) return false

  const zoned = toZonedTime(nowDate, timezone)
  const currentMinutes = zoned.getHours() * 60 + zoned.getMinutes()
  const startMinutes = hhmmToMinutes(quietHours.start)
  const endMinutes = hhmmToMinutes(quietHours.end)

  if (startMinutes > endMinutes) {
    // Crosses midnight, e.g. 22:00 (1320) to 08:00 (480)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  } else if (startMinutes < endMinutes) {
    // Within same day, e.g. 13:00 (780) to 15:00 (900)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }
  return false
}

/**
 * Checks whether the day of the week is active (1 = Monday, 7 = Sunday).
 */
export function isDayActive(nowDate: Date, activeDays: number[], timezone: string = 'UTC'): boolean {
  if (!activeDays || activeDays.length === 0) return true
  const zoned = toZonedTime(nowDate, timezone)
  const jsDay = zoned.getDay()
  const isoDay = jsDay === 0 ? 7 : jsDay
  return activeDays.includes(isoDay)
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Enumerate all scheduled reminder slots for a given local day (traditional interval-based).
 */
export function getTodayReminderSlots(
  nowUtc: Date,
  config: ReminderScheduleConfig,
): ReminderSlot[] {
  const { timezone, reminderStartTime, reminderEndTime, intervalMinutes } = config
  const nowLocal = toZonedTime(nowUtc, timezone)

  const start = localSlotTimeToUtc(nowLocal, reminderStartTime, timezone)
  const end = localSlotTimeToUtc(nowLocal, reminderEndTime, timezone)

  const slots: ReminderSlot[] = []
  let current = start
  let foundNext = false

  while (isBefore(current, end) || isEqual(current, end)) {
    const slotKey = buildOccurrenceKey('__placeholder__', current, timezone)
    const isPast = isBefore(current, nowUtc)
    const isNext = !isPast && !foundNext
    if (isNext) foundNext = true

    const timeStr = format(toZonedTime(current, timezone), 'HH:mm')

    slots.push({
      timeStr,
      localTime: current,
      slotKey,
      isActive: true,
      isPast,
      isNext,
    })

    current = addMinutes(current, intervalMinutes)
  }

  return slots
}

/**
 * Enumerate all customizable reminder slots for today.
 */
export function getCustomReminderSlots(
  nowUtc: Date,
  config: CustomScheduleConfig,
): ReminderSlot[] {
  const { timezone, customSlots, activeSlots, activeDays, quietHoursEnabled, quietHoursStart, quietHoursEnd } = config
  const nowLocal = toZonedTime(nowUtc, timezone)

  const sortedSlots = [...new Set(customSlots)].sort((a, b) => hhmmToMinutes(a) - hhmmToMinutes(b))
  const slots: ReminderSlot[] = []
  let foundNext = false

  for (const timeStr of sortedSlots) {
    const slotUtc = localSlotTimeToUtc(nowLocal, timeStr, timezone)
    const slotKey = buildOccurrenceKey('__placeholder__', slotUtc, timezone)
    const isActive = activeSlots.includes(timeStr)
    const inQuietHours = isQuietHoursActive(slotUtc, {
      enabled: quietHoursEnabled,
      start: quietHoursStart,
      end: quietHoursEnd,
    }, timezone)
    const isDayEnabled = isDayActive(slotUtc, activeDays, timezone)

    const isPast = isBefore(slotUtc, nowUtc)
    const eligibleForNext = isActive && !inQuietHours && isDayEnabled && !isPast
    const isNext = eligibleForNext && !foundNext
    if (isNext) foundNext = true

    slots.push({
      timeStr,
      localTime: slotUtc,
      slotKey,
      isActive,
      isPast,
      isNext,
    })
  }

  return slots
}

/**
 * Returns the next upcoming reminder slot after `nowUtc`, or null if none remaining today.
 */
export function getNextReminderSlot(
  nowUtc: Date,
  config: ReminderScheduleConfig,
): Date | null {
  const slots = getTodayReminderSlots(nowUtc, config)
  const next = slots.find((s) => s.isNext)
  return next?.localTime ?? null
}

export function getNextCustomReminderSlot(
  nowUtc: Date,
  config: CustomScheduleConfig,
): Date | null {
  const slots = getCustomReminderSlots(nowUtc, config)
  const next = slots.find((s) => s.isNext)
  return next?.localTime ?? null
}

/**
 * Determines whether a reminder slot at `slotUtcTime` should fire given `nowUtc`.
 */
export function isSlotDue(slotUtcTime: Date, nowUtc: Date, intervalMinutes: number = 180): boolean {
  const windowEnd = addMinutes(slotUtcTime, intervalMinutes)
  return (
    (isEqual(slotUtcTime, nowUtc) || isBefore(slotUtcTime, nowUtc)) &&
    isBefore(nowUtc, windowEnd)
  )
}

/**
 * Build the unique schedule_occurrence_key for a given user and slot time.
 * Format: "<userId>:<YYYY-MM-DD>T<HH:MM>" (local timezone)
 */
export function buildOccurrenceKey(userId: string, slotUtcTime: Date, timezone: string): string {
  const local = toZonedTime(slotUtcTime, timezone)
  const dateStr = format(local, 'yyyy-MM-dd')
  const timeStr = format(local, 'HH:mm')
  return `${userId}:${dateStr}T${timeStr}`
}

/**
 * Compute the countdown (in seconds) until the next reminder slot.
 */
export function secondsUntilNextReminder(nowUtc: Date, config: ReminderScheduleConfig | CustomScheduleConfig): number | null {
  let next: Date | null = null
  if ('customSlots' in config) {
    next = getNextCustomReminderSlot(nowUtc, config)
  } else {
    next = getNextReminderSlot(nowUtc, config)
  }
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
  const start = localSlotTimeToUtc(nowLocal, reminderStartTime, timezone)
  const end = localSlotTimeToUtc(nowLocal, reminderEndTime, timezone)
  return (
    (isEqual(nowUtc, start) || isBefore(start, nowUtc)) &&
    (isBefore(nowUtc, end) || isEqual(nowUtc, end))
  )
}

import { describe, it, expect } from 'vitest'
import {
  getTodayReminderSlots,
  getNextReminderSlot,
  isSlotDue,
  buildOccurrenceKey,
  formatCountdown,
  secondsUntilNextReminder,
  type ReminderScheduleConfig,
} from '@/lib/reminderUtils'

describe('reminderUtils', () => {
  const defaultConfig: ReminderScheduleConfig = {
    timezone: 'UTC',
    reminderStartTime: '09:00',
    reminderEndTime: '21:00',
    intervalMinutes: 180, // 3 hours
  }

  it('generates expected 3-hour slots from 09:00 to 21:00 (inclusive)', () => {
    // 2026-10-24 08:00 UTC
    const nowUtc = new Date('2026-10-24T08:00:00Z')
    const slots = getTodayReminderSlots(nowUtc, defaultConfig)

    // Expected slots: 09:00, 12:00, 15:00, 18:00, 21:00 -> exactly 5 slots
    expect(slots).toHaveLength(5)
    expect(slots[0].isPast).toBe(false)
    expect(slots[0].isNext).toBe(true)
    expect(slots[1].isNext).toBe(false)
  })

  it('correctly marks past and next slots mid-day', () => {
    // 2026-10-24 13:30 UTC
    const nowUtc = new Date('2026-10-24T13:30:00Z')
    const slots = getTodayReminderSlots(nowUtc, defaultConfig)

    expect(slots).toHaveLength(5)
    // 09:00 -> past
    expect(slots[0].isPast).toBe(true)
    expect(slots[0].isNext).toBe(false)
    // 12:00 -> past
    expect(slots[1].isPast).toBe(true)
    expect(slots[1].isNext).toBe(false)
    // 15:00 -> next
    expect(slots[2].isPast).toBe(false)
    expect(slots[2].isNext).toBe(true)
    // 18:00, 21:00 -> future but not next
    expect(slots[3].isNext).toBe(false)
    expect(slots[4].isNext).toBe(false)
  })

  it('determines the next upcoming reminder slot', () => {
    const nowUtc = new Date('2026-10-24T10:00:00Z')
    const next = getNextReminderSlot(nowUtc, defaultConfig)
    expect(next).not.toBeNull()
    expect(next?.toISOString()).toBe('2026-10-24T12:00:00.000Z')
  })

  it('returns null for next slot if all slots for today are past', () => {
    const nowUtc = new Date('2026-10-24T22:00:00Z')
    const next = getNextReminderSlot(nowUtc, defaultConfig)
    expect(next).toBeNull()
  })

  it('evaluates isSlotDue properly within the trigger window', () => {
    const slotTime = new Date('2026-10-24T09:00:00Z')
    // Exactly at slot
    expect(isSlotDue(slotTime, new Date('2026-10-24T09:00:00Z'), 180)).toBe(true)
    // 5 minutes in
    expect(isSlotDue(slotTime, new Date('2026-10-24T09:05:00Z'), 180)).toBe(true)
    // Before slot
    expect(isSlotDue(slotTime, new Date('2026-10-24T08:59:59Z'), 180)).toBe(false)
    // After interval expires
    expect(isSlotDue(slotTime, new Date('2026-10-24T12:00:00Z'), 180)).toBe(false)
  })

  it('builds unique occurrence key with user ID and local timestamp', () => {
    const slot = new Date('2026-10-24T09:00:00Z')
    const key = buildOccurrenceKey('user-123', slot, 'UTC')
    expect(key).toBe('user-123:2026-10-24T09:00')
  })

  it('computes and formats countdown string appropriately', () => {
    const nowUtc = new Date('2026-10-24T10:00:00Z')
    const seconds = secondsUntilNextReminder(nowUtc, defaultConfig)
    // Next slot is 12:00 UTC -> 2 hours = 7200 seconds
    expect(seconds).toBe(7200)

    expect(formatCountdown(3600 + 45 * 60)).toBe('1h 45m')
    expect(formatCountdown(3600)).toBe('1h')
    expect(formatCountdown(120)).toBe('2m')
    expect(formatCountdown(45)).toBe('45s')
  })
})

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_REMINDER_SLOTS,
  getCustomReminderSlots,
  isQuietHoursActive,
  isDayActive,
  buildOccurrenceKey,
  hhmmToMinutes,
  minutesToHHMM,
  type CustomScheduleConfig,
} from '@/lib/reminderUtils'

describe('Custom Reminder Engine & Quiet Hours', () => {
  const baseConfig: CustomScheduleConfig = {
    timezone: 'UTC',
    customSlots: [...DEFAULT_REMINDER_SLOTS],
    activeSlots: [...DEFAULT_REMINDER_SLOTS],
    activeDays: [1, 2, 3, 4, 5, 6, 7],
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  }

  it('verifies default 5-slot schedule includes 09:00, 12:00, 15:00, 18:00, 21:00', () => {
    expect(DEFAULT_REMINDER_SLOTS).toEqual(['09:00', '12:00', '15:00', '18:00', '21:00'])
    const nowUtc = new Date('2026-10-24T07:00:00Z')
    const slots = getCustomReminderSlots(nowUtc, baseConfig)
    expect(slots).toHaveLength(5)
    expect(slots.map((s) => s.timeStr)).toEqual(['09:00', '12:00', '15:00', '18:00', '21:00'])
    expect(slots[0].isNext).toBe(true)
  })

  it('respects user-defined custom slots and sorting', () => {
    const customConfig: CustomScheduleConfig = {
      ...baseConfig,
      customSlots: ['14:30', '08:15', '20:00'],
      activeSlots: ['14:30', '08:15', '20:00'],
    }
    const nowUtc = new Date('2026-10-24T10:00:00Z')
    const slots = getCustomReminderSlots(nowUtc, customConfig)

    // Should be sorted: 08:15, 14:30, 20:00
    expect(slots.map((s) => s.timeStr)).toEqual(['08:15', '14:30', '20:00'])
    expect(slots[0].isPast).toBe(true)
    expect(slots[1].isNext).toBe(true)
  })

  it('respects quiet hours crossing midnight (e.g. 22:00 to 08:00)', () => {
    const quiet = { enabled: true, start: '22:00', end: '08:00' }

    // 23:30 is quiet
    const lateNight = new Date('2026-10-24T23:30:00Z')
    expect(isQuietHoursActive(lateNight, quiet)).toBe(true)

    // 04:15 is quiet
    const earlyMorning = new Date('2026-10-24T04:15:00Z')
    expect(isQuietHoursActive(earlyMorning, quiet)).toBe(true)

    // 08:00 is active (end of quiet window)
    const morningActive = new Date('2026-10-24T08:00:00Z')
    expect(isQuietHoursActive(morningActive, quiet)).toBe(false)

    // 14:00 is active
    const afternoon = new Date('2026-10-24T14:00:00Z')
    expect(isQuietHoursActive(afternoon, quiet)).toBe(false)
  })

  it('respects active days of the week', () => {
    // 2026-10-24 is a Saturday (ISO Day 6)
    const saturday = new Date('2026-10-24T12:00:00Z')
    // 2026-10-26 is a Monday (ISO Day 1)
    const monday = new Date('2026-10-26T12:00:00Z')

    const weekdaysOnly = [1, 2, 3, 4, 5]
    expect(isDayActive(saturday, weekdaysOnly)).toBe(false)
    expect(isDayActive(monday, weekdaysOnly)).toBe(true)
  })

  it('guarantees deterministic schedule_occurrence_key for duplicate prevention', () => {
    const slot = new Date('2026-10-24T15:00:00Z')
    const key = buildOccurrenceKey('user-test-uuid', slot, 'America/New_York')
    // 15:00 UTC = 11:00 EDT in New York
    expect(key).toBe('user-test-uuid:2026-10-24T11:00')
  })

  it('correctly parses and formats time minutes', () => {
    expect(hhmmToMinutes('09:15')).toBe(555)
    expect(minutesToHHMM(555)).toBe('09:15')
    expect(minutesToHHMM(0)).toBe('00:00')
    expect(minutesToHHMM(1439)).toBe('23:59')
  })
})

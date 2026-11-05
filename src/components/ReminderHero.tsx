import React, { useState, useEffect } from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTaskStore } from '@/store/useTaskStore'
import {
  getCustomReminderSlots,
  secondsUntilNextReminder,
  formatCountdown,
  type CustomScheduleConfig,
} from '@/lib/reminderUtils'
import { format, addDays, startOfWeek } from 'date-fns'

export const ReminderHero: React.FC = () => {
  const { preferences, permission, enablePushNotifications } = useSettingsStore()
  const { tasks } = useTaskStore()
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [todaySlots, setTodaySlots] = useState<ReturnType<typeof getCustomReminderSlots>>([])
  const [_selectedDayOffset, setSelectedDayOffset] = useState(0)

  const pendingToday = tasks.filter((t) => t.status !== 'completed' && t.archived_at === null)

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const scheduleConfig: CustomScheduleConfig = {
        timezone: preferences.timezone,
        customSlots: preferences.custom_slots || ['09:00', '12:00', '15:00', '18:00', '21:00'],
        activeSlots: preferences.active_slots || ['09:00', '12:00', '15:00', '18:00', '21:00'],
        activeDays: preferences.active_days || [1, 2, 3, 4, 5, 6, 7],
        quietHoursEnabled: preferences.quiet_hours_enabled,
        quietHoursStart: preferences.quiet_hours_start,
        quietHoursEnd: preferences.quiet_hours_end,
      }
      setSecondsLeft(secondsUntilNextReminder(now, scheduleConfig))
      setTodaySlots(getCustomReminderSlots(now, scheduleConfig))
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [preferences])

  // Compute days of the week starting from Monday
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    const isToday = format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    return {
      date: d,
      dayName: format(d, 'EEE'),
      dayNum: format(d, 'd'),
      isToday,
      offset: i,
    }
  })

  const bookedHours = (
    pendingToday.reduce((acc, t) => acc + (t.estimated_duration_minutes || 30), 0) / 60
  ).toFixed(1)

  return (
    <div className="mb-6 space-y-5">
      {/* Date Horizon Carousel Header */}
      <section className="flex flex-col gap-2 pt-1">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#DAC58F] font-semibold">
              Temporal Architecture
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-white">
              Today’s Schedule
            </h1>
          </div>
          <div className="flex items-center gap-1.5 bg-[#1B1C1E] border border-[#DAC58F]/15 px-3 py-1 rounded-full text-[#D0C5AF] shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DAC58F]" />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              {preferences.timezone}
            </span>
          </div>
        </div>

        {/* Date Strip Scrollable Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto py-1.5 scrollbar-none">
          {weekDays.map((wd) => {
            const isSelected = wd.isToday
            return (
              <button
                key={wd.dayNum}
                type="button"
                onClick={() => setSelectedDayOffset(wd.offset)}
                className={`flex flex-col items-center justify-center min-w-[52px] py-2 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#56481E] border-[#DAC58F]/40 text-[#F2CA50] shadow-md ring-1 ring-[#DAC58F]/30'
                    : 'bg-[#1B1C1E] border-[#DAC58F]/10 text-[#99907C] hover:text-[#E3E2E5] hover:bg-[#24262A]'
                }`}
              >
                <span className={`text-[10px] uppercase font-semibold ${isSelected ? 'text-[#DAC58F]' : ''}`}>
                  {wd.dayName}
                </span>
                <span className={`font-mono text-base font-bold mt-0.5 ${isSelected ? 'text-white' : ''}`}>
                  {wd.dayNum}
                </span>
                {isSelected && (
                  <span className="w-1 h-1 rounded-full bg-[#DAC58F] absolute bottom-1 shadow-[0_0_4px_#DAC58F]" />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Composure Architecture Card */}
      <section className="bg-[#1B1C1E] border border-[#DAC58F]/15 rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-36 h-36 rounded-full bg-[#56481E]/30 blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between gap-4 relative z-10">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#DAC58F]">
                hourglass_top
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#DAC58F] font-semibold">
                Composure Architecture
              </span>
            </div>
            <h2 className="font-serif text-base sm:text-lg text-white leading-tight">
              Focus Horizon: {bookedHours}h Deep Work Booked
            </h2>
            <p className="text-xs text-[#99907C]">
              Continuous check-ins running at designated reminder windows. Push notification fires 10m prior to milestones.
            </p>
          </div>

          {/* Micro Composure Index Dial */}
          <div className="flex flex-col items-center justify-center flex-shrink-0 bg-[#121315] border border-[#DAC58F]/15 rounded-xl p-3 min-w-[78px] shadow-sm">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 -rotate-90 transform" viewBox="0 0 48 48">
                <circle
                  className="text-[#292A2C]"
                  cx="24"
                  cy="24"
                  fill="transparent"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <circle
                  className="text-[#DAC58F]"
                  cx="24"
                  cy="24"
                  fill="transparent"
                  r="20"
                  stroke="currentColor"
                  strokeDasharray="125.6"
                  strokeDashoffset="27.6"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </svg>
              <span className="absolute font-mono text-xs font-bold text-white">
                {secondsLeft !== null && secondsLeft > 0 ? formatCountdown(secondsLeft) : '84%'}
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-wider text-[#99907C] font-mono mt-1">
              Calm Index
            </span>
          </div>
        </div>
      </section>

      {/* Push Permission Callout if not enabled */}
      {permission !== 'granted' && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#56481E]/40 border border-[#DAC58F]/30 text-[#DAC58F] text-xs">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg text-[#F2CA50]">
              notifications_active
            </span>
            <div>
              <span className="font-semibold text-white block">Push Notifications Arming</span>
              <span className="text-[11px] text-[#D0C5AF]">
                Enable web push to receive 10-minute advance dispatches and scheduled slot alerts.
              </span>
            </div>
          </div>
          <button
            onClick={enablePushNotifications}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-[#F2CA50] text-[#141211] font-semibold text-xs whitespace-nowrap hover:opacity-90 transition cursor-pointer"
          >
            Arm Push
          </button>
        </div>
      )}

      {/* Today's Reminder Schedule Slots with Bronzed Hairline Axis */}
      <section className="bg-[#1B1C1E] border border-[#DAC58F]/15 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#DAC58F] text-[18px]">
              schedule
            </span>
            <h3 className="font-serif text-base text-white">
              Today's Reminder Schedule
            </h3>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#99907C]">
            528Hz Dispatch
          </span>
        </div>

        {todaySlots.length === 0 ? (
          <p className="text-xs text-[#99907C] italic">
            No active reminder slots configured for today.
          </p>
        ) : (
          <div className="relative flex flex-col gap-3 pl-6">
            {/* Bronzed Hairline Axis */}
            <div className="absolute left-2.5 top-2 bottom-2 w-[1px] bg-[#DAC58F]/25" />

            {todaySlots.map((slot) => {
              const timeFormatted = format(slot.localTime, 'h:mm a')
              return (
                <div key={slot.slotKey} className="relative flex items-center justify-between text-xs py-1">
                  {/* Pin Node */}
                  <div
                    className={`absolute -left-6 w-3 h-3 rounded-full border transition-all ${
                      slot.isPast
                        ? 'bg-[#292A2C] border-[#DAC58F]/20 text-[#DAC58F]'
                        : slot.isNext
                        ? 'bg-[#F2CA50] border-[#D4AF37] shadow-[0_0_8px_#F2CA50]'
                        : 'bg-[#121315] border-[#DAC58F]/30'
                    }`}
                  />

                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-white font-medium text-xs">
                      {timeFormatted}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-[#99907C]">
                      Slot {slot.timeStr}
                    </span>
                  </div>

                  <div>
                    {slot.isPast ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#292A2C] text-[#99907C]">
                        Dispatched ✓
                      </span>
                    ) : slot.isNext ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-[#56481E] border border-[#DAC58F]/40 text-[#F2CA50] shadow-sm animate-pulse">
                        Next Horizon
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#121315] text-[#99907C] border border-[#DAC58F]/10">
                        Queued
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

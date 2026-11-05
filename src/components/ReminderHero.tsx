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
    <div className="mb-8 space-y-6">
      {/* Date Horizon Carousel Header */}
      <section className="flex flex-col gap-2 pt-1">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#745A2E] font-semibold">
              Temporal Architecture
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#181615]">
              Today’s Schedule
            </h1>
          </div>
          <div className="flex items-center gap-1.5 bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] px-3 py-1 rounded-full text-[#2D2926] shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#745A2E]" />
            <span className="text-[10px] font-mono uppercase tracking-wider font-medium">
              {preferences.timezone}
            </span>
          </div>
        </div>

        {/* Date Strip Scrollable Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none">
          {weekDays.map((wd) => {
            const isSelected = wd.isToday
            return (
              <button
                key={wd.dayNum}
                type="button"
                onClick={() => setSelectedDayOffset(wd.offset)}
                className={`flex flex-col items-center justify-center min-w-[54px] py-2.5 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#181615] border-[#181615] text-[#FAF7F2] shadow-sm'
                    : 'bg-[#F4EFEB] border-[rgba(45,41,38,0.08)] text-[#7A746E] hover:text-[#181615] hover:bg-[#EFECE3]'
                }`}
              >
                <span className={`text-[10px] uppercase font-semibold ${isSelected ? 'text-[#FAF7F2]' : 'text-[#7A746E]'}`}>
                  {wd.dayName}
                </span>
                <span className={`font-mono text-base font-bold mt-0.5 ${isSelected ? 'text-[#FAF7F2]' : 'text-[#181615]'}`}>
                  {wd.dayNum}
                </span>
                {isSelected && (
                  <span className="w-1 h-1 rounded-full bg-[#C2A26F] absolute bottom-1.5" />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Composure Architecture Card */}
      <section className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between gap-4 relative z-10">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#745A2E]">
                hourglass_top
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#745A2E] font-semibold">
                Composure Architecture
              </span>
            </div>
            <h2 className="font-serif text-lg sm:text-xl text-[#181615] leading-tight">
              Focus Horizon: {bookedHours}h Deep Work Booked
            </h2>
            <p className="text-xs text-[#7A746E]">
              Continuous check-ins running at designated reminder windows. Push notification fires 10m prior to milestones.
            </p>
          </div>

          {/* Micro Composure Index Dial */}
          <div className="flex flex-col items-center justify-center flex-shrink-0 bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] rounded-xl p-3 min-w-[78px] shadow-xs">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 -rotate-90 transform" viewBox="0 0 48 48">
                <circle
                  className="text-[#EFECE3]"
                  cx="24"
                  cy="24"
                  fill="transparent"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <circle
                  className="text-[#745A2E]"
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
              <span className="absolute font-mono text-xs font-bold text-[#181615]">
                {secondsLeft !== null && secondsLeft > 0 ? formatCountdown(secondsLeft) : '84%'}
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-wider text-[#7A746E] font-mono mt-1">
              Calm Index
            </span>
          </div>
        </div>
      </section>

      {/* Push Permission Callout if not enabled */}
      {permission !== 'granted' && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#FEDAA3]/40 border border-[#745A2E]/25 text-[#745A2E] text-xs">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg text-[#745A2E]">
              notifications_active
            </span>
            <div>
              <span className="font-semibold text-[#181615] block">Push Notifications Arming</span>
              <span className="text-[11px] text-[#2D2926]">
                Enable web push to receive 10-minute advance dispatches and scheduled slot alerts.
              </span>
            </div>
          </div>
          <button
            onClick={enablePushNotifications}
            className="btn-primary px-3.5 py-1.5 rounded-md font-semibold text-xs whitespace-nowrap cursor-pointer"
          >
            Arm Push
          </button>
        </div>
      )}

      {/* Today's Reminder Schedule Slots with Bronzed Hairline Axis */}
      <section className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#745A2E] text-[18px]">
              schedule
            </span>
            <h3 className="font-serif text-lg text-[#181615]">
              Today's Reminder Schedule
            </h3>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#7A746E]">
            528Hz Dispatch
          </span>
        </div>

        {todaySlots.length === 0 ? (
          <p className="text-xs text-[#7A746E] italic">
            No active reminder slots configured for today.
          </p>
        ) : (
          <div className="relative flex flex-col gap-3 pl-6">
            {/* Bronzed Hairline Axis */}
            <div className="absolute left-2.5 top-2 bottom-2 w-[1px] bg-[rgba(45,41,38,0.12)]" />

            {todaySlots.map((slot) => {
              const timeFormatted = format(slot.localTime, 'h:mm a')
              return (
                <div key={slot.slotKey} className="relative flex items-center justify-between text-xs py-1">
                  {/* Pin Node */}
                  <div
                    className={`absolute -left-6 w-3 h-3 rounded-full border transition-all ${
                      slot.isPast
                        ? 'bg-[#4A6B56] border-[#4A6B56]'
                        : slot.isNext
                        ? 'bg-[#745A2E] border-[#C2A26F] shadow-[0_0_6px_rgba(116,90,46,0.3)]'
                        : 'bg-[#FAF7F2] border-[rgba(45,41,38,0.2)]'
                    }`}
                  />

                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[#181615] font-semibold text-xs">
                      {timeFormatted}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-[#7A746E]">
                      Slot {slot.timeStr}
                    </span>
                  </div>

                  <div>
                    {slot.isPast ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#EFECE3] text-[#4A6B56] font-medium">
                        Dispatched ✓
                      </span>
                    ) : slot.isNext ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-[#181615] text-[#FAF7F2] shadow-xs">
                        Next Horizon
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FAF7F2] text-[#7A746E] border border-[rgba(45,41,38,0.08)]">
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

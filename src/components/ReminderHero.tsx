import React, { useState, useEffect } from 'react'
import { Clock, AlertCircle, Bell, Check, Sparkles, Moon } from 'lucide-react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTaskStore } from '@/store/useTaskStore'
import {
  getCustomReminderSlots,
  secondsUntilNextReminder,
  formatCountdown,
  type CustomScheduleConfig,
} from '@/lib/reminderUtils'
import { format } from 'date-fns'

export const ReminderHero: React.FC = () => {
  const { preferences, permission, enablePushNotifications } = useSettingsStore()
  const { tasks } = useTaskStore()
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [todaySlots, setTodaySlots] = useState<ReturnType<typeof getCustomReminderSlots>>([])

  const pendingToday = tasks.filter((t) => t.status !== 'completed' && t.archived_at === null)
  const urgentCount = pendingToday.filter((t) => t.priority === 'urgent' || t.priority === 'high').length

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

  // Next slot time
  const nextSlot = todaySlots.find((s) => s.isNext)
  const nextSlotTimeStr = nextSlot ? format(nextSlot.localTime, 'h:mm a') : null

  return (
    <div className="mb-6 space-y-4">
      {/* Top Introduction Row */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-['Outfit']">
            Make today count.
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            {pendingToday.length === 0 ? (
              <span className="text-emerald-400 font-medium inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                All tasks complete for today. Excellent focus!
              </span>
            ) : (
              <span>
                <strong className="text-white font-medium">{pendingToday.length}</strong>{' '}
                {pendingToday.length === 1 ? 'task' : 'tasks'} remaining
                {urgentCount > 0 && (
                  <span>
                    {' '}• <strong className="text-amber-400 font-medium">{urgentCount}</strong> high priority
                  </span>
                )}
                {nextSlotTimeStr && (
                  <span>
                    {' '}• Next check-in at <strong className="text-white font-medium">{nextSlotTimeStr}</strong>
                  </span>
                )}
              </span>
            )}
          </p>
        </div>

        {/* Live Reminder Timing Badge */}
        <div className="flex items-center space-x-2 text-xs flex-shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-[#151B28] border border-white/[0.08] text-[#94A3B8] flex items-center space-x-2 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#70DFFF] opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#70DFFF]"></span>
            </span>
            <Clock className="w-3.5 h-3.5 text-[#70DFFF]" />
            <span className="text-[#64748B]">Next alert:</span>
            <span className="tabular-nums font-mono text-white font-medium">
              {secondsLeft !== null && secondsLeft > 0 ? formatCountdown(secondsLeft) : 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Push Permission Callout */}
      {permission !== 'granted' && (
        <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-200 text-xs">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-amber-200/90">
              Enable background notifications to receive automated check-ins when Chroniq is closed.
            </span>
          </div>
          <button
            onClick={enablePushNotifications}
            className="px-3 py-1 rounded-md bg-amber-400 text-[#080B12] font-semibold hover:bg-amber-300 transition cursor-pointer flex-shrink-0 ml-3"
          >
            Enable
          </button>
        </div>
      )}

      {/* Refined Horizontal Reminder Timeline */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#121826] border border-white/[0.06] shadow-sm">
        <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-3">
          <div className="flex items-center space-x-2 font-medium text-white">
            <Bell className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span className="font-['Outfit'] tracking-wide">Today's Reminder Schedule</span>
          </div>
          <div className="flex items-center space-x-2.5 text-[11px] text-[#64748B]">
            <span className="font-mono text-[#94A3B8]">{preferences.timezone}</span>
            {preferences.quiet_hours_enabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.04] text-[#94A3B8]">
                <Moon className="w-3 h-3 text-[#A99AFF]" />
                Quiet: {preferences.quiet_hours_start}–{preferences.quiet_hours_end}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {todaySlots.map((slot, idx) => {
            const timeFormatted = format(slot.localTime, 'h:mm a')
            return (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border text-xs transition ${
                  slot.isNext
                    ? 'bg-[#151B28] border-[#70DFFF]/50 shadow-xs ring-1 ring-[#70DFFF]/20'
                    : slot.isPast
                    ? 'bg-[#080B12]/60 border-white/[0.03] opacity-50'
                    : slot.isActive
                    ? 'bg-[#151B28]/70 border-white/[0.06] hover:border-white/[0.12]'
                    : 'bg-[#080B12]/30 border-dashed border-white/[0.05] opacity-40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`tabular-nums font-mono font-medium ${
                      slot.isNext ? 'text-[#70DFFF]' : slot.isPast ? 'text-[#64748B]' : 'text-white'
                    }`}
                  >
                    {timeFormatted}
                  </span>
                  {slot.isPast ? (
                    <Check className="w-3.5 h-3.5 text-[#64748B]" />
                  ) : slot.isNext ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#70DFFF] animate-pulse" />
                  ) : !slot.isActive ? (
                    <span className="text-[10px] text-[#64748B]">Off</span>
                  ) : null}
                </div>
                <div className="text-[11px] text-[#64748B]">
                  {slot.isPast ? 'Passed' : slot.isNext ? 'Next up' : slot.isActive ? 'Active' : 'Disabled'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

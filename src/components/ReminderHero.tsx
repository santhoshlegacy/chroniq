import React, { useState, useEffect } from 'react'
import { Clock, Send, AlertCircle, Bell, Check } from 'lucide-react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTaskStore } from '@/store/useTaskStore'
import { getTodayReminderSlots, secondsUntilNextReminder, formatCountdown } from '@/lib/reminderUtils'
import { format } from 'date-fns'

export const ReminderHero: React.FC = () => {
  const { preferences, permission, sendTestNotification, testNotificationStatus, enablePushNotifications } = useSettingsStore()
  const { tasks } = useTaskStore()
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [todaySlots, setTodaySlots] = useState<ReturnType<typeof getTodayReminderSlots>>([])
  const [isSending, setIsSending] = useState(false)

  const pendingToday = tasks.filter((t) => t.status !== 'completed' && t.archived_at === null)
  const urgentCount = pendingToday.filter((t) => t.priority === 'urgent' || t.priority === 'high').length

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const config = {
        timezone: preferences.timezone,
        reminderStartTime: preferences.reminder_start_time,
        reminderEndTime: preferences.reminder_end_time,
        intervalMinutes: preferences.interval_minutes,
      }
      setSecondsLeft(secondsUntilNextReminder(now, config))
      setTodaySlots(getTodayReminderSlots(now, config))
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [preferences])

  const handleTestNotification = async () => {
    setIsSending(true)
    await sendTestNotification(pendingToday.length)
    setIsSending(false)
  }

  // Next slot time
  const nextSlot = todaySlots.find((s) => s.isNext)
  const nextSlotTimeStr = nextSlot ? format(nextSlot.localTime, 'h:mm a') : null

  return (
    <div className="mb-6 space-y-4">
      {/* Top Introduction Row */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-['Outfit']">
            Make today count.
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">
            {pendingToday.length === 0 ? (
              <span className="text-emerald-400 font-medium">All tasks complete for today. Excellent focus!</span>
            ) : (
              <span>
                <strong className="text-white font-medium">{pendingToday.length}</strong> {pendingToday.length === 1 ? 'task' : 'tasks'} remaining
                {urgentCount > 0 && (
                  <span> • <strong className="text-amber-400 font-medium">{urgentCount}</strong> high priority</span>
                )}
                {nextSlotTimeStr && (
                  <span> • Next automated check at <strong className="text-white font-medium">{nextSlotTimeStr}</strong></span>
                )}
              </span>
            )}
          </p>
        </div>

        {/* Supporting reminder timing badge & test button */}
        <div className="flex items-center space-x-2 text-xs flex-shrink-0">
          <div className="px-2.5 py-1 rounded-lg bg-[#151B28] border border-white/[0.06] text-[#94A3B8] flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-[#70DFFF]" />
            <span className="text-[#64748B]">Next alert:</span>
            <span className="tabular-nums font-mono text-white font-medium">
              {secondsLeft !== null && secondsLeft > 0 ? formatCountdown(secondsLeft) : 'Active'}
            </span>
          </div>

          <button
            onClick={handleTestNotification}
            disabled={isSending}
            className="p-1.5 px-2 rounded-lg bg-[#151B28] hover:bg-[#1C2436] border border-white/[0.06] text-[#94A3B8] hover:text-white transition text-xs flex items-center space-x-1 cursor-pointer"
            title="Dispatch immediate test push to verify notifications"
          >
            <Send className="w-3 h-3 text-[#70DFFF]" />
            <span className="hidden sm:inline text-[11px]">{isSending ? 'Sending...' : 'Test Alert'}</span>
          </button>
        </div>
      </div>

      {/* Test Status feedback */}
      {testNotificationStatus && (
        <div className="p-2.5 rounded-xl bg-[#151B28] border border-[#70DFFF]/30 text-xs text-[#70DFFF] flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#70DFFF]" />
          <span>{testNotificationStatus}</span>
        </div>
      )}

      {/* Push Permission Callout (Discreet, Non-intrusive) */}
      {permission !== 'granted' && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-200 text-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Enable background notifications to receive automated 3-hour check-ins when Chroniq is closed.</span>
          </div>
          <button
            onClick={enablePushNotifications}
            className="px-2.5 py-1 rounded-md bg-amber-400 text-[#080B12] font-semibold hover:bg-amber-300 transition cursor-pointer flex-shrink-0 ml-3"
          >
            Enable
          </button>
        </div>
      )}

      {/* Refined Horizontal Reminder Timeline */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-[#111827] border border-white/[0.06]">
        <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-3">
          <div className="flex items-center space-x-2 font-medium text-white/90">
            <Bell className="w-3.5 h-3.5 text-[#70DFFF]" />
            <span>Daily 3-Hour Rhythm</span>
          </div>
          <span className="text-[11px] text-[#64748B] font-mono">
            {preferences.timezone} • {preferences.interval_minutes / 60}h intervals
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {todaySlots.map((slot, idx) => {
            const timeFormatted = format(slot.localTime, 'h:mm a')
            return (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border text-xs transition ${
                  slot.isNext
                    ? 'bg-[#151B28] border-[#70DFFF]/40 shadow-sm shadow-[#70DFFF]/10'
                    : slot.isPast
                    ? 'bg-[#080B12]/60 border-white/[0.04] opacity-50'
                    : 'bg-[#151B28]/60 border-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`tabular-nums font-mono font-medium ${
                    slot.isNext ? 'text-[#70DFFF]' : slot.isPast ? 'text-[#64748B]' : 'text-white'
                  }`}>
                    {timeFormatted}
                  </span>
                  {slot.isPast ? (
                    <Check className="w-3 h-3 text-[#64748B]" />
                  ) : slot.isNext ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#70DFFF]" />
                  ) : null}
                </div>
                <div className="text-[10px] text-[#64748B]">
                  {slot.isPast ? 'Passed' : slot.isNext ? 'Next up' : 'Scheduled'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

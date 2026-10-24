import React, { useEffect, useState } from 'react'
import { Bell, BellOff, Settings, Plus, Download, Check } from 'lucide-react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { secondsUntilNextReminder, formatCountdown } from '@/lib/reminderUtils'
import logoImg from '@/assets/logo.png'

interface NavbarProps {
  onOpenSettings: () => void
  onOpenNewTask: () => void
  onOpenInstall: () => void
  isStandalone?: boolean
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSettings,
  onOpenNewTask,
  onOpenInstall,
  isStandalone = false,
}) => {
  const { preferences, permission, enablePushNotifications, isSettingUpPush } = useSettingsStore()
  const [timeStr, setTimeStr] = useState<string>('')
  const [countdownStr, setCountdownStr] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      try {
        const formatted = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: preferences.timezone,
        }).format(now)
        setTimeStr(formatted)
      } catch {
        setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      }

      const config = {
        timezone: preferences.timezone,
        reminderStartTime: preferences.reminder_start_time,
        reminderEndTime: preferences.reminder_end_time,
        intervalMinutes: preferences.interval_minutes,
      }
      const secs = secondsUntilNextReminder(now, config)
      if (secs !== null && secs > 0) {
        setCountdownStr(formatCountdown(secs))
      } else if (secs === 0) {
        setCountdownStr('Due now')
      } else {
        setCountdownStr('Off window')
      }
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [preferences])

  return (
    <header className="sticky top-0 z-40 w-full header-glass">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/[0.1] bg-[#080B12] flex-shrink-0 flex items-center justify-center">
            <img
              src={logoImg}
              alt="Chroniq"
              className="w-full h-full object-cover scale-[2.2] translate-y-[22%]"
            />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-base font-bold tracking-tight text-white font-['Outfit']">
              Chroniq
            </span>
            <span className="text-[11px] text-[#64748B] hidden md:inline font-normal">
              Own your time.
            </span>
          </div>
        </div>

        {/* Live Clock & Next Reminder indicator (Subtle, Tabular) */}
        <div className="hidden sm:flex items-center space-x-3 text-xs text-[#94A3B8]">
          <span className="tabular-nums font-mono text-white/90">{timeStr}</span>
          <span className="text-white/20">•</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-[#64748B]">Next cycle:</span>
            <span className="tabular-nums font-mono font-medium text-[#70DFFF]">
              {countdownStr}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Push Status Badge / Trigger */}
          {permission === 'granted' ? (
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-xs text-[#94A3B8] hover:text-white rounded-lg hover:bg-white/[0.04] transition flex items-center space-x-1.5 cursor-pointer"
              title="Push notifications active. Click to configure."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="hidden lg:inline text-[11px]">Push Active</span>
            </button>
          ) : (
            <button
              onClick={enablePushNotifications}
              disabled={isSettingUpPush}
              className="p-1.5 text-xs rounded-lg hover:bg-white/[0.04] transition text-[#94A3B8] hover:text-amber-300 flex items-center space-x-1 cursor-pointer"
              title="Enable 3-hour push notifications"
            >
              {permission === 'denied' ? (
                <BellOff className="w-4 h-4 text-rose-400" />
              ) : (
                <Bell className="w-4 h-4 text-amber-400" />
              )}
              <span className="hidden lg:inline text-[11px]">
                {permission === 'denied' ? 'Blocked' : 'Enable Push'}
              </span>
            </button>
          )}

          {/* Install Chroniq Button (Only shown when not already running standalone) */}
          {isStandalone ? (
            <div
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-1.5"
              title="Chroniq is running in installed standalone app mode"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-medium">Installed</span>
            </div>
          ) : (
            <button
              onClick={onOpenInstall}
              className="btn-secondary px-2.5 py-1.5 text-xs flex items-center space-x-1.5 cursor-pointer"
              title="Install Chroniq as a Progressive Web App"
            >
              <Download className="w-3.5 h-3.5 text-[#70DFFF]" />
              <span className="hidden sm:inline">Install Chroniq</span>
              <span className="sm:hidden text-[11px]">Install</span>
            </button>
          )}

          {/* Primary Action: New Task */}
          <button
            onClick={onOpenNewTask}
            className="btn-primary px-3 py-1.5 text-xs flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Task</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="btn-ghost p-2 cursor-pointer"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

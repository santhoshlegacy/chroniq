import React, { useEffect, useState } from 'react'
import { ChroniqLogo } from './ChroniqLogo'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useAuthStore } from '@/store/useAuthStore'
import { secondsUntilNextReminder, formatCountdown, type CustomScheduleConfig } from '@/lib/reminderUtils'
import type { NavTab } from './BottomNav'

interface NavbarProps {
  activeTab: NavTab
  onSelectTab: (tab: NavTab) => void
  onOpenSettings: () => void
  onOpenNewTask: () => void
  onOpenInstall: () => void
  isStandalone?: boolean
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenNewTask,
  onOpenInstall,
  isStandalone = false,
}) => {
  const { preferences, permission, enablePushNotifications, isSettingUpPush } = useSettingsStore()
  const { user, profile } = useAuthStore()

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

      const scheduleConfig: CustomScheduleConfig = {
        timezone: preferences.timezone,
        customSlots: preferences.custom_slots || ['09:00', '12:00', '15:00', '18:00', '21:00'],
        activeSlots: preferences.active_slots || ['09:00', '12:00', '15:00', '18:00', '21:00'],
        activeDays: preferences.active_days || [1, 2, 3, 4, 5, 6, 7],
        quietHoursEnabled: preferences.quiet_hours_enabled,
        quietHoursStart: preferences.quiet_hours_start,
        quietHoursEnd: preferences.quiet_hours_end,
      }

      const secs = secondsUntilNextReminder(now, scheduleConfig)
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

  const userDisplayName =
    profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member'
  const userAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url

  const tabLabels: Record<NavTab, string> = {
    tasks: 'Tasks',
    schedule: 'Schedule',
    settings: 'Settings',
    account: 'Account',
  }

  return (
    <header className="sticky top-0 z-40 w-full header-glass border-b border-[#DAC58F]/12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        {/* Brand Monogram & Status */}
        <div
          onClick={() => onSelectTab('tasks')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#DAC58F]/25 bg-[#0D0E10] flex-shrink-0 flex items-center justify-center shadow-md p-1 group-hover:border-[#F2CA50]/50 transition-all">
            <ChroniqLogo className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-lg font-bold tracking-tight text-white group-hover:text-[#F2CA50] transition-colors">
                Chroniq
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#DAC58F] font-semibold">
                · {tabLabels[activeTab]}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DAC58F] animate-pulse" />
              <span className="text-[9px] uppercase tracking-widest text-[#99907C] font-mono">
                Synchronized &amp; Calm
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[#1B1C1E] border border-[#DAC58F]/15">
          {(['tasks', 'schedule', 'settings', 'account'] as NavTab[]).map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onSelectTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F2CA50] text-[#141211] shadow-sm'
                    : 'text-[#D0C5AF] hover:text-white hover:bg-[#292A2C]'
                }`}
              >
                <span>{tab === 'account' ? (user ? 'Account' : 'Sign In') : tabLabels[tab]}</span>
              </button>
            )
          })}
        </nav>

        {/* Live Clock & Next Reminder indicator */}
        <div className="hidden xl:flex items-center gap-3 text-xs text-[#99907C] font-mono">
          <span className="tabular-nums text-white/90">{timeStr}</span>
          <span className="text-[#DAC58F]/30">•</span>
          <div className="flex items-center gap-1.5">
            <span>Next Check-in:</span>
            <span className="tabular-nums font-semibold text-[#F2CA50]">
              {countdownStr}
            </span>
          </div>
          <span className="text-[#DAC58F]/30">•</span>
          <div
            className="flex items-center gap-1"
            title={user ? 'Connected to cloud ledger' : 'Operating in local vault storage'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-400' : 'bg-[#DAC58F]'}`} />
            <span className="text-[10px] uppercase text-[#D0C5AF]">
              {user ? 'Cloud' : 'Local'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Push Status Badge */}
          {permission === 'granted' ? (
            <button
              onClick={onOpenSettings}
              type="button"
              className="p-1.5 text-xs text-[#D0C5AF] hover:text-white rounded-lg hover:bg-[#292A2C] transition flex items-center gap-1.5 cursor-pointer border border-[#DAC58F]/15"
              title="Push notifications active. Click to configure."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#DAC58F]" />
              <span className="hidden sm:inline text-[11px] font-mono">Push Armed</span>
            </button>
          ) : (
            <button
              onClick={enablePushNotifications}
              disabled={isSettingUpPush}
              type="button"
              className="p-1.5 text-xs rounded-lg hover:bg-[#292A2C] transition text-[#D0C5AF] hover:text-[#F2CA50] flex items-center gap-1 cursor-pointer border border-[#DAC58F]/15"
              title="Enable push notifications"
            >
              <span className="material-symbols-outlined text-sm">
                {permission === 'denied' ? 'notifications_off' : 'notifications'}
              </span>
              <span className="hidden sm:inline text-[11px]">
                {permission === 'denied' ? 'Blocked' : 'Enable Push'}
              </span>
            </button>
          )}

          {/* Standalone status / PWA Install */}
          {isStandalone ? (
            <div
              className="px-2.5 py-1.5 rounded-lg bg-[#56481E]/40 border border-[#DAC58F]/30 text-[#DAC58F] text-xs flex items-center gap-1"
              title="Running in standalone PWA mode"
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              <span className="hidden sm:inline text-[10px] uppercase font-mono font-semibold">Installed</span>
            </div>
          ) : (
            <button
              onClick={onOpenInstall}
              type="button"
              className="px-2.5 py-1.5 text-xs rounded-lg bg-[#1B1C1E] hover:bg-[#292A2C] text-[#E3E2E5] border border-[#DAC58F]/20 transition flex items-center gap-1 cursor-pointer"
              title="Install Chroniq as a Progressive Web App"
            >
              <span className="material-symbols-outlined text-sm text-[#F2CA50]">download</span>
              <span className="hidden sm:inline text-[11px]">Install</span>
            </button>
          )}

          {/* Primary Action: New Task */}
          <button
            onClick={onOpenNewTask}
            type="button"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-tr from-[#D4AF37] to-[#F2CA50] text-[#141211] transition flex items-center gap-1 cursor-pointer shadow-sm hover:opacity-90 active:scale-95"
          >
            <span className="material-symbols-outlined text-sm font-bold">add</span>
            <span>New Task</span>
          </button>

          {/* User Avatar / Login shortcut on right */}
          {user ? (
            <button
              onClick={() => onSelectTab('account')}
              type="button"
              className="p-0.5 rounded-lg hover:ring-2 hover:ring-[#DAC58F]/60 transition flex items-center cursor-pointer border border-[#DAC58F]/25 bg-[#1B1C1E]"
              title={user.email ?? 'Account'}
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userDisplayName}
                  className="w-7 h-7 rounded-md object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-md bg-[#292A2C] text-[#F2CA50] text-xs font-bold flex items-center justify-center font-serif">
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => onSelectTab('account')}
              type="button"
              className="px-2.5 py-1.5 text-xs rounded-lg bg-[#1B1C1E] hover:bg-[#292A2C] text-[#E3E2E5] border border-[#DAC58F]/20 transition flex items-center gap-1 cursor-pointer"
              title="Sign in to sync mandates"
            >
              <span className="material-symbols-outlined text-sm text-[#F2CA50]">login</span>
              <span className="hidden sm:inline text-[11px]">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

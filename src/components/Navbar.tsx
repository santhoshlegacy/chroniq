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
    <header className="sticky top-0 z-40 w-full header-silk">
      <div className="editorial-container h-20 flex items-center justify-between">
        {/* Brand Monogram & Status */}
        <div
          onClick={() => onSelectTab('tasks')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-[rgba(45,41,38,0.12)] bg-[#F4EFEB] flex-shrink-0 flex items-center justify-center shadow-xs p-1 group-hover:border-[#C2A26F] transition-all">
            <ChroniqLogo className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-xl font-bold tracking-tight text-[#181615] group-hover:text-[#745A2E] transition-colors">
                Chroniq
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#745A2E] font-semibold">
                · {tabLabels[activeTab]}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#745A2E] animate-pulse" />
              <span className="text-[9px] uppercase tracking-widest text-[#7A746E] font-mono">
                Synchronized &amp; Calm
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[#EFECE3] border border-[rgba(45,41,38,0.08)]">
          {(['tasks', 'schedule', 'settings', 'account'] as NavTab[]).map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onSelectTab(tab)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#181615] text-[#FAF7F2] shadow-xs'
                    : 'text-[#7A746E] hover:text-[#181615] hover:bg-[#FAF7F2]/60'
                }`}
              >
                <span>{tab === 'account' ? (user ? 'Account' : 'Sign In') : tabLabels[tab]}</span>
              </button>
            )
          })}
        </nav>

        {/* Live Clock & Next Reminder indicator */}
        <div className="hidden xl:flex items-center gap-3 text-xs text-[#7A746E] font-mono">
          <span className="tabular-nums text-[#181615] font-semibold">{timeStr}</span>
          <span className="text-[rgba(45,41,38,0.2)]">•</span>
          <div className="flex items-center gap-1.5">
            <span>Next Check-in:</span>
            <span className="tabular-nums font-semibold text-[#745A2E]">
              {countdownStr}
            </span>
          </div>
          <span className="text-[rgba(45,41,38,0.2)]">•</span>
          <div
            className="flex items-center gap-1"
            title={user ? 'Connected to cloud ledger' : 'Operating in local vault storage'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-[#4A6B56]' : 'bg-[#745A2E]'}`} />
            <span className="text-[10px] uppercase text-[#7A746E]">
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
              className="p-1.5 px-2.5 text-xs text-[#2D2926] hover:text-[#181615] rounded-lg hover:bg-[#EFECE3] transition flex items-center gap-1.5 cursor-pointer border border-[rgba(45,41,38,0.1)] bg-[#F4EFEB]"
              title="Push notifications active. Click to configure."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B56]" />
              <span className="hidden sm:inline text-[11px] font-mono">Push Armed</span>
            </button>
          ) : (
            <button
              onClick={enablePushNotifications}
              disabled={isSettingUpPush}
              type="button"
              className="p-1.5 px-2.5 text-xs rounded-lg hover:bg-[#EFECE3] transition text-[#745A2E] flex items-center gap-1 cursor-pointer border border-[rgba(45,41,38,0.1)] bg-[#F4EFEB]"
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
              className="px-2.5 py-1.5 rounded-lg bg-[#EFECE3] border border-[rgba(45,41,38,0.1)] text-[#745A2E] text-xs flex items-center gap-1"
              title="Running in standalone PWA mode"
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              <span className="hidden sm:inline text-[10px] uppercase font-mono font-semibold">Installed</span>
            </div>
          ) : (
            <button
              onClick={onOpenInstall}
              type="button"
              className="px-2.5 py-1.5 text-xs rounded-lg bg-[#EFECE3] hover:bg-[#FAF7F2] text-[#181615] border border-[rgba(45,41,38,0.12)] transition flex items-center gap-1 cursor-pointer"
              title="Install Chroniq as a Progressive Web App"
            >
              <span className="material-symbols-outlined text-sm text-[#745A2E]">download</span>
              <span className="hidden sm:inline text-[11px]">Install</span>
            </button>
          )}

          {/* Primary Action: New Task (Architectural Primary Button) */}
          <button
            onClick={onOpenNewTask}
            type="button"
            className="btn-primary px-3.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm font-bold">add</span>
            <span>New Task</span>
          </button>

          {/* User Avatar / Login shortcut on right */}
          {user ? (
            <button
              onClick={() => onSelectTab('account')}
              type="button"
              className="p-0.5 rounded-lg hover:ring-2 hover:ring-[#C2A26F]/60 transition flex items-center cursor-pointer border border-[rgba(45,41,38,0.12)] bg-[#F4EFEB]"
              title={user.email ?? 'Account'}
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userDisplayName}
                  className="w-7 h-7 rounded-md object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-md bg-[#EFECE3] text-[#181615] text-xs font-bold flex items-center justify-center font-serif">
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => onSelectTab('account')}
              type="button"
              className="px-2.5 py-1.5 text-xs rounded-lg bg-[#EFECE3] hover:bg-[#FAF7F2] text-[#181615] border border-[rgba(45,41,38,0.12)] transition flex items-center gap-1 cursor-pointer"
              title="Sign in to sync mandates"
            >
              <span className="material-symbols-outlined text-sm text-[#745A2E]">login</span>
              <span className="hidden sm:inline text-[11px]">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

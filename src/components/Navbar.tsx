import React, { useEffect, useState } from 'react'
import logoUrl from '@/assets/logo.png'
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
        setCountdownStr('Idle')
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
      <div className="editorial-container h-20 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Monogram & Status */}
        <div
          onClick={() => onSelectTab('tasks')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0 min-w-0"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border border-[rgba(45,41,38,0.12)] bg-[#F4EFEB] flex-shrink-0 flex items-center justify-center shadow-xs p-1 group-hover:border-[#C2A26F] transition-all">
            <img
              src={logoUrl}
              alt="Chroniq"
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                const target = e.currentTarget
                const base = import.meta.env.BASE_URL || './'
                const fallback = base.endsWith('/') ? `${base}logo.png` : `${base}/logo.png`
                if (target.src !== fallback && !target.src.endsWith(fallback)) {
                  target.src = fallback
                } else if (!target.src.endsWith('logo.png')) {
                  target.src = './logo.png'
                }
              }}
            />
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
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B56]" />
              <span className="text-[10px] tracking-wider text-[#7A746E]">
                All Synced
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Tab Navigation with Clean Underline Indicator */}
        <nav className="hidden md:flex items-center gap-2">
          {(['tasks', 'schedule', 'settings', 'account'] as NavTab[]).map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onSelectTab(tab)}
                className={`relative px-3.5 py-2 text-xs uppercase tracking-wider font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#181615] font-semibold'
                    : 'text-[#7A746E] hover:text-[#181615]'
                }`}
              >
                <span>{tab === 'account' ? (user ? 'Account' : 'Sign In') : tabLabels[tab]}</span>
                {isActive && (
                  <span className="absolute bottom-0 inset-x-2 h-0.5 rounded-full bg-[#181615]" />
                )}
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
            title={user ? 'Connected to cloud storage' : 'Saved on this device'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-[#4A6B56]' : 'bg-[#745A2E]'}`} />
            <span className="text-[10px] uppercase text-[#7A746E]">
              {user ? 'Cloud' : 'Local'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Push Status Badge */}
          {permission === 'granted' ? (
            <button
              onClick={onOpenSettings}
              type="button"
              className="p-1.5 px-2.5 text-xs text-[#2D2926] hover:text-[#181615] rounded-lg hover:bg-[#EFECE3] transition flex items-center gap-1.5 cursor-pointer border border-[rgba(45,41,38,0.1)] bg-[#F4EFEB] shrink-0"
              title="Push notifications active. Click to configure."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B56]" />
              <span className="hidden sm:inline text-[11px]">Push Active</span>
            </button>
          ) : (
            <button
              onClick={enablePushNotifications}
              disabled={isSettingUpPush}
              type="button"
              className="p-1.5 px-2.5 text-xs rounded-lg hover:bg-[#EFECE3] transition text-[#745A2E] flex items-center gap-1 cursor-pointer border border-[rgba(45,41,38,0.1)] bg-[#F4EFEB] shrink-0"
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
            <button
              onClick={onOpenInstall}
              type="button"
              className="px-2.5 py-1.5 rounded-lg bg-[#EFECE3] border border-[rgba(45,41,38,0.1)] text-[#745A2E] text-xs flex items-center gap-1 hover:bg-[#FAF7F2] transition cursor-pointer shrink-0"
              title="Installed as standalone application. Click for details."
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              <span className="hidden sm:inline text-[11px] font-medium">Installed</span>
            </button>
          ) : (
            <button
              onClick={onOpenInstall}
              type="button"
              className="px-2.5 py-1.5 text-xs rounded-lg bg-[#EFECE3] hover:bg-[#FAF7F2] text-[#181615] border border-[rgba(45,41,38,0.12)] transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              title="Install Chroniq on your device"
            >
              <span className="material-symbols-outlined text-sm text-[#745A2E]">download</span>
              <span className="hidden sm:inline text-[11px] font-medium">Install</span>
            </button>
          )}

          {/* Primary Action: New Task (Desktop only - mobile uses Quick Add / inline action) */}
          <button
            onClick={onOpenNewTask}
            type="button"
            className="hidden sm:inline-flex btn-primary px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-md items-center gap-1 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-sm font-bold">add</span>
            <span>New Task</span>
          </button>

          {/* User Avatar / Login shortcut on right */}
          {user ? (
            <button
              onClick={() => onSelectTab('account')}
              type="button"
              className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center border border-[rgba(45,41,38,0.15)] bg-[#F4EFEB] hover:ring-2 hover:ring-[#C2A26F]/60 transition cursor-pointer p-0"
              title={user.email ?? 'Account'}
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userDisplayName}
                  className="w-full h-full rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#EFECE3] text-[#181615] text-xs font-bold flex items-center justify-center font-serif shrink-0">
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => onSelectTab('account')}
              type="button"
              className="px-2.5 py-1.5 text-xs rounded-lg bg-[#EFECE3] hover:bg-[#FAF7F2] text-[#181615] border border-[rgba(45,41,38,0.12)] transition flex items-center gap-1 cursor-pointer shrink-0"
              title="Sign in to sync tasks"
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

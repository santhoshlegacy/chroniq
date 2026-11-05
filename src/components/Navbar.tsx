import React, { useEffect, useState } from 'react'
import { Bell, BellOff, Settings, Plus, Download, Check, LogIn, Cloud, HardDrive, CheckSquare, Calendar, User } from 'lucide-react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useAuthStore } from '@/store/useAuthStore'
import { secondsUntilNextReminder, formatCountdown, type CustomScheduleConfig } from '@/lib/reminderUtils'
import type { NavTab } from './BottomNav'
import logoImg from '@/assets/logo.png'

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

  const userDisplayName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member'
  const userAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url

  return (
    <header className="sticky top-0 z-40 w-full header-glass">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          onClick={() => onSelectTab('tasks')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/[0.12] bg-[#121826] flex-shrink-0 flex items-center justify-center shadow-sm group-hover:border-[#5EEAD4]/40 transition">
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
            <span className="text-[11px] text-[#64748B] hidden lg:inline font-normal">
              Own your time.
            </span>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <nav className="hidden md:flex items-center space-x-1 p-1 rounded-xl bg-[#121826] border border-white/[0.06]">
          <button
            onClick={() => onSelectTab('tasks')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-[#182233] text-white border border-white/[0.08] font-semibold shadow-xs'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <CheckSquare className={`w-3.5 h-3.5 ${activeTab === 'tasks' ? 'text-[#5EEAD4]' : 'text-[#64748B]'}`} />
            <span>Tasks</span>
          </button>
          <button
            onClick={() => onSelectTab('schedule')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-[#182233] text-white border border-white/[0.08] font-semibold shadow-xs'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 ${activeTab === 'schedule' ? 'text-[#5EEAD4]' : 'text-[#64748B]'}`} />
            <span>Schedule</span>
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#182233] text-white border border-white/[0.08] font-semibold shadow-xs'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Settings className={`w-3.5 h-3.5 ${activeTab === 'settings' ? 'text-[#5EEAD4]' : 'text-[#64748B]'}`} />
            <span>Settings</span>
          </button>
          <button
            onClick={() => onSelectTab('account')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'account'
                ? 'bg-[#182233] text-white border border-white/[0.08] font-semibold shadow-xs'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <User className={`w-3.5 h-3.5 ${activeTab === 'account' ? 'text-[#5EEAD4]' : 'text-[#64748B]'}`} />
            <span>{user ? 'Account' : 'Sign In'}</span>
          </button>
        </nav>

        {/* Live Clock & Next Reminder indicator (Subtle, Tabular) */}
        <div className="hidden xl:flex items-center space-x-3 text-xs text-[#94A3B8]">
          <span className="tabular-nums font-mono text-white/90">{timeStr}</span>
          <span className="text-white/20">•</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-[#64748B]">Next check-in:</span>
            <span className="tabular-nums font-mono font-medium text-[#5EEAD4]">
              {countdownStr}
            </span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center space-x-1" title={user ? 'Connected to Supabase cloud database' : 'Operating in local offline storage'}>
            {user ? (
              <span className="flex items-center space-x-1 text-emerald-400 text-[11px]">
                <Cloud className="w-3 h-3" />
                <span>Cloud</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-[#64748B] text-[11px]">
                <HardDrive className="w-3 h-3" />
                <span>Local</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Push Status Badge */}
          {permission === 'granted' ? (
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-xs text-[#94A3B8] hover:text-white rounded-lg hover:bg-white/[0.04] transition flex items-center space-x-1.5 cursor-pointer"
              title="Push notifications active. Click to configure."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="hidden sm:inline text-[11px]">Push Active</span>
            </button>
          ) : (
            <button
              onClick={enablePushNotifications}
              disabled={isSettingUpPush}
              className="p-1.5 text-xs rounded-lg hover:bg-white/[0.04] transition text-[#94A3B8] hover:text-amber-300 flex items-center space-x-1 cursor-pointer"
              title="Enable push notifications"
            >
              {permission === 'denied' ? (
                <BellOff className="w-4 h-4 text-rose-400" />
              ) : (
                <Bell className="w-4 h-4 text-amber-400" />
              )}
              <span className="hidden sm:inline text-[11px]">
                {permission === 'denied' ? 'Blocked' : 'Enable Push'}
              </span>
            </button>
          )}

          {/* Standalone status / PWA Install */}
          {isStandalone ? (
            <div
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-1.5"
              title="Running in standalone PWA mode"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-medium">Installed</span>
            </div>
          ) : (
            <button
              onClick={onOpenInstall}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-[#121826] hover:bg-[#182233] text-[#F3F4F8] border border-white/[0.08] transition flex items-center space-x-1.5 cursor-pointer"
              title="Install Chroniq as a Progressive Web App"
            >
              <Download className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {/* Primary Action: New Task */}
          <button
            onClick={onOpenNewTask}
            className="px-3 py-1.5 text-xs font-medium rounded-xl btn-primary transition flex items-center space-x-1 cursor-pointer font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Task</span>
          </button>

          {/* User Avatar / Login shortcut on right */}
          {user ? (
            <button
              onClick={() => onSelectTab('account')}
              className="p-0.5 rounded-xl hover:ring-2 hover:ring-[#5EEAD4]/40 transition flex items-center cursor-pointer border border-white/[0.12]"
              title={user.email ?? 'Account'}
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userDisplayName}
                  className="w-7 h-7 rounded-lg object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#182233] text-[#5EEAD4] text-xs font-bold flex items-center justify-center font-['Outfit']">
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => onSelectTab('account')}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-[#121826] hover:bg-[#182233] text-[#F3F4F8] border border-white/[0.08] transition flex items-center space-x-1.5 cursor-pointer"
              title="Sign in to sync tasks"
            >
              <LogIn className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

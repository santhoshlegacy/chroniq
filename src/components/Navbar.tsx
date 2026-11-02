import React, { useEffect, useState } from 'react'
import { Bell, BellOff, Settings, Plus, Download, Check, LogIn, LogOut, Cloud, HardDrive } from 'lucide-react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useAuthStore } from '@/store/useAuthStore'
import { secondsUntilNextReminder, formatCountdown, type CustomScheduleConfig } from '@/lib/reminderUtils'
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
  const { user, profile, loginWithGoogle, logout, isLoading: isAuthLoading } = useAuthStore()

  const [timeStr, setTimeStr] = useState<string>('')
  const [countdownStr, setCountdownStr] = useState<string>('')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

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

  const userDisplayName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const userAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url

  return (
    <header className="sticky top-0 z-40 w-full bg-[#080B12]/95 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/[0.1] bg-[#0E131F] flex-shrink-0 flex items-center justify-center">
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
            <span className="text-[#64748B]">Next check-in:</span>
            <span className="tabular-nums font-mono font-medium text-[#70DFFF]">
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
              <span className="hidden lg:inline text-[11px]">Push Active</span>
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
              <span className="hidden lg:inline text-[11px]">
                {permission === 'denied' ? 'Blocked' : 'Enable Push'}
              </span>
            </button>
          )}

          {/* Standalone status / PWA Install */}
          {isStandalone ? (
            <div
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-1.5"
              title="Running in standalone PWA mode"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-medium">Installed</span>
            </div>
          ) : (
            <button
              onClick={onOpenInstall}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-[#151B28] hover:bg-[#1C2436] text-[#E7ECF4] border border-white/[0.08] transition flex items-center space-x-1.5 cursor-pointer"
              title="Install Chroniq as a Progressive Web App"
            >
              <Download className="w-3.5 h-3.5 text-[#70DFFF]" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {/* Primary Action: New Task */}
          <button
            onClick={onOpenNewTask}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#70DFFF] hover:bg-[#58CFEF] text-[#080B12] transition flex items-center space-x-1 cursor-pointer font-semibold"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Task</span>
          </button>

          {/* User Profile / Google Sign-In */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="p-1 rounded-lg hover:bg-white/[0.06] transition flex items-center space-x-1.5 cursor-pointer border border-white/[0.08]"
                title={user.email ?? 'Account'}
              >
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userDisplayName}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#1C2436] text-[#70DFFF] text-[11px] font-bold flex items-center justify-center">
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#111827] border border-white/[0.1] shadow-xl py-2 z-40 text-xs text-[#E7ECF4] animate-in fade-in duration-100">
                    <div className="px-3 py-2 border-b border-white/[0.06]">
                      <p className="font-semibold text-white truncate">{userDisplayName}</p>
                      <p className="text-[#94A3B8] text-[11px] truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        onOpenSettings()
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/[0.06] transition flex items-center space-x-2 text-[#94A3B8] hover:text-white"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Reminder Settings</span>
                    </button>
                    <button
                      onClick={async () => {
                        setIsUserMenuOpen(false)
                        await logout()
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-rose-500/10 transition flex items-center space-x-2 text-rose-400"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={loginWithGoogle}
              disabled={isAuthLoading}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-[#151B28] hover:bg-[#1C2436] text-[#E7ECF4] border border-white/[0.08] transition flex items-center space-x-1.5 cursor-pointer"
              title="Sign in with Google to sync tasks across all devices"
            >
              <LogIn className="w-3.5 h-3.5 text-[#70DFFF]" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

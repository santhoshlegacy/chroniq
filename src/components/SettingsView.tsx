import React, { useState, useEffect } from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTaskStore } from '@/store/useTaskStore'
import { useAuthStore } from '@/store/useAuthStore'
import { COMMON_TIMEZONES, secondsUntilNextReminder, formatCountdown, type CustomScheduleConfig } from '@/lib/reminderUtils'
import { isValidE164PhoneNumber } from '@/lib/voiceReminderClient'

const DAYS_OF_WEEK = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 7, label: 'Sun' },
]

const AVATAR_PRESETS = [
  { label: 'Obsidian Minimal', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80' },
  { label: 'Executive Atelier', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80' },
  { label: 'Architect Monogram', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&q=80' },
  { label: 'Alabaster Silk', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80' },
]

interface SettingsViewProps {
  onOpenInstall?: () => void
  isStandalone?: boolean
  initialTab?: 'notifications' | 'app-info' | 'profile' | 'voice' | 'history'
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenInstall,
  isStandalone = false,
  initialTab = 'notifications',
}) => {
  const {
    preferences,
    voicePreferences,
    permission,
    isSettingUpPush,
    enablePushNotifications,
    sendTestNotification,
    testNotificationStatus,
    errorMessage,
    clearError,
    updatePreferences,
    updateVoicePreferences,
    addCustomSlot,
    removeCustomSlot,
    toggleSlotActive,
    toggleDayActive,
    events,
  } = useSettingsStore()

  const { tasks } = useTaskStore()
  const { user, profile, updateProfile, logout } = useAuthStore()

  const [activeTab, setActiveTab] = useState<'notifications' | 'app-info' | 'profile' | 'voice' | 'history'>(initialTab)
  const [newSlotInput, setNewSlotInput] = useState('14:00')
  const [phoneInput, setPhoneInput] = useState(voicePreferences.phone_number || '')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [phoneSaved, setPhoneSaved] = useState(false)
  const [selectedHarmonic, setSelectedHarmonic] = useState('Chime')

  // Profile Edit State
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [profileTimezone, setProfileTimezone] = useState(preferences.timezone || 'Asia/Kolkata')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (profile || user) {
      setDisplayName(profile?.display_name || user?.user_metadata?.full_name || '')
      setAvatarUrl(profile?.avatar_url || user?.user_metadata?.avatar_url || '')
      setProfileTimezone(profile?.timezone || preferences.timezone || 'Asia/Kolkata')
    }
  }, [profile, user, preferences.timezone])

  const pendingCount = tasks.filter((t) => t.status !== 'completed' && t.archived_at === null).length

  // Armed background reminder calculations
  const nowMs = Date.now()
  const pending10mTasks = tasks.filter((t) => {
    if (t.status === 'completed' || t.archived_at !== null || !t.due_at) return false
    const dueMs = new Date(t.due_at).getTime()
    if (isNaN(dueMs)) return false
    return dueMs > nowMs
  }).sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())

  const activeCadenceTasks = tasks.filter((t) => t.status !== 'completed' && t.archived_at === null)

  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'completed' || t.archived_at !== null || !t.due_at) return false
    const dueMs = new Date(t.due_at).getTime()
    return !isNaN(dueMs) && dueMs <= nowMs
  })

  // Next slot countdown
  const scheduleConfig: CustomScheduleConfig = {
    timezone: preferences.timezone,
    customSlots: preferences.custom_slots || ['09:00', '12:00', '15:00', '18:00', '21:00'],
    activeSlots: preferences.active_slots || ['09:00', '12:00', '15:00', '18:00', '21:00'],
    activeDays: preferences.active_days || [1, 2, 3, 4, 5, 6, 7],
    quietHoursEnabled: preferences.quiet_hours_enabled,
    quietHoursStart: preferences.quiet_hours_start,
    quietHoursEnd: preferences.quiet_hours_end,
  }
  const nextSlotSeconds = secondsUntilNextReminder(new Date(), scheduleConfig)

  const handleAddSlot = async () => {
    if (!newSlotInput) return
    await addCustomSlot(newSlotInput)
    setNewSlotInput('14:00')
  }

  const handleSavePhone = async () => {
    if (phoneInput && !isValidE164PhoneNumber(phoneInput)) {
      setPhoneError('Please enter a valid international phone number in E.164 format (e.g., +14155552671).')
      return
    }
    setPhoneError(null)
    await updateVoicePreferences({ phone_number: phoneInput || null })
    setPhoneSaved(true)
    setTimeout(() => setPhoneSaved(false), 3000)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setIsSavingProfile(true)
    setProfileError(null)
    setProfileSaved(false)

    const res = await updateProfile({
      display_name: displayName.trim(),
      full_name: displayName.trim(),
      avatar_url: avatarUrl.trim() || undefined,
      timezone: profileTimezone,
    })

    if (res.success) {
      await updatePreferences({ timezone: profileTimezone })
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3500)
    } else {
      setProfileError(res.error || 'Failed to update profile.')
    }
    setIsSavingProfile(false)
  }

  const activeSlots = preferences.active_slots || []
  const customSlots = preferences.custom_slots || ['09:00', '12:00', '15:00', '18:00', '21:00']
  const activeDays = preferences.active_days || [1, 2, 3, 4, 5, 6, 7]

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-8 px-4 animate-in fade-in duration-200 mb-24 sm:mb-16">
      {/* Overview Header Capsule */}
      <section className="flex flex-col gap-1 mb-6 sm:mb-8">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#745A2E] font-semibold">
            Chroniq Operations
          </span>
          <span className="w-1 h-1 rounded-full bg-[#745A2E]" />
          <span className="text-[10px] uppercase tracking-wider text-[#7A746E]">
            {user ? 'Cloud Synchronized' : 'Local Workspace'}
          </span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#181615]">
          Settings &amp; Executive Hub
        </h1>
        <p className="text-xs sm:text-sm text-[#7A746E] max-w-lg mt-0.5 leading-relaxed">
          Manage armed push notifications, background schedules, profile credentials, and audio check-ins.
        </p>
      </section>

      {/* Main Tab Navigation Bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#EFECE3] border border-[rgba(45,41,38,0.1)] mb-6 overflow-x-auto no-scrollbar shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'notifications'
              ? 'bg-[#181615] text-[#FAF7F2] shadow-xs'
              : 'text-[#7A746E] hover:text-[#181615]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">notifications</span>
          <span>Notifications</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('app-info')}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'app-info'
              ? 'bg-[#181615] text-[#FAF7F2] shadow-xs'
              : 'text-[#7A746E] hover:text-[#181615]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">sensors</span>
          <span>App Info &amp; Reminders</span>
          {pending10mTasks.length + overdueTasks.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#FEDAA3]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#181615] text-[#FAF7F2] shadow-xs'
              : 'text-[#7A746E] hover:text-[#181615]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">person</span>
          <span>Edit Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('voice')}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'voice'
              ? 'bg-[#181615] text-[#FAF7F2] shadow-xs'
              : 'text-[#7A746E] hover:text-[#181615]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">volume_up</span>
          <span>Voice &amp; Audio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#181615] text-[#FAF7F2] shadow-xs'
              : 'text-[#7A746E] hover:text-[#181615]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">history</span>
          <span>History</span>
        </button>
      </div>

      {/* ──────────────── TAB 1: NOTIFICATIONS & ALERTS ──────────────── */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Web Push Control Card */}
          <section className="relative w-full rounded-2xl bg-[#F4EFEB] border border-[rgba(45,41,38,0.12)] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] flex items-center justify-center text-[#745A2E] shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">
                    {permission === 'granted'
                      ? 'notifications_active'
                      : permission === 'denied'
                      ? 'notifications_off'
                      : 'notifications'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#745A2E] font-mono font-semibold">
                      Web Push Gateway
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                        permission === 'granted'
                          ? 'bg-[#EFECE3] text-[#4A6B56] border border-[#4A6B56]/20'
                          : permission === 'denied'
                          ? 'bg-[#BA1A1A]/10 text-[#BA1A1A] border border-[#BA1A1A]/20'
                          : 'bg-[#FEDAA3]/50 text-[#745A2E] border border-[#745A2E]/20'
                      }`}
                    >
                      {permission === 'granted' ? 'Active' : permission === 'denied' ? 'Blocked in Browser' : 'Inactive'}
                    </span>
                  </div>
                  <span className="font-serif text-lg sm:text-xl text-[#181615]">
                    {permission === 'granted'
                      ? 'Push Notifications Active'
                      : permission === 'denied'
                      ? 'Push Blocked in Browser'
                      : 'Enable Lock-Screen Alerts'}
                  </span>
                  <p className="text-xs text-[#7A746E] max-w-md">
                    {permission === 'granted'
                      ? 'Dispatches native background alerts to your lock screen even when Chroniq is closed.'
                      : permission === 'denied'
                      ? 'Notifications are blocked in your browser site settings. Tap the lock icon in your address bar to allow.'
                      : 'Allow push permissions to receive timely advance warnings and scheduled daily reminders.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                {permission === 'granted' ? (
                  <button
                    type="button"
                    onClick={() => sendTestNotification(pendingCount)}
                    className="px-3.5 py-2 rounded-xl bg-[#1C1917] hover:bg-[#2D2926] text-[#FAF7F2] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-[0.98]"
                    title="Send an immediate test alert to this device"
                  >
                    <span className="material-symbols-outlined text-sm text-[#FEDAA3]">send</span>
                    <span>Send Test Alert</span>
                  </button>
                ) : permission === 'denied' ? (
                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        'Notifications are currently blocked by your browser.\n\nTo enable:\n1. Click the lock/settings icon next to the URL.\n2. Set Notifications to "Allow".\n3. Refresh this page.'
                      )
                    }
                    className="px-3.5 py-2 rounded-xl bg-[#EFECE3] border border-[rgba(45,41,38,0.12)] text-[#181615] text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-[#FAF7F2] transition-all"
                  >
                    <span className="material-symbols-outlined text-sm text-[#BA1A1A]">help</span>
                    <span>How to Unblock</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={enablePushNotifications}
                    disabled={isSettingUpPush}
                    className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">notifications</span>
                    <span>{isSettingUpPush ? 'Arming...' : 'Enable Push'}</span>
                  </button>
                )}
              </div>
            </div>

            {testNotificationStatus && (
              <div className="pt-2 border-t border-[rgba(45,41,38,0.08)] flex items-center gap-2 text-xs text-[#4A6B56] font-mono animate-in fade-in duration-200">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>{testNotificationStatus}</span>
              </div>
            )}

            {errorMessage && (
              <div className="pt-2 border-t border-[rgba(45,41,38,0.08)] flex items-center justify-between text-xs text-[#BA1A1A] font-mono animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-[#7A746E] hover:text-[#181615] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </div>
            )}
          </section>

          {/* Toggles & Rule Cards */}
          <div className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs">
            <h3 className="font-serif text-lg text-[#181615] flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#745A2E]">rule</span>
              <span>Intelligent Notification Toggles</span>
            </h3>

            {/* Advance Warnings & Overdue Alerts */}
            <div className="space-y-3">
              {/* 10-Minute Warning Toggle */}
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#181615]">10-Minute Advance Warnings</span>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-semibold bg-[#FEDAA3]/40 text-[#745A2E]">
                      Auto-Armed
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A746E]">
                    Dispatches a background push alert 10–15 minutes before any task deadline.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.warning_10m_enabled !== false}
                    onChange={(e) => updatePreferences({ warning_10m_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#EFECE3] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#181615]"></div>
                </label>
              </div>

              {/* Overdue Alerts Toggle */}
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#181615]">Overdue Deadline Alerts</span>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-semibold bg-[#FEDAA3]/40 text-[#745A2E]">
                      Strict Single Alert
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A746E]">
                    Sends a distinct "Task Overdue" push notification the moment a scheduled deadline expires.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.overdue_alert_enabled !== false}
                    onChange={(e) => updatePreferences({ overdue_alert_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#EFECE3] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#181615]"></div>
                </label>
              </div>

              {/* 3-Hour Recurring Cadence Toggle */}
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#181615]">3-Hour Interval Cadence</span>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-semibold bg-[#FEDAA3]/40 text-[#745A2E]">
                      3h / 6h Cadence
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A746E]">
                    Sends a gentle "Schedule Reminder" check-in every 3 hours while tasks remain uncompleted.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.recurring_3h_enabled !== false}
                    onChange={(e) => updatePreferences({ recurring_3h_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#EFECE3] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#181615]"></div>
                </label>
              </div>

              {/* Master Engine Toggle */}
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-[#181615] block">Automated Reminder Engine</span>
                  <p className="text-[11px] text-[#7A746E]">
                    Master switch enabling Supabase pg_cron background scheduler evaluation.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.enabled}
                    onChange={(e) => updatePreferences({ enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#EFECE3] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#181615]"></div>
                </label>
              </div>
            </div>

            {/* Daily Reminder Slots Configuration */}
            <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#745A2E]">schedule</span>
                  <span className="text-xs font-semibold text-[#181615]">Daily Check-in Slots</span>
                </div>
                <span className="text-[11px] text-[#7A746E] font-mono">
                  {activeSlots.length} active of {customSlots.length}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {customSlots.map((slot) => {
                  const isActive = activeSlots.includes(slot)
                  return (
                    <div
                      key={slot}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border transition ${
                        isActive
                          ? 'bg-[#EFECE3] border-[rgba(45,41,38,0.15)] text-[#181615]'
                          : 'bg-[#FAF7F2] border-[rgba(45,41,38,0.08)] text-[#7A746E]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSlotActive(slot)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#745A2E]' : 'bg-[#7A746E]'}`} />
                        <span className="font-mono text-xs font-medium">{slot}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomSlot(slot)}
                        className="text-[#7A746E] hover:text-[#BA1A1A] transition cursor-pointer p-0.5"
                        title="Remove slot"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="time"
                  value={newSlotInput}
                  onChange={(e) => setNewSlotInput(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#EFECE3] border border-[rgba(45,41,38,0.12)] text-xs text-[#181615] focus:outline-none focus:bg-[#FAF7F2] focus:border-[#C2A26F]"
                />
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="btn-primary px-3.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Add Slot</span>
                </button>
              </div>
            </div>

            {/* Active Days */}
            <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-3">
              <span className="text-xs font-semibold text-[#181615] block">Active Days of Week</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DAYS_OF_WEEK.map((day) => {
                  const isActive = activeDays.includes(day.id)
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDayActive(day.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                        isActive
                          ? 'bg-[#181615] text-[#FAF7F2]'
                          : 'bg-[#EFECE3] text-[#7A746E] border border-[rgba(45,41,38,0.08)]'
                      }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#181615] block">Quiet Hours (Do Not Disturb)</span>
                  <span className="text-[11px] text-[#7A746E]">
                    Mutes background reminders during your selected resting window.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.quiet_hours_enabled}
                    onChange={(e) => updatePreferences({ quiet_hours_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#EFECE3] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#181615]"></div>
                </label>
              </div>

              {preferences.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] text-[#7A746E] mb-1">Starts</label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_start}
                      onChange={(e) => updatePreferences({ quiet_hours_start: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#EFECE3] border border-[rgba(45,41,38,0.12)] text-xs text-[#181615]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#7A746E] mb-1">Ends</label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_end}
                      onChange={(e) => updatePreferences({ quiet_hours_end: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#EFECE3] border border-[rgba(45,41,38,0.12)] text-xs text-[#181615]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Timezone */}
            <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-2">
              <span className="text-xs font-semibold text-[#181615] block">Active Timezone (IANA)</span>
              <select
                value={preferences.timezone}
                onChange={(e) => updatePreferences({ timezone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#EFECE3] border border-[rgba(45,41,38,0.12)] text-xs text-[#181615] focus:outline-none focus:bg-[#FAF7F2] focus:border-[#C2A26F]"
              >
                {COMMON_TIMEZONES.map((tz: string) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 2: APP INFO & ACTIVE REMINDERS (TASK 3) ──────────────── */}
      {activeTab === 'app-info' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Overview Monitor Status */}
          <section className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.12)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(45,41,38,0.08)]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#181615] text-[#FEDAA3] flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">sensors</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#181615] font-serif">
                    Armed Background Reminders
                  </h3>
                  <p className="text-xs text-[#7A746E]">
                    Real-time status of all active push schedules evaluated by Supabase pg_cron.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-[#EFECE3] text-[#4A6B56] border border-[#4A6B56]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B56] animate-pulse" />
                <span>Cron Active</span>
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)]">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#7A746E] block">
                  10m Warnings
                </span>
                <span className="text-lg font-serif font-bold text-[#181615] mt-0.5 block">
                  {pending10mTasks.length} Armed
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)]">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#7A746E] block">
                  3h Cadence
                </span>
                <span className="text-lg font-serif font-bold text-[#181615] mt-0.5 block">
                  {activeCadenceTasks.length} Active
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)]">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#7A746E] block">
                  Overdue Tasks
                </span>
                <span className={`text-lg font-serif font-bold mt-0.5 block ${overdueTasks.length > 0 ? 'text-[#BA1A1A]' : 'text-[#181615]'}`}>
                  {overdueTasks.length} Tracked
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)]">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#7A746E] block">
                  Next Daily Slot
                </span>
                <span className="text-lg font-serif font-bold text-[#745A2E] mt-0.5 block truncate">
                  {nextSlotSeconds !== null && nextSlotSeconds > 0 ? formatCountdown(nextSlotSeconds) : 'Due Now'}
                </span>
              </div>
            </div>
          </section>

          {/* Section: Pending 10-Minute Warnings */}
          <section className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[rgba(45,41,38,0.08)]">
              <span className="text-xs font-mono uppercase tracking-wider text-[#745A2E] font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">alarm</span>
                <span>Armed 10-Minute Warnings ({pending10mTasks.length})</span>
              </span>
              <span className="text-[10px] text-[#7A746E] font-mono">
                Window: 10–15m Before Deadline
              </span>
            </div>

            {pending10mTasks.length === 0 ? (
              <div className="p-5 text-center rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)]">
                <p className="text-xs text-[#7A746E]">
                  No upcoming task deadlines scheduled. Add a task with a due date to arm advance warnings.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pending10mTasks.map((t) => {
                  const dueMs = new Date(t.due_at!).getTime()
                  const minsRemaining = Math.max(0, Math.round((dueMs - nowMs) / 60000))
                  const isArmedInWindow = minsRemaining <= 15 && minsRemaining > 0

                  return (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-[#181615] block truncate">
                          {t.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#7A746E] font-mono">
                          <span>Due: {new Date(t.due_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span>{minsRemaining}m remaining</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0 ${
                          isArmedInWindow
                            ? 'bg-[#FEDAA3] text-[#745A2E] border border-[#745A2E]/30 animate-pulse'
                            : 'bg-[#EFECE3] text-[#745A2E]'
                        }`}
                      >
                        {isArmedInWindow ? 'DISPATCHING' : 'ARMED'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Section: Active 3-Hour Cadence Tasks */}
          <section className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[rgba(45,41,38,0.08)]">
              <span className="text-xs font-mono uppercase tracking-wider text-[#745A2E] font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">timelapse</span>
                <span>Active 3-Hour Recurring Cadence ({activeCadenceTasks.length})</span>
              </span>
              <span className="text-[10px] text-[#7A746E] font-mono">
                Cadence: Every 180 Minutes
              </span>
            </div>

            {activeCadenceTasks.length === 0 ? (
              <div className="p-5 text-center rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)]">
                <p className="text-xs text-[#7A746E]">
                  All tasks completed! No active tasks currently running on the 3-hour schedule.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeCadenceTasks.slice(0, 8).map((t) => {
                  const baseline = t.last_reminded_at || t.created_at
                  const elapsedMins = Math.max(0, Math.round((nowMs - new Date(baseline).getTime()) / 60000))
                  const hoursActive = Math.round(elapsedMins / 60)

                  return (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-[#181615] block truncate">
                          {t.title}
                        </span>
                        <span className="text-[11px] text-[#7A746E] font-mono block mt-0.5">
                          Tracking: {hoursActive}h since last alert ({elapsedMins % 180}m into current 3h cycle)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#EFECE3] text-[#4A6B56] font-medium shrink-0">
                        SCHEDULED
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Architecture & Diagnostic Specifications */}
          <section className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-[#745A2E] font-semibold block pb-2 border-b border-[rgba(45,41,38,0.08)]">
              System Architecture &amp; Delivery Engine
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-1">
                <span className="font-semibold text-[#181615] block">Delivery Protocol</span>
                <p className="text-[#7A746E] text-[11px]">
                  RFC 8291 / RFC 8292 Direct HTTP POST directly to FCM/APNs push gateways using VAPID keys. Does not rely on Realtime WebSockets.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-1">
                <span className="font-semibold text-[#181615] block">Background Cron Cadence</span>
                <p className="text-[#7A746E] text-[11px]">
                  Supabase pg_cron runs every 60 seconds, invoking the Deno Edge Function with atomic transaction occurrence claiming.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-1">
                <span className="font-semibold text-[#181615] block">Service Worker Architecture</span>
                <p className="text-[#7A746E] text-[11px]">
                  Strict <code className="text-[#745A2E]">event.waitUntil()</code> execution prevents mobile operating systems from sleeping before lock-screen banners render.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-1">
                <span className="font-semibold text-[#181615] block">Application Runtime</span>
                <p className="text-[#7A746E] text-[11px]">
                  {isStandalone ? 'Native Standalone PWA Window' : 'Web Client Mode (Installable as Standalone PWA)'}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ──────────────── TAB 3: EDIT PROFILE / USER SETTINGS (TASK 4A) ──────────────── */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <section className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.12)] rounded-2xl p-6 sm:p-8 shadow-xs">
            {user ? (
              <form onSubmit={handleSaveProfile} className="space-y-6 text-[#181615]">
                {/* Header Profile Identity */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-[rgba(45,41,38,0.08)]">
                  <div className="relative group shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName || 'Avatar'}
                        className="w-20 h-20 rounded-full object-cover border-2 border-[rgba(45,41,38,0.15)] shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[#EFECE3] border-2 border-[rgba(45,41,38,0.15)] text-[#181615] text-2xl font-bold flex items-center justify-center font-serif shadow-md">
                        {(displayName || user.email || 'M').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-xl sm:text-2xl text-[#181615] truncate">
                      {displayName || 'Member Profile'}
                    </h3>
                    <p className="text-xs text-[#7A746E] font-mono mt-0.5 truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#EFECE3] text-[#4A6B56] border border-[#4A6B56]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B56]" />
                        <span>Cloud Account Verified</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preset Avatar Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#181615]">
                    Quick Choose Luxury Avatar Presets
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`p-2 rounded-xl border flex items-center gap-2.5 transition text-left cursor-pointer ${
                          avatarUrl === preset.url
                            ? 'bg-[#EFECE3] border-[#745A2E] ring-1 ring-[#745A2E]'
                            : 'bg-[#FAF7F2] border-[rgba(45,41,38,0.08)] hover:bg-[#EFECE3]'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <span className="text-[11px] font-medium text-[#181615] leading-tight line-clamp-1">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Avatar URL */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#181615]">
                    Custom Avatar Image URL
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.12)] text-xs text-[#181615] focus:outline-none focus:border-[#C2A26F] transition"
                  />
                  <span className="text-[10px] text-[#7A746E]">
                    Paste any public image URL or select from our curated quiet luxury presets above.
                  </span>
                </div>

                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#181615]">
                    Display Name / Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.12)] text-xs text-[#181615] focus:outline-none focus:border-[#C2A26F] transition font-medium"
                  />
                </div>

                {/* Email Address (Read-only) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#181615]">
                    Connected Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email || ''}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFECE3]/60 border border-[rgba(45,41,38,0.08)] text-xs text-[#7A746E] cursor-not-allowed font-mono"
                  />
                </div>

                {/* Preferred User Timezone */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#181615]">
                    User Primary Timezone
                  </label>
                  <select
                    value={profileTimezone}
                    onChange={(e) => setProfileTimezone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.12)] text-xs text-[#181615] focus:outline-none focus:border-[#C2A26F]"
                  >
                    {COMMON_TIMEZONES.map((tz: string) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Messages */}
                {profileSaved && (
                  <div className="p-3.5 rounded-xl bg-[#EFECE3] border border-[#4A6B56]/30 text-xs text-[#4A6B56] font-mono flex items-center gap-2 animate-in fade-in">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    <span>Profile preferences successfully saved to Supabase Cloud!</span>
                  </div>
                )}

                {profileError && (
                  <div className="p-3.5 rounded-xl bg-[#BA1A1A]/10 border border-[#BA1A1A]/20 text-xs text-[#BA1A1A] font-mono flex items-center gap-2 animate-in fade-in">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{profileError}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-[rgba(45,41,38,0.08)]">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    <span>{isSavingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => logout()}
                    className="px-4 py-2 rounded-xl bg-[#EFECE3] hover:bg-[#FAF7F2] text-[#BA1A1A] text-xs font-semibold border border-[rgba(45,41,38,0.1)] transition cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#EFECE3] text-[#745A2E] flex items-center justify-center mx-auto shadow-xs">
                  <span className="material-symbols-outlined text-2xl">account_circle</span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-xl text-[#181615]">Sign In to Customize Your Profile</h3>
                  <p className="text-xs text-[#7A746E] max-w-sm mx-auto">
                    Sign in to sync your reminders, custom avatars, and delivery preferences across all your devices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const authBtn = document.querySelector('[data-tab="account"]') as HTMLElement
                    if (authBtn) authBtn.click()
                  }}
                  className="btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">login</span>
                  <span>Go to Account Sign In</span>
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ──────────────── TAB 4: VOICE & AUDIO ──────────────── */}
      {activeTab === 'voice' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            {/* Alert Tone Selector */}
            <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-[#181615]">Alert Chime Harmonics</span>
                <span className="text-[10px] font-mono uppercase text-[#745A2E] font-semibold">
                  {selectedHarmonic}
                </span>
              </div>
              <p className="text-[11px] text-[#7A746E]">
                Select the harmonic frequency played when reminders and test alerts arrive.
              </p>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {[
                  { name: 'Chime', sub: 'Gentle Bell', icon: 'music_note' },
                  { name: 'Classic Bell', sub: 'Standard Tone', icon: 'notifications' },
                  { name: 'Vibration Only', sub: 'Muted', icon: 'vibration' },
                ].map((item) => {
                  const isSel = selectedHarmonic === item.name
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setSelectedHarmonic(item.name)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center cursor-pointer ${
                        isSel
                          ? 'bg-[#F4EFEB] border-[#C2A26F] text-[#181615] shadow-xs ring-1 ring-[#C2A26F]/40'
                          : 'bg-[#EFECE3] border-[rgba(45,41,38,0.08)] text-[#7A746E] hover:text-[#181615]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg mb-1">{item.icon}</span>
                      <span className="text-xs font-semibold">{item.name}</span>
                      <span className="text-[10px] opacity-75">{item.sub}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* In-App Spoken Voice Reminders */}
            <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#181615] block">
                    In-App Spoken Voice Reminders
                  </span>
                  <span className="text-[11px] text-[#7A746E]">
                    Uses device Web Speech API to narrate pending tasks during check-in windows.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={voicePreferences.speech_enabled}
                  onChange={(e) => updateVoicePreferences({ speech_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#745A2E] accent-[#745A2E] cursor-pointer"
                />
              </div>
            </div>

            {/* Automated Phone Call Reminders */}
            <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#181615] block">
                    Phone Call Reminders (Telephony)
                  </span>
                  <span className="text-[11px] text-[#7A746E]">
                    Receive automated phone call alerts for urgent tasks.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={voicePreferences.phone_call_enabled}
                  onChange={(e) => updateVoicePreferences({ phone_call_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#745A2E] accent-[#745A2E] cursor-pointer"
                />
              </div>

              {voicePreferences.phone_call_enabled && (
                <div className="pt-2 space-y-2">
                  <label className="text-[11px] text-[#7A746E] block">
                    Phone Number (E.164 format, e.g., +14155552671)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+1..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#EFECE3] border border-[rgba(45,41,38,0.12)] text-xs text-[#181615] focus:outline-none focus:bg-[#FAF7F2] focus:border-[#C2A26F]"
                    />
                    <button
                      type="button"
                      onClick={handleSavePhone}
                      className="btn-primary px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                  {phoneError && <p className="text-[11px] text-[#BA1A1A]">{phoneError}</p>}
                  {phoneSaved && <p className="text-[11px] text-[#4A6B56]">Phone number saved!</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 5: DELIVERY HISTORY LOG ──────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-mono uppercase tracking-wider text-[#745A2E] font-semibold">
                Recent Audit Trail Log
              </span>
              <span className="text-[10px] text-[#7A746E] font-mono">
                {events.length} Recorded
              </span>
            </div>

            {events.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)]">
                <span className="material-symbols-outlined text-[24px] text-[#7A746E] mb-1">
                  history_toggle_off
                </span>
                <p className="text-xs text-[#7A746E]">No notifications recorded in history yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 15).map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-sm text-[#745A2E]">
                        done_all
                      </span>
                      <div>
                        <span className="text-[#181615] block font-medium capitalize">
                          {evt.result.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-[#7A746E] font-mono">
                          {new Date(evt.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#EFECE3] text-[#4A6B56] font-medium">
                      Delivered
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Application Installation & Device Card */}
      {onOpenInstall && (
        <section className="mt-8 p-5 rounded-2xl bg-[#F4EFEB] border border-[rgba(45,41,38,0.12)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#181615] text-[#FAF7F2] flex items-center justify-center flex-shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-lg text-[#C2A26F]">
                {isStandalone ? 'verified' : 'download'}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#181615] font-serif">
                {isStandalone ? 'Chroniq Installed' : 'Install Chroniq App'}
              </h3>
              <p className="text-xs text-[#7A746E]">
                {isStandalone
                  ? 'Running natively in standalone full-screen mode.'
                  : 'Add to your Home Screen or Desktop for fast offline access.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenInstall}
            className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#2D2926] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all active:scale-[0.98] flex-shrink-0"
          >
            <span className="material-symbols-outlined text-sm text-[#C2A26F]">
              {isStandalone ? 'info' : 'download'}
            </span>
            <span>{isStandalone ? 'App Info' : 'Install App'}</span>
          </button>
        </section>
      )}
    </div>
  )
}

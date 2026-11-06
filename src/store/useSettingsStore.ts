import { create } from 'zustand'
import logoUrl from '@/assets/logo.png'
import type { NotificationEvent, NotificationPreferences, VoiceReminderPreferences, Task } from '@/types'
import {
  getPermissionState,
  isPushSupported,
  setupPushNotifications,
  type PushPermissionState,
} from '@/lib/pushClient'
import { playNotificationChime } from '@/lib/soundUtils'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { DEFAULT_REMINDER_SLOTS } from '@/lib/reminderUtils'
import { speakTaskReminder, isSpeechSynthesisSupported } from '@/lib/voiceReminderClient'

const SETTINGS_STORAGE_KEY = 'chroniq_settings_v3'
const VOICE_STORAGE_KEY = 'chroniq_voice_settings_v3'
const EVENTS_STORAGE_KEY = 'chroniq_events_v3'

function getDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function getInitialPreferences(): NotificationPreferences {
  const defaults: NotificationPreferences = {
    id: 'local-pref',
    user_id: 'local-user',
    enabled: true,
    timezone: getDefaultTimezone(),
    reminder_start_time: '09:00',
    reminder_end_time: '21:00',
    interval_minutes: 180,
    suppress_when_no_tasks: true,
    custom_slots: [...DEFAULT_REMINDER_SLOTS],
    active_slots: [...DEFAULT_REMINDER_SLOTS],
    active_days: [1, 2, 3, 4, 5, 6, 7],
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    eligible_task_types: 'all_pending',
    push_enabled: true,
    voice_enabled: false,
    warning_10m_enabled: true,
    overdue_alert_enabled: true,
    recurring_3h_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (typeof window === 'undefined') return defaults
  const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (saved) {
    try {
      return { ...defaults, ...JSON.parse(saved) }
    } catch {
      // Use defaults
    }
  }
  return defaults
}

function getInitialVoicePreferences(): VoiceReminderPreferences {
  const defaults: VoiceReminderPreferences = {
    id: 'local-voice',
    user_id: 'local-user',
    speech_enabled: true,
    speech_rate: 1.0,
    speech_pitch: 1.0,
    speech_voice: 'natural',
    phone_call_enabled: false,
    phone_number: null,
    phone_country_code: '+1',
    phone_verified: false,
    phone_consent_given_at: null,
    provider_preference: 'twilio',
    max_calls_per_day: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (typeof window === 'undefined') return defaults
  const saved = localStorage.getItem(VOICE_STORAGE_KEY)
  if (saved) {
    try {
      return { ...defaults, ...JSON.parse(saved) }
    } catch {
      // Use defaults
    }
  }
  return defaults
}

function getInitialEvents(): NotificationEvent[] {
  if (typeof window === 'undefined') return []
  const saved = localStorage.getItem(EVENTS_STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      // Fallback
    }
  }

  const exampleEvents: NotificationEvent[] = [
    {
      id: 'evt-1',
      user_id: 'local-user',
      schedule_occurrence_key: `local-user:${new Date().toISOString().slice(0, 10)}T09:00`,
      scheduled_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      attempted_at: new Date(Date.now() - 3 * 60 * 60 * 1000 + 400).toISOString(),
      result: 'sent',
      error_category: null,
      task_count_snapshot: 3,
      push_status_code: 201,
      delivery_mode: 'push',
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ]

  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(exampleEvents))
  return exampleEvents
}

interface SettingsStore {
  preferences: NotificationPreferences
  voicePreferences: VoiceReminderPreferences
  permission: PushPermissionState
  isPushSupported: boolean
  isSpeechSupported: boolean
  isSubscribed: boolean
  isSettingUpPush: boolean
  events: NotificationEvent[]
  testNotificationStatus: string | null
  isLoading: boolean
  errorMessage: string | null

  // Actions
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>
  updateVoicePreferences: (updates: Partial<VoiceReminderPreferences>) => Promise<void>
  addCustomSlot: (timeHHMM: string) => Promise<void>
  removeCustomSlot: (timeHHMM: string) => Promise<void>
  toggleSlotActive: (timeHHMM: string) => Promise<void>
  toggleDayActive: (isoDay: number) => Promise<void>
  refreshPermission: () => void
  enablePushNotifications: () => Promise<boolean>
  sendTestNotification: (unfinishedCount: number) => Promise<boolean>
  testVoiceReminder: (tasks: Task[]) => Promise<boolean>
  addEvent: (event: NotificationEvent) => void
  syncSettingsWithSupabase: () => Promise<void>
  clearError: () => void
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  preferences: getInitialPreferences(),
  voicePreferences: getInitialVoicePreferences(),
  permission: typeof window !== 'undefined' ? getPermissionState() : 'default',
  isPushSupported: typeof window !== 'undefined' ? isPushSupported() : false,
  isSpeechSupported: typeof window !== 'undefined' ? isSpeechSynthesisSupported() : false,
  isSubscribed: false,
  isSettingUpPush: false,
  events: getInitialEvents(),
  testNotificationStatus: null,
  isLoading: false,
  errorMessage: null,

  clearError: () => set({ errorMessage: null }),

  syncSettingsWithSupabase: async () => {
    if (!isSupabaseConfigured) return
    try {
      set({ isLoading: true })
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // Fetch notification preferences
        const { data: notifData } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (notifData) {
          const raw = notifData as any
          const loaded: NotificationPreferences = {
            ...get().preferences,
            ...(raw as Partial<NotificationPreferences>),
            custom_slots: raw.custom_slots || DEFAULT_REMINDER_SLOTS,
            active_slots: raw.active_slots || DEFAULT_REMINDER_SLOTS,
            active_days: raw.active_days || [1, 2, 3, 4, 5, 6, 7],
          }
          set({ preferences: loaded })
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(loaded))
        }

        // Fetch voice preferences
        const { data: voiceData } = await supabase
          .from('voice_reminder_preferences')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (voiceData) {
          const loadedVoice: VoiceReminderPreferences = {
            ...get().voicePreferences,
            ...(voiceData as unknown as Partial<VoiceReminderPreferences>),
          }
          set({ voicePreferences: loadedVoice })
          localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify(loadedVoice))
        }

        // Fetch recent notification events
        const { data: eventData } = await supabase
          .from('notification_events')
          .select('*')
          .eq('user_id', session.user.id)
          .order('scheduled_at', { ascending: false })
          .limit(30)

        if (eventData) {
          set({ events: eventData as unknown as NotificationEvent[] })
          localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(eventData))
        }
      }
    } catch (err: any) {
      console.warn('Sync preferences error:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  updatePreferences: async (updates) => {
    const updated = {
      ...get().preferences,
      ...updates,
      updated_at: new Date().toISOString(),
    }
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated))
    set({ preferences: updated })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { error } = await (supabase.from('notification_preferences') as any).upsert({
          ...updated,
          user_id: session.user.id,
        })
        if (error) {
          set({ errorMessage: `Failed to save reminder preferences: ${error.message}` })
        }
      }
    } catch {
      // Local fallback
    }
  },

  updateVoicePreferences: async (updates) => {
    const updated = {
      ...get().voicePreferences,
      ...updates,
      updated_at: new Date().toISOString(),
    }
    localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify(updated))
    set({ voicePreferences: updated })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { error } = await (supabase.from('voice_reminder_preferences') as any).upsert({
          ...updated,
          user_id: session.user.id,
        })
        if (error) {
          set({ errorMessage: `Failed to save voice preferences: ${error.message}` })
        }
      }
    } catch {
      // Local fallback
    }
  },

  addCustomSlot: async (timeHHMM) => {
    const current = get().preferences.custom_slots || []
    if (current.includes(timeHHMM)) return
    const updatedSlots = [...current, timeHHMM].sort()
    const updatedActive = [...(get().preferences.active_slots || []), timeHHMM].sort()
    await get().updatePreferences({
      custom_slots: updatedSlots,
      active_slots: updatedActive,
    })
  },

  removeCustomSlot: async (timeHHMM) => {
    const updatedSlots = (get().preferences.custom_slots || []).filter((s) => s !== timeHHMM)
    const updatedActive = (get().preferences.active_slots || []).filter((s) => s !== timeHHMM)
    await get().updatePreferences({
      custom_slots: updatedSlots,
      active_slots: updatedActive,
    })
  },

  toggleSlotActive: async (timeHHMM) => {
    const currentActive = get().preferences.active_slots || []
    const nextActive = currentActive.includes(timeHHMM)
      ? currentActive.filter((s) => s !== timeHHMM)
      : [...currentActive, timeHHMM].sort()
    await get().updatePreferences({ active_slots: nextActive })
  },

  toggleDayActive: async (isoDay) => {
    const currentDays = get().preferences.active_days || [1, 2, 3, 4, 5, 6, 7]
    const nextDays = currentDays.includes(isoDay)
      ? currentDays.filter((d) => d !== isoDay)
      : [...currentDays, isoDay].sort()
    await get().updatePreferences({ active_days: nextDays })
  },

  refreshPermission: () => {
    set({
      permission: getPermissionState(),
      isPushSupported: isPushSupported(),
      isSpeechSupported: isSpeechSynthesisSupported(),
    })
  },

  enablePushNotifications: async () => {
    set({ isSettingUpPush: true, errorMessage: null })
    try {
      const result = await setupPushNotifications('Primary Device')
      set({
        permission: result.permissionState,
        isSubscribed: result.success,
        errorMessage: result.error || null,
      })
      if (result.success) {
        playNotificationChime()
      }
      return result.success
    } finally {
      set({ isSettingUpPush: false })
    }
  },

  sendTestNotification: async (unfinishedCount: number) => {
    playNotificationChime()
    const now = new Date()
    const title = 'Chroniq — Check-In'
    const body =
      unfinishedCount > 0
        ? `You have ${unfinishedCount} unfinished task${unfinishedCount === 1 ? '' : 's'} waiting. Own your time!`
        : 'All tasks completed! Own your time. Finish what matters.'

    const newEvent: NotificationEvent = {
      id: `evt-${Date.now()}`,
      user_id: 'local-user',
      schedule_occurrence_key: `local-user:${now.toISOString().slice(0, 16)}`,
      scheduled_at: now.toISOString(),
      attempted_at: now.toISOString(),
      result: 'sent',
      error_category: null,
      task_count_snapshot: unfinishedCount,
      push_status_code: 200,
      delivery_mode: 'push',
      created_at: now.toISOString(),
    }

    get().addEvent(newEvent)

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready
          if (reg) {
            await reg.showNotification(title, {
              body,
              icon: logoUrl,
              badge: logoUrl,
              tag: 'chroniq-test-reminder',
              data: { url: window.location.href },
            })
            set({ testNotificationStatus: 'Dispatched to Service Worker!' })
            setTimeout(() => set({ testNotificationStatus: null }), 4000)
            return true
          }
        }
        new Notification(title, { body, icon: logoUrl })
        set({ testNotificationStatus: 'Browser notification shown!' })
        setTimeout(() => set({ testNotificationStatus: null }), 4000)
        return true
      } catch (err) {
        console.warn('Notification display failed:', err)
      }
    }

    set({ testNotificationStatus: `[Simulation] "${title}": ${body}` })
    setTimeout(() => set({ testNotificationStatus: null }), 5000)
    return true
  },

  testVoiceReminder: async (tasks: Task[]) => {
    const { voicePreferences } = get()
    const result = await speakTaskReminder(tasks, {
      rate: voicePreferences.speech_rate,
      pitch: voicePreferences.speech_pitch,
    })

    const now = new Date()
    const newEvent: NotificationEvent = {
      id: `evt-${Date.now()}`,
      user_id: 'local-user',
      schedule_occurrence_key: `voice-test:${now.toISOString().slice(0, 16)}`,
      scheduled_at: now.toISOString(),
      attempted_at: now.toISOString(),
      result: result.success ? 'sent' : 'failed',
      error_category: result.success ? null : 'speech_synthesis_unavailable',
      task_count_snapshot: tasks.filter((t) => t.status !== 'completed').length,
      push_status_code: null,
      delivery_mode: 'speech_chime',
      created_at: now.toISOString(),
    }
    get().addEvent(newEvent)

    set({ testNotificationStatus: result.message })
    setTimeout(() => set({ testNotificationStatus: null }), 5000)
    return result.success
  },

  addEvent: (event) => {
    const updated = [event, ...get().events.slice(0, 29)]
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated))
    set({ events: updated })
  },
}))

import { create } from 'zustand'
import type { NotificationEvent, NotificationPreferences } from '@/types'
import {
  getPermissionState,
  isPushSupported,
  setupPushNotifications,
  type PushPermissionState,
} from '@/lib/pushClient'
import { playNotificationChime } from '@/lib/soundUtils'
import { supabase } from '@/lib/supabase'

const SETTINGS_STORAGE_KEY = 'chroniq_settings_v2'
const EVENTS_STORAGE_KEY = 'chroniq_events_v2'

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
    interval_minutes: 180, // 3 hours
    suppress_when_no_tasks: true,
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

  // Prepopulate an example event for audit demonstration
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
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ]

  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(exampleEvents))
  return exampleEvents
}

interface SettingsStore {
  preferences: NotificationPreferences
  permission: PushPermissionState
  isPushSupported: boolean
  isSubscribed: boolean
  isSettingUpPush: boolean
  events: NotificationEvent[]
  testNotificationStatus: string | null

  // Actions
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>
  refreshPermission: () => void
  enablePushNotifications: () => Promise<boolean>
  sendTestNotification: (unfinishedCount: number) => Promise<boolean>
  addEvent: (event: NotificationEvent) => void
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  preferences: getInitialPreferences(),
  permission: typeof window !== 'undefined' ? getPermissionState() : 'default',
  isPushSupported: typeof window !== 'undefined' ? isPushSupported() : false,
  isSubscribed: false,
  isSettingUpPush: false,
  events: getInitialEvents(),
  testNotificationStatus: null,

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('notification_preferences') as any).upsert({
          ...updated,
          user_id: session.user.id,
        })
      }
    } catch {
      // Local fallback
    }
  },

  refreshPermission: () => {
    set({
      permission: getPermissionState(),
      isPushSupported: isPushSupported(),
    })
  },

  enablePushNotifications: async () => {
    set({ isSettingUpPush: true })
    try {
      const result = await setupPushNotifications('Primary Device')
      set({
        permission: result.permissionState,
        isSubscribed: result.success,
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
    const title = 'Chroniq — 3-Hour Reminder'
    const body = unfinishedCount > 0
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
      created_at: now.toISOString(),
    }

    get().addEvent(newEvent)

    // Try service worker or desktop notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration()
          if (reg) {
            await reg.showNotification(title, {
              body,
              icon: '/icons/icon-192.png',
              badge: '/icons/badge-72.png',
              tag: 'chroniq-test-reminder',
              data: { url: window.location.origin },
            })
            set({ testNotificationStatus: 'Notification dispatched to Service Worker!' })
            setTimeout(() => set({ testNotificationStatus: null }), 4000)
            return true
          }
        }
        new Notification(title, { body, icon: '/icons/icon-192.png' })
        set({ testNotificationStatus: 'Notification sent!' })
        setTimeout(() => set({ testNotificationStatus: null }), 4000)
        return true
      } catch (err) {
        console.warn('Local notification error:', err)
      }
    }

    // In-app fallback toast
    set({ testNotificationStatus: `[Simulation] "${title}": ${body}` })
    setTimeout(() => set({ testNotificationStatus: null }), 5000)
    return true
  },

  addEvent: (event) => {
    const updated = [event, ...get().events.slice(0, 19)]
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated))
    set({ events: updated })
  },
}))

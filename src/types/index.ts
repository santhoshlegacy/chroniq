// ─── Enums ────────────────────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type NotificationResult =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'skipped'
  | 'no_tasks'
  | 'expired_sub'
  | 'quiet_hours'
  | 'day_inactive'

export type EligibleTaskType = 'all_pending' | 'due_today_or_overdue' | 'urgent_only'
export type DeliveryMode = 'push' | 'speech_chime' | 'phone_call'

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  scheduled_date: string | null    // ISO date 'YYYY-MM-DD'
  due_at: string | null            // ISO datetime UTC
  estimated_duration_minutes: number | null
  completed_at: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  carried_from_date: string | null // ISO date 'YYYY-MM-DD'
  category: string | null
}

export interface Profile {
  id: string
  display_name: string | null
  email: string | null
  avatar_url: string | null
  full_name: string | null
  timezone: string
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  id: string
  user_id: string
  enabled: boolean
  timezone: string
  reminder_start_time: string  // 'HH:MM'
  reminder_end_time: string    // 'HH:MM'
  interval_minutes: number
  suppress_when_no_tasks: boolean
  // Extended custom schedule
  custom_slots: string[]       // e.g. ['09:00', '12:00', '15:00', '18:00', '21:00']
  active_slots: string[]       // subset of enabled slots
  active_days: number[]        // 1 = Monday ... 7 = Sunday
  quiet_hours_enabled: boolean
  quiet_hours_start: string    // '22:00'
  quiet_hours_end: string      // '08:00'
  eligible_task_types: EligibleTaskType
  push_enabled: boolean
  voice_enabled: boolean
  created_at: string
  updated_at: string
}

export interface VoiceReminderPreferences {
  id: string
  user_id: string
  speech_enabled: boolean
  speech_rate: number
  speech_pitch: number
  speech_voice: string
  phone_call_enabled: boolean
  phone_number: string | null
  phone_country_code: string
  phone_verified: boolean
  phone_consent_given_at: string | null
  provider_preference: 'twilio' | 'vonage' | 'mock'
  max_calls_per_day: number
  created_at: string
  updated_at: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  device_label: string | null
  created_at: string
  updated_at: string
  last_successful_delivery_at: string | null
  revoked_at: string | null
}

export interface NotificationEvent {
  id: string
  user_id: string
  schedule_occurrence_key: string
  scheduled_at: string
  attempted_at: string | null
  result: NotificationResult
  error_category: string | null
  task_count_snapshot: number | null
  push_status_code: number | null
  delivery_mode?: DeliveryMode
  telephony_call_id?: string | null
  telephony_provider?: string | null
  telephony_status?: string | null
  telephony_duration_seconds?: number | null
  telephony_cost_estimate?: number | null
  created_at: string
}

export interface DailySummary {
  id: string
  user_id: string
  local_date: string
  completed_count: number
  remaining_count: number
  overdue_count: number
  completion_percentage: number
  created_at: string
}

// ─── UI / View Models ─────────────────────────────────────────────────────────

export interface DashboardStats {
  totalToday: number
  completedToday: number
  remainingToday: number
  overdueCount: number
  urgentPending: number
  completionPercentage: number
  nextReminderAt: Date | null
  lastReminderResult: NotificationResult | null
  lastReminderAt: Date | null
}

export interface TaskFormValues {
  title: string
  description: string
  priority: TaskPriority
  scheduled_date: string
  due_at: string
  estimated_duration_minutes: string
  category: string
}

export interface ReminderSlot {
  timeStr: string       // 'HH:mm'
  localTime: Date       // local time of this slot
  slotKey: string       // 'YYYY-MM-DDTHH:MM' in user's timezone
  isActive: boolean
  isPast: boolean
  isNext: boolean
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface ApiError {
  message: string
  code?: string
}

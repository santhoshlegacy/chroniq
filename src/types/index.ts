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
  localTime: Date       // local time of this slot
  slotKey: string       // 'YYYY-MM-DDTHH:MM' in user's timezone
  isPast: boolean
  isNext: boolean
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface ApiError {
  message: string
  code?: string
}

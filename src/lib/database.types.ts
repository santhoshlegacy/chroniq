export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          email: string | null
          avatar_url: string | null
          full_name: string | null
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          email?: string | null
          avatar_url?: string | null
          full_name?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          email?: string | null
          avatar_url?: string | null
          full_name?: string | null
          timezone?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          status: 'pending' | 'in_progress' | 'completed'
          scheduled_date: string | null
          due_at: string | null
          estimated_duration_minutes: number | null
          completed_at: string | null
          created_at: string
          updated_at: string
          archived_at: string | null
          carried_from_date: string | null
          category: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'pending' | 'in_progress' | 'completed'
          scheduled_date?: string | null
          due_at?: string | null
          estimated_duration_minutes?: number | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
          carried_from_date?: string | null
          category?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'pending' | 'in_progress' | 'completed'
          scheduled_date?: string | null
          due_at?: string | null
          estimated_duration_minutes?: number | null
          completed_at?: string | null
          updated_at?: string
          archived_at?: string | null
          carried_from_date?: string | null
          category?: string | null
        }
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          enabled: boolean
          timezone: string
          reminder_start_time: string
          reminder_end_time: string
          interval_minutes: number
          suppress_when_no_tasks: boolean
          custom_slots: string[]
          active_slots: string[]
          active_days: number[]
          quiet_hours_enabled: boolean
          quiet_hours_start: string
          quiet_hours_end: string
          eligible_task_types: string
          push_enabled: boolean
          voice_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          enabled?: boolean
          timezone?: string
          reminder_start_time?: string
          reminder_end_time?: string
          interval_minutes?: number
          suppress_when_no_tasks?: boolean
          custom_slots?: string[]
          active_slots?: string[]
          active_days?: number[]
          quiet_hours_enabled?: boolean
          quiet_hours_start?: string
          quiet_hours_end?: string
          eligible_task_types?: string
          push_enabled?: boolean
          voice_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          timezone?: string
          reminder_start_time?: string
          reminder_end_time?: string
          interval_minutes?: number
          suppress_when_no_tasks?: boolean
          custom_slots?: string[]
          active_slots?: string[]
          active_days?: number[]
          quiet_hours_enabled?: boolean
          quiet_hours_start?: string
          quiet_hours_end?: string
          eligible_task_types?: string
          push_enabled?: boolean
          voice_enabled?: boolean
          updated_at?: string
        }
      }
      voice_reminder_preferences: {
        Row: {
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
          provider_preference: string
          max_calls_per_day: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          speech_enabled?: boolean
          speech_rate?: number
          speech_pitch?: number
          speech_voice?: string
          phone_call_enabled?: boolean
          phone_number?: string | null
          phone_country_code?: string
          phone_verified?: boolean
          phone_consent_given_at?: string | null
          provider_preference?: string
          max_calls_per_day?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          speech_enabled?: boolean
          speech_rate?: number
          speech_pitch?: number
          speech_voice?: string
          phone_call_enabled?: boolean
          phone_number?: string | null
          phone_country_code?: string
          phone_verified?: boolean
          phone_consent_given_at?: string | null
          provider_preference?: string
          max_calls_per_day?: number
          updated_at?: string
        }
      }
      push_subscriptions: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          device_label?: string | null
          created_at?: string
          updated_at?: string
          last_successful_delivery_at?: string | null
          revoked_at?: string | null
        }
        Update: {
          device_label?: string | null
          last_successful_delivery_at?: string | null
          revoked_at?: string | null
          updated_at?: string
        }
      }
      notification_events: {
        Row: {
          id: string
          user_id: string
          schedule_occurrence_key: string
          scheduled_at: string
          attempted_at: string | null
          result: 'pending' | 'sent' | 'failed' | 'skipped' | 'no_tasks' | 'expired_sub' | 'quiet_hours' | 'day_inactive'
          error_category: string | null
          task_count_snapshot: number | null
          push_status_code: number | null
          delivery_mode: string
          telephony_call_id: string | null
          telephony_provider: string | null
          telephony_status: string | null
          telephony_duration_seconds: number | null
          telephony_cost_estimate: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          schedule_occurrence_key: string
          scheduled_at: string
          attempted_at?: string | null
          result?: 'pending' | 'sent' | 'failed' | 'skipped' | 'no_tasks' | 'expired_sub' | 'quiet_hours' | 'day_inactive'
          error_category?: string | null
          task_count_snapshot?: number | null
          push_status_code?: number | null
          delivery_mode?: string
          telephony_call_id?: string | null
          telephony_provider?: string | null
          telephony_status?: string | null
          telephony_duration_seconds?: number | null
          telephony_cost_estimate?: number | null
          created_at?: string
        }
        Update: {
          attempted_at?: string | null
          result?: 'pending' | 'sent' | 'failed' | 'skipped' | 'no_tasks' | 'expired_sub' | 'quiet_hours' | 'day_inactive'
          error_category?: string | null
          task_count_snapshot?: number | null
          push_status_code?: number | null
          telephony_call_id?: string | null
          telephony_provider?: string | null
          telephony_status?: string | null
          telephony_duration_seconds?: number | null
          telephony_cost_estimate?: number | null
        }
      }
      daily_summaries: {
        Row: {
          id: string
          user_id: string
          local_date: string
          completed_count: number
          remaining_count: number
          overdue_count: number
          completion_percentage: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          local_date: string
          completed_count?: number
          remaining_count?: number
          overdue_count?: number
          completion_percentage?: number
          created_at?: string
        }
        Update: {
          completed_count?: number
          remaining_count?: number
          overdue_count?: number
          completion_percentage?: number
        }
      }
    }
  }
}

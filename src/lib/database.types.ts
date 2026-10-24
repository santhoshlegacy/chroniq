// Placeholder database types — will be replaced by `supabase gen types typescript`
// after the Supabase project is configured.
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
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
          endpoint?: string
          p256dh?: string
          auth?: string
          device_label?: string | null
          updated_at?: string
          last_successful_delivery_at?: string | null
          revoked_at?: string | null
        }
      }
      notification_events: {
        Row: {
          id: string
          user_id: string
          schedule_occurrence_key: string
          scheduled_at: string
          attempted_at: string | null
          result: 'pending' | 'sent' | 'failed' | 'skipped' | 'no_tasks' | 'expired_sub'
          error_category: string | null
          task_count_snapshot: number | null
          push_status_code: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          schedule_occurrence_key: string
          scheduled_at: string
          attempted_at?: string | null
          result?: 'pending' | 'sent' | 'failed' | 'skipped' | 'no_tasks' | 'expired_sub'
          error_category?: string | null
          task_count_snapshot?: number | null
          push_status_code?: number | null
          created_at?: string
        }
        Update: {
          attempted_at?: string | null
          result?: 'pending' | 'sent' | 'failed' | 'skipped' | 'no_tasks' | 'expired_sub'
          error_category?: string | null
          task_count_snapshot?: number | null
          push_status_code?: number | null
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

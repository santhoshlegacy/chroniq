import { create } from 'zustand'
import { format } from 'date-fns'
import type { Task, TaskPriority, TaskStatus } from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { playCompleteSound, playClickSound } from '@/lib/soundUtils'

const LOCAL_STORAGE_KEY = 'chroniq_tasks_v2'
const UNMIGRATED_LOCAL_KEY = 'chroniq_local_unmigrated_tasks'

function getLocalStoredTasks(): Task[] {
  if (typeof window === 'undefined') return []
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved) as Task[]
    } catch {
      // Return empty fallback
    }
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const initial: Task[] = [
    {
      id: 'task-1',
      user_id: 'local-user',
      title: 'Review Q4 Architecture Plan & Service Worker sync',
      description: 'Ensure Deno edge runtime and VAPID key exchange handles cron reminders reliably.',
      priority: 'urgent',
      status: 'pending',
      scheduled_date: todayStr,
      due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      estimated_duration_minutes: 45,
      completed_at: null,
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      archived_at: null,
      carried_from_date: null,
      category: 'Engineering',
    },
    {
      id: 'task-2',
      user_id: 'local-user',
      title: 'Audit quiet hours and custom reminder intervals',
      description: 'Verify 09:00, 12:00, 15:00, 18:00, 21:00 schedule cadence.',
      priority: 'high',
      status: 'pending',
      scheduled_date: todayStr,
      due_at: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      estimated_duration_minutes: 60,
      completed_at: null,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      archived_at: null,
      carried_from_date: null,
      category: 'Design',
    },
    {
      id: 'task-3',
      user_id: 'local-user',
      title: 'Configure Web Push permission and test reminder ping',
      description: 'Trigger simulated reminder to verify service worker notification display while browser is idle.',
      priority: 'medium',
      status: 'pending',
      scheduled_date: todayStr,
      due_at: null,
      estimated_duration_minutes: 20,
      completed_at: null,
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      archived_at: null,
      carried_from_date: null,
      category: 'Productivity',
    },
    {
      id: 'task-4',
      user_id: 'local-user',
      title: 'Initialize Chroniq database migrations & pg_cron schedule',
      description: 'Verified 001_initial_schema and 002_cron_scheduler idempotency.',
      priority: 'high',
      status: 'completed',
      scheduled_date: todayStr,
      due_at: null,
      estimated_duration_minutes: 30,
      completed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      archived_at: null,
      carried_from_date: null,
      category: 'DevOps',
    },
  ]

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial))
  return initial
}

export type TaskFilter = 'today' | 'upcoming' | 'overdue' | 'completed' | 'all'

export interface NewTaskInput {
  title: string
  description?: string | null
  priority?: TaskPriority
  status?: TaskStatus
  scheduled_date?: string | null
  due_at?: string | null
  estimated_duration_minutes?: number | null
  completed_at?: string | null
  archived_at?: string | null
  carried_from_date?: string | null
  category?: string | null
}

interface TaskStore {
  tasks: Task[]
  activeFilter: TaskFilter
  priorityFilter: TaskPriority | 'all'
  categoryFilter: string | 'all'
  searchQuery: string
  isLoading: boolean
  isSubmitting: boolean
  errorMessage: string | null
  isSupabaseConnected: boolean
  unmigratedLocalCount: number

  // Actions
  setFilter: (filter: TaskFilter) => void
  setPriorityFilter: (priority: TaskPriority | 'all') => void
  setCategoryFilter: (category: string | 'all') => void
  setSearchQuery: (query: string) => void
  clearError: () => void
  fetchTasks: () => Promise<void>
  syncWithSupabase: () => Promise<void>
  addTask: (task: NewTaskInput) => Promise<Task | null>
  updateTask: (id: string, updates: Partial<Task>) => Promise<boolean>
  toggleTaskComplete: (id: string) => Promise<boolean>
  deleteTask: (id: string) => Promise<boolean>
  archiveTask: (id: string) => Promise<boolean>
  importLocalTasksToCloud: () => Promise<{ imported: number; failed: number }>
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: getLocalStoredTasks(),
  activeFilter: 'today',
  priorityFilter: 'all',
  categoryFilter: 'all',
  searchQuery: '',
  isLoading: false,
  isSubmitting: false,
  errorMessage: null,
  isSupabaseConnected: false,
  unmigratedLocalCount: 0,

  setFilter: (filter) => {
    playClickSound()
    set({ activeFilter: filter })
  },

  setPriorityFilter: (priority) => {
    playClickSound()
    set({ priorityFilter: priority })
  },

  setCategoryFilter: (category) => {
    playClickSound()
    set({ categoryFilter: category })
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  clearError: () => set({ errorMessage: null }),

  fetchTasks: async () => {
    await get().syncWithSupabase()
  },

  syncWithSupabase: async () => {
    if (!isSupabaseConfigured) {
      set({ isSupabaseConnected: false })
      return
    }

    try {
      set({ isLoading: true, errorMessage: null })
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        set({ isSupabaseConnected: true })

        // Check if there are local offline tasks not yet imported to this user
        const localTasks = getLocalStoredTasks()
        const unmigrated = localTasks.filter(
          (t) => t.user_id === 'local-user' || t.user_id !== session.user.id
        )
        set({ unmigratedLocalCount: unmigrated.length })

        // Fetch user's tasks with index-optimized sorting
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(200)

        if (error) {
          set({ errorMessage: `Failed to load tasks from server: ${error.message}` })
          return
        }

        if (data) {
          set({ tasks: data as Task[] })
        }
      } else {
        set({ isSupabaseConnected: false, unmigratedLocalCount: 0 })
        // When not signed in, retain local tasks
        const localTasks = getLocalStoredTasks()
        set({ tasks: localTasks })
      }
    } catch (err: any) {
      set({ errorMessage: err?.message || 'Network error syncing tasks.' })
    } finally {
      set({ isLoading: false })
    }
  },

  addTask: async (taskData) => {
    if (get().isSubmitting) return null
    set({ isSubmitting: true, errorMessage: null })
    playClickSound()

    const nowIso = new Date().toISOString()
    const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}`

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        // Authenticated creation: Supabase assigns user_id via session
        const newTaskPayload = {
          user_id: session.user.id,
          title: taskData.title.trim(),
          description: taskData.description?.trim() || null,
          priority: taskData.priority ?? 'medium',
          status: taskData.status ?? 'pending',
          scheduled_date: taskData.scheduled_date || format(new Date(), 'yyyy-MM-dd'),
          due_at: taskData.due_at || null,
          estimated_duration_minutes: taskData.estimated_duration_minutes ?? null,
          completed_at: taskData.completed_at || null,
          archived_at: taskData.archived_at || null,
          carried_from_date: taskData.carried_from_date || null,
          category: taskData.category?.trim() || null,
        }

        const { data, error } = await (supabase.from('tasks') as any)
          .insert(newTaskPayload)
          .select()
          .single()

        if (error || !data) {
          set({ errorMessage: error?.message || 'Failed to save task to server.' })
          return null
        }

        const createdTask = data as Task
        set({ tasks: [createdTask, ...get().tasks] })
        return createdTask
      } else {
        // Local mode
        const newTask: Task = {
          id: tempId,
          user_id: 'local-user',
          title: taskData.title.trim(),
          description: taskData.description?.trim() || null,
          priority: taskData.priority ?? 'medium',
          status: taskData.status ?? 'pending',
          scheduled_date: taskData.scheduled_date || format(new Date(), 'yyyy-MM-dd'),
          due_at: taskData.due_at || null,
          estimated_duration_minutes: taskData.estimated_duration_minutes ?? null,
          completed_at: taskData.completed_at || null,
          archived_at: taskData.archived_at || null,
          carried_from_date: taskData.carried_from_date || null,
          category: taskData.category?.trim() || null,
          created_at: nowIso,
          updated_at: nowIso,
        }

        const updated = [newTask, ...get().tasks]
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
        set({ tasks: updated })
        return newTask
      }
    } catch (err: any) {
      set({ errorMessage: err?.message || 'Error creating task.' })
      return null
    } finally {
      set({ isSubmitting: false })
    }
  },

  updateTask: async (id, updates) => {
    if (get().isSubmitting) return false
    playClickSound()
    const previousTasks = get().tasks
    const nowIso = new Date().toISOString()

    // Optimistic update
    const updatedTasks = previousTasks.map((t) => (t.id === id ? { ...t, ...updates, updated_at: nowIso } : t))
    set({ tasks: updatedTasks, errorMessage: null })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { error } = await (supabase.from('tasks') as any)
          .update({
            ...updates,
            updated_at: nowIso,
          })
          .eq('id', id)
          .eq('user_id', session.user.id)

        if (error) {
          // Revert optimistic update
          set({ tasks: previousTasks, errorMessage: `Server update failed: ${error.message}` })
          return false
        }
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTasks))
      }
      return true
    } catch (err: any) {
      set({ tasks: previousTasks, errorMessage: err?.message || 'Error updating task.' })
      return false
    }
  },

  toggleTaskComplete: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return false

    const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed'
    const completedAt = nextStatus === 'completed' ? new Date().toISOString() : null

    if (nextStatus === 'completed') {
      playCompleteSound()
    } else {
      playClickSound()
    }

    return get().updateTask(id, {
      status: nextStatus,
      completed_at: completedAt,
    })
  },

  deleteTask: async (id) => {
    playClickSound()
    const previousTasks = get().tasks
    const updatedTasks = previousTasks.filter((t) => t.id !== id)
    set({ tasks: updatedTasks, errorMessage: null })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', id)
          .eq('user_id', session.user.id)

        if (error) {
          set({ tasks: previousTasks, errorMessage: `Failed to delete task: ${error.message}` })
          return false
        }
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTasks))
      }
      return true
    } catch (err: any) {
      set({ tasks: previousTasks, errorMessage: err?.message || 'Error deleting task.' })
      return false
    }
  },

  archiveTask: async (id) => {
    const nowIso = new Date().toISOString()
    return get().updateTask(id, {
      archived_at: nowIso,
    })
  },

  importLocalTasksToCloud: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      set({ errorMessage: 'Sign in required to import tasks.' })
      return { imported: 0, failed: 0 }
    }

    const localTasks = getLocalStoredTasks().filter(
      (t) => t.user_id === 'local-user' || t.user_id !== session.user.id
    )

    if (localTasks.length === 0) {
      set({ unmigratedLocalCount: 0 })
      return { imported: 0, failed: 0 }
    }

    set({ isLoading: true })
    let imported = 0
    let failed = 0

    for (const task of localTasks) {
      try {
        const { error } = await (supabase.from('tasks') as any).insert({
          user_id: session.user.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          scheduled_date: task.scheduled_date,
          due_at: task.due_at,
          estimated_duration_minutes: task.estimated_duration_minutes,
          completed_at: task.completed_at,
          archived_at: task.archived_at,
          category: task.category,
        })

        if (!error) {
          imported++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }

    // Clear migrated local tasks to prevent re-prompting
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    localStorage.setItem(UNMIGRATED_LOCAL_KEY, 'done')
    set({ unmigratedLocalCount: 0, isLoading: false })
    await get().syncWithSupabase()

    return { imported, failed }
  },
}))

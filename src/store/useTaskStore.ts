import { create } from 'zustand'
import { format } from 'date-fns'
import type { Task, TaskPriority, TaskStatus } from '@/types'
import { supabase } from '@/lib/supabase'
import { playCompleteSound, playClickSound } from '@/lib/soundUtils'

const LOCAL_STORAGE_KEY = 'chroniq_tasks_v2'

function getInitialTasks(): Task[] {
  if (typeof window === 'undefined') return []
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved) as Task[]
    } catch {
      // Fallback
    }
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const initial: Task[] = [
    {
      id: 'task-1',
      user_id: 'local-user',
      title: 'Review Q4 Architecture Plan & Service Worker sync',
      description: 'Ensure Deno edge runtime and VAPID key exchange handles 3-hour cron reminders reliably.',
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
      title: 'Polish Liquid Glass UI components & specular highlights',
      description: 'Add fluid backdrop-blur with 0.12 opacity borders and ambient radial glow orbs.',
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
      description: 'Trigger simulated 3-hour reminder to test service worker notification display while browser is idle.',
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
  searchQuery: string
  isLoading: boolean
  isSupabaseConnected: boolean

  // Actions
  setFilter: (filter: TaskFilter) => void
  setPriorityFilter: (priority: TaskPriority | 'all') => void
  setSearchQuery: (query: string) => void
  addTask: (task: NewTaskInput) => Promise<Task>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  toggleTaskComplete: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  archiveTask: (id: string) => Promise<void>
  syncWithSupabase: () => Promise<void>
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: getInitialTasks(),
  activeFilter: 'today',
  priorityFilter: 'all',
  searchQuery: '',
  isLoading: false,
  isSupabaseConnected: false,

  setFilter: (filter) => {
    playClickSound()
    set({ activeFilter: filter })
  },

  setPriorityFilter: (priority) => {
    playClickSound()
    set({ priorityFilter: priority })
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  addTask: async (taskData) => {
    playClickSound()
    const nowIso = new Date().toISOString()
    const newTask: Task = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}`,
      user_id: 'local-user',
      title: taskData.title,
      description: taskData.description ?? null,
      priority: taskData.priority ?? 'medium',
      status: taskData.status ?? 'pending',
      scheduled_date: taskData.scheduled_date ?? format(new Date(), 'yyyy-MM-dd'),
      due_at: taskData.due_at ?? null,
      estimated_duration_minutes: taskData.estimated_duration_minutes ?? null,
      completed_at: taskData.completed_at ?? null,
      archived_at: taskData.archived_at ?? null,
      carried_from_date: taskData.carried_from_date ?? null,
      category: taskData.category ?? null,
      created_at: nowIso,
      updated_at: nowIso,
    }

    const updated = [newTask, ...get().tasks]
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
    set({ tasks: updated })

    // Optional background sync with Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('tasks') as any).insert({
          ...newTask,
          user_id: session.user.id,
        })
      }
    } catch {
      // Local mode fallback
    }

    return newTask
  },

  updateTask: async (id, updates) => {
    playClickSound()
    const updated = get().tasks.map((t) => {
      if (t.id !== id) return t
      return {
        ...t,
        ...updates,
        updated_at: new Date().toISOString(),
      }
    })

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
    set({ tasks: updated })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('tasks') as any).update(updates).eq('id', id)
      }
    } catch {
      // Local fallback
    }
  },

  toggleTaskComplete: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return

    const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed'
    const completedAt = nextStatus === 'completed' ? new Date().toISOString() : null

    if (nextStatus === 'completed') {
      playCompleteSound()
    } else {
      playClickSound()
    }

    const updated = get().tasks.map((t) => {
      if (t.id !== id) return t
      return {
        ...t,
        status: nextStatus,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      }
    })

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
    set({ tasks: updated })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('tasks') as any).update({
          status: nextStatus,
          completed_at: completedAt,
        }).eq('id', id)
      }
    } catch {
      // Local fallback
    }
  },

  deleteTask: async (id) => {
    playClickSound()
    const updated = get().tasks.filter((t) => t.id !== id)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
    set({ tasks: updated })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('tasks') as any).delete().eq('id', id)
      }
    } catch {
      // Local fallback
    }
  },

  archiveTask: async (id) => {
    playClickSound()
    const nowIso = new Date().toISOString()
    const updated = get().tasks.map((t) => {
      if (t.id !== id) return t
      return { ...t, archived_at: nowIso, updated_at: nowIso }
    })
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
    set({ tasks: updated })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('tasks') as any).update({ archived_at: nowIso }).eq('id', id)
      }
    } catch {
      // Local fallback
    }
  },

  syncWithSupabase: async () => {
    try {
      set({ isLoading: true })
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        set({ isSupabaseConnected: true })
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          set({ tasks: data as Task[] })
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
        }
      }
    } catch {
      // Remain in local mode
    } finally {
      set({ isLoading: false })
    }
  },
}))

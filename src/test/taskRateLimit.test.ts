import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTaskStore } from '@/store/useTaskStore'
import { supabase } from '@/lib/supabase'

describe('Task Rate Limiting', () => {
  beforeEach(() => {
    localStorage.clear()
    useTaskStore.setState({
      tasks: [],
      errorMessage: null,
      isSubmitting: false,
    })
    vi.restoreAllMocks()
  })

  it('rejects 31st task in local storage mode without adding a ghost task', async () => {
    // Mock offline / no session
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    } as any)

    const store = useTaskStore.getState()

    // Add 30 tasks
    for (let i = 1; i <= 30; i++) {
      const task = await store.addTask({
        title: `Task #${i}`,
        description: null,
        priority: 'medium',
        status: 'pending',
        scheduled_date: '2026-11-05',
        due_at: null,
        estimated_duration_minutes: 15,
        completed_at: null,
      })
      expect(task).not.toBeNull()
    }

    expect(useTaskStore.getState().tasks.length).toBe(30)
    expect(useTaskStore.getState().errorMessage).toBeNull()

    // 31st task should be rate limited
    const rejectedTask = await store.addTask({
      title: 'Spam Task #31',
      description: null,
      priority: 'urgent',
      status: 'pending',
      scheduled_date: '2026-11-05',
      due_at: null,
      estimated_duration_minutes: 15,
      completed_at: null,
    })

    expect(rejectedTask).toBeNull()
    // No ghost task added: length must still be exactly 30
    expect(useTaskStore.getState().tasks.length).toBe(30)
    // Error message must match the exact requirement
    expect(useTaskStore.getState().errorMessage).toBe(
      'Rate limit exceeded. Please wait a minute before adding more tasks.'
    )
  })

  it('catches Supabase rate limit exception cleanly and sets error message without ghost task', async () => {
    const mockUser = { id: 'auth-user-999' }
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    } as any)

    // Mock Supabase insert returning the custom rate limit exception
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: 'P0001',
            message: 'Rate limit exceeded. Please wait a minute before adding more tasks.',
            details: 'check_task_rate_limit() trigger fired',
          },
        }),
      }),
    })

    vi.spyOn(supabase, 'from').mockReturnValue({
      insert: mockInsert,
    } as any)

    const store = useTaskStore.getState()
    const result = await store.addTask({
      title: 'Authenticated Task While Rate Limited',
      description: null,
      priority: 'high',
      status: 'pending',
      scheduled_date: '2026-11-05',
      due_at: null,
      estimated_duration_minutes: 20,
      completed_at: null,
    })

    expect(result).toBeNull()
    expect(useTaskStore.getState().tasks.length).toBe(0)
    expect(useTaskStore.getState().errorMessage).toBe(
      'Rate limit exceeded. Please wait a minute before adding more tasks.'
    )
  })
})

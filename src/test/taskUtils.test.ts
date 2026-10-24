import { describe, it, expect } from 'vitest'
import {
  isTaskEligibleToday,
  isTaskOverdue,
  calculateDashboardStats,
  sortTasksByPriorityThenDue,
} from '@/lib/taskUtils'
import type { Task } from '@/types'

function makeMockTask(overrides: Partial<Task>): Task {
  return {
    id: 't-1',
    user_id: 'u-1',
    title: 'Test task',
    description: null,
    status: 'pending',
    priority: 'medium',
    scheduled_date: '2026-10-24',
    due_at: null,
    estimated_duration_minutes: null,
    completed_at: null,
    archived_at: null,
    carried_from_date: null,
    category: null,
    created_at: '2026-10-24T00:00:00Z',
    updated_at: '2026-10-24T00:00:00Z',
    ...overrides,
  }
}

describe('taskUtils', () => {
  it('correctly determines task eligibility today', () => {
    const today = '2026-10-24'
    const pendingToday = makeMockTask({ scheduled_date: today, status: 'pending' })
    const completedToday = makeMockTask({ scheduled_date: today, status: 'completed' })
    const archived = makeMockTask({ scheduled_date: today, archived_at: '2026-10-24T01:00:00Z' })
    const future = makeMockTask({ scheduled_date: '2026-10-25' })
    const undated = makeMockTask({ scheduled_date: null })

    expect(isTaskEligibleToday(pendingToday, today)).toBe(true)
    expect(isTaskEligibleToday(undated, today)).toBe(true)
    expect(isTaskEligibleToday(completedToday, today)).toBe(false)
    expect(isTaskEligibleToday(archived, today)).toBe(false)
    expect(isTaskEligibleToday(future, today)).toBe(false)
  })

  it('detects overdue tasks based on due_at vs nowUtc', () => {
    const now = new Date('2026-10-24T12:00:00Z')
    const overdue = makeMockTask({ due_at: '2026-10-24T11:00:00Z' })
    const futureDue = makeMockTask({ due_at: '2026-10-24T13:00:00Z' })
    const completedOverdue = makeMockTask({
      due_at: '2026-10-24T11:00:00Z',
      status: 'completed',
    })

    expect(isTaskOverdue(overdue, now)).toBe(true)
    expect(isTaskOverdue(futureDue, now)).toBe(false)
    expect(isTaskOverdue(completedOverdue, now)).toBe(false)
  })

  it('calculates dashboard completion statistics without division by zero', () => {
    const now = new Date('2026-10-24T12:00:00Z')
    const statsEmpty = calculateDashboardStats([], now, 'UTC', {
      nextReminderAt: null,
      lastReminderResult: null,
      lastReminderAt: null,
    })

    expect(statsEmpty.totalToday).toBe(0)
    expect(statsEmpty.completionPercentage).toBe(0)

    const tasks: Task[] = [
      makeMockTask({ id: '1', status: 'completed', completed_at: '2026-10-24T10:00:00Z' }),
      makeMockTask({ id: '2', status: 'pending', priority: 'urgent' }),
    ]

    const stats = calculateDashboardStats(tasks, now, 'UTC', {
      nextReminderAt: null,
      lastReminderResult: 'sent',
      lastReminderAt: new Date('2026-10-24T09:00:00Z'),
    })

    expect(stats.totalToday).toBe(2)
    expect(stats.completedToday).toBe(1)
    expect(stats.remainingToday).toBe(1)
    expect(stats.urgentPending).toBe(1)
    expect(stats.completionPercentage).toBe(50)
  })

  it('sorts tasks by priority (urgent > high > medium > low)', () => {
    const tasks: Task[] = [
      makeMockTask({ id: '1', priority: 'low' }),
      makeMockTask({ id: '2', priority: 'urgent' }),
      makeMockTask({ id: '3', priority: 'medium' }),
      makeMockTask({ id: '4', priority: 'high' }),
    ]

    const sorted = sortTasksByPriorityThenDue(tasks)
    expect(sorted.map((t) => t.priority)).toEqual(['urgent', 'high', 'medium', 'low'])
  })
})

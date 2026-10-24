import React, { useMemo } from 'react'
import { Sparkles, CheckCircle2, Plus } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { TaskCard } from './TaskCard'
import type { Task } from '@/types'
import {
  filterTodayTasks,
  filterOverdueTasks,
  filterCompletedToday,
  filterUpcoming,
  sortTasksByPriorityThenDue,
} from '@/lib/taskUtils'
import { format } from 'date-fns'

interface TaskListProps {
  onEditTask: (task: Task) => void
  onOpenNewTask: () => void
}

export const TaskList: React.FC<TaskListProps> = ({ onEditTask, onOpenNewTask }) => {
  const { tasks, activeFilter, priorityFilter, searchQuery } = useTaskStore()
  const { preferences } = useSettingsStore()

  const sorted = useMemo(() => {
    const nowUtc = new Date()
    const localToday = format(nowUtc, 'yyyy-MM-dd')

    let filtered: Task[] = []
    if (activeFilter === 'today') {
      filtered = filterTodayTasks(tasks, localToday)
    } else if (activeFilter === 'overdue') {
      filtered = filterOverdueTasks(tasks, nowUtc)
    } else if (activeFilter === 'upcoming') {
      filtered = filterUpcoming(tasks, localToday)
    } else if (activeFilter === 'completed') {
      filtered = filterCompletedToday(tasks, preferences.timezone)
    } else {
      filtered = tasks.filter((t) => t.archived_at === null)
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter((t) => t.priority === priorityFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q)),
      )
    }

    return sortTasksByPriorityThenDue(filtered)
  }, [tasks, activeFilter, priorityFilter, searchQuery, preferences.timezone])

  if (sorted.length === 0) {
    return (
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-8 sm:p-12 text-center my-4">
        <div className="w-10 h-10 mx-auto rounded-xl bg-[#151B28] border border-white/[0.08] flex items-center justify-center text-[#70DFFF] mb-3">
          {activeFilter === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <Sparkles className="w-5 h-5 text-[#70DFFF]" />
          )}
        </div>
        <h3 className="text-sm font-semibold text-white">
          {activeFilter === 'completed'
            ? 'No completed tasks yet today'
            : activeFilter === 'overdue'
            ? 'No overdue tasks — schedule on track'
            : 'No tasks found'}
        </h3>
        <p className="mt-1 text-xs text-[#94A3B8] max-w-xs mx-auto">
          {activeFilter === 'today'
            ? 'Add a priority task to keep your rhythm moving today.'
            : 'Tasks matching this filter will appear here.'}
        </p>
        <button
          onClick={onOpenNewTask}
          className="mt-4 btn-primary px-3.5 py-1.5 text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Task</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2 mb-12">
      {sorted.map((task) => (
        <TaskCard key={task.id} task={task} onEdit={onEditTask} />
      ))}
    </div>
  )
}

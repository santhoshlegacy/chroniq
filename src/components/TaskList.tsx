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
  onSelectTask?: (task: Task) => void
}

export const TaskList: React.FC<TaskListProps> = ({
  onEditTask,
  onOpenNewTask,
  onSelectTask,
}) => {
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
      <div className="bg-[#121826] border border-white/[0.06] rounded-2xl p-8 sm:p-12 text-center my-4 shadow-sm">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[#182233] border border-white/[0.08] flex items-center justify-center text-[#5EEAD4] mb-3.5 shadow-xs">
          {activeFilter === 'completed' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          ) : (
            <Sparkles className="w-6 h-6 text-[#5EEAD4]" />
          )}
        </div>
        <h3 className="text-base font-semibold text-white font-['Outfit']">
          {activeFilter === 'completed'
            ? 'No completed tasks yet today'
            : activeFilter === 'overdue'
            ? 'No overdue tasks — schedule on track'
            : 'No tasks in this view'}
        </h3>
        <p className="mt-1 text-xs text-[#94A3B8] max-w-xs mx-auto">
          {activeFilter === 'today'
            ? 'Add a priority task to focus your energy today.'
            : 'Tasks matching this filter will appear here.'}
        </p>
        <button
          onClick={onOpenNewTask}
          className="mt-4 btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Task</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2.5 mb-20 sm:mb-12">
      {sorted.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onEditTask}
          onSelect={onSelectTask}
        />
      ))}
    </div>
  )
}

import React, { useMemo } from 'react'
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
      <div className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-2xl p-8 sm:p-14 text-center my-6 shadow-xs relative overflow-hidden">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#EFECE3] border border-[rgba(45,41,38,0.08)] flex items-center justify-center text-[#745A2E] mb-3.5 shadow-xs">
          <span className="material-symbols-outlined text-[24px]">
            {activeFilter === 'completed' ? 'verified' : 'hourglass_empty'}
          </span>
        </div>

        <h3 className="font-serif text-xl sm:text-2xl text-[#181615]">
          {activeFilter === 'completed'
            ? 'No completed tasks yet today'
            : activeFilter === 'overdue'
            ? "No overdue tasks — you're all caught up!"
            : 'No tasks found'}
        </h3>

        <p className="mt-1.5 text-xs text-[#7A746E] max-w-sm mx-auto leading-relaxed">
          {activeFilter === 'today'
            ? 'Add a task to plan your day and stay on track.'
            : 'Tasks matching this filter will appear here.'}
        </p>

        <button
          onClick={onOpenNewTask}
          className="btn-primary mt-6 px-5 py-2.5 rounded-md inline-flex items-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider font-semibold"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          <span>Add Task</span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 mb-24 sm:mb-16">
      {/* Editorial Section Horizon Header */}
      <div className="flex items-end justify-between pt-2 pb-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#745A2E] font-semibold">
            Task List
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#181615]">
            All Tasks
          </h2>
        </div>
        <div className="flex items-center gap-2 bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] px-3.5 py-1 rounded-full text-[#2D2926] shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#745A2E]" />
          <span className="font-mono text-xs text-[#181615] tabular-nums font-semibold">
            {sorted.length} {sorted.length === 1 ? 'Task' : 'Tasks'}
          </span>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        {sorted.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEditTask}
            onSelect={onSelectTask}
          />
        ))}
      </div>
    </div>
  )
}

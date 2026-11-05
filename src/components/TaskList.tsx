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
      <div className="bg-[#1B1C1E] border border-[#DAC58F]/15 rounded-2xl p-8 sm:p-12 text-center my-4 shadow-sm relative overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-[#DAC58F]/5 blur-3xl pointer-events-none" />

        <div className="w-12 h-12 mx-auto rounded-full bg-[#121315] border border-[#DAC58F]/25 flex items-center justify-center text-[#F2CA50] mb-3.5 shadow-md">
          <span className="material-symbols-outlined text-[24px]">
            {activeFilter === 'completed' ? 'verified' : 'hourglass_empty'}
          </span>
        </div>

        <h3 className="font-serif text-lg text-white">
          {activeFilter === 'completed'
            ? 'No completed mandates recorded yet today'
            : activeFilter === 'overdue'
            ? 'No overdue mandates — celestial cadence honored'
            : 'Ledger Empty • Tranquil Horizon'}
        </h3>

        <p className="mt-1 text-xs text-[#99907C] max-w-xs mx-auto leading-relaxed">
          {activeFilter === 'today'
            ? 'Inscribe a high-priority mandate to structure your focus cadence.'
            : 'All recorded mandates matching this filter will materialize here.'}
        </p>

        <button
          onClick={onOpenNewTask}
          className="mt-5 px-4 py-2 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-[#F2CA50] text-[#141211] text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          <span>Inscribe Mandate</span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 mb-20 sm:mb-12">
      {/* Editorial Section Horizon Header */}
      <div className="flex items-end justify-between pt-1 pb-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#DAC58F] font-semibold">
            Master Ledger
          </span>
          <h2 className="font-serif text-xl sm:text-2xl text-white">
            Curated Mandates
          </h2>
        </div>
        <div className="flex items-center gap-1.5 bg-[#1B1C1E] border border-[#DAC58F]/15 px-3 py-1 rounded-full text-[#D0C5AF] shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DAC58F]" />
          <span className="font-mono text-xs text-white tabular-nums">
            {sorted.length} {sorted.length === 1 ? 'Mandate' : 'Mandates'}
          </span>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-2.5">
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

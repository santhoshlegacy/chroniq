import React, { useMemo } from 'react'
import { Search, Filter, Calendar, Clock, AlertTriangle, CheckCircle2, ListFilter } from 'lucide-react'
import { useTaskStore, type TaskFilter } from '@/store/useTaskStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { filterTodayTasks, filterOverdueTasks, filterCompletedToday, filterUpcoming } from '@/lib/taskUtils'
import type { TaskPriority } from '@/types'
import { format } from 'date-fns'

interface TaskFilterBarProps {
  onOpenNewTask: () => void
}

export const TaskFilterBar: React.FC<TaskFilterBarProps> = () => {
  const { tasks, activeFilter, setFilter, priorityFilter, setPriorityFilter, searchQuery, setSearchQuery } = useTaskStore()
  const { preferences } = useSettingsStore()

  const { todayCount, overdueCount, upcomingCount, completedCount, allCount } = useMemo(() => {
    const nowUtc = new Date()
    const localToday = format(nowUtc, 'yyyy-MM-dd')
    return {
      todayCount: filterTodayTasks(tasks, localToday).length,
      overdueCount: filterOverdueTasks(tasks, nowUtc).length,
      upcomingCount: filterUpcoming(tasks, localToday).length,
      completedCount: filterCompletedToday(tasks, preferences.timezone).length,
      allCount: tasks.filter((t) => t.archived_at === null).length,
    }
  }, [tasks, preferences.timezone])

  const filterTabs: { id: TaskFilter; label: string; count: number; icon: React.ReactNode }[] = [
    { id: 'today', label: 'Today', count: todayCount, icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'upcoming', label: 'Upcoming', count: upcomingCount, icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'overdue', label: 'Overdue', count: overdueCount, icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> },
    { id: 'completed', label: 'Completed', count: completedCount, icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'all', label: 'All Tasks', count: allCount, icon: <ListFilter className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
      {/* Navigation Filter Tabs */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-[#151B28] text-white border border-white/[0.08] shadow-xs'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <span className={isActive ? 'text-[#70DFFF]' : 'text-[#64748B]'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              <span
                className={`tabular-nums font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                  isActive
                    ? 'bg-[#111827] text-white'
                    : 'text-[#64748B]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search & Priority Filter Controls */}
      <div className="flex items-center space-x-2">
        {/* Search Input */}
        <div className="relative flex-1 sm:w-48">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#111827] border border-white/[0.06] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#70DFFF]/40 transition"
          />
        </div>

        {/* Priority Filter */}
        <div className="relative">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
            className="appearance-none px-3 py-1.5 pr-7 rounded-lg bg-[#111827] border border-white/[0.06] text-xs text-[#94A3B8] hover:text-white font-medium focus:outline-none focus:border-[#70DFFF]/40 cursor-pointer transition"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <Filter className="w-3 h-3 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  )
}

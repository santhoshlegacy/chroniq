import React, { useMemo } from 'react'
import { useTaskStore, type TaskFilter } from '@/store/useTaskStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { filterTodayTasks, filterOverdueTasks, filterCompletedToday, filterUpcoming } from '@/lib/taskUtils'
import type { TaskPriority } from '@/types'
import { format } from 'date-fns'

interface TaskFilterBarProps {
  onOpenNewTask?: () => void
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

  const filterTabs: { id: TaskFilter; label: string; count: number; isOverdue?: boolean }[] = [
    { id: 'today', label: 'Active', count: todayCount },
    { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
    { id: 'overdue', label: 'Overdue', count: overdueCount, isOverdue: true },
    { id: 'completed', label: 'Completed', count: completedCount },
    { id: 'all', label: 'All Folios', count: allCount },
  ]

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
      {/* Editorial Filter Horizon (Pills) */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#F2CA50] text-[#141211] shadow-sm'
                  : 'bg-[#1B1C1E] text-[#D0C5AF] hover:text-white hover:bg-[#292A2C] border border-[#DAC58F]/10'
              }`}
            >
              <span>{tab.label}</span>
              {tab.isOverdue && tab.count > 0 ? (
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] font-bold ${
                    isActive
                      ? 'bg-[#141211] text-[#F2CA50]'
                      : 'bg-[#93000A] text-[#FFDAD6]'
                  }`}
                >
                  {tab.count}
                </span>
              ) : (
                <span
                  className={`font-mono text-[10px] tabular-nums ${
                    isActive ? 'text-[#141211] font-bold' : 'text-[#99907C]'
                  }`}
                >
                  ({tab.count})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search & Priority Controls */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1 sm:w-48">
          <span className="material-symbols-outlined text-[16px] text-[#99907C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search mandates..."
            className="w-full pl-8 pr-3 py-1.5 rounded-full bg-[#1B1C1E] border border-[#DAC58F]/15 text-xs text-white placeholder-[#99907C]/70 focus:outline-none focus:border-[#DAC58F]/50 transition"
          />
        </div>

        {/* Priority Filter */}
        <div className="relative">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
            className="appearance-none px-3 py-1.5 pr-7 rounded-full bg-[#1B1C1E] border border-[#DAC58F]/15 text-xs text-[#D0C5AF] hover:text-white font-medium focus:outline-none focus:border-[#DAC58F]/50 cursor-pointer transition"
          >
            <option value="all">All Tiers</option>
            <option value="urgent">Tier 1 Sovereign</option>
            <option value="high">Amber Horizon</option>
            <option value="medium">Champagne</option>
            <option value="low">Sage Ritual</option>
          </select>
          <span className="material-symbols-outlined text-[15px] text-[#99907C] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            expand_more
          </span>
        </div>
      </div>
    </div>
  )
}

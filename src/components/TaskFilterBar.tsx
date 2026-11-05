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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
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
                  ? 'bg-[#181615] text-[#FAF7F2] shadow-xs'
                  : 'bg-[#F4EFEB] text-[#2D2926] hover:text-[#181615] hover:bg-[#EFECE3] border border-[rgba(45,41,38,0.08)]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.isOverdue && tab.count > 0 ? (
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] font-bold ${
                    isActive
                      ? 'bg-[#FAF7F2] text-[#BA1A1A]'
                      : 'bg-[#FFDAD6] text-[#BA1A1A]'
                  }`}
                >
                  {tab.count}
                </span>
              ) : (
                <span
                  className={`font-mono text-[10px] tabular-nums ${
                    isActive ? 'text-[#FAF7F2] font-semibold' : 'text-[#7A746E]'
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
          <span className="material-symbols-outlined text-[16px] text-[#7A746E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search mandates..."
            className="w-full pl-8 pr-3 py-1.5 rounded-full bg-[#F4EFEB] border border-[rgba(45,41,38,0.1)] text-xs text-[#181615] placeholder-[#7A746E] focus:outline-none focus:bg-[#FAF7F2] focus:border-[#C2A26F] transition"
          />
        </div>

        {/* Priority Filter */}
        <div className="relative">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
            className="appearance-none px-3 py-1.5 pr-7 rounded-full bg-[#F4EFEB] border border-[rgba(45,41,38,0.1)] text-xs text-[#181615] font-medium focus:outline-none focus:bg-[#FAF7F2] focus:border-[#C2A26F] cursor-pointer transition"
          >
            <option value="all">All Tiers</option>
            <option value="urgent">Tier 1 Sovereign</option>
            <option value="high">Amber Horizon</option>
            <option value="medium">Champagne</option>
            <option value="low">Sage Ritual</option>
          </select>
          <span className="material-symbols-outlined text-[15px] text-[#7A746E] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            expand_more
          </span>
        </div>
      </div>
    </div>
  )
}

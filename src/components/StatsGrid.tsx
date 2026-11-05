import React, { useMemo } from 'react'
import { CheckCircle2, Target, Zap, AlertTriangle } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { calculateDashboardStats } from '@/lib/taskUtils'

export const StatsGrid: React.FC = () => {
  const { tasks } = useTaskStore()
  const { preferences } = useSettingsStore()

  const stats = useMemo(() => {
    return calculateDashboardStats(tasks, new Date(), preferences.timezone, {
      nextReminderAt: null,
      lastReminderResult: null,
      lastReminderAt: null,
    })
  }, [tasks, preferences.timezone])

  return (
    <div className="bg-[#121826] border border-white/[0.06] rounded-2xl p-4 sm:p-5 mb-6 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 md:divide-x md:divide-white/[0.06]">
        {/* 1. Completion Rate */}
        <div className="md:px-5 first:pl-0">
          <div className="flex items-center space-x-1.5 text-xs text-[#94A3B8] mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Completion</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-white tabular-nums font-['Outfit']">
              {stats.completionPercentage}%
            </span>
            <span className="text-[11px] text-[#64748B] tabular-nums font-mono">
              {stats.completedToday}/{stats.totalToday} done
            </span>
          </div>
          {/* Subtle Progress Track */}
          <div className="mt-2.5 w-full h-1.5 rounded-full bg-[#182233] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#5EEAD4] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, stats.completionPercentage))}%` }}
            />
          </div>
        </div>

        {/* 2. Pending Today */}
        <div className="md:px-5">
          <div className="flex items-center space-x-1.5 text-xs text-[#94A3B8] mb-1">
            <Target className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span>Remaining Today</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-white tabular-nums font-['Outfit']">
              {stats.remainingToday}
            </span>
            <span className="text-[11px] text-[#64748B]">
              {stats.remainingToday === 1 ? 'task queued' : 'tasks queued'}
            </span>
          </div>
          <div className="mt-2.5 text-[11px] text-[#64748B] truncate">
            {stats.remainingToday === 0 ? 'Clean slate' : 'Monitored by reminder cycle'}
          </div>
        </div>

        {/* 3. Urgent / High Impact */}
        <div className="md:px-5">
          <div className="flex items-center space-x-1.5 text-xs text-[#94A3B8] mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>High Impact</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-white tabular-nums font-['Outfit']">
              {stats.urgentPending}
            </span>
            <span className="text-[11px] text-[#64748B]">
              {stats.urgentPending === 1 ? 'priority task' : 'priority tasks'}
            </span>
          </div>
          <div className="mt-2.5 text-[11px] text-[#64748B] truncate">
            {stats.urgentPending > 0 ? 'Requires priority focus' : 'No urgent bottlenecks'}
          </div>
        </div>

        {/* 4. Overdue Guard */}
        <div className="md:px-5 last:pr-0">
          <div className="flex items-center space-x-1.5 text-xs text-[#94A3B8] mb-1">
            <AlertTriangle className={`w-3.5 h-3.5 ${stats.overdueCount > 0 ? 'text-rose-400' : 'text-[#64748B]'}`} />
            <span>Overdue Guard</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-bold tracking-tight tabular-nums font-['Outfit'] ${
              stats.overdueCount > 0 ? 'text-rose-400' : 'text-white'
            }`}>
              {stats.overdueCount}
            </span>
            <span className="text-[11px] text-[#64748B]">
              {stats.overdueCount === 1 ? 'task overdue' : 'tasks overdue'}
            </span>
          </div>
          <div className={`mt-2.5 text-[11px] truncate ${stats.overdueCount > 0 ? 'text-rose-300 font-medium' : 'text-[#64748B]'}`}>
            {stats.overdueCount > 0 ? 'Attention required' : 'All schedules on track'}
          </div>
        </div>
      </div>
    </div>
  )
}

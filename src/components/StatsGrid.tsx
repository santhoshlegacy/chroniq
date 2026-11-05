import React, { useMemo } from 'react'
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

  const completionPct = stats.completionPercentage || 0
  const deepWorkHours = (
    tasks
      .filter((t) => t.status !== 'completed' && t.archived_at === null)
      .reduce((acc, t) => acc + (t.estimated_duration_minutes || 30), 0) / 60
  ).toFixed(1)

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Metric 1: Intended Cadence */}
      <div className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] p-5 rounded-2xl shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-[#C2A26F]/40 transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-[#745A2E] tracking-wider font-semibold">
              Intended Cadence
            </span>
            <span className="text-xs text-[#7A746E]">Cognitive reserve index</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] flex items-center justify-center text-[#745A2E]">
            <span className="material-symbols-outlined text-[16px]">timelapse</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between mt-4">
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-3xl sm:text-4xl text-[#181615] font-light tabular-nums">
              {deepWorkHours}
            </span>
            <span className="text-xs text-[#7A746E] font-normal">hrs</span>
          </div>

          {/* Tactile Mini Circular Dial / Gauge */}
          <div className="relative w-11 h-11 flex items-center justify-center">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 48 48">
              <circle
                className="text-[#EFECE3]"
                cx="24"
                cy="24"
                fill="none"
                r="19"
                stroke="currentColor"
                strokeWidth="3"
              />
              <circle
                className="text-[#745A2E]"
                cx="24"
                cy="24"
                fill="none"
                r="19"
                stroke="currentColor"
                strokeDasharray="119.38"
                strokeDashoffset={119.38 - (119.38 * Math.min(100, Math.max(15, completionPct))) / 100}
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
            <span className="absolute font-mono text-[10px] text-[#181615] font-bold">
              {completionPct}%
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[rgba(45,41,38,0.08)] flex items-center justify-between text-[#7A746E] text-[10px] uppercase font-mono">
          <span>{stats.completedToday}/{stats.totalToday} Honored</span>
          <span className="text-[#745A2E] flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[12px]">spa</span> Calm Steady
          </span>
        </div>
      </div>

      {/* Metric 2: Impending Milestone */}
      <div className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] p-5 rounded-2xl shadow-xs flex flex-col justify-between group hover:border-[#C2A26F]/40 transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-[#745A2E] tracking-wider font-semibold">
              Impending Milestone
            </span>
            <span className="text-xs text-[#7A746E]">Prioritized focus session</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#FEDAA3] border border-[#745A2E]/25 text-[#745A2E] text-[9px] uppercase font-mono tracking-wider font-semibold">
            Armed
          </span>
        </div>

        <div className="mt-4 flex flex-col">
          <span className="font-serif text-base text-[#181615] leading-tight truncate">
            {stats.urgentPending > 0
              ? `${stats.urgentPending} High-Tier Mandates`
              : stats.remainingToday > 0
              ? `${stats.remainingToday} Mandates Queued`
              : 'Ledger Clear'}
          </span>
          <span className="text-xs text-[#7A746E] truncate mt-0.5 font-mono">
            {preferences.timezone} Horizon
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[rgba(45,41,38,0.08)] flex items-center justify-between text-[10px] text-[#7A746E]">
          <span className="flex items-center gap-1 text-[#181615] font-mono font-medium">
            <span className="material-symbols-outlined text-[13px] text-[#745A2E]">
              notifications_active
            </span>
            Scheduled
          </span>
          <span className="text-[#745A2E] font-mono font-medium">10m Advance Push</span>
        </div>
      </div>

      {/* Metric 3: Proactive Telemetry & Haptics */}
      <div className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] p-5 rounded-2xl shadow-xs flex flex-col justify-between group hover:border-[#C2A26F]/40 transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-[#745A2E] tracking-wider font-semibold">
              Proactive Telemetry
            </span>
            <span className="text-xs text-[#7A746E]">Synchronized dispatch engine</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] flex items-center justify-center text-[#745A2E]">
            <span className="material-symbols-outlined text-[16px]">sensors</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-3xl sm:text-4xl text-[#181615] font-light tabular-nums">10</span>
            <span className="text-xs text-[#7A746E] font-normal">min</span>
            <span className="text-xs text-[#745A2E] ml-1.5 font-mono font-medium">Advance Push</span>
          </div>
          <span className="text-xs text-[#7A746E] truncate mt-0.5">
            528Hz Solfeggio acoustic armed
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[rgba(45,41,38,0.08)] flex items-center justify-between text-[10px] text-[#7A746E] font-mono">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#745A2E]" /> Multi-Device
          </span>
          <span className="text-[#181615] font-medium">Active SW</span>
        </div>
      </div>

      {/* Metric 4: Cadence Purge & Archival */}
      <div className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] p-5 rounded-2xl shadow-xs flex flex-col justify-between group hover:border-[#C2A26F]/40 transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-[#745A2E] tracking-wider font-semibold">
              Cadence Purge
            </span>
            <span className="text-xs text-[#7A746E]">Autonomous clutter governance</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] flex items-center justify-center text-[#7A746E]">
            <span className="material-symbols-outlined text-[16px]">auto_delete</span>
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-3xl sm:text-4xl text-[#181615] font-light tabular-nums">30</span>
              <span className="text-xs text-[#7A746E]">days</span>
            </div>
            <span className="text-xs text-[#745A2E] mt-0.5 font-mono">Purge rule enforced</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#EFECE3] border border-[rgba(45,41,38,0.1)] text-[10px] font-mono text-[#2D2926]">
            Automated
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[rgba(45,41,38,0.08)] flex items-center justify-between text-[10px] text-[#7A746E] font-mono">
          <span>Scheduled Sweep</span>
          <span className="text-[#181615] font-medium">Midnight Meridian</span>
        </div>
      </div>
    </section>
  )
}

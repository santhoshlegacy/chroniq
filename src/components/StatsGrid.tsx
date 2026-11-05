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
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      {/* Metric 1: Intended Cadence */}
      <div className="bg-[#1B1C1E] border border-[#DAC58F]/15 p-4 rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-[#DAC58F]/30 transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-[#DAC58F] tracking-wider font-semibold">
              Intended Cadence
            </span>
            <span className="text-xs text-[#99907C]">Cognitive reserve index</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-[#121315] border border-[#DAC58F]/15 flex items-center justify-center text-[#DAC58F]">
            <span className="material-symbols-outlined text-[16px]">timelapse</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between mt-3">
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-3xl text-white font-light tabular-nums">
              {deepWorkHours}
            </span>
            <span className="text-xs text-[#99907C] font-normal">hrs</span>
          </div>

          {/* Tactile Mini Circular Dial / Gauge */}
          <div className="relative w-11 h-11 flex items-center justify-center">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 48 48">
              <circle
                className="text-[#292A2C]"
                cx="24"
                cy="24"
                fill="none"
                r="19"
                stroke="currentColor"
                strokeWidth="3"
              />
              <circle
                className="text-[#DAC58F]"
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
            <span className="absolute font-mono text-[10px] text-[#DAC58F] font-bold">
              {completionPct}%
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-[#DAC58F]/8 flex items-center justify-between text-[#99907C] text-[10px] uppercase font-mono">
          <span>{stats.completedToday}/{stats.totalToday} Honored</span>
          <span className="text-[#DAC58F] flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[12px]">spa</span> Calm Steady
          </span>
        </div>
      </div>

      {/* Metric 2: Impending Milestone */}
      <div className="bg-[#1B1C1E] border border-[#DAC58F]/15 p-4 rounded-xl shadow-sm flex flex-col justify-between group hover:border-[#DAC58F]/30 transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-[#DAC58F] tracking-wider font-semibold">
              Impending Milestone
            </span>
            <span className="text-xs text-[#99907C]">Prioritized focus session</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#56481E] border border-[#DAC58F]/25 text-[#DAC58F] text-[9px] uppercase font-mono tracking-wider font-semibold">
            Armed
          </span>
        </div>

        <div className="mt-3 flex flex-col">
          <span className="font-serif text-base text-white leading-tight truncate">
            {stats.urgentPending > 0
              ? `${stats.urgentPending} High-Tier Mandates`
              : stats.remainingToday > 0
              ? `${stats.remainingToday} Mandates Queued`
              : 'Ledger Clear'}
          </span>
          <span className="text-xs text-[#99907C] truncate mt-0.5 font-mono">
            {preferences.timezone} Horizon
          </span>
        </div>

        <div className="mt-2.5 pt-2 border-t border-[#DAC58F]/8 flex items-center justify-between text-[10px] text-[#99907C]">
          <span className="flex items-center gap-1 text-white font-mono">
            <span className="material-symbols-outlined text-[13px] text-[#DAC58F]">
              notifications_active
            </span>
            Scheduled
          </span>
          <span className="text-[#DAC58F] font-mono">10m Advance Push</span>
        </div>
      </div>

      {/* Metric 3: Proactive Telemetry & Haptics */}
      <div className="bg-[#1B1C1E] border border-[#DAC58F]/15 p-4 rounded-xl shadow-sm flex flex-col justify-between group hover:border-[#DAC58F]/30 transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-[#DAC58F] tracking-wider font-semibold">
              Proactive Telemetry
            </span>
            <span className="text-xs text-[#99907C]">Synchronized dispatch engine</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-[#121315] border border-[#DAC58F]/15 flex items-center justify-center text-[#DAC58F]">
            <span className="material-symbols-outlined text-[16px]">sensors</span>
          </div>
        </div>

        <div className="mt-3 flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-3xl text-white font-light tabular-nums">10</span>
            <span className="text-xs text-[#99907C] font-normal">min</span>
            <span className="text-xs text-[#DAC58F] ml-1.5 font-mono">Advance Push</span>
          </div>
          <span className="text-xs text-[#99907C] truncate mt-0.5">
            528Hz Solfeggio acoustic armed
          </span>
        </div>

        <div className="mt-2.5 pt-2 border-t border-[#DAC58F]/8 flex items-center justify-between text-[10px] text-[#99907C] font-mono">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DAC58F]" /> Multi-Device
          </span>
          <span className="text-white">Active SW</span>
        </div>
      </div>

      {/* Metric 4: Cadence Purge & Archival */}
      <div className="bg-[#1B1C1E] border border-[#DAC58F]/15 p-4 rounded-xl shadow-sm flex flex-col justify-between group hover:border-[#DAC58F]/30 transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-[#DAC58F] tracking-wider font-semibold">
              Cadence Purge
            </span>
            <span className="text-xs text-[#99907C]">Autonomous clutter governance</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-[#121315] border border-[#DAC58F]/15 flex items-center justify-center text-[#99907C]">
            <span className="material-symbols-outlined text-[16px]">auto_delete</span>
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-3xl text-white font-light tabular-nums">30</span>
              <span className="text-xs text-[#99907C]">days</span>
            </div>
            <span className="text-xs text-[#DAC58F] mt-0.5 font-mono">Purge rule enforced</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#292A2C] border border-[#DAC58F]/15 text-[10px] font-mono text-[#D0C5AF]">
            Automated
          </span>
        </div>

        <div className="mt-2.5 pt-2 border-t border-[#DAC58F]/8 flex items-center justify-between text-[10px] text-[#99907C] font-mono">
          <span>Scheduled Sweep</span>
          <span className="text-white">Midnight Meridian</span>
        </div>
      </div>
    </section>
  )
}

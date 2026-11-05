import React from 'react'
import type { Task } from '@/types'

interface InAppToastProps {
  task: Task
  type: '10m' | 'due' | 'slot'
  onAcknowledge: () => void
  onSnooze: () => void
  onDismiss: () => void
}

export const InAppToast: React.FC<InAppToastProps> = ({
  task,
  type,
  onAcknowledge,
  onSnooze,
  onDismiss,
}) => {
  const is10m = type === '10m'

  return (
    <div className="relative overflow-hidden rounded-xl p-4 bg-[#F4EFEB] border border-[rgba(45,41,38,0.12)] shadow-[0_12px_36px_-4px_rgba(45,41,38,0.08)] transition-all duration-300 animate-in slide-in-from-top-3">
      {/* Top Row: Monogram, Tag & Dismiss */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Chroniq Brand Logo */}
          <div className="w-6 h-6 rounded-md overflow-hidden shadow-xs flex-shrink-0 bg-[#FFFFFF] border border-[rgba(45,41,38,0.12)] p-0.5">
            <img src="/logo.png" alt="Chroniq" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#181615] uppercase tracking-widest font-mono">
              CHRONIQ
            </span>
            <span className="text-[10px] font-bold text-[#745A2E] tracking-wider uppercase">
              • {is10m ? '10M REMINDER' : 'TASK DUE'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-[#745A2E] bg-[#EFECE3] border border-[#745A2E]/20 px-2.5 py-0.5 rounded-full font-semibold">
            {is10m ? 'in 10 min' : 'Now Due'}
          </span>
          <button
            onClick={onDismiss}
            aria-label="Dismiss Alert"
            className="w-6 h-6 rounded-full bg-[#EFECE3] flex items-center justify-center text-[#7A746E] hover:text-[#181615] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>

      {/* Notification Content */}
      <div className="flex flex-col gap-1 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#745A2E] animate-pulse flex-shrink-0" />
          <h2 className="text-sm font-semibold text-[#181615] tracking-tight leading-snug">
            {task.title}
          </h2>
        </div>
        {task.description && (
          <p className="text-xs text-[#4D4541] leading-relaxed line-clamp-2 pl-4">
            {task.description}
          </p>
        )}
      </div>

      {/* Linear Micro Chronograph Retrograde 10-Minute Bar */}
      <div className="mb-3 bg-[#EFECE3] rounded-full h-1 overflow-hidden">
        <div className="bg-[#745A2E] h-full w-[88%] rounded-full shadow-xs" />
      </div>

      {/* Actions & Policy Strip */}
      <div className="flex flex-col gap-2 pt-0.5">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAcknowledge}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#181615] hover:bg-[#2D2926] text-[#FAF7F2] text-[11px] uppercase tracking-wider font-semibold active:scale-[0.98] transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-[#FEDAA3]">shield_with_heart</span>
            <span>Acknowledge</span>
          </button>
          <button
            onClick={onSnooze}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#EFECE3] hover:bg-[#E5E2DB] text-[#181615] text-[11px] uppercase tracking-wider font-medium border border-[rgba(45,41,38,0.1)] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-[#745A2E]">snooze</span>
            <span>Snooze 5m</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-[#7A746E] pt-1.5 border-t border-[rgba(45,41,38,0.08)]">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-[#745A2E]">verified_user</span>
            <span>Early push &amp; 30-day archival active</span>
          </span>
          <span className="font-mono text-[#745A2E]">Geneva Synchronized</span>
        </div>
      </div>
    </div>
  )
}

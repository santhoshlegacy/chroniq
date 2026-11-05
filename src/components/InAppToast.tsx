import React from 'react'
import { ChroniqLogo } from './ChroniqLogo'
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
    <div className="relative overflow-hidden rounded-xl p-4 bg-[#1F2022]/95 backdrop-blur-2xl border border-[#DAC58F]/20 shadow-2xl transition-all duration-300 animate-in slide-in-from-top-3">
      {/* Ambient Gold Bloom Aura */}
      <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-[#F2CA50]/15 blur-2xl pointer-events-none" />

      {/* Top Row: Monogram, Tag & Timestamp */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Chroniq Monogram Brand Logo */}
          <div className="w-6 h-6 rounded-full overflow-hidden shadow-md flex-shrink-0 bg-[#0D0E10] border border-[#DAC58F]/30 p-0.5">
            <ChroniqLogo className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-white uppercase tracking-widest font-mono">
              CHRONIQ
            </span>
            <span className="text-[10px] font-bold text-[#F2CA50] tracking-wider uppercase">
              • {is10m ? '10M PROACTIVE DISPATCH' : 'IMPENDING HORIZON'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-[#DAC58F] bg-[#56481E]/60 border border-[#DAC58F]/20 px-2 py-0.5 rounded-full font-medium">
            {is10m ? 'in 10 min' : 'Now Due'}
          </span>
          <button
            onClick={onDismiss}
            aria-label="Dismiss Alert"
            className="w-6 h-6 rounded-full bg-[#292A2C] flex items-center justify-center text-[#D0C5AF] hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>

      {/* Notification Content */}
      <div className="flex flex-col gap-1 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#F2CA50] animate-pulse flex-shrink-0" />
          <h2 className="text-sm font-semibold text-white tracking-tight leading-snug">
            {task.title}
          </h2>
        </div>
        {task.description && (
          <p className="text-xs text-[#D0C5AF] leading-relaxed line-clamp-2 pl-4">
            {task.description}
          </p>
        )}
      </div>

      {/* Linear Micro Chronograph Retrograde 10-Minute Bar */}
      <div className="mb-3 bg-[#292A2C] rounded-full h-1 overflow-hidden">
        <div className="bg-gradient-to-r from-[#D4AF37] to-[#F2CA50] h-full w-[88%] rounded-full shadow-[0_0_8px_rgba(242,202,80,0.6)]" />
      </div>

      {/* Actions & Policy Strip */}
      <div className="flex flex-col gap-2 pt-0.5">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAcknowledge}
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#D4AF37] hover:bg-[#F2CA50] text-[#141211] text-[11px] uppercase tracking-wider font-semibold active:scale-[0.98] transition-all shadow-md cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">shield_with_heart</span>
            <span>Acknowledge</span>
          </button>
          <button
            onClick={onSnooze}
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#292A2C] hover:bg-[#343537] text-white text-[11px] uppercase tracking-wider font-medium border border-[#DAC58F]/15 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">snooze</span>
            <span>Snooze 5m</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-[#99907C] pt-1 border-t border-[#DAC58F]/10">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-[#DAC58F]">verified_user</span>
            <span>Early push &amp; 30-day archival active</span>
          </span>
          <span className="font-mono text-[#DAC58F]">Geneva Synchronized</span>
        </div>
      </div>
    </div>
  )
}


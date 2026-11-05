import React, { useState, useMemo } from 'react'
import type { Task, TaskPriority } from '@/types'
import { useTaskStore } from '@/store/useTaskStore'
import { isTaskOverdue } from '@/lib/taskUtils'
import { format, parseISO } from 'date-fns'

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onSelect?: (task: Task) => void
}

const priorityBadges: Record<
  TaskPriority,
  { label: string; text: string; bg: string; dot: string }
> = {
  urgent: {
    label: 'Crimson VIP',
    text: 'text-[#FFB4AB]',
    bg: 'bg-[#93000A]/40 border-[#FFB4AB]/30',
    dot: 'bg-[#BA1A1A]',
  },
  high: {
    label: 'Amber Horizon',
    text: 'text-[#F2CA50]',
    bg: 'bg-[#56481E]/40 border-[#DAC58F]/30',
    dot: 'bg-[#D4AF37]',
  },
  medium: {
    label: 'Champagne',
    text: 'text-[#DAC58F]',
    bg: 'bg-[#1F2022] border-[#DAC58F]/20',
    dot: 'bg-[#DAC58F]',
  },
  low: {
    label: 'Sage Ritual',
    text: 'text-[#D0C5AF]',
    bg: 'bg-[#292A2C] border-[#99907C]/20',
    dot: 'bg-[#99907C]',
  },
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onSelect }) => {
  const { toggleTaskComplete, deleteTask, archiveTask } = useTaskStore()
  const [showMenu, setShowMenu] = useState(false)

  const isCompleted = task.status === 'completed'
  const isOverdue = useMemo(() => isTaskOverdue(task, new Date()), [task])
  const pBadge = priorityBadges[task.priority]

  const formattedDue = task.due_at ? format(parseISO(task.due_at), 'MMM d, h:mm a') : null
  const formattedScheduled = task.scheduled_date ? format(parseISO(task.scheduled_date), 'MMM d') : null

  return (
    <div
      onClick={() => onSelect?.(task)}
      className={`group relative rounded-xl p-4 border transition-all duration-200 cursor-pointer flex flex-col gap-2 ${
        isCompleted
          ? 'bg-[#121315]/70 border-[#DAC58F]/8 opacity-65'
          : isOverdue
          ? 'bg-[#1B1C1E] border-[#BA1A1A]/35 hover:border-[#BA1A1A]/60 shadow-md'
          : 'bg-[#1B1C1E] border-[#DAC58F]/12 hover:border-[#DAC58F]/30 hover:bg-[#222428] shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Tactile Horological Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleTaskComplete(task.id)
          }}
          className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-[4px] border flex items-center justify-center transition-all cursor-pointer ${
            isCompleted
              ? 'bg-[#D4AF37] border-[#D4AF37] text-[#141211] shadow-[0_0_8px_rgba(212,175,55,0.4)]'
              : 'border-[#DAC58F]/30 bg-[#121315] hover:border-[#DAC58F] text-transparent hover:text-[#DAC58F]'
          }`}
          aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        >
          <span className="material-symbols-outlined text-[15px] font-bold">check</span>
        </button>

        {/* Center: Title & Description & Priority Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {/* Priority Indicator */}
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${pBadge.bg} ${pBadge.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${pBadge.dot}`} />
              <span>{pBadge.label}</span>
            </span>

            {/* Category */}
            {task.category && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#D0C5AF] bg-[#292A2C] border border-[#DAC58F]/10">
                {task.category}
              </span>
            )}

            {/* Overdue Alert */}
            {isOverdue && !isCompleted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#93000A]/40 text-[#FFB4AB] border border-[#FFB4AB]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#BA1A1A] animate-pulse" />
                <span>Past Due</span>
              </span>
            )}
          </div>

          {/* Task Title */}
          <h3
            className={`text-sm sm:text-base font-semibold leading-snug transition-colors group-hover:text-[#F2CA50] ${
              isCompleted ? 'line-through text-[#99907C]' : 'text-white'
            }`}
          >
            {task.title}
          </h3>

          {/* Task Description Snippet */}
          {task.description && (
            <p
              className={`mt-1 text-xs leading-relaxed line-clamp-2 ${
                isCompleted ? 'text-[#99907C]' : 'text-[#D0C5AF]'
              }`}
            >
              {task.description}
            </p>
          )}
        </div>

        {/* Right: Quick Detail Expand & Options */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onSelect?.(task)}
            className="p-1 rounded bg-[#292A2C]/60 text-[#D0C5AF] hover:text-[#F2CA50] hover:bg-[#343537] transition-colors cursor-pointer"
            title="Inspect dossier"
          >
            <span className="material-symbols-outlined text-[17px]">open_in_new</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded bg-[#292A2C]/60 text-[#D0C5AF] hover:text-white hover:bg-[#343537] transition-colors cursor-pointer"
              aria-label="Options"
            >
              <span className="material-symbols-outlined text-[17px]">more_horiz</span>
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-36 bg-[#1F2022] border border-[#DAC58F]/20 rounded-xl py-1 z-30 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      onEdit(task)
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#D0C5AF] hover:text-white hover:bg-[#292A2C] flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm text-[#DAC58F]">edit</span>
                    <span>Edit Task</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      archiveTask(task.id)
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#D0C5AF] hover:text-white hover:bg-[#292A2C] flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm text-[#D0C5AF]">inventory_2</span>
                    <span>Archive</span>
                  </button>
                  <div className="h-px bg-[#DAC58F]/10 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      deleteTask(task.id)
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#FFB4AB] hover:bg-[#93000A]/20 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dossier Bottom Framing Strip */}
      <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-[#DAC58F]/8 text-[11px] text-[#99907C]">
        <div className="flex items-center gap-3">
          {formattedDue ? (
            <span className={`flex items-center gap-1 font-mono ${isOverdue && !isCompleted ? 'text-[#FFB4AB] font-semibold' : ''}`}>
              <span className="material-symbols-outlined text-[13px]">schedule</span>
              <span>Due {formattedDue}</span>
            </span>
          ) : formattedScheduled ? (
            <span className="flex items-center gap-1 font-mono">
              <span className="material-symbols-outlined text-[13px]">calendar_month</span>
              <span>{formattedScheduled}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 font-mono">
              <span className="material-symbols-outlined text-[13px]">hourglass_empty</span>
              <span>Continuous Cadence</span>
            </span>
          )}

          {task.estimated_duration_minutes && (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#292A2C] text-[#DAC58F]">
              {task.estimated_duration_minutes}m deep focus
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[#DAC58F] text-[10px] uppercase font-mono tracking-wider">
          <span className="material-symbols-outlined text-[12px]">lock</span>
          <span className="hidden sm:inline">Vault Protected</span>
        </div>
      </div>
    </div>
  )
}

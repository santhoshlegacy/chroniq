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
    text: 'text-[#BA1A1A]',
    bg: 'bg-[#FFDAD6] border-[rgba(186,26,26,0.25)]',
    dot: 'bg-[#BA1A1A]',
  },
  high: {
    label: 'Amber Horizon',
    text: 'text-[#745A2E]',
    bg: 'bg-[#FEDAA3] border-[rgba(116,90,46,0.25)]',
    dot: 'bg-[#C2A26F]',
  },
  medium: {
    label: 'Geneva Calibre',
    text: 'text-[#4D4541]',
    bg: 'bg-[#EFECE3] border-[rgba(45,41,38,0.08)]',
    dot: 'bg-[#8C7654]',
  },
  low: {
    label: 'Sage Ritual',
    text: 'text-[#7A746E]',
    bg: 'bg-[#EFECE3] border-[rgba(45,41,38,0.06)]',
    dot: 'bg-[#7A746E]',
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
      className={`group relative rounded-lg p-5 border transition-all duration-200 cursor-pointer flex flex-col gap-2.5 ${
        isCompleted
          ? 'bg-[#F4EFEB]/60 border-[rgba(45,41,38,0.05)] opacity-65'
          : isOverdue
          ? 'bg-[#F4EFEB] border-[#BA1A1A]/35 hover:border-[#BA1A1A]/60 shadow-xs hover:shadow-md'
          : 'bg-[#F4EFEB] border-[rgba(45,41,38,0.08)] hover:border-[#C2A26F] hover:bg-[#FAF7F2] shadow-xs hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3.5">
        {/* Left: Tactile 18x18px Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleTaskComplete(task.id)
          }}
          className={`flex-shrink-0 w-[18px] h-[18px] mt-0.5 rounded-[3px] border flex items-center justify-center transition-all cursor-pointer ${
            isCompleted
              ? 'bg-[#181615] border-[#181615] text-[#C2A26F]'
              : 'border-[#8C7654]/40 bg-transparent hover:border-[#745A2E] text-transparent hover:text-[#745A2E]'
          }`}
          aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        >
          <span className="material-symbols-outlined text-[13px] font-bold">check</span>
        </button>

        {/* Center: Title & Description & Priority Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {/* Priority Indicator */}
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] text-[10px] font-semibold uppercase tracking-wider border ${pBadge.bg} ${pBadge.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${pBadge.dot}`} />
              <span>{pBadge.label}</span>
            </span>

            {/* Category */}
            {task.category && (
              <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono text-[#7A746E] bg-[#EFECE3] border border-[rgba(45,41,38,0.06)]">
                {task.category}
              </span>
            )}

            {/* Overdue Alert */}
            {isOverdue && !isCompleted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-semibold bg-[#FFDAD6] text-[#BA1A1A] border border-[#BA1A1A]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#BA1A1A] animate-pulse" />
                <span>Past Due</span>
              </span>
            )}
          </div>

          {/* Task Title */}
          <h3
            className={`text-sm sm:text-base font-semibold leading-snug transition-colors group-hover:text-[#745A2E] ${
              isCompleted ? 'line-through text-[#7A746E]' : 'text-[#181615]'
            }`}
          >
            {task.title}
          </h3>

          {/* Task Description Snippet */}
          {task.description && (
            <p
              className={`mt-1 text-xs leading-relaxed line-clamp-2 ${
                isCompleted ? 'text-[#7A746E]' : 'text-[#4D4541]'
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
            className="p-1.5 rounded bg-[#EFECE3] text-[#7A746E] hover:text-[#181615] hover:bg-[#E5E2DB] transition-colors cursor-pointer"
            title="Inspect dossier"
          >
            <span className="material-symbols-outlined text-[17px]">open_in_new</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded bg-[#EFECE3] text-[#7A746E] hover:text-[#181615] hover:bg-[#E5E2DB] transition-colors cursor-pointer"
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
                <div className="absolute right-0 mt-1 w-36 bg-[#F4EFEB] border border-[rgba(45,41,38,0.12)] rounded-lg py-1 z-30 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      onEdit(task)
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#2D2926] hover:bg-[#EFECE3] flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm text-[#745A2E]">edit</span>
                    <span>Edit Mandate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      archiveTask(task.id)
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#2D2926] hover:bg-[#EFECE3] flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm text-[#7A746E]">inventory_2</span>
                    <span>Archive</span>
                  </button>
                  <div className="h-px bg-[rgba(45,41,38,0.08)] my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      deleteTask(task.id)
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#BA1A1A] hover:bg-[#FFDAD6] flex items-center gap-2 cursor-pointer"
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
      <div className="flex items-center justify-between pt-2 mt-1 border-t border-[rgba(45,41,38,0.06)] text-[11px] text-[#7A746E]">
        <div className="flex items-center gap-3">
          {formattedDue ? (
            <span className={`flex items-center gap-1 font-mono ${isOverdue && !isCompleted ? 'text-[#BA1A1A] font-semibold' : ''}`}>
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
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#EFECE3] text-[#745A2E]">
              {task.estimated_duration_minutes}m deep focus
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[#745A2E] text-[10px] uppercase font-mono tracking-wider">
          <span className="material-symbols-outlined text-[12px]">lock</span>
          <span className="hidden sm:inline">Vault Protected</span>
        </div>
      </div>
    </div>
  )
}

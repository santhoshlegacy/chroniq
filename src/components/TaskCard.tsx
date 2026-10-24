import React, { useState, useMemo } from 'react'
import { Check, Clock, Calendar, MoreVertical, Edit2, Trash2, Archive, AlertCircle, Tag } from 'lucide-react'
import type { Task, TaskPriority } from '@/types'
import { useTaskStore } from '@/store/useTaskStore'
import { isTaskOverdue } from '@/lib/taskUtils'
import { format, parseISO } from 'date-fns'

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
}

const priorityBadges: Record<TaskPriority, { label: string; dot: string; text: string }> = {
  urgent: {
    label: 'Urgent',
    dot: 'bg-rose-400',
    text: 'text-rose-400',
  },
  high: {
    label: 'High',
    dot: 'bg-amber-400',
    text: 'text-amber-400',
  },
  medium: {
    label: 'Medium',
    dot: 'bg-[#70DFFF]',
    text: 'text-[#70DFFF]',
  },
  low: {
    label: 'Low',
    dot: 'bg-slate-400',
    text: 'text-slate-400',
  },
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit }) => {
  const { toggleTaskComplete, deleteTask, archiveTask } = useTaskStore()
  const [showMenu, setShowMenu] = useState(false)

  const isCompleted = task.status === 'completed'
  const isOverdue = useMemo(() => isTaskOverdue(task, new Date()), [task])
  const pBadge = priorityBadges[task.priority]

  const formattedDue = task.due_at ? format(parseISO(task.due_at), 'MMM d, h:mm a') : null
  const formattedScheduled = task.scheduled_date ? format(parseISO(task.scheduled_date), 'MMM d') : null

  return (
    <div
      className={`rounded-xl p-4 border transition-all duration-150 ${
        isCompleted
          ? 'bg-[#0E1320] border-white/[0.03] opacity-60'
          : isOverdue
          ? 'bg-[#141824] border-rose-500/25 hover:border-rose-500/40'
          : 'bg-[#111827] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#131B2C]'
      }`}
    >
      <div className="flex items-start justify-between gap-3.5">
        {/* Left: Custom Checkbox */}
        <button
          type="button"
          onClick={() => toggleTaskComplete(task.id)}
          className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center transition cursor-pointer ${
            isCompleted
              ? 'bg-[#151B28] border-[#70DFFF]/60 text-[#70DFFF]'
              : 'border-white/20 bg-[#151B28] hover:border-[#70DFFF]/60'
          }`}
          aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </button>

        {/* Center: Title & Description & Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {/* Priority Indicator */}
            <span className={`inline-flex items-center space-x-1.5 text-[11px] font-medium ${pBadge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pBadge.dot}`} />
              <span>{pBadge.label}</span>
            </span>

            {/* Category */}
            {task.category && (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] text-[#94A3B8] bg-[#151B28] border border-white/[0.04]">
                <Tag className="w-2.5 h-2.5 text-[#64748B]" />
                <span>{task.category}</span>
              </span>
            )}

            {/* Overdue Alert */}
            {isOverdue && !isCompleted && (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-950/40 text-rose-400 border border-rose-500/30">
                <AlertCircle className="w-2.5 h-2.5" />
                <span>Overdue</span>
              </span>
            )}
          </div>

          {/* Task Title */}
          <h3
            className={`text-sm font-medium leading-snug transition ${
              isCompleted
                ? 'line-through text-[#64748B]'
                : 'text-[#E7ECF4]'
            }`}
          >
            {task.title}
          </h3>

          {/* Task Description */}
          {task.description && (
            <p className={`mt-1 text-xs leading-relaxed line-clamp-2 ${isCompleted ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>
              {task.description}
            </p>
          )}

          {/* Timing Metadata */}
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-[#64748B]">
            {formattedScheduled && (
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-[#64748B]" />
                <span className="tabular-nums font-mono">{formattedScheduled}</span>
              </span>
            )}
            {formattedDue && (
              <span className={`flex items-center space-x-1 ${isOverdue && !isCompleted ? 'text-rose-400 font-medium' : ''}`}>
                <Clock className="w-3 h-3 text-[#64748B]" />
                <span className="tabular-nums font-mono">Due {formattedDue}</span>
              </span>
            )}
            {task.estimated_duration_minutes && (
              <span className="tabular-nums font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#151B28] text-[#94A3B8]">
                {task.estimated_duration_minutes}m
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-md text-[#64748B] hover:text-white hover:bg-white/[0.04] transition cursor-pointer"
            aria-label="Task options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-36 bg-[#151B28] border border-white/[0.08] rounded-xl py-1 z-30 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false)
                    onEdit(task)
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-[#94A3B8] hover:text-white hover:bg-white/[0.04] flex items-center space-x-2 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#70DFFF]" />
                  <span>Edit Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false)
                    archiveTask(task.id)
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-[#94A3B8] hover:text-white hover:bg-white/[0.04] flex items-center space-x-2 cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5 text-[#A99AFF]" />
                  <span>Archive</span>
                </button>
                <div className="h-px bg-white/[0.06] my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false)
                    deleteTask(task.id)
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

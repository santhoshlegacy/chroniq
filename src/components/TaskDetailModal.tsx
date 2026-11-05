import React from 'react'
import { X, Calendar, Clock, Tag, Check, Edit2, Trash2, AlertCircle } from 'lucide-react'
import type { Task, TaskPriority } from '@/types'
import { useTaskStore } from '@/store/useTaskStore'
import { isTaskOverdue } from '@/lib/taskUtils'
import { format, parseISO } from 'date-fns'

interface TaskDetailModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onEdit: (task: Task) => void
}

const priorityBadges: Record<TaskPriority, { label: string; dot: string; text: string; bg: string }> = {
  urgent: {
    label: 'Urgent',
    dot: 'bg-rose-400',
    text: 'text-rose-400',
    bg: 'bg-rose-950/40 border-rose-500/20',
  },
  high: {
    label: 'High',
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    bg: 'bg-amber-950/40 border-amber-500/20',
  },
  medium: {
    label: 'Medium',
    dot: 'bg-[#5EEAD4]',
    text: 'text-[#5EEAD4]',
    bg: 'bg-[#5EEAD4]/10 border-[#5EEAD4]/20',
  },
  low: {
    label: 'Low',
    dot: 'bg-slate-400',
    text: 'text-slate-400',
    bg: 'bg-slate-800/40 border-slate-700/30',
  },
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onEdit,
}) => {
  const { toggleTaskComplete, deleteTask } = useTaskStore()

  if (!isOpen || !task) return null

  const isCompleted = task.status === 'completed'
  const isOverdue = isTaskOverdue(task, new Date())
  const pBadge = priorityBadges[task.priority]

  const formattedDue = task.due_at ? format(parseISO(task.due_at), 'MMMM d, yyyy • h:mm a') : null
  const formattedScheduled = task.scheduled_date ? format(parseISO(task.scheduled_date), 'EEEE, MMMM d, yyyy') : null

  const handleToggleComplete = async () => {
    await toggleTaskComplete(task.id)
    onClose()
  }

  const handleDelete = async () => {
    await deleteTask(task.id)
    onClose()
  }

  const handleOpenEdit = () => {
    onClose()
    onEdit(task)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0A0E17]/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Floating Modal / Bottom Sheet */}
      <div className="relative w-full sm:max-w-lg bg-[#121826] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 text-[#F3F4F8] max-h-[90vh] flex flex-col">
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-white/[0.06] flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority Badge */}
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${pBadge.bg} ${pBadge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pBadge.dot}`} />
              <span>{pBadge.label} Priority</span>
            </span>

            {/* Category Tag */}
            {task.category && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs text-[#94A3B8] bg-[#161F2E] border border-white/[0.06]">
                <Tag className="w-3 h-3 text-[#64748B]" />
                <span>{task.category}</span>
              </span>
            )}

            {/* Overdue Badge */}
            {isOverdue && !isCompleted && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950/50 text-rose-300 border border-rose-500/30">
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span>Overdue</span>
              </span>
            )}

            {/* Completed Badge */}
            {isCompleted && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Completed</span>
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition cursor-pointer flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <h2 className={`text-lg sm:text-xl font-bold tracking-tight font-['Outfit'] ${isCompleted ? 'line-through text-[#64748B]' : 'text-white'}`}>
              {task.title}
            </h2>
          </div>

          {/* Full Description */}
          <div>
            <span className="block text-[11px] font-medium text-[#64748B] uppercase tracking-wider mb-1.5">
              Description
            </span>
            {task.description ? (
              <div className="p-3.5 rounded-xl bg-[#161F2E] border border-white/[0.04] text-xs sm:text-sm text-[#E2E8F0] leading-relaxed whitespace-pre-wrap break-words">
                {task.description}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] italic">No description provided for this task.</p>
            )}
          </div>

          {/* Scheduling Metadata Card */}
          <div className="p-3.5 rounded-xl bg-[#161F2E] border border-white/[0.04] space-y-2.5 text-xs">
            {formattedScheduled && (
              <div className="flex items-center justify-between text-[#94A3B8]">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  <span>Scheduled Date</span>
                </div>
                <span className="text-white font-medium">{formattedScheduled}</span>
              </div>
            )}

            {formattedDue && (
              <div className="flex items-center justify-between text-[#94A3B8]">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Deadline</span>
                </div>
                <span className={`font-mono font-medium ${isOverdue && !isCompleted ? 'text-rose-400' : 'text-white'}`}>
                  {formattedDue}
                </span>
              </div>
            )}

            {task.estimated_duration_minutes && (
              <div className="flex items-center justify-between text-[#94A3B8]">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-[#C4B5FD]" />
                  <span>Estimated Duration</span>
                </div>
                <span className="text-white font-medium">{task.estimated_duration_minutes} minutes</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/[0.06] bg-[#0F1422] rounded-b-2xl flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenEdit}
              className="px-3 py-1.5 rounded-lg bg-[#161F2E] hover:bg-[#1D2A3E] border border-white/[0.08] text-xs font-medium text-white transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span>Edit</span>
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 rounded-lg bg-[#161F2E] hover:bg-rose-950/40 border border-white/[0.08] hover:border-rose-500/30 text-xs font-medium text-rose-400 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          <button
            onClick={handleToggleComplete}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
              isCompleted
                ? 'bg-[#161F2E] text-[#94A3B8] hover:text-white border border-white/[0.08]'
                : 'btn-primary'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isCompleted ? 'Mark Incomplete' : 'Mark Complete'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}


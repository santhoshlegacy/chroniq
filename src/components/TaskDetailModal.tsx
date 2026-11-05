import React, { useState } from 'react'
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

const priorityBadges: Record<
  TaskPriority,
  { label: string; text: string; bg: string; dot: string }
> = {
  urgent: {
    label: 'Urgent',
    text: 'text-[#BA1A1A]',
    bg: 'bg-[#FFDAD6] border-[#BA1A1A]/30',
    dot: 'bg-[#BA1A1A]',
  },
  high: {
    label: 'High',
    text: 'text-[#745A2E]',
    bg: 'bg-[#FEDAA3] border-[#745A2E]/30',
    dot: 'bg-[#745A2E]',
  },
  medium: {
    label: 'Medium',
    text: 'text-[#181615]',
    bg: 'bg-[#EFECE3] border-[rgba(45,41,38,0.12)]',
    dot: 'bg-[#C2A26F]',
  },
  low: {
    label: 'Low',
    text: 'text-[#7A746E]',
    bg: 'bg-[#FAF7F2] border-[rgba(45,41,38,0.1)]',
    dot: 'bg-[#7A746E]',
  },
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onEdit,
}) => {
  const { toggleTaskComplete, deleteTask } = useTaskStore()
  const [justCompleted, setJustCompleted] = useState(false)

  if (!isOpen || !task) return null

  const isCompleted = task.status === 'completed'
  const isOverdue = isTaskOverdue(task, new Date())
  const pBadge = priorityBadges[task.priority]

  const formattedDue = task.due_at
    ? format(parseISO(task.due_at), 'MMMM d, yyyy • h:mm a')
    : null
  const formattedScheduled = task.scheduled_date
    ? format(parseISO(task.scheduled_date), 'EEEE, MMMM d')
    : null

  const handleToggleComplete = async () => {
    if (!isCompleted) {
      setJustCompleted(true)
      setTimeout(async () => {
        await toggleTaskComplete(task.id)
        setJustCompleted(false)
        onClose()
      }, 900)
    } else {
      await toggleTaskComplete(task.id)
      onClose()
    }
  }

  const handleDelete = async () => {
    if (confirm('Delete this task?')) {
      await deleteTask(task.id)
      onClose()
    }
  }

  const handleOpenEdit = () => {
    onClose()
    onEdit(task)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#181615]/40 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Floating Modal Sheet / Dialog */}
      <div className="relative w-full sm:max-w-lg bg-[#F4EFEB] border border-[rgba(45,41,38,0.12)] rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 text-[#181615] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-[rgba(45,41,38,0.15)]" />
        </div>

        {justCompleted ? (
          <div className="py-16 px-6 flex flex-col items-center justify-center text-center gap-3 animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 rounded-full bg-[#EFECE3] border border-[#4A6B56]/30 text-[#4A6B56] flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[32px]">verified</span>
            </div>
            <h3 className="font-serif text-xl text-[#181615]">Task Completed</h3>
            <p className="text-xs text-[#7A746E] max-w-xs">
              Completed tasks are automatically deleted after 30 days.
            </p>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-[rgba(45,41,38,0.08)] flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold border ${pBadge.bg} ${pBadge.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pBadge.dot}`} />
                    <span>{pBadge.label}</span>
                  </span>

                  {task.category && (
                    <span className="px-2 py-0.5 rounded bg-[#EFECE3] border border-[rgba(45,41,38,0.1)] text-[11px] text-[#2D2926]">
                      #{task.category}
                    </span>
                  )}

                  {isCompleted && (
                    <span className="px-2 py-0.5 rounded bg-[#4A6B56]/15 border border-[#4A6B56]/30 text-[11px] text-[#4A6B56] font-semibold">
                      Completed ✓
                    </span>
                  )}

                  {isOverdue && !isCompleted && (
                    <span className="px-2 py-0.5 rounded bg-[#FFDAD6] border border-[#BA1A1A]/30 text-[11px] text-[#BA1A1A] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#BA1A1A]" />
                      Past Due
                    </span>
                  )}
                </div>

                <h2 className="font-serif text-lg sm:text-xl text-[#181615] mt-1 leading-snug break-words">
                  {task.title}
                </h2>
              </div>

              <button
                onClick={onClose}
                aria-label="Close details"
                className="w-8 h-8 rounded-full bg-[#EFECE3] hover:bg-[#FAF7F2] border border-[rgba(45,41,38,0.1)] flex items-center justify-center text-[#2D2926] hover:text-[#181615] transition-colors cursor-pointer flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Full Untruncated Description */}
              <div className="bg-[#EFECE3] rounded-xl p-4 sm:p-5 border border-[rgba(45,41,38,0.08)]">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#745A2E] block mb-1 font-semibold">
                  Notes &amp; Description
                </span>
                {task.description ? (
                  <p className="text-xs sm:text-sm text-[#181615] whitespace-pre-wrap leading-relaxed">
                    {task.description}
                  </p>
                ) : (
                  <p className="text-xs text-[#7A746E] italic">
                    No description provided for this task.
                  </p>
                )}
              </div>

              {/* Metadata Details Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#FAF7F2] rounded-lg p-3 border border-[rgba(45,41,38,0.08)] flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-[#7A746E] font-mono">
                    Due Date
                  </span>
                  <span className="text-xs text-[#181615] font-medium mt-1">
                    {formattedDue || formattedScheduled || 'No Due Date'}
                  </span>
                </div>

                <div className="bg-[#FAF7F2] rounded-lg p-3 border border-[rgba(45,41,38,0.08)] flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-[#7A746E] font-mono">
                    Estimated Duration
                  </span>
                  <span className="text-xs text-[#181615] font-medium mt-1">
                    {task.estimated_duration_minutes} minutes
                  </span>
                </div>
              </div>

              {/* Auto-delete Notice */}
              <div className="p-3 rounded-lg bg-[#EFECE3]/70 border border-[rgba(45,41,38,0.08)] flex items-center justify-between text-[11px] text-[#7A746E]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#745A2E]">
                    auto_delete
                  </span>
                  <span>Completed tasks are automatically deleted after 30 days.</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 pt-3 border-t border-[rgba(45,41,38,0.08)] bg-[#F4EFEB] flex flex-col gap-2">
              <button
                type="button"
                onClick={handleToggleComplete}
                className="btn-primary w-full py-2.5 rounded-md flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-base">
                  {isCompleted ? 'restart_alt' : 'check_circle'}
                </span>
                <span>
                  {isCompleted ? 'Reopen Task' : 'Mark Completed'}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="flex-1 py-2 rounded-md bg-[#EFECE3] hover:bg-[#FAF7F2] text-[#181615] text-xs uppercase tracking-wider font-medium border border-[rgba(45,41,38,0.12)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm text-[#745A2E]">edit</span>
                  <span>Edit Task</span>
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-2 rounded-md bg-[#FFDAD6] hover:bg-[#FFB4AB] text-[#BA1A1A] text-xs uppercase tracking-wider font-medium border border-[#BA1A1A]/20 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

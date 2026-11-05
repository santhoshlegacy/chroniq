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
    label: 'Tier 1 Sovereign',
    text: 'text-[#FFDAD6]',
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
    label: 'Geneva Calibre',
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
    if (confirm('Disintegrate this mandate from the vault?')) {
      await deleteTask(task.id)
      onClose()
    }
  }

  const handleOpenEdit = () => {
    onClose()
    onEdit(task)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0D0E10]/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Architectural Dossier Floating Sheet / Dialog */}
      <div className="relative w-full sm:max-w-lg bg-[#1B1C1E] border border-[#DAC58F]/20 rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 text-[#E3E2E5] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-[#DAC58F]/30" />
        </div>

        {justCompleted ? (
          <div className="py-16 px-6 flex flex-col items-center justify-center text-center gap-3 animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 rounded-full bg-[#56481E] border border-[#DAC58F]/40 text-[#F2CA50] flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-[32px]">verified</span>
            </div>
            <h3 className="font-serif text-xl text-white">Mandate Honored</h3>
            <p className="text-xs text-[#D0C5AF] max-w-xs">
              Archived securely into vault history ledger. 30-day purge cycle active.
            </p>
          </div>
        ) : (
          <>
            {/* Dossier Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-[#DAC58F]/10 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold border ${pBadge.bg} ${pBadge.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pBadge.dot}`} />
                    <span>{pBadge.label}</span>
                  </span>

                  {task.category && (
                    <span className="px-2 py-0.5 rounded bg-[#292A2C] border border-[#DAC58F]/15 text-[11px] text-[#D0C5AF]">
                      Vault #{task.category}
                    </span>
                  )}

                  {isCompleted && (
                    <span className="px-2 py-0.5 rounded bg-[#56481E]/60 border border-[#DAC58F]/30 text-[11px] text-[#DAC58F] font-semibold">
                      Completed ✓
                    </span>
                  )}

                  {isOverdue && !isCompleted && (
                    <span className="px-2 py-0.5 rounded bg-[#93000A]/50 border border-[#FFB4AB]/30 text-[11px] text-[#FFB4AB] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#BA1A1A]" />
                      Past Due
                    </span>
                  )}
                </div>

                <h2 className="font-serif text-lg sm:text-xl text-white mt-1 leading-snug break-words">
                  {task.title}
                </h2>
              </div>

              <button
                onClick={onClose}
                aria-label="Close dossier"
                className="w-8 h-8 rounded-full bg-[#292A2C] border border-[#DAC58F]/15 flex items-center justify-center text-[#D0C5AF] hover:text-white transition-colors cursor-pointer flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Dossier Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Full Untruncated Description in Confidential Instructions Callout */}
              <div className="bg-[#121315] rounded-xl p-4 border border-[#DAC58F]/12">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#DAC58F] block mb-1 font-semibold">
                  Confidential Instructions &amp; Focus Context
                </span>
                {task.description ? (
                  <p className="text-xs sm:text-sm text-[#E3E2E5] whitespace-pre-wrap leading-relaxed">
                    {task.description}
                  </p>
                ) : (
                  <p className="text-xs text-[#99907C] italic">
                    No supplementary details recorded for this mandate.
                  </p>
                )}
              </div>

              {/* Metadata Details Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#121315] rounded-lg p-3 border border-[#DAC58F]/10 flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-[#99907C] font-mono">
                    Horizon Window
                  </span>
                  <span className="text-xs text-white font-medium mt-1">
                    {formattedDue || formattedScheduled || 'Continuous Focus'}
                  </span>
                </div>

                <div className="bg-[#121315] rounded-lg p-3 border border-[#DAC58F]/10 flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-[#99907C] font-mono">
                    Estimated Depth
                  </span>
                  <span className="text-xs text-white font-medium mt-1">
                    {task.estimated_duration_minutes} minutes deep work
                  </span>
                </div>
              </div>

              {/* Cadence Disintegration Notice */}
              <div className="p-3 rounded-lg bg-[#292A2C]/40 border border-[#DAC58F]/10 flex items-center justify-between text-[11px] text-[#99907C]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#DAC58F]">
                    auto_delete
                  </span>
                  <span>Completed tasks disintegrate automatically after 30 days.</span>
                </div>
              </div>
            </div>

            {/* Dossier Footer Actions */}
            <div className="p-4 sm:p-5 pt-3 border-t border-[#DAC58F]/10 bg-[#141517] flex flex-col gap-2">
              <button
                type="button"
                onClick={handleToggleComplete}
                className="w-full py-2.5 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-[#F2CA50] text-[#141211] font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">
                  {isCompleted ? 'restart_alt' : 'check_circle'}
                </span>
                <span>
                  {isCompleted ? 'Reopen Mandate' : 'Mark Honored & Complete'}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="flex-1 py-2 rounded-lg bg-[#292A2C] hover:bg-[#343537] text-white text-xs uppercase tracking-wider font-medium border border-[#DAC58F]/15 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm text-[#DAC58F]">edit</span>
                  <span>Edit Mandate</span>
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-2 rounded-lg bg-[#93000A]/30 hover:bg-[#93000A]/60 text-[#FFB4AB] text-xs uppercase tracking-wider font-medium border border-[#FFB4AB]/20 flex items-center justify-center gap-1 transition-colors cursor-pointer"
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

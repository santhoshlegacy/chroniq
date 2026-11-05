import React, { useState, useEffect } from 'react'
import type { Task, TaskPriority } from '@/types'
import { useTaskStore } from '@/store/useTaskStore'
import { format } from 'date-fns'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  taskToEdit?: Task | null
}

const CATEGORIES = ['Engineering', 'Design', 'Productivity', 'Personal', 'Health', 'Operations', 'Finance']

interface FormState {
  title: string
  description: string
  priority: TaskPriority
  scheduledDate: string
  dueAt: string
  duration: string
  category: string
}

function getDefaultFormState(): FormState {
  return {
    title: '',
    description: '',
    priority: 'medium',
    scheduledDate: format(new Date(), 'yyyy-MM-dd'),
    dueAt: '',
    duration: '30',
    category: 'Productivity',
  }
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, taskToEdit }) => {
  const { addTask, updateTask } = useTaskStore()
  const [form, setForm] = useState<FormState>(getDefaultFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (taskToEdit) {
      setForm({
        title: taskToEdit.title,
        description: taskToEdit.description ?? '',
        priority: taskToEdit.priority,
        scheduledDate: taskToEdit.scheduled_date ?? format(new Date(), 'yyyy-MM-dd'),
        dueAt: taskToEdit.due_at ? taskToEdit.due_at.slice(0, 16) : '',
        duration: taskToEdit.estimated_duration_minutes ? String(taskToEdit.estimated_duration_minutes) : '30',
        category: taskToEdit.category ?? 'Productivity',
      })
    } else {
      setForm(getDefaultFormState())
    }
  }, [taskToEdit, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || isSubmitting) return

    setIsSubmitting(true)
    const durNum = parseInt(form.duration, 10) || null
    const dueIso = form.dueAt ? new Date(form.dueAt).toISOString() : null

    if (taskToEdit) {
      await updateTask(taskToEdit.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        scheduled_date: form.scheduledDate || null,
        due_at: dueIso,
        estimated_duration_minutes: durNum,
        category: form.category,
      })
    } else {
      await addTask({
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        status: 'pending',
        scheduled_date: form.scheduledDate || null,
        due_at: dueIso,
        estimated_duration_minutes: durNum,
        completed_at: null,
        category: form.category,
      })
    }

    setIsSubmitting(false)
    onClose()
  }

  const priorityConfigs: Record<TaskPriority, { label: string; dot: string; border: string; bg: string }> = {
    urgent: { label: 'Tier 1 Sovereign', dot: 'bg-[#BA1A1A]', border: 'border-[#BA1A1A]/40', bg: 'bg-[#93000A]/30 text-[#FFDAD6]' },
    high: { label: 'Amber Horizon', dot: 'bg-[#D4AF37]', border: 'border-[#D4AF37]/40', bg: 'bg-[#56481E]/40 text-[#F2CA50]' },
    medium: { label: 'Champagne', dot: 'bg-[#DAC58F]', border: 'border-[#DAC58F]/40', bg: 'bg-[#1F2022] text-[#DAC58F]' },
    low: { label: 'Sage Ritual', dot: 'bg-[#7F7570]', border: 'border-[#7F7570]/40', bg: 'bg-[#292A2C] text-[#D0C5AF]' },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0D0E10]/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#1B1C1E] border border-[#DAC58F]/20 rounded-2xl p-6 sm:p-7 shadow-2xl z-10 animate-in zoom-in-95 duration-150 text-[#E3E2E5]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#DAC58F]/10">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#DAC58F]">
              Mandate Inscription
            </span>
            <h2 className="text-base font-semibold text-white tracking-tight font-serif mt-0.5">
              {taskToEdit ? 'Modify Mandate Dossier' : 'Inscribe New Mandate'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#99907C] hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#DAC58F] mb-1 font-semibold">
              Mandate Title <span className="text-[#F2CA50]">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Fiduciary Trust Agreement Execution"
              className="w-full px-3.5 py-2 rounded-xl bg-[#121315] border border-[#DAC58F]/20 text-xs text-white placeholder-[#99907C]/60 focus:outline-none focus:border-[#DAC58F] transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#DAC58F] mb-1 font-semibold">
              Confidential Instructions (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={2000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Key notes, context, or deliverables..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#121315] border border-[#DAC58F]/20 text-xs text-white placeholder-[#99907C]/60 focus:outline-none focus:border-[#DAC58F] transition resize-none"
            />
          </div>

          {/* Priority Selector */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#DAC58F] mb-1.5 font-semibold">
              Urgency Tier
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => {
                const isSelected = form.priority === p
                const cfg = priorityConfigs[p]
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      isSelected
                        ? `${cfg.bg} ${cfg.border} ring-1 ring-[#DAC58F]/30 shadow-xs font-semibold`
                        : 'bg-[#121315] border-[#DAC58F]/10 text-[#99907C] hover:text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="truncate">{cfg.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dates & Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#99907C] mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-[#121315] border border-[#DAC58F]/20 text-xs text-white focus:outline-none focus:border-[#DAC58F]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#99907C] mb-1">
                Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-[#121315] border border-[#DAC58F]/20 text-xs text-white focus:outline-none focus:border-[#DAC58F]"
              />
            </div>
          </div>

          {/* Category & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#99907C] mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-[#121315] border border-[#DAC58F]/20 text-xs text-white focus:outline-none focus:border-[#DAC58F]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#99907C] mb-1">
                Estimated Duration (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="480"
                step="5"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-[#121315] border border-[#DAC58F]/20 text-xs text-white focus:outline-none focus:border-[#DAC58F] tabular-nums font-mono"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#DAC58F]/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#99907C] hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !form.title.trim()}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-[#F2CA50] text-[#141211] font-semibold text-xs uppercase tracking-wider disabled:opacity-40 cursor-pointer shadow-md hover:opacity-90 active:scale-95 transition-all"
            >
              {taskToEdit ? 'Save Dossier' : 'Inscribe Mandate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

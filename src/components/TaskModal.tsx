import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, Tag } from 'lucide-react'
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

  const priorityConfigs: Record<TaskPriority, { label: string; dot: string }> = {
    urgent: { label: 'Urgent', dot: 'bg-rose-400' },
    high: { label: 'High', dot: 'bg-amber-400' },
    medium: { label: 'Medium', dot: 'bg-[#5EEAD4]' },
    low: { label: 'Low', dot: 'bg-slate-400' },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0A0E17]/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#121826] border border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-2xl z-10 animate-in zoom-in-95 duration-150 text-[#F3F4F8]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white tracking-tight font-['Outfit']">
            {taskToEdit ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">
              Task Title <span className="text-[#5EEAD4]">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Finalize architecture review"
              className="w-full px-3 py-2 rounded-xl bg-[#182233] border border-white/[0.06] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#5EEAD4]/50 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={2000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Key notes, context, or deliverables..."
              className="w-full px-3 py-2 rounded-xl bg-[#182233] border border-white/[0.06] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#5EEAD4]/50 transition resize-none"
            />
          </div>

          {/* Priority Selector */}
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              Priority Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => {
                const isSelected = form.priority === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium capitalize flex items-center justify-center space-x-1.5 border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#1E2B40] border-[#5EEAD4]/40 text-white shadow-xs'
                        : 'bg-[#182233] border-white/[0.04] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${priorityConfigs[p].dot}`} />
                    <span>{priorityConfigs[p].label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dates & Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1 flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-[#64748B]" />
                <span>Scheduled Date</span>
              </label>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-[#182233] border border-white/[0.06] text-xs text-white focus:outline-none focus:border-[#5EEAD4]/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-[#64748B]" />
                <span>Deadline (Optional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-[#182233] border border-white/[0.06] text-xs text-white focus:outline-none focus:border-[#5EEAD4]/50"
              />
            </div>
          </div>

          {/* Category & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1 flex items-center space-x-1">
                <Tag className="w-3 h-3 text-[#64748B]" />
                <span>Category</span>
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-[#182233] border border-white/[0.06] text-xs text-white focus:outline-none focus:border-[#5EEAD4]/50"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-[#64748B]" />
                <span>Est. Minutes</span>
              </label>
              <input
                type="number"
                min="5"
                max="480"
                step="5"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-[#182233] border border-white/[0.06] text-xs text-white focus:outline-none focus:border-[#5EEAD4]/50 tabular-nums font-mono"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !form.title.trim()}
              className="btn-primary px-4 py-1.5 text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              {taskToEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

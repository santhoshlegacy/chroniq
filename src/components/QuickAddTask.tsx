import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import type { TaskPriority } from '@/types'
import { format } from 'date-fns'

export const QuickAddTask: React.FC = () => {
  const { addTask } = useTaskStore()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [category] = useState('General')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    const todayStr = format(new Date(), 'yyyy-MM-dd')

    await addTask({
      title: title.trim(),
      description: null,
      priority,
      status: 'pending',
      scheduled_date: todayStr,
      due_at: null,
      estimated_duration_minutes: 30,
      completed_at: null,
      category,
    })

    setTitle('')
    setIsSubmitting(false)
  }

  const priorityConfigs: Record<TaskPriority, { label: string; dot: string }> = {
    urgent: { label: 'Urgent', dot: 'bg-rose-400' },
    high: { label: 'High', dot: 'bg-amber-400' },
    medium: { label: 'Medium', dot: 'bg-[#70DFFF]' },
    low: { label: 'Low', dot: 'bg-slate-400' },
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#111827] border border-white/[0.06] rounded-xl p-2.5 sm:p-3 mb-6 flex flex-col sm:flex-row items-center gap-2.5 transition focus-within:border-white/[0.14]"
    >
      <div className="relative flex-1 w-full">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task for today's focus window (Press Enter)..."
          className="w-full px-3.5 py-2 rounded-lg bg-[#151B28] border border-white/[0.04] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#70DFFF]/40 transition"
        />
      </div>

      <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
        {/* Priority Selector (Subtle Dots + Label) */}
        <div className="flex items-center space-x-1 bg-[#151B28] p-1 rounded-lg border border-white/[0.04]">
          {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => {
            const isSelected = priority === p
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex items-center space-x-1.5 px-2 py-1 rounded-md text-[11px] font-medium capitalize transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#1C2436] text-white border border-white/[0.08] shadow-xs'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priorityConfigs[p].dot}`} />
                <span>{priorityConfigs[p].label}</span>
              </button>
            )
          })}
        </div>

        {/* Add Button (Ice Cyan) */}
        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="btn-primary px-3.5 py-1.5 text-xs font-semibold flex items-center space-x-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add</span>
        </button>
      </div>
    </form>
  )
}

import React, { useState } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import type { TaskPriority } from '@/types'
import { format } from 'date-fns'

export const QuickAddTask: React.FC = () => {
  const { addTask } = useTaskStore()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isListening, setIsListening] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    const todayStr = format(new Date(), 'yyyy-MM-dd')

    const created = await addTask({
      title: title.trim(),
      description: null,
      priority,
      status: 'pending',
      scheduled_date: todayStr,
      due_at: null,
      estimated_duration_minutes: 30,
      completed_at: null,
      category: 'General',
    })

    if (created) {
      setTitle('')
    }
    setIsSubmitting(false)
  }

  const handleToggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.')
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => setIsListening(true)
      recognition.onend = () => setIsListening(false)
      recognition.onerror = () => setIsListening(false)

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        if (transcript) {
          setTitle((prev) => (prev ? `${prev} ${transcript}` : transcript))
        }
      }

      recognition.start()
    } catch {
      setIsListening(false)
    }
  }

  const urgencyPips: {
    priority: TaskPriority
    title: string
    colorClass: string
    activeClass: string
  }[] = [
    {
      priority: 'urgent',
      title: 'Urgent Priority',
      colorClass: 'bg-[#BA1A1A]',
      activeClass: 'ring-2 ring-[#BA1A1A] ring-offset-2 ring-offset-[#F4EFEB] scale-125',
    },
    {
      priority: 'high',
      title: 'High Priority',
      colorClass: 'bg-[#C2A26F]',
      activeClass: 'ring-2 ring-[#C2A26F] ring-offset-2 ring-offset-[#F4EFEB] scale-125',
    },
    {
      priority: 'medium',
      title: 'Medium Priority',
      colorClass: 'bg-[#8C7654]',
      activeClass: 'ring-2 ring-[#8C7654] ring-offset-2 ring-offset-[#F4EFEB] scale-125',
    },
    {
      priority: 'low',
      title: 'Low Priority',
      colorClass: 'bg-[#7A746E]',
      activeClass: 'ring-2 ring-[#7A746E] ring-offset-2 ring-offset-[#F4EFEB] scale-125',
    },
  ]

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-xl p-4 mb-8 flex flex-col gap-3 shadow-[0_4px_16px_rgba(45,41,38,0.03)] hover:border-[rgba(45,41,38,0.16)] transition-all focus-within:border-[#C2A26F]"
    >
      {/* Input Row */}
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[#745A2E] text-[20px] flex-shrink-0">
          edit_note
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
          placeholder="Add a new task..."
          className="bg-transparent flex-1 text-sm text-[#181615] placeholder-[#7A746E]/70 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleToggleVoice}
          title={isListening ? 'Listening...' : 'Voice Dictation'}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isListening
              ? 'bg-[#BA1A1A] text-[#FAF7F2] animate-pulse'
              : 'bg-[#EFECE3] text-[#4D4541] hover:text-[#181615] hover:bg-[#E5E2DB]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">mic</span>
        </button>
      </div>

      {/* Priority Pips & Add Task Action */}
      <div className="flex items-center justify-between pt-2 border-t border-[rgba(45,41,38,0.06)]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#7A746E]">
            Priority
          </span>
          <div className="flex items-center gap-2.5">
            {urgencyPips.map((item) => {
              const isSelected = priority === item.priority
              return (
                <button
                  key={item.priority}
                  type="button"
                  onClick={() => setPriority(item.priority)}
                  title={item.title}
                  className={`w-3.5 h-3.5 rounded-full ${item.colorClass} transition-all cursor-pointer ${
                    isSelected ? item.activeClass : 'opacity-50 hover:opacity-100 hover:scale-115'
                  }`}
                />
              )
            })}
          </div>
          <span className="text-[10px] uppercase font-mono text-[#745A2E] font-semibold hidden sm:inline">
            {priority.toUpperCase()}
          </span>
        </div>

        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="btn-primary px-4 py-1.5 rounded-md text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          <span>Add Task</span>
        </button>
      </div>
    </form>
  )
}

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

    await addTask({
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

    setTitle('')
    setIsSubmitting(false)
  }

  // Voice dictation using browser Web Speech API
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
    borderClass: string
  }[] = [
    {
      priority: 'urgent',
      title: 'Crimson Sovereign / VIP',
      colorClass: 'bg-[#BA1A1A]',
      activeClass: 'ring-2 ring-[#BA1A1A] scale-125 shadow-[0_0_8px_#BA1A1A]',
      borderClass: 'border-[#BA1A1A]/40',
    },
    {
      priority: 'high',
      title: 'Amber Horizon / High',
      colorClass: 'bg-[#D4AF37]',
      activeClass: 'ring-2 ring-[#D4AF37] scale-125 shadow-[0_0_8px_#D4AF37]',
      borderClass: 'border-[#D4AF37]/40',
    },
    {
      priority: 'medium',
      title: 'Champagne / Medium',
      colorClass: 'bg-[#DAC58F]',
      activeClass: 'ring-2 ring-[#DAC58F] scale-125 shadow-[0_0_8px_#DAC58F]',
      borderClass: 'border-[#DAC58F]/40',
    },
    {
      priority: 'low',
      title: 'Sage Ritual / Standard',
      colorClass: 'bg-[#7F7570]',
      activeClass: 'ring-2 ring-[#99907C] scale-125 shadow-[0_0_8px_#99907C]',
      borderClass: 'border-[#7F7570]/40',
    },
  ]

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#1B1C1E] border border-[#DAC58F]/15 rounded-xl p-3 sm:p-4 mb-6 flex flex-col gap-3 shadow-md hover:border-[#DAC58F]/25 transition-all focus-within:border-[#DAC58F]/40"
    >
      {/* Input Row */}
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[#DAC58F] text-[20px] flex-shrink-0">
          edit_note
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
          placeholder="Inscribe new mandate or focus block..."
          className="bg-transparent flex-1 text-sm text-[#E3E2E5] placeholder-[#99907C]/70 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleToggleVoice}
          title={isListening ? 'Listening...' : 'Voice Dictation'}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isListening
              ? 'bg-[#BA1A1A] text-white animate-pulse'
              : 'bg-[#292A2C] text-[#D0C5AF] hover:text-white hover:bg-[#343537]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">mic</span>
        </button>
      </div>

      {/* Urgency Pips & Inscribe Action */}
      <div className="flex items-center justify-between pt-1 border-t border-[#DAC58F]/10">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#99907C]">
            Urgency
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
                    isSelected ? item.activeClass : 'opacity-60 hover:opacity-100 hover:scale-115'
                  }`}
                />
              )
            })}
          </div>
          <span className="text-[10px] uppercase font-mono text-[#DAC58F] hidden sm:inline">
            {priority.toUpperCase()}
          </span>
        </div>

        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="px-4 py-1.5 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-[#F2CA50] text-[#141211] font-semibold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          <span>Inscribe</span>
        </button>
      </div>
    </form>
  )
}

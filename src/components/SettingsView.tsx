import React, { useState } from 'react'
import {
  Bell,
  Clock,
  Moon,
  Calendar,
  Volume2,
  History,
  Plus,
  Trash2,
  Globe,
  Smartphone,
  Phone,
} from 'lucide-react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { COMMON_TIMEZONES } from '@/lib/reminderUtils'
import { isValidE164PhoneNumber } from '@/lib/voiceReminderClient'

const DAYS_OF_WEEK = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 7, label: 'Sun' },
]

export const SettingsView: React.FC = () => {
  const {
    preferences,
    voicePreferences,
    updatePreferences,
    updateVoicePreferences,
    addCustomSlot,
    removeCustomSlot,
    toggleSlotActive,
    toggleDayActive,
    events,
  } = useSettingsStore()

  const [activeTab, setActiveTab] = useState<'schedule' | 'voice' | 'history'>('schedule')
  const [newSlotInput, setNewSlotInput] = useState('14:00')
  const [isSaved, setIsSaved] = useState(false)
  const [phoneInput, setPhoneInput] = useState(voicePreferences.phone_number || '')
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const handleAddSlot = async () => {
    if (!newSlotInput) return
    await addCustomSlot(newSlotInput)
    setNewSlotInput('14:00')
  }

  const handleSavePhone = async () => {
    if (phoneInput && !isValidE164PhoneNumber(phoneInput)) {
      setPhoneError('Please enter a valid international phone number in E.164 format (e.g., +14155552671).')
      return
    }
    setPhoneError(null)
    await updateVoicePreferences({ phone_number: phoneInput || null })
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  const activeSlots = preferences.active_slots || []
  const customSlots = preferences.custom_slots || ['09:00', '12:00', '15:00', '18:00', '21:00']
  const activeDays = preferences.active_days || [1, 2, 3, 4, 5, 6, 7]

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-8 px-4 animate-in fade-in duration-200 mb-20 sm:mb-12">
      {/* View Header */}
      <div className="surface-panel rounded-2xl p-6 sm:p-7 space-y-6">
        <div className="flex items-center space-x-3 pb-5 border-b border-white/[0.08]">
          <div className="p-2.5 rounded-xl bg-[#182233] border border-white/[0.08] text-[#5EEAD4] shadow-sm">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight font-['Outfit']">
              Notification & Reminder Settings
            </h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Customize daily reminder times, voice check-ins, and notification preferences
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-[#161F2E] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-[#1E2B40] text-white border border-white/[0.08] font-semibold shadow-xs'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Daily Schedule & Slots
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'voice'
                ? 'bg-[#1E2B40] text-white border border-white/[0.08] font-semibold shadow-xs'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-[#C4B5FD]" />
            <span>Voice & Calls</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'history'
                ? 'bg-[#1E2B40] text-white border border-white/[0.08] font-semibold shadow-xs'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Delivery History ({events.length})</span>
          </button>
        </div>

        {/* ──────── TAB 1: SCHEDULE & SLOTS ──────── */}
        {activeTab === 'schedule' && (
          <div className="space-y-5">
            {/* Master automated check-in toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#161F2E] border border-white/[0.06]">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-white block">Automated Daily Reminders</span>
                <span className="text-[11px] text-[#94A3B8]">
                  Receive Web Push notifications at configured times when tasks are pending
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.enabled}
                  onChange={(e) => updatePreferences({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#0A0E17] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5EEAD4]"></div>
              </label>
            </div>

            {/* Custom Daily Slots */}
            <div className="p-4 rounded-xl bg-[#161F2E] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#5EEAD4]" />
                  <span className="text-xs font-semibold text-white">Daily Reminder Slots</span>
                </div>
                <span className="text-[11px] text-[#64748B]">Click slot to enable/disable</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {customSlots.map((slot) => {
                  const isActive = activeSlots.includes(slot)
                  return (
                    <div
                      key={slot}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition ${
                        isActive
                          ? 'bg-[#182233] border-[#5EEAD4]/40 text-white shadow-xs'
                          : 'bg-[#121826]/60 border-white/[0.04] text-[#64748B]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSlotActive(slot)}
                        className="flex-1 text-left font-mono font-medium cursor-pointer"
                      >
                        {slot}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomSlot(slot)}
                        className="p-1 text-[#64748B] hover:text-rose-400 transition cursor-pointer"
                        title="Remove slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Add custom slot input */}
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="time"
                  value={newSlotInput}
                  onChange={(e) => setNewSlotInput(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#121826] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#5EEAD4]"
                />
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="px-3 py-1.5 rounded-lg btn-secondary text-xs flex items-center space-x-1.5 cursor-pointer font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Reminder Time</span>
                </button>
              </div>
            </div>

            {/* Active Days */}
            <div className="p-4 rounded-xl bg-[#161F2E] border border-white/[0.06] space-y-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#5EEAD4]" />
                <span className="text-xs font-semibold text-white">Active Days of the Week</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS_OF_WEEK.map((d) => {
                  const isActive = activeDays.includes(d.id)
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDayActive(d.id)}
                      className={`py-2 text-center rounded-lg text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-[#182233] text-white border border-[#5EEAD4]/40 shadow-xs'
                          : 'bg-[#121826]/40 text-[#64748B] border border-white/[0.04]'
                      }`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="p-4 rounded-xl bg-[#161F2E] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Moon className="w-4 h-4 text-[#C4B5FD]" />
                  <span className="text-xs font-semibold text-white">Quiet Hours (Do Not Disturb)</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.quiet_hours_enabled}
                    onChange={(e) => updatePreferences({ quiet_hours_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#0A0E17] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C4B5FD]"></div>
                </label>
              </div>

              {preferences.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] text-[#94A3B8] mb-1">Starts at</label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_start}
                      onChange={(e) => updatePreferences({ quiet_hours_start: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#121826] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#C4B5FD]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#94A3B8] mb-1">Ends at</label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_end}
                      onChange={(e) => updatePreferences({ quiet_hours_end: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#121826] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#C4B5FD]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Timezone */}
            <div className="p-4 rounded-xl bg-[#161F2E] border border-white/[0.06] space-y-2">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-[#5EEAD4]" />
                <span className="text-xs font-semibold text-white">Timezone</span>
              </div>
              <select
                value={preferences.timezone}
                onChange={(e) => updatePreferences({ timezone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#121826] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#5EEAD4]"
              >
                {COMMON_TIMEZONES.map((tz: string) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ──────── TAB 2: VOICE & TELEPHONY ──────── */}
        {activeTab === 'voice' && (
          <div className="space-y-5">
            {/* Spoken Reminders */}
            <div className="p-4 rounded-xl bg-[#161F2E] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-[#C4B5FD]" />
                  <div>
                    <span className="text-xs font-semibold text-white block">In-App Spoken Voice Reminders</span>
                    <span className="text-[11px] text-[#94A3B8]">
                      Uses device Web Speech API to narrate pending tasks during check-in windows
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voicePreferences.speech_enabled}
                    onChange={(e) => updateVoicePreferences({ speech_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#0A0E17] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C4B5FD]"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.04]">
                <div>
                  <label className="block text-[11px] text-[#94A3B8] mb-1">
                    Speech Rate: {voicePreferences.speech_rate}x
                  </label>
                  <input
                    type="range"
                    min="0.7"
                    max="1.4"
                    step="0.1"
                    value={voicePreferences.speech_rate}
                    onChange={(e) => updateVoicePreferences({ speech_rate: parseFloat(e.target.value) })}
                    className="w-full accent-[#C4B5FD]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#94A3B8] mb-1">
                    Speech Pitch: {voicePreferences.speech_pitch}
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.1"
                    value={voicePreferences.speech_pitch}
                    onChange={(e) => updateVoicePreferences({ speech_pitch: parseFloat(e.target.value) })}
                    className="w-full accent-[#C4B5FD]"
                  />
                </div>
              </div>
            </div>

            {/* Phone Calls */}
            <div className="p-4 rounded-xl bg-[#161F2E] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Automated Phone Call Reminders</span>
                    <span className="text-[11px] text-[#94A3B8]">
                      Receive automated check-in phone call when urgent tasks are overdue
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voicePreferences.phone_call_enabled}
                    onChange={(e) => updateVoicePreferences({ phone_call_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#0A0E17] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-400"></div>
                </label>
              </div>

              {voicePreferences.phone_call_enabled && (
                <div className="pt-2 space-y-3 border-t border-white/[0.04]">
                  <div>
                    <label className="block text-[11px] text-[#94A3B8] mb-1">
                      International Phone Number (E.164)
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Smartphone className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="+14155552671"
                          className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#121826] border border-white/[0.08] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSavePhone}
                        className="px-3 py-1.5 rounded-lg btn-primary text-xs font-semibold cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                    {phoneError && <p className="text-xs text-rose-400 mt-1">{phoneError}</p>}
                    {isSaved && <p className="text-xs text-emerald-400 mt-1">Saved successfully!</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──────── TAB 3: DELIVERY HISTORY ──────── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Logged reminder delivery events</span>
              <span className="text-[11px] text-[#64748B]">Total: {events.length}</span>
            </div>

            {events.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B] bg-[#161F2E] rounded-xl border border-white/[0.06]">
                No delivery events recorded yet. Scheduled reminder cycles will appear here once executed.
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-xl bg-[#161F2E] border border-white/[0.06] flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                            evt.result === 'sent'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : evt.result === 'no_tasks'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : evt.result === 'quiet_hours'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {evt.result}
                        </span>
                        <span className="text-[11px] font-mono text-[#94A3B8]">
                          {new Date(evt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {evt.delivery_mode && (
                          <span className="text-[10px] text-[#64748B] uppercase">
                            • {evt.delivery_mode}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        Snapshot: {evt.task_count_snapshot ?? 0} tasks
                        {evt.error_category && ` • Error: ${evt.error_category}`}
                      </p>
                    </div>

                    <div className="text-right text-[11px] text-[#64748B] font-mono">
                      {new Date(evt.scheduled_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

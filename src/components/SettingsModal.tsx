import React, { useState } from 'react'
import {
  X,
  Bell,
  Globe,
  History,
  Volume2,
  Phone,
  Plus,
  Moon,
  Info,
} from 'lucide-react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { DEFAULT_REMINDER_SLOTS } from '@/lib/reminderUtils'
import { isValidE164PhoneNumber } from '@/lib/voiceReminderClient'
import { format, parseISO } from 'date-fns'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
]

const DAYS_OF_WEEK = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 7, label: 'Sun' },
]

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
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
  const [consentChecked, setConsentChecked] = useState(Boolean(voicePreferences.phone_consent_given_at))
  const [phoneError, setPhoneError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSlotInput) return
    await addCustomSlot(newSlotInput)
    setNewSlotInput('')
  }

  const handleResetSlotsToDefault = async () => {
    await updatePreferences({
      custom_slots: [...DEFAULT_REMINDER_SLOTS],
      active_slots: [...DEFAULT_REMINDER_SLOTS],
    })
  }

  const handleSaveVoicePhone = async () => {
    if (voicePreferences.phone_call_enabled) {
      if (!isValidE164PhoneNumber(phoneInput)) {
        setPhoneError('Please enter a valid international phone number in E.164 format (e.g. +14155552671).')
        return
      }
      if (!consentChecked) {
        setPhoneError('Explicit user consent is required before scheduling automated phone call reminders.')
        return
      }
    }
    setPhoneError(null)
    await updateVoicePreferences({
      phone_number: phoneInput.trim() || null,
      phone_consent_given_at: consentChecked ? new Date().toISOString() : null,
      phone_verified: isValidE164PhoneNumber(phoneInput),
    })
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#080B12]/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0E131F] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl z-10 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150 text-[#E7ECF4]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-[#151B28] border border-white/[0.08] text-[#70DFFF]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Notification & Reminders</h2>
              <p className="text-xs text-[#94A3B8]">Customize daily reminder times, voice check-ins, and notification preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center space-x-1.5 mt-3.5 p-1 rounded-xl bg-[#151B28] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-[#0E131F] text-white border border-white/[0.08] font-semibold'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Schedule & Slots
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'voice'
                ? 'bg-[#0E131F] text-white border border-white/[0.08] font-semibold'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>Voice & Calls</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'history'
                ? 'bg-[#0E131F] text-white border border-white/[0.08] font-semibold'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Delivery History ({events.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 pr-1 mt-4 space-y-4">
          {/* ──────── TAB 1: SCHEDULE & SLOTS ──────── */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              {/* Master automated check-in toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#151B28] border border-white/[0.06]">
                <div>
                  <span className="text-xs font-semibold text-white block">Automated Reminder Engine</span>
                  <span className="text-[11px] text-[#94A3B8]">
                    Evaluates user reminder slots every minute via backend scheduler
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.enabled}
                    onChange={(e) => updatePreferences({ enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#080B12] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#70DFFF]"></div>
                </label>
              </div>

              {/* Custom Slots Management */}
              <div className="p-3.5 rounded-xl bg-[#151B28] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white block">Reminder Schedule Slots</span>
                    <span className="text-[11px] text-[#94A3B8]">
                      Default: 9:00 AM, 12:00 PM, 3:00 PM, 6:00 PM, 9:00 PM. Toggle on/off or add custom slots.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetSlotsToDefault}
                    className="text-[11px] text-[#70DFFF] hover:underline cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>

                {/* Slots Grid */}
                <div className="flex flex-wrap gap-2">
                  {(preferences.custom_slots || DEFAULT_REMINDER_SLOTS).map((slot) => {
                    const isActive = (preferences.active_slots || DEFAULT_REMINDER_SLOTS).includes(slot)
                    return (
                      <div
                        key={slot}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs transition ${
                          isActive
                            ? 'bg-[#0E131F] border-[#70DFFF]/40 text-[#70DFFF]'
                            : 'bg-[#0E131F]/40 border-white/[0.06] text-[#64748B]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSlotActive(slot)}
                          className="font-mono font-medium cursor-pointer"
                          title="Click to toggle active"
                        >
                          {slot}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCustomSlot(slot)}
                          className="text-[#64748B] hover:text-rose-400 p-0.5 cursor-pointer"
                          title="Remove slot"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Slot Input */}
                <form onSubmit={handleAddSlot} className="flex items-center space-x-2 pt-2 border-t border-white/[0.04]">
                  <input
                    type="time"
                    value={newSlotInput}
                    onChange={(e) => setNewSlotInput(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0E131F] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#70DFFF]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-[#1C2436] hover:bg-[#253046] text-xs text-white border border-white/[0.08] flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#70DFFF]" />
                    <span>Add Slot</span>
                  </button>
                </form>
              </div>

              {/* Active Days of Week */}
              <div className="p-3.5 rounded-xl bg-[#151B28] border border-white/[0.06] space-y-2">
                <span className="text-xs font-semibold text-white block">Active Days of Week</span>
                <div className="flex gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const isDaySelected = (preferences.active_days || [1, 2, 3, 4, 5, 6, 7]).includes(day.id)
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDayActive(day.id)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition cursor-pointer ${
                          isDaySelected
                            ? 'bg-[#0E131F] border-[#70DFFF]/50 text-[#70DFFF]'
                            : 'bg-[#0E131F]/30 border-white/[0.04] text-[#64748B]'
                        }`}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="p-3.5 rounded-xl bg-[#151B28] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Moon className="w-3.5 h-3.5 text-[#A78BFA]" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Quiet Hours</span>
                      <span className="text-[11px] text-[#94A3B8]">Suppress check-in notifications during resting hours</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.quiet_hours_enabled}
                      onChange={(e) => updatePreferences({ quiet_hours_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#080B12] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#A78BFA]"></div>
                  </label>
                </div>

                {preferences.quiet_hours_enabled && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] text-[#94A3B8] mb-1">Quiet Window Starts</label>
                      <input
                        type="time"
                        value={preferences.quiet_hours_start}
                        onChange={(e) => updatePreferences({ quiet_hours_start: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0E131F] border border-white/[0.08] text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#94A3B8] mb-1">Quiet Window Ends</label>
                      <input
                        type="time"
                        value={preferences.quiet_hours_end}
                        onChange={(e) => updatePreferences({ quiet_hours_end: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0E131F] border border-white/[0.08] text-xs text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Timezone & Eligible Tasks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#151B28] border border-white/[0.06]">
                  <label className="block text-xs font-semibold text-white mb-1.5 flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#70DFFF]" />
                    <span>User Timezone (IANA)</span>
                  </label>
                  <select
                    value={preferences.timezone}
                    onChange={(e) => updatePreferences({ timezone: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0E131F] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#70DFFF]"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-[#151B28] border border-white/[0.06]">
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Eligible Reminder Tasks
                  </label>
                  <select
                    value={preferences.eligible_task_types || 'all_pending'}
                    onChange={(e) => updatePreferences({ eligible_task_types: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0E131F] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#70DFFF]"
                  >
                    <option value="all_pending">All Pending Tasks</option>
                    <option value="due_today_or_overdue">Due Today or Overdue Only</option>
                    <option value="urgent_only">High & Urgent Priority Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ──────── TAB 2: VOICE & TELEPHONY ──────── */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              {/* Spoken Reminders (Web Speech API) */}
              <div className="p-3.5 rounded-xl bg-[#151B28] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 text-[#A78BFA]" />
                    <div>
                      <span className="text-xs font-semibold text-white block">In-App Spoken Voice Reminders</span>
                      <span className="text-[11px] text-[#94A3B8]">
                        Uses client-side Web Speech API to narrate pending tasks
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
                    <div className="w-9 h-5 bg-[#080B12] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#A78BFA]"></div>
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
                      className="w-full accent-[#A78BFA]"
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
                      className="w-full accent-[#A78BFA]"
                    />
                  </div>
                </div>
              </div>

              {/* Actual Phone Calls (Telephony Architecture) */}
              <div className="p-3.5 rounded-xl bg-[#151B28] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Actual Incoming Phone Calls</span>
                      <span className="text-[11px] text-[#94A3B8]">
                        Automated phone check-in via server-side telephony provider
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
                    <div className="w-9 h-5 bg-[#080B12] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-400"></div>
                  </label>
                </div>

                {voicePreferences.phone_call_enabled && (
                  <div className="space-y-3 pt-2 border-t border-white/[0.04]">
                    <div>
                      <label className="block text-[11px] text-[#94A3B8] mb-1">
                        Mobile Phone Number (E.164 Format, e.g. +14155552671)
                      </label>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="+14155552671"
                        className="w-full px-3 py-1.5 rounded-lg bg-[#0E131F] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#70DFFF]"
                      />
                    </div>

                    <div className="flex items-start space-x-2 text-xs">
                      <input
                        type="checkbox"
                        id="phoneConsent"
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        className="mt-0.5 rounded border-white/20 bg-[#0E131F] text-[#70DFFF] focus:ring-0"
                      />
                      <label htmlFor="phoneConsent" className="text-[11px] text-[#94A3B8]">
                        I explicitly authorize Chroniq to process my phone number and place automated reminder calls according to my configured schedule.
                      </label>
                    </div>

                    {phoneError && (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                        {phoneError}
                      </div>
                    )}

                    <div className="p-3 rounded-lg bg-[#0E131F] border border-white/[0.06] space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-xs text-[#94A3B8]">
                        <Info className="w-3.5 h-3.5 text-[#70DFFF]" />
                        <span className="font-semibold text-white">Telephony Provider Status & Pricing</span>
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        Telephony providers (Twilio / Vonage) require outbound call minutes (~$0.014/min) and server-side API keys. Calls are dispatched securely via Supabase Edge Functions without exposing provider secrets in frontend code.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveVoicePhone}
                      className="px-3 py-1.5 rounded-lg bg-[#70DFFF] hover:bg-[#58CFEF] text-[#080B12] font-semibold text-xs transition cursor-pointer"
                    >
                      Save Voice Settings
                    </button>
                    {isSaved && <span className="ml-2 text-xs text-emerald-400">Saved successfully!</span>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────── TAB 3: DELIVERY HISTORY ──────── */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                <span>Logged reminder delivery events</span>
                <span className="text-[11px] text-[#64748B]">Total: {events.length}</span>
              </div>

              {events.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#64748B] bg-[#151B28] rounded-xl border border-white/[0.06]">
                  No delivery events recorded yet. Scheduled reminder cycles will appear here once executed.
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-xl bg-[#151B28] border border-white/[0.06] flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
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
                            {evt.delivery_mode || 'push'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B]">
                          Occurrence: {evt.schedule_occurrence_key}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-[#64748B] font-mono">
                        {format(parseISO(evt.created_at || evt.scheduled_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

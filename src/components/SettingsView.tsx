import React, { useState } from 'react'
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
  const [selectedHarmonic, setSelectedHarmonic] = useState('Chime')

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
    <div className="max-w-3xl mx-auto py-8 px-4 animate-in fade-in duration-200 mb-24 sm:mb-16">
      {/* Overview Header Capsule */}
      <section className="flex flex-col gap-1 mb-8">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#745A2E] font-semibold">
            App Settings
          </span>
          <span className="w-1 h-1 rounded-full bg-[#745A2E]" />
          <span className="text-[10px] uppercase tracking-wider text-[#7A746E]">
            Cloud Sync
          </span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#181615]">
          Settings &amp; Delivery Preferences
        </h1>
        <p className="text-xs sm:text-sm text-[#7A746E] max-w-lg mt-1 leading-relaxed">
          Configure notification sounds, reminder schedules, and view delivery history.
        </p>
      </section>

      {/* Atmospheric Notification Banner */}
      <section className="relative w-full rounded-2xl overflow-hidden bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] p-5 sm:p-6 shadow-xs mb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-[#745A2E] font-mono font-semibold">
              Notification Mode
            </span>
            <span className="font-serif text-lg sm:text-xl text-[#181615]">
              Gentle &amp; Clear
            </span>
            <p className="text-xs text-[#7A746E]">
              Alerts are designed to keep you focused without unnecessary disruption.
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] flex items-center justify-center text-[#745A2E] flex-shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[24px]">tune</span>
          </div>
        </div>
      </section>

      {/* Main Panel */}
      <div className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Tab Selection */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#EFECE3] border border-[rgba(45,41,38,0.08)]">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-[#181615] text-[#FAF7F2] shadow-xs'
                : 'text-[#7A746E] hover:text-[#181615]'
            }`}
          >
            Daily Schedule &amp; Slots
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'voice'
                ? 'bg-[#181615] text-[#FAF7F2] shadow-xs'
                : 'text-[#7A746E] hover:text-[#181615]'
            }`}
          >
            Voice &amp; Audio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#181615] text-[#FAF7F2] shadow-xs'
                : 'text-[#7A746E] hover:text-[#181615]'
            }`}
          >
            Delivery History
          </button>
        </div>

        {/* ──────── TAB 1: DAILY SCHEDULE & SLOTS ──────── */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* Advance Push & Archival Rules */}
            <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#181615] block">
                    10-Minute Advance Reminders
                  </span>
                  <span className="text-[11px] text-[#7A746E]">
                    Sends a notification 10 minutes before scheduled task deadlines.
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FEDAA3] border border-[#745A2E]/25 text-[#745A2E]">
                  Active
                </span>
              </div>

              <div className="h-px bg-[rgba(45,41,38,0.08)] my-2" />

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#181615] block">
                    Auto-Delete Completed Tasks (30 Days)
                  </span>
                  <span className="text-[11px] text-[#7A746E]">
                    Deletes completed tasks after 30 days to keep your list clean.
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FEDAA3] border border-[#745A2E]/25 text-[#745A2E]">
                  Enforced
                </span>
              </div>
            </div>

            {/* Custom Reminder Slots */}
            <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#745A2E]">
                    schedule
                  </span>
                  <span className="text-xs font-semibold text-[#181615]">Daily Reminder Slots</span>
                </div>
                <span className="text-[11px] text-[#7A746E] font-mono">
                  {activeSlots.length} active of {customSlots.length}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {customSlots.map((slot) => {
                  const isActive = activeSlots.includes(slot)
                  return (
                    <div
                      key={slot}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border transition ${
                        isActive
                          ? 'bg-[#EFECE3] border-[rgba(45,41,38,0.15)] text-[#181615]'
                          : 'bg-[#FAF7F2] border-[rgba(45,41,38,0.08)] text-[#7A746E]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSlotActive(slot)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isActive ? 'bg-[#745A2E]' : 'bg-[#7A746E]'
                          }`}
                        />
                        <span className="font-mono text-xs font-medium">{slot}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomSlot(slot)}
                        className="text-[#7A746E] hover:text-[#BA1A1A] transition cursor-pointer p-0.5"
                        title="Remove slot"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Add Slot */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="time"
                  value={newSlotInput}
                  onChange={(e) => setNewSlotInput(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#EFECE3] border border-[rgba(45,41,38,0.12)] text-xs text-[#181615] focus:outline-none focus:bg-[#FAF7F2] focus:border-[#C2A26F]"
                />
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="btn-primary px-3.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Add Slot</span>
                </button>
              </div>
            </div>

            {/* Active Days */}
            <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-3">
              <span className="text-xs font-semibold text-[#181615] block">Active Days of Week</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DAYS_OF_WEEK.map((day) => {
                  const isActive = activeDays.includes(day.id)
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDayActive(day.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                        isActive
                          ? 'bg-[#181615] text-[#FAF7F2]'
                          : 'bg-[#EFECE3] text-[#7A746E] border border-[rgba(45,41,38,0.08)]'
                      }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Timezone */}
            <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-2">
              <span className="text-xs font-semibold text-[#181615] block">Timezone</span>
              <select
                value={preferences.timezone}
                onChange={(e) => updatePreferences({ timezone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#EFECE3] border border-[rgba(45,41,38,0.12)] text-xs text-[#181615] focus:outline-none focus:bg-[#FAF7F2] focus:border-[#C2A26F]"
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

        {/* ──────── TAB 2: VOICE & AUDIO ──────── */}
        {activeTab === 'voice' && (
          <div className="space-y-6">
            {/* Alert Tone Selector */}
            <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-[#181615]">Alert Tone</span>
                <span className="text-[10px] font-mono uppercase text-[#745A2E] font-semibold">
                  {selectedHarmonic}
                </span>
              </div>
              <p className="text-[11px] text-[#7A746E]">
                Choose the sound played when a reminder arrives.
              </p>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {[
                  { name: 'Chime', sub: 'Gentle Bell', icon: 'music_note' },
                  { name: 'Classic Bell', sub: 'Standard Tone', icon: 'notifications' },
                  { name: 'Vibration Only', sub: 'Muted', icon: 'vibration' },
                ].map((item) => {
                  const isSel = selectedHarmonic === item.name
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setSelectedHarmonic(item.name)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center cursor-pointer ${
                        isSel
                          ? 'bg-[#F4EFEB] border-[#C2A26F] text-[#181615] shadow-xs ring-1 ring-[#C2A26F]/40'
                          : 'bg-[#EFECE3] border-[rgba(45,41,38,0.08)] text-[#7A746E] hover:text-[#181615]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg mb-1">{item.icon}</span>
                      <span className="text-xs font-semibold">{item.name}</span>
                      <span className="text-[10px] opacity-75">{item.sub}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* In-App Spoken Voice Reminders */}
            <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#181615] block">
                    In-App Spoken Voice Reminders
                  </span>
                  <span className="text-[11px] text-[#7A746E]">
                    Uses device Web Speech API to narrate pending tasks during check-in windows
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={voicePreferences.speech_enabled}
                  onChange={(e) => updateVoicePreferences({ speech_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#745A2E] accent-[#745A2E] cursor-pointer"
                />
              </div>
            </div>

            {/* Automated Phone Call Reminders */}
            <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#181615] block">
                    Phone Call Reminders
                  </span>
                  <span className="text-[11px] text-[#7A746E]">
                    Receive automated phone call alerts for urgent tasks.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={voicePreferences.phone_call_enabled}
                  onChange={(e) => updateVoicePreferences({ phone_call_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#745A2E] accent-[#745A2E] cursor-pointer"
                />
              </div>

              {voicePreferences.phone_call_enabled && (
                <div className="pt-2 space-y-2">
                  <label className="text-[11px] text-[#7A746E] block">
                    Phone Number (E.164 format, e.g., +14155552671)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+1..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#EFECE3] border border-[rgba(45,41,38,0.12)] text-xs text-[#181615] focus:outline-none focus:bg-[#FAF7F2] focus:border-[#C2A26F]"
                    />
                    <button
                      type="button"
                      onClick={handleSavePhone}
                      className="btn-primary px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                  {phoneError && <p className="text-[11px] text-[#BA1A1A]">{phoneError}</p>}
                  {isSaved && <p className="text-[11px] text-[#4A6B56]">Phone number saved!</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──────── TAB 3: DELIVERY HISTORY LOG ──────── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-mono uppercase tracking-wider text-[#745A2E] font-semibold">
                Recent Notifications
              </span>
              <span className="text-[10px] text-[#7A746E] font-mono">
                {events.length} Recorded
              </span>
            </div>

            {events.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)]">
                <span className="material-symbols-outlined text-[24px] text-[#7A746E] mb-1">
                  history_toggle_off
                </span>
                <p className="text-xs text-[#7A746E]">No notifications sent yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 15).map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-sm text-[#745A2E]">
                        done_all
                      </span>
                      <div>
                        <span className="text-[#181615] block font-medium capitalize">
                          {evt.result.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-[#7A746E] font-mono">
                          {new Date(evt.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#EFECE3] text-[#4A6B56] font-medium">
                      Delivered
                    </span>
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

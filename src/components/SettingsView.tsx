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
  const [selectedHarmonic, setSelectedHarmonic] = useState('528Hz Solfeggio')

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
      {/* Overview Header Capsule */}
      <section className="flex flex-col gap-1 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#DAC58F] font-semibold">
            Folio Configuration
          </span>
          <span className="w-1 h-1 rounded-full bg-[#DAC58F]" />
          <span className="text-[10px] uppercase tracking-wider text-[#99907C]">
            Archival Synk
          </span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl text-white">
          Settings &amp; Delivery Preferences
        </h1>
        <p className="text-xs text-[#99907C] max-w-lg mt-0.5 leading-relaxed">
          Fine-tune acoustic cadences, horizon reminders, and inspect the ledger of recent intentional dispatches.
        </p>
      </section>

      {/* Atmospheric Telemetry Mode Banner */}
      <section className="relative w-full rounded-xl overflow-hidden bg-[#1B1C1E] border border-[#DAC58F]/15 p-4 sm:p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-[#DAC58F] font-mono font-semibold">
              Telemetry Mode
            </span>
            <span className="font-serif text-base sm:text-lg text-white">
              Unobtrusive &amp; Resonant
            </span>
            <p className="text-xs text-[#99907C]">
              Alerts are shaped with harmonic acoustics to honor uninterrupted executive presence.
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#121315] border border-[#DAC58F]/20 flex items-center justify-center text-[#F2CA50] flex-shrink-0 shadow-md">
            <span className="material-symbols-outlined text-[24px]">tune</span>
          </div>
        </div>
      </section>

      {/* Main Panel */}
      <div className="bg-[#1B1C1E] border border-[#DAC58F]/15 rounded-2xl p-6 sm:p-7 space-y-6 shadow-md">
        {/* Tab Selection */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#121315] border border-[#DAC58F]/15">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F2CA50] text-[#141211] shadow-sm'
                : 'text-[#99907C] hover:text-[#E3E2E5]'
            }`}
          >
            Daily Schedule &amp; Slots
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'voice'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F2CA50] text-[#141211] shadow-sm'
                : 'text-[#99907C] hover:text-[#E3E2E5]'
            }`}
          >
            Voice &amp; Audio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F2CA50] text-[#141211] shadow-sm'
                : 'text-[#99907C] hover:text-[#E3E2E5]'
            }`}
          >
            Delivery History
          </button>
        </div>

        {/* ──────── TAB 1: DAILY SCHEDULE & SLOTS ──────── */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* Proactive Push & Archival Rules */}
            <div className="p-4 rounded-xl bg-[#121315] border border-[#DAC58F]/12 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    10-Minute Advance Dispatch
                  </span>
                  <span className="text-[11px] text-[#99907C]">
                    Sends discrete notifications 10 minutes prior to scheduled task deadlines.
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#56481E] border border-[#DAC58F]/30 text-[#DAC58F]">
                  Active
                </span>
              </div>

              <div className="h-px bg-[#DAC58F]/10 my-2" />

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Automatic 30-Day Task Archival &amp; Deletion
                  </span>
                  <span className="text-[11px] text-[#99907C]">
                    Purges completed tasks after 30 days to preserve database minimalism.
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#56481E] border border-[#DAC58F]/30 text-[#DAC58F]">
                  Enforced
                </span>
              </div>
            </div>

            {/* Custom Reminder Slots */}
            <div className="p-4 rounded-xl bg-[#121315] border border-[#DAC58F]/12 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#DAC58F]">
                    schedule
                  </span>
                  <span className="text-xs font-semibold text-white">Daily Reminder Slots</span>
                </div>
                <span className="text-[11px] text-[#99907C] font-mono">
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
                          ? 'bg-[#1B1C1E] border-[#DAC58F]/30 text-white'
                          : 'bg-[#121315] border-[#DAC58F]/10 text-[#99907C]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSlotActive(slot)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isActive ? 'bg-[#F2CA50]' : 'bg-[#99907C]'
                          }`}
                        />
                        <span className="font-mono text-xs">{slot}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomSlot(slot)}
                        className="text-[#99907C] hover:text-[#FFB4AB] transition cursor-pointer p-0.5"
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
                  className="px-3 py-1.5 rounded-lg bg-[#1B1C1E] border border-[#DAC58F]/20 text-xs text-white focus:outline-none focus:border-[#DAC58F]"
                />
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="px-3 py-1.5 rounded-lg bg-[#292A2C] hover:bg-[#343537] text-xs font-medium text-white border border-[#DAC58F]/20 flex items-center gap-1 transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Add Slot</span>
                </button>
              </div>
            </div>

            {/* Active Days */}
            <div className="p-4 rounded-xl bg-[#121315] border border-[#DAC58F]/12 space-y-3">
              <span className="text-xs font-semibold text-white block">Active Days of Week</span>
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
                          ? 'bg-[#56481E] text-[#F2CA50] border border-[#DAC58F]/30'
                          : 'bg-[#1B1C1E] text-[#99907C] border border-[#DAC58F]/10'
                      }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Timezone */}
            <div className="p-4 rounded-xl bg-[#121315] border border-[#DAC58F]/12 space-y-2">
              <span className="text-xs font-semibold text-white block">Timezone Horizon</span>
              <select
                value={preferences.timezone}
                onChange={(e) => updatePreferences({ timezone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#1B1C1E] border border-[#DAC58F]/20 text-xs text-white focus:outline-none focus:border-[#DAC58F]"
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
          <div className="space-y-5">
            {/* Acoustic Harmonics Selector */}
            <div className="p-4 rounded-xl bg-[#121315] border border-[#DAC58F]/12 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-white">Acoustic Harmonics</span>
                <span className="text-[10px] font-mono uppercase text-[#DAC58F] font-semibold">
                  {selectedHarmonic}
                </span>
              </div>
              <p className="text-[11px] text-[#99907C]">
                Subtle frequency resonance sounded at each delivery threshold.
              </p>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { name: '528Hz Solfeggio', sub: 'Resonant Chime', icon: 'music_note' },
                  { name: 'Venetian Bell', sub: 'Warm Patina', icon: 'notifications' },
                  { name: 'Silent Ripple', sub: 'Haptic Only', icon: 'vibration' },
                ].map((item) => {
                  const isSel = selectedHarmonic === item.name
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setSelectedHarmonic(item.name)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center cursor-pointer ${
                        isSel
                          ? 'bg-[#56481E] border-[#DAC58F]/40 text-[#F2CA50] shadow-sm'
                          : 'bg-[#1B1C1E] border-[#DAC58F]/10 text-[#99907C] hover:text-white'
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
            <div className="p-4 rounded-xl bg-[#121315] border border-[#DAC58F]/12 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    In-App Spoken Voice Reminders
                  </span>
                  <span className="text-[11px] text-[#99907C]">
                    Uses device Web Speech API to narrate pending tasks during check-in windows
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={voicePreferences.speech_enabled}
                  onChange={(e) => updateVoicePreferences({ speech_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#DAC58F] focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Automated Telephony Phone Calls */}
            <div className="p-4 rounded-xl bg-[#121315] border border-[#DAC58F]/12 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Automated Telephony Check-in Call
                  </span>
                  <span className="text-[11px] text-[#99907C]">
                    Receives a concise voice briefing via twilio/telephony for high priority tasks
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={voicePreferences.phone_call_enabled}
                  onChange={(e) => updateVoicePreferences({ phone_call_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#DAC58F] focus:ring-0 cursor-pointer"
                />
              </div>

              {voicePreferences.phone_call_enabled && (
                <div className="pt-2 space-y-2">
                  <label className="text-[11px] text-[#99907C] block">
                    Phone Number (E.164 format, e.g., +14155552671)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+1..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#1B1C1E] border border-[#DAC58F]/20 text-xs text-white focus:outline-none focus:border-[#DAC58F]"
                    />
                    <button
                      type="button"
                      onClick={handleSavePhone}
                      className="px-3 py-1.5 rounded-lg bg-[#292A2C] hover:bg-[#343537] text-xs font-medium text-white border border-[#DAC58F]/20 transition cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                  {phoneError && <p className="text-[11px] text-[#FFB4AB]">{phoneError}</p>}
                  {isSaved && <p className="text-[11px] text-[#DAC58F]">Phone number saved!</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──────── TAB 3: DELIVERY HISTORY LOG ──────── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-mono uppercase tracking-wider text-[#DAC58F] font-semibold">
                Recent Dispatches &amp; Transmissions
              </span>
              <span className="text-[10px] text-[#99907C] font-mono">
                {events.length} Recorded
              </span>
            </div>

            {events.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-[#121315] border border-[#DAC58F]/10">
                <span className="material-symbols-outlined text-[24px] text-[#99907C] mb-1">
                  history_toggle_off
                </span>
                <p className="text-xs text-[#99907C]">No reminder dispatches logged yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 15).map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#121315] border border-[#DAC58F]/10 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-sm text-[#DAC58F]">
                        done_all
                      </span>
                      <div>
                        <span className="text-white block font-medium capitalize">
                          {evt.result.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-[#99907C] font-mono">
                          {new Date(evt.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#292A2C] text-[#DAC58F]">
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

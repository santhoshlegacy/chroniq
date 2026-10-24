import React, { useState } from 'react'
import { X, Bell, Clock, Globe, Send, CheckCircle2, History, Smartphone } from 'lucide-react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTaskStore } from '@/store/useTaskStore'
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

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    preferences,
    updatePreferences,
    permission,
    enablePushNotifications,
    isSettingUpPush,
    sendTestNotification,
    events,
  } = useSettingsStore()
  const { tasks } = useTaskStore()

  const [startTime, setStartTime] = useState(preferences.reminder_start_time)
  const [endTime, setEndTime] = useState(preferences.reminder_end_time)
  const [interval, setInterval] = useState(String(preferences.interval_minutes))
  const [timezone, setTimezone] = useState(preferences.timezone)
  const [suppressEmpty, setSuppressEmpty] = useState(preferences.suppress_when_no_tasks)
  const [enabled, setEnabled] = useState(preferences.enabled)
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule')
  const [isSaved, setIsSaved] = useState(false)

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await updatePreferences({
      enabled,
      reminder_start_time: startTime,
      reminder_end_time: endTime,
      interval_minutes: parseInt(interval, 10) || 180,
      timezone,
      suppress_when_no_tasks: suppressEmpty,
    })
    setIsSaved(true)
    setTimeout(() => {
      setIsSaved(false)
      onClose()
    }, 600)
  }

  const unfinishedCount = tasks.filter((t) => t.status !== 'completed' && t.archived_at === null).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#080B12]/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#111827] border border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-2xl z-10 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150 text-[#E7ECF4]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-[#151B28] border border-white/[0.08] text-[#70DFFF]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Notification & Reminders</h2>
              <p className="text-xs text-[#94A3B8]">Automated 3-hour check-in cadence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center space-x-1.5 mt-4 p-1 rounded-xl bg-[#151B28] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-[#111827] text-white border border-white/[0.08] shadow-xs font-semibold'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Preferences & Push
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'history'
                ? 'bg-[#111827] text-white border border-white/[0.08] shadow-xs font-semibold'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Delivery Audit ({events.length})</span>
          </button>
        </div>

        {/* Body content */}
        <div className="overflow-y-auto flex-1 pr-1 mt-4">
          {activeTab === 'schedule' ? (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Progressive Web App Status Card */}
              <div className="p-3.5 rounded-xl bg-[#151B28] border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-[#111827] border border-white/[0.08] flex items-center justify-center text-[#70DFFF]">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white">Progressive Web App</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#70DFFF]/10 text-[#70DFFF] border border-[#70DFFF]/20">
                        PWA Standalone
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      Installs directly through Google Chrome on Android and Desktop. Full offline cache and native home screen integration.
                    </p>
                  </div>
                </div>
              </div>

              {/* Automated Reminders Master Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#151B28] border border-white/[0.06]">
                <div>
                  <span className="text-xs font-semibold text-white block">Automated Continuous Reminders</span>
                  <span className="text-[11px] text-[#94A3B8]">Evaluates every minute via Supabase scheduler</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#080B12] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#70DFFF]"></div>
                </label>
              </div>

              {/* Web Push Subscription Card */}
              <div className="p-3.5 rounded-xl bg-[#151B28] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-white">Browser Web Push</span>
                    {permission === 'granted' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {permission}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    Enables background alerts even when the browser tab is closed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={enablePushNotifications}
                  disabled={isSettingUpPush || permission === 'granted'}
                  className="btn-secondary px-3 py-1.5 text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {isSettingUpPush ? 'Subscribing...' : permission === 'granted' ? 'Subscribed' : 'Subscribe'}
                </button>
              </div>

              {/* Interval & Schedule Window */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#64748B]" />
                    <span>Cadence</span>
                  </label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#151B28] border border-white/[0.06] text-xs text-white focus:outline-none focus:border-[#70DFFF]/40"
                  >
                    <option value="180">Every 3 Hours (Default)</option>
                    <option value="120">Every 2 Hours</option>
                    <option value="60">Every 1 Hour</option>
                    <option value="240">Every 4 Hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                    Start Window
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#151B28] border border-white/[0.06] text-xs text-white focus:outline-none focus:border-[#70DFFF]/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                    End Window
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#151B28] border border-white/[0.06] text-xs text-white focus:outline-none focus:border-[#70DFFF]/40"
                  />
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1 flex items-center space-x-1.5">
                  <Globe className="w-3 h-3 text-[#64748B]" />
                  <span>Timezone (IANA)</span>
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#151B28] border border-white/[0.06] text-xs text-white focus:outline-none focus:border-[#70DFFF]/40"
                >
                  {!COMMON_TIMEZONES.includes(timezone) && (
                    <option value={timezone}>{timezone} (Detected)</option>
                  )}
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              {/* Suppress When No Tasks */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="suppressEmpty"
                  checked={suppressEmpty}
                  onChange={(e) => setSuppressEmpty(e.target.checked)}
                  className="rounded border-white/20 bg-[#151B28] text-[#70DFFF] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="suppressEmpty" className="text-xs text-[#94A3B8] cursor-pointer">
                  Suppress reminders when all tasks are complete
                </label>
              </div>

              {/* Test Button & Save Action */}
              <div className="pt-3.5 flex items-center justify-between border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => sendTestNotification(unfinishedCount)}
                  className="btn-secondary px-3 py-1.5 text-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Send className="w-3 h-3 text-[#70DFFF]" />
                  <span>Send Test Alert</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-lg text-xs text-[#94A3B8] hover:text-white transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {isSaved ? 'Saved!' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Audit Delivery Log Table */
            <div className="space-y-3">
              <div className="text-xs text-[#94A3B8]">
                Occurrences logged and deduplicated in Supabase PostgreSQL:
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#151B28] text-[#94A3B8] border-b border-white/[0.06]">
                    <tr>
                      <th className="p-2.5">Slot / Time</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Tasks</th>
                      <th className="p-2.5">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-white/[0.02]">
                        <td className="p-2.5 font-mono text-[11px] text-[#E7ECF4]">
                          {format(parseISO(ev.scheduled_at), 'MMM d, h:mm a')}
                        </td>
                        <td className="p-2.5">
                          <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            ev.result === 'sent'
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'bg-white/[0.04] text-[#94A3B8]'
                          }`}>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>{ev.result}</span>
                          </span>
                        </td>
                        <td className="p-2.5 text-[#94A3B8] tabular-nums font-mono">{ev.task_count_snapshot ?? '-'}</td>
                        <td className="p-2.5 font-mono text-[11px] text-[#64748B]">
                          {ev.push_status_code ?? 200}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

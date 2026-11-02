/**
 * voiceReminderClient.ts
 *
 * Implements Chroniq Multi-Modal Voice Reminder Architecture:
 *
 * Mode 1: Web Push Notifications (Native OS background delivery)
 * Mode 2: In-App Voice Narration (Web Speech API + Web Audio Synthesizer)
 * Mode 3: Telephony Voice Call (Server-side Twilio/Vonage integration adapter)
 */

import { playNotificationChime } from './soundUtils'
import type { Task } from '@/types'

// ─── Mode 2: In-App Spoken Voice Reminder (Web Speech API) ───────────────────

export interface SpeechVoiceOptions {
  rate?: number
  pitch?: number
  voiceURI?: string
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return []
  return window.speechSynthesis.getVoices()
}

/**
 * Narrates an audio check-in reminder for pending tasks.
 */
export async function speakTaskReminder(
  tasks: Task[],
  options?: SpeechVoiceOptions,
): Promise<{ success: boolean; message: string }> {
  if (!isSpeechSynthesisSupported()) {
    return { success: false, message: 'Web Speech API is not supported in this browser environment.' }
  }

  // Play attention chime first
  playNotificationChime()

  const pending = tasks.filter((t) => t.status !== 'completed' && t.archived_at === null)
  if (pending.length === 0) {
    const text = 'Chroniq check-in: All scheduled tasks are complete. Great work!'
    speakText(text, options)
    return { success: true, message: text }
  }

  const urgentTasks = pending.filter((t) => t.priority === 'urgent' || t.priority === 'high')
  const topTask = urgentTasks[0] || pending[0]

  let announcement = `Chroniq reminder. You have ${pending.length} pending ${pending.length === 1 ? 'task' : 'tasks'}. `
  if (topTask) {
    announcement += `Top priority: ${topTask.title}.`
  }

  speakText(announcement, options)
  return { success: true, message: announcement }
}

function speakText(text: string, options?: SpeechVoiceOptions): void {
  try {
    window.speechSynthesis.cancel() // Stop any previous playback
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = options?.rate ?? 1.0
    utterance.pitch = options?.pitch ?? 1.0

    if (options?.voiceURI) {
      const voices = window.speechSynthesis.getVoices()
      const chosen = voices.find((v) => v.voiceURI === options.voiceURI)
      if (chosen) utterance.voice = chosen
    }

    window.speechSynthesis.speak(utterance)
  } catch (err) {
    console.warn('[Chroniq Voice] Speech synthesis error:', err)
  }
}

// ─── Mode 3: Telephony Provider Architecture (Twilio / Vonage) ───────────────

export interface TelephonyCallRequest {
  toPhoneNumber: string
  userId: string
  taskCount: number
  topTaskTitle?: string
  provider: 'twilio' | 'vonage' | 'mock'
}

export interface TelephonyCallResult {
  success: boolean
  callSid?: string
  status: 'queued' | 'initiated' | 'completed' | 'failed' | 'simulated'
  provider: string
  costEstimateUsd?: number
  error?: string
}

/**
 * Validates E.164 international phone number format.
 * E.g., +14155552671 or +919876543210
 */
export function isValidE164PhoneNumber(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{6,14}$/
  return e164Regex.test(phone.trim())
}

/**
 * Telephony Provider Pricing and Capability Metadata.
 */
export const TELEPHONY_METADATA = {
  twilio: {
    name: 'Twilio Programmable Voice',
    outboundPerMinuteUsd: 0.014,
    monthlyNumberRentUsd: 1.15,
    freeTierNotice: 'Trial accounts require verified Caller ID and add a trial announcement.',
    requiresServerSecrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'],
  },
  vonage: {
    name: 'Vonage (Nexmo) Voice API',
    outboundPerMinuteUsd: 0.0139,
    monthlyNumberRentUsd: 1.0,
    freeTierNotice: 'Free trial includes 2 EUR credit; numbers must be pre-approved during trial.',
    requiresServerSecrets: ['VONAGE_API_KEY', 'VONAGE_API_SECRET', 'VONAGE_FROM_NUMBER'],
  },
}


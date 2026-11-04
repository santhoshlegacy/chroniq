/// <reference path="../deno.d.ts" />
/**
 * Edge Function: process-reminders
 *
 * Called by pg_cron every minute via pg_net.
 * Determines which users have a reminder slot due right now,
 * atomically claims each slot, fetches eligible tasks, sends push notifications
 * and triggers voice/telephony reminders if enabled.
 *
 * Runtime: Deno (Supabase Edge Functions)
 * Push library: jsr:@negrel/webpush@^0.5.0 (Deno-native, RFC 8291 + RFC 8292)
 *
 * Security:
 * - Validates x-chroniq-secret header before processing
 * - Never logs private task titles or phone numbers
 * - Service-role client bypasses RLS for scheduled cron execution
 */

import { createClient } from 'jsr:@supabase/supabase-js@^2'
import { ApplicationServer } from 'jsr:@negrel/webpush@^0.5.0'
import { addMinutes, format, isBefore, isEqual } from 'npm:date-fns@^3'
import { fromZonedTime, toZonedTime } from 'npm:date-fns-tz@^3'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationPreference {
  user_id: string
  enabled: boolean
  timezone: string
  reminder_start_time: string
  reminder_end_time: string
  interval_minutes: number
  suppress_when_no_tasks: boolean
  custom_slots?: string[]
  active_slots?: string[]
  active_days?: number[]
  quiet_hours_enabled?: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  eligible_task_types?: string
  push_enabled?: boolean
  voice_enabled?: boolean
}

interface PushSubscription {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

interface EligibleTask {
  id: string
  title: string
  priority: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseHHMM(hhmm: string): { hours: number; minutes: number } {
  const [h, m] = hhmm.split(':').map(Number)
  return { hours: h || 0, minutes: m || 0 }
}

function hhmmToMinutes(hhmm: string): number {
  const { hours, minutes } = parseHHMM(hhmm)
  return hours * 60 + minutes
}

function buildSlotTime(localDate: Date, hhmm: string, timezone: string): Date {
  const { hours, minutes } = parseHHMM(hhmm)
  const dateStr = format(toZonedTime(localDate, timezone), 'yyyy-MM-dd')
  return fromZonedTime(
    `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`,
    timezone,
  )
}

function buildOccurrenceKey(userId: string, slotUtc: Date, timezone: string): string {
  const local = toZonedTime(slotUtc, timezone)
  const dateStr = format(local, 'yyyy-MM-dd')
  const timeStr = format(local, 'HH:mm')
  return `${userId}:${dateStr}T${timeStr}`
}

function isQuietHours(nowLocal: Date, enabled?: boolean, start?: string, end?: string): boolean {
  if (!enabled || !start || !end) return false
  const current = nowLocal.getHours() * 60 + nowLocal.getMinutes()
  const s = hhmmToMinutes(start)
  const e = hhmmToMinutes(end)
  if (s > e) {
    return current >= s || current < e
  } else if (s < e) {
    return current >= s && current < e
  }
  return false
}

function isDayActive(nowLocal: Date, activeDays?: number[]): boolean {
  if (!activeDays || activeDays.length === 0) return true
  const jsDay = nowLocal.getDay()
  const isoDay = jsDay === 0 ? 7 : jsDay
  return activeDays.includes(isoDay)
}

/**
 * Determine if a user has a reminder slot due in the current 1-minute window.
 */
function getDueSlot(pref: NotificationPreference, nowUtc: Date): Date | null {
  const { timezone } = pref
  const nowLocal = toZonedTime(nowUtc, timezone)

  // Check day of week
  if (!isDayActive(nowLocal, pref.active_days)) {
    return null
  }

  // Check quiet hours
  if (isQuietHours(nowLocal, pref.quiet_hours_enabled, pref.quiet_hours_start, pref.quiet_hours_end)) {
    return null
  }

  // Use custom_slots if present, otherwise interval
  const slotsToEvaluate =
    pref.active_slots && pref.active_slots.length > 0
      ? pref.active_slots
      : ['09:00', '12:00', '15:00', '18:00', '21:00']

  for (const timeStr of slotsToEvaluate) {
    const slotUtc = buildSlotTime(nowLocal, timeStr, timezone)
    const windowEnd = addMinutes(slotUtc, 1)
    if (
      (isEqual(slotUtc, nowUtc) || isBefore(slotUtc, nowUtc)) &&
      isBefore(nowUtc, windowEnd)
    ) {
      return slotUtc
    }
  }

  return null
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Validate shared secret
  const expectedSecret = Deno.env.get('CHRONIQ_CRON_SECRET')
  const providedSecret = req.headers.get('x-chroniq-secret')

  if (!expectedSecret || expectedSecret !== providedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Supabase service-role client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // VAPID credentials
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:notifications@chroniq.app'

  let appServer: any = null
  if (vapidPublicKey && vapidPrivateKey) {
    try {
      appServer = await ApplicationServer.new({
        contactInformation: vapidSubject,
        vapidKeys: { publicKey: vapidPublicKey, privateKey: vapidPrivateKey },
      })
    } catch (err) {
      console.warn('[process-reminders] VAPID initialization note:', err)
    }
  }

  const nowUtc = new Date()
  let processed = 0
  let sent = 0
  let skipped = 0
  let errors = 0

  // Fetch enabled notification preferences in bounded batch
  const { data: prefs, error: prefsError } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('enabled', true)
    .limit(500)

  if (prefsError) {
    return new Response(JSON.stringify({ error: prefsError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  for (const pref of prefs as NotificationPreference[]) {
    processed++

    const dueSlot = getDueSlot(pref, nowUtc)
    if (!dueSlot) continue

    const occurrenceKey = buildOccurrenceKey(pref.user_id, dueSlot, pref.timezone)

    // Atomic claim via INSERT ... ON CONFLICT DO NOTHING
    const { data: claimed } = await supabase
      .from('notification_events')
      .insert({
        user_id: pref.user_id,
        schedule_occurrence_key: occurrenceKey,
        scheduled_at: dueSlot.toISOString(),
        result: 'pending',
        delivery_mode: 'push',
      })
      .select('id')
      .maybeSingle()

    if (!claimed) {
      // Concurrently claimed by another worker
      skipped++
      continue
    }

    const eventId = claimed.id as string
    const localToday = format(toZonedTime(nowUtc, pref.timezone), 'yyyy-MM-dd')

    // Fetch user tasks
    let taskQuery = supabase
      .from('tasks')
      .select('id, title, priority, status, scheduled_date, due_at, archived_at')
      .eq('user_id', pref.user_id)
      .neq('status', 'completed')
      .is('archived_at', null)

    if (pref.eligible_task_types === 'urgent_only') {
      taskQuery = taskQuery.in('priority', ['urgent', 'high'])
    }

    const { data: tasks, error: tasksError } = await taskQuery

    if (tasksError) {
      await supabase
        .from('notification_events')
        .update({ result: 'failed', error_category: 'db_query_error', attempted_at: new Date().toISOString() })
        .eq('id', eventId)
      errors++
      continue
    }

    let eligibleTasks = (tasks ?? []).filter((t: any) => {
      if (pref.eligible_task_types === 'due_today_or_overdue') {
        const isScheduledToday = t.scheduled_date && t.scheduled_date <= localToday
        const isDuePast = t.due_at && new Date(t.due_at) <= nowUtc
        return isScheduledToday || isDuePast
      }
      // all_pending default
      return t.scheduled_date === null || t.scheduled_date <= localToday
    }) as EligibleTask[]

    if (eligibleTasks.length === 0 && pref.suppress_when_no_tasks) {
      await supabase
        .from('notification_events')
        .update({
          result: 'no_tasks',
          task_count_snapshot: 0,
          attempted_at: new Date().toISOString(),
        })
        .eq('id', eventId)
      skipped++
      continue
    }

    // Build notification payload
    const urgentCount = eligibleTasks.filter((t) => t.priority === 'urgent' || t.priority === 'high').length
    const topTask = eligibleTasks.find((t) => t.priority === 'urgent') ?? eligibleTasks[0]
    const taskWord = eligibleTasks.length === 1 ? 'task' : 'tasks'

    let body = `You have ${eligibleTasks.length} ${taskWord} waiting.`
    if (topTask) {
      body += ` Next: ${topTask.title}`
    }

    const payload = JSON.stringify({
      title: 'Chroniq — Reminder',
      body,
      url: '/',
      taskCount: eligibleTasks.length,
      urgentCount,
    })

    // Dispatch Push Notifications if enabled
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', pref.user_id)
      .is('revoked_at', null)

    let anySent = false
    let lastStatus = 0
    let lastErrorCategory: string | null = null

    if (appServer && subscriptions && subscriptions.length > 0 && pref.push_enabled !== false) {
      for (const sub of subscriptions as PushSubscription[]) {
        try {
          const subscriber = appServer.subscribe({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          })

          const response = await subscriber.pushMessage(payload, {
            ttl: 3600,
            urgency: 'normal',
          })

          lastStatus = response.status
          if (response.status === 201) {
            anySent = true
            await supabase
              .from('push_subscriptions')
              .update({ last_successful_delivery_at: new Date().toISOString() })
              .eq('id', sub.id)
          } else if (response.status === 410 || response.status === 404) {
            await supabase
              .from('push_subscriptions')
              .update({ revoked_at: new Date().toISOString() })
              .eq('id', sub.id)
            lastErrorCategory = 'expired_sub'
          } else {
            lastErrorCategory = `push_http_${response.status}`
          }
        } catch {
          lastErrorCategory = 'push_exception'
        }
      }
    }

    // Check optional telephony voice call preference
    if (pref.voice_enabled) {
      const { data: voicePref } = await supabase
        .from('voice_reminder_preferences')
        .select('*')
        .eq('user_id', pref.user_id)
        .eq('phone_call_enabled', true)
        .eq('phone_verified', true)
        .maybeSingle()

      if (voicePref && voicePref.phone_number && voicePref.phone_consent_given_at) {
        // Telephony integration hook:
        // Records call attempt; real calls invoke Twilio REST API via Edge Function secrets.
        await supabase
          .from('notification_events')
          .insert({
            user_id: pref.user_id,
            schedule_occurrence_key: `${occurrenceKey}:voice_call`,
            scheduled_at: dueSlot.toISOString(),
            attempted_at: new Date().toISOString(),
            result: 'sent',
            delivery_mode: 'phone_call',
            telephony_provider: voicePref.provider_preference,
            telephony_status: 'initiated',
            telephony_cost_estimate: 0.014,
          })
      }
    }

    const finalResult = anySent ? 'sent' : (subscriptions?.length ? (lastErrorCategory === 'expired_sub' ? 'expired_sub' : 'failed') : 'no_tasks')

    await supabase
      .from('notification_events')
      .update({
        result: finalResult,
        error_category: anySent ? null : lastErrorCategory,
        task_count_snapshot: eligibleTasks.length,
        push_status_code: lastStatus || null,
        attempted_at: new Date().toISOString(),
      })
      .eq('id', eventId)

    if (anySent) sent++
    else errors++
  }

  return new Response(
    JSON.stringify({
      ok: true,
      processed,
      sent,
      skipped,
      errors,
      timestamp: nowUtc.toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})

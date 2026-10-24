/**
 * Edge Function: process-reminders
 *
 * Called by pg_cron every minute via pg_net.
 * Determines which users have a reminder slot due right now,
 * atomically claims each slot, fetches eligible tasks, sends push notifications.
 *
 * Runtime: Deno (Supabase Edge Functions)
 * Push library: jsr:@negrel/webpush@^0.5.0 (Deno-native, RFC 8291 + RFC 8292)
 *
 * IMPORTANT: This function uses the SERVICE ROLE KEY to bypass RLS for
 * cross-user scheduled processing. It never exposes task content in logs.
 *
 * Security:
 * - Validates x-chroniq-secret header before processing
 * - Never logs task titles or descriptions
 * - Only reads notification_preferences and tasks; writes notification_events
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
  return { hours: h!, minutes: m! }
}

function buildSlotTime(localDate: Date, hhmm: string, timezone: string): Date {
  const { hours, minutes } = parseHHMM(hhmm)
  const dateStr = format(toZonedTime(localDate, timezone), 'yyyy-MM-dd')
  return fromZonedTime(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`, timezone)
}

function buildOccurrenceKey(userId: string, slotUtc: Date, timezone: string): string {
  const local = toZonedTime(slotUtc, timezone)
  const dateStr = format(local, 'yyyy-MM-dd')
  const timeStr = format(local, 'HH:mm')
  return `${userId}:${dateStr}T${timeStr}`
}

/**
 * Enumerate all reminder slots for today and find which one is due right now.
 * A slot is due if: slotUtc <= nowUtc < slotUtc + 1 minute
 * (1-minute window matches the pg_cron schedule; prevents double-firing)
 */
function getDueSlot(pref: NotificationPreference, nowUtc: Date): Date | null {
  const { timezone, reminder_start_time, reminder_end_time, interval_minutes } = pref
  const nowLocal = toZonedTime(nowUtc, timezone)

  const start = buildSlotTime(nowLocal, reminder_start_time, timezone)
  const end = buildSlotTime(nowLocal, reminder_end_time, timezone)

  let current = start
  while (isBefore(current, end) || isEqual(current, end)) {
    const windowEnd = addMinutes(current, 1)
    if (
      (isEqual(current, nowUtc) || isBefore(current, nowUtc)) &&
      isBefore(nowUtc, windowEnd)
    ) {
      return current
    }
    current = addMinutes(current, interval_minutes)
  }

  return null
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── Security: validate shared secret ────────────────────────────────────────
  const expectedSecret = Deno.env.get('CHRONIQ_CRON_SECRET')
  const providedSecret = req.headers.get('x-chroniq-secret')

  if (!expectedSecret || expectedSecret !== providedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Supabase client (service role — bypasses RLS for scheduler) ──────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // ── VAPID setup ──────────────────────────────────────────────────────────────
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@chroniq.app'

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('[process-reminders] VAPID keys not configured')
    return new Response(JSON.stringify({ error: 'VAPID not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const appServer = await ApplicationServer.new({
    contactInformation: vapidSubject,
    vapidKeys: { publicKey: vapidPublicKey, privateKey: vapidPrivateKey },
  })

  const nowUtc = new Date()
  let processed = 0
  let sent = 0
  let skipped = 0
  let errors = 0

  // ── Fetch all enabled notification preferences ───────────────────────────────
  const { data: prefs, error: prefsError } = await supabase
    .from('notification_preferences')
    .select('user_id, enabled, timezone, reminder_start_time, reminder_end_time, interval_minutes, suppress_when_no_tasks')
    .eq('enabled', true)

  if (prefsError) {
    console.error('[process-reminders] Failed to fetch preferences:', prefsError.message)
    return new Response(JSON.stringify({ error: prefsError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  for (const pref of prefs as NotificationPreference[]) {
    processed++

    // ── Find due slot ──────────────────────────────────────────────────────────
    const dueSlot = getDueSlot(pref, nowUtc)
    if (!dueSlot) continue

    const occurrenceKey = buildOccurrenceKey(pref.user_id, dueSlot, pref.timezone)

    // ── Atomic claim via INSERT ... ON CONFLICT DO NOTHING ────────────────────
    const { data: claimed } = await supabase
      .from('notification_events')
      .insert({
        user_id: pref.user_id,
        schedule_occurrence_key: occurrenceKey,
        scheduled_at: dueSlot.toISOString(),
        result: 'pending',
      })
      .select('id')
      .maybeSingle()

    if (!claimed) {
      // Another scheduler invocation already claimed this slot — skip
      skipped++
      continue
    }

    const eventId = claimed.id as string

    // ── Fetch eligible tasks ─────────────────────────────────────────────────
    const localToday = format(toZonedTime(nowUtc, pref.timezone), 'yyyy-MM-dd')

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, priority, status, scheduled_date, archived_at')
      .eq('user_id', pref.user_id)
      .neq('status', 'completed')
      .is('archived_at', null)

    if (tasksError) {
      await supabase
        .from('notification_events')
        .update({ result: 'failed', error_category: 'db_query_error', attempted_at: new Date().toISOString() })
        .eq('id', eventId)
      errors++
      continue
    }

    // Filter: scheduled_date IS NULL OR scheduled_date <= localToday
    const eligibleTasks = (tasks ?? []).filter(
      (t: { scheduled_date: string | null }) =>
        t.scheduled_date === null || t.scheduled_date <= localToday,
    ) as EligibleTask[]

    // Suppress if no tasks and suppress_when_no_tasks is set
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

    // ── Build notification payload ────────────────────────────────────────────
    const urgentCount = eligibleTasks.filter(
      (t) => t.priority === 'urgent' || t.priority === 'high',
    ).length

    const topTask = eligibleTasks.find((t) => t.priority === 'urgent')
      ?? eligibleTasks.find((t) => t.priority === 'high')
      ?? eligibleTasks[0]

    const taskWord = eligibleTasks.length === 1 ? 'task' : 'tasks'
    let body = `You have ${eligibleTasks.length} ${taskWord} remaining.`
    if (urgentCount > 0) {
      body += `\n${urgentCount} high-priority ${urgentCount === 1 ? 'task needs' : 'tasks need'} attention.`
    }
    if (topTask) {
      // Only show task title — no descriptions (privacy)
      body += `\nTop priority: ${topTask.title}`
    }

    const payload = JSON.stringify({
      title: 'Chroniq — Daily Progress',
      body,
      url: '/',
      taskCount: eligibleTasks.length,
      urgentCount,
    })

    // ── Fetch active push subscriptions ──────────────────────────────────────
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', pref.user_id)
      .is('revoked_at', null)

    if (subError || !subscriptions?.length) {
      await supabase
        .from('notification_events')
        .update({
          result: 'failed',
          error_category: 'no_active_subscription',
          task_count_snapshot: eligibleTasks.length,
          attempted_at: new Date().toISOString(),
        })
        .eq('id', eventId)
      errors++
      continue
    }

    // ── Send to all subscriptions ─────────────────────────────────────────────
    let anySent = false
    let lastStatus = 0
    let lastErrorCategory: string | null = null

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
          // Subscription expired — revoke
          await supabase
            .from('push_subscriptions')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', sub.id)
          lastErrorCategory = 'expired_sub'
        } else {
          lastErrorCategory = `push_http_${response.status}`
        }
      } catch (err) {
        lastErrorCategory = 'push_exception'
        console.error('[process-reminders] Push send error (endpoint redacted):', err instanceof Error ? err.message : String(err))
      }
    }

    // ── Update event record ───────────────────────────────────────────────────
    const finalResult = anySent
      ? 'sent'
      : (lastErrorCategory === 'expired_sub' ? 'expired_sub' : 'failed')

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

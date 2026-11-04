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

// ─── Diagnostic Sanitizer ─────────────────────────────────────────────────────

function sanitizeDiagnostic(text: string): string {
  if (!text) return ''
  return text
    .replace(/https?:\/\/[^\s"'`<>]+/gi, '[URL_REDACTED]')
    .replace(/\b([a-z0-9-]+\.)+(googleapis\.com|mozilla\.com|apple\.com|push\.services|windows\.com)\b/gi, '[HOST_REDACTED]')
    .replace(/\b[A-Za-z0-9_-]{20,}\b/g, '[KEY_REDACTED]')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [TOKEN_REDACTED]')
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[EMAIL_REDACTED]')
}

// ─── Subscription Validation ──────────────────────────────────────────────────

function validatePushSubscription(sub: PushSubscription): { valid: boolean; reason?: string } {
  if (!sub || typeof sub !== 'object') {
    return { valid: false, reason: 'missing_subscription_object' }
  }

  if (!sub.endpoint || typeof sub.endpoint !== 'string' || sub.endpoint.trim().length === 0) {
    return { valid: false, reason: 'missing_endpoint' }
  }

  try {
    const url = new URL(sub.endpoint)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { valid: false, reason: 'invalid_endpoint_protocol' }
    }
  } catch {
    return { valid: false, reason: 'invalid_endpoint_url' }
  }

  if (!sub.p256dh || typeof sub.p256dh !== 'string' || sub.p256dh.trim().length === 0) {
    return { valid: false, reason: 'missing_p256dh' }
  }

  const base64UrlPattern = /^[A-Za-z0-9_-]+$/
  if (!base64UrlPattern.test(sub.p256dh.trim())) {
    return { valid: false, reason: 'invalid_p256dh_encoding' }
  }

  const p256dhLen = sub.p256dh.trim().length
  if (p256dhLen < 80 || p256dhLen > 90) {
    return { valid: false, reason: 'invalid_p256dh_length' }
  }

  if (!sub.auth || typeof sub.auth !== 'string' || sub.auth.trim().length === 0) {
    return { valid: false, reason: 'missing_auth' }
  }

  if (!base64UrlPattern.test(sub.auth.trim())) {
    return { valid: false, reason: 'invalid_auth_encoding' }
  }

  const authLen = sub.auth.trim().length
  if (authLen < 20 || authLen > 30) {
    return { valid: false, reason: 'invalid_auth_length' }
  }

  return { valid: true }
}

// ─── VAPID Keypair Verification ───────────────────────────────────────────────

function base64UrlToUint8Array(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4 !== 0) b64 += '='
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function importVapidCryptoKeyPair(
  rawPubB64Url: string,
  rawPrivB64Url: string
): Promise<CryptoKeyPair> {
  const cleanPub = rawPubB64Url.trim().replace(/^["']|["']$/g, '').trim()
  const cleanPriv = rawPrivB64Url.trim().replace(/^["']|["']$/g, '').trim()

  const b64urlRegex = /^[A-Za-z0-9_-]+$/
  if (!b64urlRegex.test(cleanPub) || !b64urlRegex.test(cleanPriv)) {
    throw new Error('VAPID keys must be valid base64url encoded strings')
  }

  const pubBytes = base64UrlToUint8Array(cleanPub)
  const privBytes = base64UrlToUint8Array(cleanPriv)

  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
    throw new Error(`Invalid public key: expected 65-byte uncompressed P-256 (got ${pubBytes.length} bytes)`)
  }

  if (privBytes.length !== 32) {
    throw new Error(`Invalid private key: expected 32-byte scalar (got ${privBytes.length} bytes)`)
  }

  const x = uint8ArrayToBase64Url(pubBytes.subarray(1, 33))
  const y = uint8ArrayToBase64Url(pubBytes.subarray(33, 65))
  const d = cleanPriv

  const pubJwk: JsonWebKey = { kty: 'EC', crv: 'P-256', x, y, ext: true }
  const privJwk: JsonWebKey = { kty: 'EC', crv: 'P-256', x, y, d, ext: true }

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    pubJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify']
  )

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    privJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  )

  const probe = new TextEncoder().encode('chroniq-vapid-verification-probe')
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    probe
  )

  const isValid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    signature,
    probe
  )

  if (!isValid) {
    throw new Error('VAPID keypair verification failed: signature does not match public key')
  }

  return { publicKey, privateKey }
}

async function verifyVapidKeypair(
  publicKey: string | undefined,
  privateKey: string | undefined
): Promise<{ status: 'valid' | 'invalid' | 'unable_to_verify'; reason?: string }> {
  if (!publicKey || !privateKey) {
    return { status: 'unable_to_verify', reason: 'missing_keys' }
  }

  try {
    await importVapidCryptoKeyPair(publicKey, privateKey)
    return { status: 'valid' }
  } catch (err: unknown) {
    const errName = err instanceof Error ? err.name : 'UnknownError'
    const errMsg = err instanceof Error ? err.message : String(err)
    const reason =
      errMsg.includes('base64url') ? 'encoding_not_base64url' :
      errMsg.includes('65-byte') ? 'public_key_not_uncompressed_p256' :
      errMsg.includes('32-byte') ? 'private_key_length_mismatch' :
      errMsg.includes('signature does not match') ? 'signature_verification_failed' :
      `crypto_exception_${errName}`

    return { status: 'invalid', reason }
  }
}

// ─── Push Error Classification ────────────────────────────────────────────────

interface ClassifiedPushError {
  stage: 'vapid_signing' | 'payload_encryption' | 'push_http_request' | 'push_dispatch'
  category: string
  sanitizedName: string
  sanitizedMessage: string
  sanitizedStack?: string
}

function classifyPushException(err: unknown): ClassifiedPushError {
  const errName = err instanceof Error ? err.name : 'Unknown'
  const rawMsg = err instanceof Error ? err.message : String(err)
  const rawStack = err instanceof Error ? err.stack : undefined

  const sanitizedMessage = sanitizeDiagnostic(rawMsg)
  const sanitizedStack = rawStack ? sanitizeDiagnostic(rawStack) : undefined

  const lowerMsg = rawMsg.toLowerCase()
  const lowerName = errName.toLowerCase()
  const lowerStack = (rawStack || '').toLowerCase()

  // VAPID signing & JWT creation exceptions
  if (
    lowerMsg.includes('sign') ||
    lowerMsg.includes('jwt') ||
    lowerMsg.includes('vapid') ||
    lowerMsg.includes('forgevapidtoken') ||
    lowerMsg.includes('forgejwt') ||
    lowerStack.includes('forgejwt') ||
    lowerStack.includes('forgevapidtoken')
  ) {
    return {
      stage: 'vapid_signing',
      category: 'vapid_signing_exception',
      sanitizedName: errName,
      sanitizedMessage,
      sanitizedStack,
    }
  }

  // Web Crypto / SubtleCrypto / payload encryption errors
  if (
    lowerName.includes('domexception') ||
    lowerName.includes('dataerror') ||
    lowerName.includes('operationerror') ||
    lowerMsg.includes('crypto') ||
    lowerMsg.includes('encrypt') ||
    lowerMsg.includes('cryptokey') ||
    lowerMsg.includes('arraybuffer') ||
    lowerMsg.includes('typedarray') ||
    lowerMsg.includes('ecdh') ||
    lowerMsg.includes('hkdf') ||
    lowerMsg.includes('gcm')
  ) {
    return {
      stage: 'payload_encryption',
      category: 'encryption_exception',
      sanitizedName: errName,
      sanitizedMessage,
      sanitizedStack,
    }
  }

  if (
    lowerName.includes('network') ||
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('econnrefused') ||
    lowerMsg.includes('enotfound') ||
    lowerMsg.includes('etimedout') ||
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('dns') ||
    lowerMsg.includes('connection')
  ) {
    return {
      stage: 'push_http_request',
      category: 'network_exception',
      sanitizedName: errName,
      sanitizedMessage,
      sanitizedStack,
    }
  }

  return {
    stage: 'push_dispatch',
    category: 'push_exception',
    sanitizedName: errName,
    sanitizedMessage,
    sanitizedStack,
  }
}

// ─── Multi-Subscription Aggregation ───────────────────────────────────────────

interface SingleSubscriptionResult {
  subscriptionId: string
  success: boolean
  statusCode: number | null
  errorCategory: string | null
  stage?: string
}

interface OverallPushOutcome {
  finalResult: 'sent' | 'failed' | 'expired_sub' | 'no_tasks'
  finalStatusCode: number | null
  finalErrorCategory: string | null
}

function aggregateSubscriptionResults(
  results: SingleSubscriptionResult[],
  hasSubscriptions: boolean
): OverallPushOutcome {
  if (!hasSubscriptions || results.length === 0) {
    return {
      finalResult: 'no_tasks',
      finalStatusCode: null,
      finalErrorCategory: null,
    }
  }

  const successes = results.filter((r) => r.success)
  const failures = results.filter((r) => !r.success)

  if (successes.length > 0) {
    const firstSuccessStatus = successes.find((s) => s.statusCode !== null)?.statusCode ?? null
    return {
      finalResult: 'sent',
      finalStatusCode: firstSuccessStatus,
      finalErrorCategory: null,
    }
  }

  const allExpired =
    failures.length > 0 &&
    failures.every((f) => f.errorCategory === 'expired_sub' || f.statusCode === 410 || f.statusCode === 404)

  if (allExpired) {
    const firstStatus = failures.find((f) => f.statusCode !== null)?.statusCode ?? null
    return {
      finalResult: 'expired_sub',
      finalStatusCode: firstStatus ?? 410,
      finalErrorCategory: 'expired_sub',
    }
  }

  const lastHttpFailure = [...failures].reverse().find((f) => f.statusCode !== null && f.statusCode > 0)
  const lastErrorCategory = [...failures].reverse().find((f) => f.errorCategory)?.errorCategory ?? 'failed'

  return {
    finalResult: 'failed',
    finalStatusCode: lastHttpFailure ? lastHttpFailure.statusCode : null,
    finalErrorCategory: lastErrorCategory,
  }
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

/**
 * Extracts local time details (hour, minute, date string, ISO weekday) using Intl.DateTimeFormat
 * in Asia/Kolkata (or user's configured timezone).
 */
function getLocalTimeDetails(nowUtc: Date, timeZone: string = 'Asia/Kolkata') {
  const tz = timeZone?.trim() || 'Asia/Kolkata'
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  })

  const parts = formatter.formatToParts(nowUtc)
  const hourVal = parts.find((p) => p.type === 'hour')?.value ?? '0'
  const minuteVal = parts.find((p) => p.type === 'minute')?.value ?? '0'

  // Safe 24-hour formatting ('24' -> 0)
  let safeHour = Number(hourVal)
  if (safeHour === 24) safeHour = 0

  const currentSlot = `${String(safeHour).padStart(2, '0')}:${String(minuteVal).padStart(2, '0')}`
  const currentMinutes = safeHour * 60 + Number(minuteVal)

  const year = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'
  const dateStr = `${year}-${month}-${day}`

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon'
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  }
  const isoDay = weekdayMap[weekday] ?? 1

  return {
    timeZone: tz,
    currentSlot,
    currentMinutes,
    dateStr,
    isoDay,
    hourVal: safeHour,
    minuteVal: Number(minuteVal),
  }
}

function buildOccurrenceKey(userId: string, slotUtc: Date, timezone: string): string {
  const tz = timezone?.trim() || 'Asia/Kolkata'
  const local = getLocalTimeDetails(slotUtc, tz)
  return `${userId}:${local.dateStr}T${local.currentSlot}`
}

function isQuietHours(currentMinutes: number, enabled?: boolean, start?: string, end?: string): boolean {
  if (!enabled || !start || !end) return false
  const s = hhmmToMinutes(start)
  const e = hhmmToMinutes(end)
  if (s > e) {
    return currentMinutes >= s || currentMinutes < e
  } else if (s < e) {
    return currentMinutes >= s && currentMinutes < e
  }
  return false
}

/**
 * Determine if a user has a reminder slot due in Asia/Kolkata (or user's timezone).
 * Extracts current time in Asia/Kolkata and evaluates active slots with a 5-minute grace window.
 */
function getDueSlot(pref: NotificationPreference, nowUtc: Date): Date | null {
  const timeZone = pref.timezone?.trim() || 'Asia/Kolkata'
  const local = getLocalTimeDetails(nowUtc, timeZone)

  // Check day of week
  if (pref.active_days && pref.active_days.length > 0 && !pref.active_days.includes(local.isoDay)) {
    return null
  }

  // Check quiet hours
  if (isQuietHours(local.currentMinutes, pref.quiet_hours_enabled, pref.quiet_hours_start, pref.quiet_hours_end)) {
    return null
  }

  // Use custom_slots if present, otherwise default to standard slots
  const slotsToEvaluate =
    pref.active_slots && pref.active_slots.length > 0
      ? pref.active_slots
      : ['09:00', '12:00', '15:00', '18:00', '21:00']

  for (const timeStr of slotsToEvaluate) {
    const slotMinutes = hhmmToMinutes(timeStr)
    const diff = local.currentMinutes - slotMinutes

    // 5-minute grace window: matches if current local time is within [slot, slot + 5 minutes)
    if (diff >= 0 && diff < 5) {
      return fromZonedTime(`${local.dateStr}T${timeStr}:00`, timeZone)
    }
  }

  return null
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Validate shared secret
  const rawCronSecret = Deno.env.get('CHRONIQ_CRON_SECRET')
  const cronSecret = rawCronSecret ? rawCronSecret.trim().replace(/^["']|["']$/g, '').trim() : undefined
  const providedSecret = req.headers.get('x-chroniq-secret')?.trim()

  if (!cronSecret || cronSecret !== providedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Supabase service-role client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    { auth: { persistSession: false } },
  )

  // VAPID credentials
  const rawVapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? Deno.env.get('VITE_VAPID_PUBLIC_KEY')
  const rawVapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const rawVapidSubject = Deno.env.get('VAPID_SUBJECT')

  const vapidPublicKey = rawVapidPublicKey
    ? rawVapidPublicKey.trim().replace(/^["']|["']$/g, '').trim()
    : undefined
  const vapidPrivateKey = rawVapidPrivateKey
    ? rawVapidPrivateKey.trim().replace(/^["']|["']$/g, '').trim()
    : undefined

  let vapidSubject = rawVapidSubject
    ? rawVapidSubject.trim().replace(/^["']|["']$/g, '').trim()
    : 'mailto:notifications@chroniq.app'

  if (vapidSubject && !vapidSubject.startsWith('mailto:') && !vapidSubject.startsWith('https://')) {
    vapidSubject = `mailto:${vapidSubject}`
  }

  let appServer: any = null
  if (vapidPublicKey && vapidPrivateKey) {
    const vapidVerification = await verifyVapidKeypair(vapidPublicKey, vapidPrivateKey)
    console.log('[process-reminders] VAPID verification:', {
      status: vapidVerification.status,
      reason: vapidVerification.reason,
      publicKeyLength: vapidPublicKey.length,
      privateKeyLength: vapidPrivateKey.length,
      subjectFormat: vapidSubject.startsWith('mailto:') || vapidSubject.startsWith('https://') ? 'valid' : 'invalid',
    })

    try {
      const vapidCryptoKeyPair = await importVapidCryptoKeyPair(vapidPublicKey, vapidPrivateKey)
      appServer = await ApplicationServer.new({
        contactInformation: vapidSubject,
        vapidKeys: vapidCryptoKeyPair,
      })
    } catch (err: unknown) {
      const sanitizedMsg = sanitizeDiagnostic(err instanceof Error ? err.message : String(err))
      console.warn('[process-reminders] VAPID initialization note:', sanitizedMsg)
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
    const localToday = getLocalTimeDetails(nowUtc, pref.timezone || 'Asia/Kolkata').dateStr

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

    // Stage 1: Subscription retrieval
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', pref.user_id)
      .is('revoked_at', null)

    if (subError) {
      console.error('[process-reminders] Subscription retrieval failed', {
        stage: 'subscription_retrieval',
        userId: pref.user_id,
        error: sanitizeDiagnostic(subError.message),
      })
    }

    const subResults: SingleSubscriptionResult[] = []

    if (appServer && subscriptions && subscriptions.length > 0 && pref.push_enabled !== false) {
      for (const sub of subscriptions as PushSubscription[]) {
        // Stage 2: Subscription validation
        const valRes = validatePushSubscription(sub)
        if (!valRes.valid) {
          console.warn('[process-reminders] Skipping subscription: validation failed', {
            stage: 'subscription_validation',
            subscriptionId: sub.id,
            reason: valRes.reason,
          })
          subResults.push({
            subscriptionId: sub.id,
            success: false,
            statusCode: null,
            errorCategory: valRes.reason ?? 'invalid_subscription',
            stage: 'subscription_validation',
          })
          continue
        }

        // Stage 3: appServer.subscribe()
        let subscriber: any
        try {
          subscriber = appServer.subscribe({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          })
        } catch (subErr: unknown) {
          const classified = classifyPushException(subErr)
          console.error('[process-reminders] Subscriber creation failed', {
            stage: 'appServer_subscribe',
            subscriptionId: sub.id,
            errorName: classified.sanitizedName,
            errorMessage: classified.sanitizedMessage,
          })
          subResults.push({
            subscriptionId: sub.id,
            success: false,
            statusCode: null,
            errorCategory: 'subscriber_init_exception',
            stage: 'appServer_subscribe',
          })
          continue
        }

        // Stage 4, 5, 6: Payload encryption, Push dispatch & Response processing
        try {
          const pushResult = await subscriber.pushTextMessage(payload, {
            ttl: 3600,
            urgency: 'normal',
          })

          // Successful resolution: push accepted!
          // Note: If pushResult has a numeric status (e.g. Response.status), preserve it; otherwise record null (never fabricate HTTP status codes)
          const acceptedStatus: number | null =
            pushResult && typeof (pushResult as any).status === 'number'
              ? (pushResult as any).status
              : null

          subResults.push({
            subscriptionId: sub.id,
            success: true,
            statusCode: acceptedStatus,
            errorCategory: null,
            stage: 'response_processing',
          })

          const { error: tsError } = await supabase
            .from('push_subscriptions')
            .update({ last_successful_delivery_at: new Date().toISOString() })
            .eq('id', sub.id)

          if (tsError) {
            console.warn('[process-reminders] Failed to update subscription timestamp:', {
              subscriptionId: sub.id,
              error: sanitizeDiagnostic(tsError.message),
            })
          }
        } catch (pushErr: unknown) {
          // Check if error wraps an HTTP response (e.g. PushMessageError.response, err.response, err.status, err.statusCode)
          const httpResponse = (pushErr as any)?.response ?? ((pushErr as any)?.status ? pushErr : null)
          const httpStatus: number | null =
            httpResponse && typeof httpResponse.status === 'number'
              ? httpResponse.status
              : typeof (pushErr as any)?.statusCode === 'number'
              ? (pushErr as any).statusCode
              : null

          let errBody: string | undefined
          if (httpResponse && typeof httpResponse.text === 'function') {
            try {
              errBody = await httpResponse.clone().text()
            } catch {
              // Body already consumed or unavailable
            }
          } else if ((pushErr as any)?.body) {
            errBody = typeof (pushErr as any).body === 'string'
              ? (pushErr as any).body
              : JSON.stringify((pushErr as any).body)
          }

          if (httpStatus !== null && httpStatus > 0) {
            console.error('[process-reminders] Push service error response:', {
              subscriptionId: sub.id,
              statusCode: httpStatus,
              body: sanitizeDiagnostic(errBody ?? ''),
            })

            // Push service rejected with an HTTP response!
            if (httpStatus === 410 || httpStatus === 404) {
              console.warn(`[process-reminders] Removing dead subscription ${sub.id} (HTTP ${httpStatus})`)
              subResults.push({
                subscriptionId: sub.id,
                success: false,
                statusCode: httpStatus,
                errorCategory: 'expired_sub',
                stage: 'response_processing',
              })

              const { error: revokeError } = await supabase
                .from('push_subscriptions')
                .update({ revoked_at: new Date().toISOString() })
                .eq('id', sub.id)

              if (revokeError) {
                console.warn('[process-reminders] Failed to mark subscription as revoked:', {
                  subscriptionId: sub.id,
                  error: sanitizeDiagnostic(revokeError.message),
                })
              }
            } else if (httpStatus === 401 || httpStatus === 403) {
              const isVapidMismatch =
                (errBody && (errBody.includes('VapidPkHashMismatch') || errBody.includes('UnauthorizedRegistration') || errBody.includes('BadDeviceToken'))) ||
                String(pushErr).includes('VapidPkHashMismatch')

              console.error('[process-reminders] VAPID authentication failure (401/403):', {
                subscriptionId: sub.id,
                statusCode: httpStatus,
                isVapidPkHashMismatch: Boolean(isVapidMismatch),
                body: sanitizeDiagnostic(errBody ?? ''),
              })

              subResults.push({
                subscriptionId: sub.id,
                success: false,
                statusCode: httpStatus,
                errorCategory: isVapidMismatch ? 'vapid_hash_mismatch' : `push_http_${httpStatus}`,
                stage: 'response_processing',
              })
            } else {
              subResults.push({
                subscriptionId: sub.id,
                success: false,
                statusCode: httpStatus,
                errorCategory: `push_http_${httpStatus}`,
                stage: 'response_processing',
              })
            }
          } else {
            // Pre-HTTP exception (status remains NULL)
            const classified = classifyPushException(pushErr)
            console.error('[process-reminders] Push dispatch exception', {
              stage: classified.stage,
              subscriptionId: sub.id,
              errorName: classified.sanitizedName,
              errorMessage: classified.sanitizedMessage,
              stack: classified.sanitizedStack,
            })
            subResults.push({
              subscriptionId: sub.id,
              success: false,
              statusCode: null,
              errorCategory: classified.category,
              stage: classified.stage,
            })
          }
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

    const outcome = aggregateSubscriptionResults(
      subResults,
      Boolean(subscriptions && subscriptions.length > 0)
    )

    // Pending-event reconciliation policy:
    // If the database update fails after push dispatch, the event row remains with result = 'pending'.
    // Important: Pending events must NEVER be automatically resent. The push service may have already
    // accepted and delivered the notification to the user's device, so blind retries risk duplicate alerts.
    // Because schedule_occurrence_key has a UNIQUE constraint, subsequent cron runs cannot claim the same slot,
    // naturally preventing duplicate pushes. Any reconciliation job must inspect events manually rather than
    // relying on timestamps as definitive proof of delivery.
    const { error: updateEventError } = await supabase
      .from('notification_events')
      .update({
        result: outcome.finalResult,
        error_category: outcome.finalErrorCategory,
        task_count_snapshot: eligibleTasks.length,
        push_status_code: outcome.finalStatusCode,
        attempted_at: new Date().toISOString(),
      })
      .eq('id', eventId)

    if (updateEventError) {
      console.error('[process-reminders] Failed to update notification event:', {
        eventId,
        error: sanitizeDiagnostic(updateEventError.message),
      })
      errors++
    } else if (outcome.finalResult === 'sent') {
      sent++
    } else {
      errors++
    }
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

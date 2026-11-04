/**
 * pushClient.ts
 *
 * Client-side Web Push subscription management.
 * Handles service worker registration, push subscription, and sending to backend.
 *
 * Security notes:
 * - Only the VAPID PUBLIC key is used here (safe to expose)
 * - The VAPID private key lives only in the Edge Function
 * - Subscription objects (endpoint + keys) are sent over HTTPS to our backend
 */

import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

// ─── Types ────────────────────────────────────────────────────────────────────

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export interface PushSetupResult {
  success: boolean
  permissionState: PushPermissionState
  error?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  // Allocate from an explicit ArrayBuffer so TS infers Uint8Array<ArrayBuffer>
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Check current notification permission state.
 */
export function getPermissionState(): PushPermissionState {
  if (!('Notification' in window)) return 'unsupported'
  if (!('serviceWorker' in navigator)) return 'unsupported'
  if (!('PushManager' in window)) return 'unsupported'
  return Notification.permission as PushPermissionState
}

/**
 * Check if Web Push is supported in this browser.
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * Register service worker (idempotent — safe to call multiple times).
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const base = import.meta.env.BASE_URL || '/'
    const swUrl = `${base.replace(/\/+$/, '')}/sw.js`
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: base,
    })
    return registration
  } catch (err) {
    console.error('[Chroniq] Service worker registration failed:', err)
    return null
  }
}

/**
 * Full push setup flow:
 * 1. Request notification permission (only if not already granted/denied)
 * 2. Register service worker
 * 3. Create push subscription
 * 4. Send subscription to backend
 */
export async function setupPushNotifications(deviceLabel?: string): Promise<PushSetupResult> {
  if (!isPushSupported()) {
    return {
      success: false,
      permissionState: 'unsupported',
      error: 'Web Push is not supported in this browser.',
    }
  }

  // 1. Request browser notification permission
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return {
      success: false,
      permissionState: permission as PushPermissionState,
      error:
        permission === 'denied'
          ? 'Notification permission was denied. Please enable it in browser settings.'
          : 'Notification permission was dismissed.',
    }
  }

  // 2. Check for VAPID key (needed for remote PushManager subscription)
  if (!VAPID_PUBLIC_KEY) {
    return {
      success: true,
      permissionState: 'granted',
      error: 'Browser notification permission granted. Remote push requires VITE_VAPID_PUBLIC_KEY.',
    }
  }

  // Register service worker
  const registration = await registerServiceWorker()
  if (!registration) {
    return {
      success: false,
      permissionState: 'granted',
      error: 'Failed to register service worker. Try refreshing the page.',
    }
  }

  // Wait for service worker to be ready
  await navigator.serviceWorker.ready

  // Create push subscription
  let subscription: globalThis.PushSubscription
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  } catch (err) {
    return {
      success: false,
      permissionState: 'granted',
      error: `Failed to create push subscription: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // Send to backend
  const result = await saveSubscriptionToBackend(subscription, deviceLabel)
  if (!result.success) {
    return { success: false, permissionState: 'granted', error: result.error }
  }

  return { success: true, permissionState: 'granted' }
}

/**
 * Send the push subscription to the backend Edge Function.
 */
async function saveSubscriptionToBackend(
  subscription: globalThis.PushSubscription,
  deviceLabel?: string,
): Promise<{ success: boolean; error?: string }> {
  const json = subscription.toJSON()
  const { endpoint, keys } = json

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return { success: false, error: 'Push subscription is missing required fields.' }
  }

  // 1. Try Edge Function push-subscribe
  const { error: fnError } = await supabase.functions.invoke('push-subscribe', {
    body: {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      device_label: deviceLabel ?? null,
    },
  })

  if (!fnError) {
    return { success: true }
  }

  // 2. Direct fallback via Supabase REST API if Edge Function is not yet deployed
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { error: dbError } = await (supabase.from('push_subscriptions') as any).upsert(
        {
          user_id: session.user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          device_label: deviceLabel ?? null,
          revoked_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      )
      if (!dbError) {
        return { success: true }
      }
    }
  } catch {
    // Fall through to report original error
  }

  return { success: false, error: fnError.message }
}

/**
 * Get the current push subscription for this device, if any.
 */
export async function getCurrentPushSubscription(): Promise<globalThis.PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const base = import.meta.env.BASE_URL || '/'
    const registration = await navigator.serviceWorker.getRegistration(base)
    if (!registration) return null
    return registration.pushManager.getSubscription()
  } catch {
    return null
  }
}

/**
 * Unsubscribe from push on this device and notify the backend.
 */
export async function unsubscribePush(): Promise<{ success: boolean; error?: string }> {
  const subscription = await getCurrentPushSubscription()
  if (!subscription) return { success: true }

  const endpoint = subscription.endpoint

  const unsubscribed = await subscription.unsubscribe()
  if (!unsubscribed) {
    return { success: false, error: 'Failed to unsubscribe from push.' }
  }

  // Revoke on backend
  const { error } = await supabase.functions.invoke('push-unsubscribe', {
    body: { endpoint },
  })

  if (error) {
    console.warn('[Chroniq] Failed to revoke subscription on server:', error.message)
    // Don't fail — local unsubscription succeeded
  }

  return { success: true }
}

/**
 * Send a test notification via the backend.
 */
export async function sendTestNotification(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.functions.invoke('test-notification')
  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

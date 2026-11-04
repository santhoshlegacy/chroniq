/// <reference lib="webworker" />
/**
 * Chroniq Service Worker
 *
 * Handles:
 * 1. Asset precaching & offline access (via Workbox injected by vite-plugin-pwa)
 * 2. Push event → shows native notification with relative icon resolution
 * 3. notificationclick → focuses or opens the app window
 */

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

// ─── Extended notification type ──────────────────────────────────────────────
interface SWNotificationOptions extends NotificationOptions {
  actions?: Array<{ action: string; title: string; icon?: string }>
  badge?: string
  renotify?: boolean
}

// ─── Precaching (injected by vite-plugin-pwa) ────────────────────────────────
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Dynamically compute asset URLs relative to the service worker location
const getAssetUrl = (relativePath: string): string => {
  try {
    return new URL(relativePath, self.location.href).href
  } catch {
    return relativePath
  }
}

// ─── Push Notifications ───────────────────────────────────────────────────────
interface ChroniqPushPayload {
  title: string
  body: string
  url?: string
  taskCount?: number
  urgentCount?: number
}

self.addEventListener('push', (event: PushEvent) => {
  let title = 'Chroniq — Reminder'
  let body = 'You have pending tasks in Chroniq.'
  let targetUrl = self.location.href

  if (event.data) {
    try {
      const json = event.data.json() as ChroniqPushPayload
      if (json && typeof json === 'object') {
        title = json.title || title
        body = json.body || body
        if (json.url) targetUrl = getAssetUrl(json.url)
      } else {
        const text = event.data.text()
        if (text) body = text
      }
    } catch {
      // JSON parsing failed; fall back safely to plain text
      try {
        const text = event.data.text()
        if (text) body = text
      } catch (textErr) {
        console.warn('[SW] Could not parse push payload as text:', textErr)
      }
    }
  }

  const notificationOptions: SWNotificationOptions = {
    body,
    icon: getAssetUrl('icons/icon-192.png'),
    badge: getAssetUrl('icons/badge-72.png'),
    tag: 'chroniq-reminder',
    renotify: true,
    requireInteraction: false,
    data: {
      url: targetUrl,
    },
    actions: [
      { action: 'open', title: 'View Tasks' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, notificationOptions as NotificationOptions))
})

// ─── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const targetUrl: string = (event.notification.data as { url?: string })?.url ?? self.location.href

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existingClient = clients.find((c) => {
          try {
            const clientUrl = new URL(c.url)
            const target = new URL(targetUrl)
            return clientUrl.origin === target.origin
          } catch {
            return false
          }
        })

        if (existingClient) {
          void existingClient.focus()
          void existingClient.navigate(targetUrl)
          return
        }

        return self.clients.openWindow(targetUrl)
      }),
  )
})

// ─── Activate: take control immediately ──────────────────────────────────────
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim())
})

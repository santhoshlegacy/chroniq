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

// ─── Precaching (injected by vite-plugin-pwa) ────────────────────────────────
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ─── Push Notifications (Bulletproof High-Priority Display) ─────────────────────

self.addEventListener('push', (event: PushEvent) => {
  console.log('[sw] push received', new Date().toISOString())
  let data: any = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_e) {
    data = { body: event.data?.text() }
  }

  event.waitUntil(
    self.registration
      .showNotification(data.title || 'Chroniq', {
        body: data.body || 'Task reminder',
        icon: self.registration.scope + 'assets/logo.png',
        data: data,
      })
      .then(() => console.log('[sw] showNotification OK'))
      .catch((e: unknown) => console.log('[sw] showNotification FAILED', String(e)))
  )
})

// ─── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const defaultScope = self.registration.scope || (self.location.origin + '/')
  const rawTarget: string = (event.notification.data as { url?: string })?.url ?? defaultScope
  let safeUrl = defaultScope
  try {
    // If target is root '/', map to the PWA scope to preserve subpath deployments (e.g., GitHub Pages)
    const targetPath = rawTarget === '/' ? defaultScope : rawTarget
    const parsed = new URL(targetPath, defaultScope)
    if (parsed.origin === self.location.origin && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
      safeUrl = parsed.href
    }
  } catch {
    safeUrl = defaultScope
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existingClient = clients.find((c) => {
          try {
            const clientUrl = new URL(c.url)
            const target = new URL(safeUrl)
            return clientUrl.origin === target.origin
          } catch {
            return false
          }
        })

        if (existingClient) {
          void existingClient.focus()
          void existingClient.navigate(safeUrl)
          return
        }

        return self.clients.openWindow(safeUrl)
      }),
  )
})

// ─── Activate: take control immediately ──────────────────────────────────────
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim())
})

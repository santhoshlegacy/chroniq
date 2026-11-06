/**
 * public/sw.js
 *
 * Standalone Service Worker for Chroniq PWA & Web Push Notifications.
 * Handles incoming push notifications dispatched from Supabase Edge Functions / Web Push gateways,
 * displays native notifications with custom title, body, icon, and actions,
 * and handles notification clicks to focus or open the app window.
 */

// Helper to resolve asset URLs relative to service worker scope
const getAssetUrl = (relativePath) => {
  try {
    return new URL(relativePath, self.location.href).href
  } catch {
    return relativePath
  }
}

// ─── Lifecycle Events ─────────────────────────────────────────────────────────

self.addEventListener('install', () => {
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Take control of all open client tabs immediately
  event.waitUntil(self.clients.claim())
})

// ─── Push Notification Handler ────────────────────────────────────────────────
// Unconditional Native Push Execution:
// The push event MUST ALWAYS execute event.waitUntil(self.registration.showNotification(...))
// immediately, regardless of client state. We strictly avoid suppressing alerts based on
// clients.matchAll() or tab visibility so background lock-screen notifications reliably fire.

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let title = 'Chroniq — Reminder'
      let body = 'You have pending tasks waiting in Chroniq.'
      let targetUrl = self.registration.scope || self.location.href
      let icon = getAssetUrl('icons/icon-192.png')
      let badge = getAssetUrl('icons/badge-72.png')
      let tag = 'chroniq-reminder'
      let data = {}

      if (event.data) {
        try {
          const json = event.data.json()
          if (json && typeof json === 'object') {
            if (json.title) title = json.title
            if (json.body) body = json.body
            if (json.icon) icon = getAssetUrl(json.icon)
            if (json.badge) badge = getAssetUrl(json.badge)
            if (json.url) targetUrl = getAssetUrl(json.url)
            if (json.tag) tag = json.tag
            data = { ...json }
          } else {
            const text = event.data.text()
            if (text) body = text
          }
        } catch {
          // Graceful fallback for non-JSON or plain text payloads
          try {
            const text = event.data.text()
            if (text) body = text
          } catch (err) {
            console.warn('[SW] Could not parse push payload as text:', err)
          }
        }
      }

      data.url = targetUrl

      const notificationOptions = {
        body,
        icon,
        badge,
        tag,
        renotify: true,
        requireInteraction: true,
        data,
        actions: [
          { action: 'open', title: 'View Tasks' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      }

      await self.registration.showNotification(title, notificationOptions)
    })()
  )
})

// ─── Notification Click Handler ──────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const defaultScope = self.registration.scope || (self.location.origin + '/')
  const rawTarget = (event.notification.data && event.notification.data.url) || defaultScope
  let safeUrl = defaultScope
  try {
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
        // Focus existing app tab if already open
        for (const client of clients) {
          try {
            const clientUrl = new URL(client.url)
            const target = new URL(safeUrl)
            if (clientUrl.origin === target.origin) {
              client.focus()
              if (client.url !== safeUrl && 'navigate' in client) {
                client.navigate(safeUrl)
              }
              return
            }
          } catch {
            // Ignore URL parsing errors
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(safeUrl)
        }
      })
  )
})


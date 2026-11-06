/**
 * public/sw.js
 *
 * Standalone Service Worker for Chroniq PWA & Web Push Notifications.
 * Handles incoming push notifications dispatched from Supabase Edge Functions / Web Push gateways,
 * displays native notifications with custom title, body, icon, and actions,
 * and handles notification clicks to focus or open the app window.
 */

// ─── Lifecycle Events ─────────────────────────────────────────────────────────

self.addEventListener('install', () => {
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Take control of all open client tabs immediately
  event.waitUntil(self.clients.claim())
})

// ─── Push Notification Handler (Bulletproof High-Priority Display) ───────────

self.addEventListener('push', (event) => {
  console.log('[sw] push received', new Date().toISOString())
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
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
      .catch((e) => console.log('[sw] showNotification FAILED', String(e)))
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


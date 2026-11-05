import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register Service Worker for PWA & incoming Web Push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/'
    const swUrl = `${base.replace(/\/+$/, '')}/sw.js`

    navigator.serviceWorker
      .register(swUrl, { scope: base })
      .then((registration) => {
        if (import.meta.env.DEV) {
          console.log('[Chroniq] Service Worker registered with scope:', registration.scope)
        }
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.error('[Chroniq] Service Worker registration failed:', error)
        }
      })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

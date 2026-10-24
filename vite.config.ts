import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// Resolve base path for GitHub Pages deployment:
// e.g., https://<username>.github.io/chroniq/
const getBasePath = (): string => {
  if (process.env.BASE_PATH) return process.env.BASE_PATH.trim()
  if (process.env.GITHUB_PAGES || process.env.GITHUB_ACTIONS) {
    const rawRepo = process.env.GITHUB_REPOSITORY?.trim()
    const repoName = rawRepo ? rawRepo.split('/')[1]?.trim() : 'chroniq'
    return `/${repoName || 'chroniq'}/`
  }
  return './'
}

const base = getBasePath()

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: 'src/sw',
      filename: 'sw.ts',
      manifest: {
        name: 'Chroniq',
        short_name: 'Chroniq',
        description: 'Own your time. Finish what matters.',
        theme_color: '#080B12',
        background_color: '#080B12',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: base === './' ? './' : base,
        scope: base === './' ? './' : base,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})

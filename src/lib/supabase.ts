import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Normalizes user-provided Supabase URLs.
 * If the user copied the browser dashboard URL:
 * https://supabase.com/dashboard/project/abcdefghijklm
 * this normalizes it to the API URL:
 * https://abcdefghijklm.supabase.co
 */
export function normalizeSupabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined
  const trimmed = rawUrl.trim()
  const dashboardMatch = trimmed.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/)
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`
  }
  return trimmed
}

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
const supabaseUrl = normalizeSupabaseUrl(rawUrl)
const supabaseKey = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
)?.trim()

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('http') &&
  supabaseKey &&
  supabaseKey.length > 10 &&
  !supabaseKey.includes('placeholder')
)

if (!isSupabaseConfigured) {
  console.info(
    '[Chroniq] Running in local offline-first mode. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to activate cloud sync.',
  )
}

const activeUrl = isSupabaseConfigured ? supabaseUrl! : 'https://placeholder-project.supabase.co'
const activeKey = isSupabaseConfigured ? supabaseKey! : 'placeholder-anon-key'

export const supabase = createClient<Database>(activeUrl, activeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

/**
 * Resolves the OAuth callback URL dynamically to support local development
 * and deployed GitHub Pages subpaths (e.g. https://<user>.github.io/<repo>/).
 */
export function getAuthRedirectUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:5173'
  
  // Explicit override if configured
  const envAppUrl = import.meta.env.VITE_APP_URL as string | undefined
  if (envAppUrl && envAppUrl.startsWith('http') && !envAppUrl.includes('localhost') && window.location.hostname !== 'localhost') {
    return envAppUrl.replace(/\/+$/, '') + window.location.pathname
  }

  // Current origin + pathname (retains /chroniq/ repo base on GitHub Pages)
  return `${window.location.origin}${window.location.pathname}`
}

/**
 * Initiate Google Sign-In with OAuth redirect.
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) {
    return {
      error: new Error('Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.'),
    }
  }

  const redirectTo = getAuthRedirectUrl()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  return { error }
}

/**
 * Sign out user and clear session.
 */
export async function signOut(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { error: null }
  }
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Checks for OAuth errors present in the current URL (e.g. from redirect).
 */
export function parseAuthUrlError(): string | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash
  const search = window.location.search

  const searchParams = new URLSearchParams(search)
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''))

  const errorDesc =
    hashParams.get('error_description') ||
    searchParams.get('error_description') ||
    hashParams.get('error') ||
    searchParams.get('error')

  return errorDesc
}

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.trim() !== '' &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey &&
  supabaseAnonKey.trim() !== '',
)

if (!isSupabaseConfigured) {
  console.info(
    '[Chroniq] Running in local offline-first mode. Tasks and preferences are persisted locally. ' +
      'To connect a live Supabase backend, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
  )
}

// Fallback to valid URL structure so createClient never throws an initialization error
const activeUrl = isSupabaseConfigured ? supabaseUrl! : 'https://placeholder-project.supabase.co'
const activeKey = isSupabaseConfigured ? supabaseAnonKey! : 'placeholder-anon-key'

export const supabase = createClient<Database>(activeUrl, activeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
  },
})

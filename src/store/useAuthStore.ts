import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured, signInWithGoogle, signOut, parseAuthUrlError } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthStore {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean
  authError: string | null
  
  // Actions
  initializeAuth: () => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  clearAuthError: () => void
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  authError: null,

  initializeAuth: async () => {
    // Check for incoming OAuth redirect errors first
    const urlError = parseAuthUrlError()
    if (urlError) {
      set({ authError: decodeURIComponent(urlError.replace(/\+/g, ' ')) })
      // Clean up the URL hash/query without page reload
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        const cleanUrl = window.location.pathname
        window.history.replaceState(null, '', cleanUrl)
      }
    }

    if (!isSupabaseConfigured) {
      set({ isLoading: false, isInitialized: true })
      return
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        set({ authError: error.message, isLoading: false, isInitialized: true })
        return
      }

      if (session?.user) {
        set({ session, user: session.user })
        await get().refreshProfile()
      } else {
        set({ session: null, user: null, profile: null })
      }
    } catch (err: any) {
      set({ authError: err?.message || 'Authentication session restore failed.' })
    } finally {
      set({ isLoading: false, isInitialized: true })
    }

    // Subscribe to ongoing auth state transitions
    supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      set({ session, user: currentUser })
      if (currentUser) {
        await get().refreshProfile()
      } else {
        set({ profile: null })
      }
    })
  },

  refreshProfile: async () => {
    const { user } = get()
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (!error && data) {
        set({ profile: data as unknown as Profile })
      } else {
        // Fallback profile representation from user metadata
        const fallbackProfile: Profile = {
          id: user.id,
          display_name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User',
          email: user.email ?? null,
          avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
          full_name: (user.user_metadata?.full_name as string) ?? null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          created_at: user.created_at,
          updated_at: user.created_at,
        }
        set({ profile: fallbackProfile })
      }
    } catch {
      // Local or network recovery
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, authError: null })
    const { error } = await signInWithGoogle()
    if (error) {
      set({ authError: error.message, isLoading: false })
    }
  },

  logout: async () => {
    set({ isLoading: true, authError: null })
    const { error } = await signOut()
    if (error) {
      set({ authError: error.message, isLoading: false })
      return
    }
    set({ user: null, session: null, profile: null, isLoading: false })
  },

  clearAuthError: () => set({ authError: null }),
}))


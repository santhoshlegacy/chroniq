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
  loginWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  logout: () => Promise<void>
  clearAuthError: () => void
  refreshProfile: () => Promise<void>
  updateProfile: (updates: {
    display_name?: string
    avatar_url?: string
    full_name?: string
    timezone?: string
  }) => Promise<{ success: boolean; error?: string }>
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

  loginWithEmail: async (email: string, password: string) => {
    set({ isLoading: true, authError: null })
    if (!isSupabaseConfigured) {
      const err = new Error('Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
      set({ authError: err.message, isLoading: false })
      return { error: err }
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      set({ authError: error.message, isLoading: false })
      return { error }
    }
    set({ user: data.user, session: data.session, isLoading: false })
    await get().refreshProfile()
    return { error: null }
  },

  signUpWithEmail: async (email: string, password: string) => {
    set({ isLoading: true, authError: null })
    if (!isSupabaseConfigured) {
      const err = new Error('Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
      set({ authError: err.message, isLoading: false })
      return { error: err }
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: email.split('@')[0],
        },
      },
    })
    if (error) {
      set({ authError: error.message, isLoading: false })
      return { error }
    }
    set({ user: data.user, session: data.session, isLoading: false })
    if (data.user) {
      await get().refreshProfile()
    }
    return { error: null }
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

  updateProfile: async (updates) => {
    const { user, profile } = get()
    if (!user) {
      return { success: false, error: 'User must be signed in to update profile.' }
    }

    try {
      set({ isLoading: true, authError: null })

      // 1. Update Supabase Auth user_metadata
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: updates.full_name ?? updates.display_name,
          display_name: updates.display_name,
          avatar_url: updates.avatar_url,
        },
      })

      if (authError) {
        set({ authError: authError.message, isLoading: false })
        return { success: false, error: authError.message }
      }

      // 2. Update profiles table in Supabase DB
      const updatedProfilePayload: Record<string, any> = {
        id: user.id,
        updated_at: new Date().toISOString(),
      }
      if (updates.display_name !== undefined) updatedProfilePayload.display_name = updates.display_name
      if (updates.full_name !== undefined) updatedProfilePayload.full_name = updates.full_name
      if (updates.avatar_url !== undefined) updatedProfilePayload.avatar_url = updates.avatar_url
      if (updates.timezone !== undefined) updatedProfilePayload.timezone = updates.timezone

      const { error: dbError } = await (supabase
        .from('profiles') as any)
        .upsert(updatedProfilePayload, { onConflict: 'id' })

      if (dbError) {
        console.warn('[useAuthStore] Profile DB update note:', dbError.message)
      }

      // 3. Update store state
      const mergedProfile: Profile = {
        ...(profile || {
          id: user.id,
          display_name: updates.display_name ?? 'User',
          email: user.email ?? null,
          avatar_url: updates.avatar_url ?? null,
          full_name: updates.full_name ?? null,
          timezone: updates.timezone ?? 'Asia/Kolkata',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
        ...updatedProfilePayload,
      }

      set({
        user: authData.user ?? user,
        profile: mergedProfile,
        isLoading: false,
      })

      return { success: true }
    } catch (err: any) {
      const msg = err?.message || 'Failed to update profile'
      set({ authError: msg, isLoading: false })
      return { success: false, error: msg }
    }
  },

  clearAuthError: () => set({ authError: null }),
}))


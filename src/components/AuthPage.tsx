import React, { useState } from 'react'
import logoUrl from '@/assets/logo.png'
import { useAuthStore } from '@/store/useAuthStore'
import { useTaskStore } from '@/store/useTaskStore'

interface AuthPageProps {
  onContinueOffline: () => void
}

export const AuthPage: React.FC<AuthPageProps> = ({ onContinueOffline }) => {
  const {
    user,
    profile,
    loginWithGoogle,
    loginWithEmail,
    signUpWithEmail,
    logout,
    isLoading,
    authError,
    clearAuthError,
  } = useAuthStore()

  const { unmigratedLocalCount, importLocalTasksToCloud } = useTaskStore()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password || isSubmitting) return

    clearAuthError()
    setSuccessMessage(null)
    setIsSubmitting(true)

    if (mode === 'signin') {
      const res = await loginWithEmail(email, password)
      if (!res.error) {
        setSuccessMessage('Welcome back! Loading your tasks...')
      }
    } else {
      const res = await signUpWithEmail(email, password)
      if (!res.error) {
        setSuccessMessage('Account created! Confirm your email if verification is required, or sign in.')
      }
    }
    setIsSubmitting(false)
  }

  const handleMigrate = async () => {
    const res = await importLocalTasksToCloud()
    setImportStatus(`Successfully migrated ${res.imported} offline task${res.imported === 1 ? '' : 's'} to your cloud storage!`)
    setTimeout(() => setImportStatus(null), 5000)
  }

  const userDisplayName =
    profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member'
  const userAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url

  // ──────── Authenticated User View ────────
  if (user) {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 px-4 animate-in fade-in duration-200">
        <div className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl text-[#181615]">
          {/* User Header */}
          <div className="flex items-center gap-4 pb-6 border-b border-[rgba(45,41,38,0.08)]">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userDisplayName}
                className="w-16 h-16 rounded-full object-cover shrink-0 border border-[rgba(45,41,38,0.12)] shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#EFECE3] border border-[rgba(45,41,38,0.12)] text-[#181615] text-xl font-bold flex items-center justify-center shadow-xs font-serif shrink-0">
                {userDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#181615] truncate font-serif">
                  {userDisplayName}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEDAA3] text-[#745A2E] border border-[#745A2E]/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#745A2E]" />
                  <span>Synchronized</span>
                </span>
              </div>
              <p className="text-xs text-[#7A746E] truncate mt-0.5 font-mono">{user.email}</p>
              <p className="text-[11px] text-[#745A2E] mt-1 font-mono uppercase tracking-wider">
                Personal Cloud Account
              </p>
            </div>
          </div>

          {/* Sync Status Card */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#7A746E]">Storage</span>
              <span className="text-[#181615] font-medium flex items-center gap-1 font-mono">
                <span className="material-symbols-outlined text-sm text-[#745A2E]">cloud_done</span>
                Cloud Storage
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#7A746E]">Data Protection</span>
              <span className="text-[#181615] font-medium flex items-center gap-1 font-mono">
                <span className="material-symbols-outlined text-sm text-[#4A6B56]">lock</span>
                Strict User Isolation
              </span>
            </div>
          </div>

          {/* Local Migration Banner if applicable */}
          {unmigratedLocalCount > 0 && (
            <div className="p-4 rounded-xl bg-[#FEDAA3]/40 border border-[#745A2E]/25 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#181615] block">
                    Offline Tasks Ready to Sync
                  </span>
                  <span className="text-[11px] text-[#2D2926]">
                    You have <strong className="text-[#745A2E]">{unmigratedLocalCount} offline tasks</strong> saved locally on this browser.
                  </span>
                </div>
              </div>
              <button
                onClick={handleMigrate}
                className="btn-primary w-full py-2 rounded-md font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Sync Tasks to Cloud
              </button>
              {importStatus && <p className="text-xs text-[#4A6B56] text-center">{importStatus}</p>}
            </div>
          )}

          {/* Sign Out Action */}
          <div className="pt-2 flex justify-between items-center">
            <button
              onClick={onContinueOffline}
              className="text-xs text-[#7A746E] hover:text-[#181615] transition cursor-pointer"
            >
              Back to Tasks
            </button>
            <button
              onClick={() => logout()}
              disabled={isLoading}
              className="px-4 py-2 rounded-md bg-[#EFECE3] hover:bg-[#FAF7F2] text-[#181615] text-xs font-medium border border-[rgba(45,41,38,0.12)] flex items-center gap-1.5 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ──────── Guest / Sign In View ────────
  return (
    <div className="max-w-md mx-auto py-8 sm:py-12 px-4 animate-in fade-in duration-200">
      <div className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden text-[#181615]">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-full overflow-hidden border border-[rgba(45,41,38,0.12)] bg-[#FAF7F2] flex items-center justify-center shadow-xs p-2">
            <img
              src={logoUrl}
              alt="Chroniq"
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                const target = e.currentTarget
                const base = import.meta.env.BASE_URL || './'
                const fallback = base.endsWith('/') ? `${base}logo.png` : `${base}/logo.png`
                if (target.src !== fallback && !target.src.endsWith(fallback)) {
                  target.src = fallback
                } else if (!target.src.endsWith('logo.png')) {
                  target.src = './logo.png'
                }
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-[#181615] tracking-tight font-serif pt-1">
            {mode === 'signin' ? 'Sign In to Chroniq' : 'Create an Account'}
          </h1>
          <p className="text-xs text-[#7A746E] max-w-xs mx-auto leading-relaxed">
            {mode === 'signin'
              ? 'Access synced reminders, notifications, and task history across devices.'
              : 'Stay on top of your daily schedule with smart reminders.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex p-1 rounded-xl bg-[#EFECE3] border border-[rgba(45,41,38,0.08)]">
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              clearAuthError()
              setSuccessMessage(null)
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-[#181615] text-[#FAF7F2] shadow-xs'
                : 'text-[#7A746E] hover:text-[#181615]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              clearAuthError()
              setSuccessMessage(null)
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#181615] text-[#FAF7F2] shadow-xs'
                : 'text-[#7A746E] hover:text-[#181615]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error / Success Messages */}
        {authError && (
          <div className="p-3 rounded-xl bg-[#FFDAD6] border border-[#BA1A1A]/20 text-[#93000A] text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{authError}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-[#4A6B56]/15 border border-[#4A6B56]/30 text-[#4A6B56] text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1-Click Google OAuth Button */}
        <button
          type="button"
          onClick={() => loginWithGoogle()}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-[#FAF7F2] hover:bg-[#EFECE3] border border-[rgba(45,41,38,0.12)] text-[#181615] font-medium text-xs flex items-center justify-center gap-2.5 transition shadow-xs cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[rgba(45,41,38,0.08)]"></div>
          <span className="flex-shrink mx-3 text-[10px] uppercase font-mono tracking-widest text-[#7A746E]">
            Or with email
          </span>
          <div className="flex-grow border-t border-[rgba(45,41,38,0.08)]"></div>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-[11px] font-medium text-[#2D2926] block mb-1 font-mono uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2 rounded-xl bg-[#EFECE3] border border-[rgba(45,41,38,0.12)] text-xs text-[#181615] placeholder-[#7A746E] focus:outline-none focus:bg-[#FAF7F2] focus:border-[#C2A26F] transition"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#2D2926] block mb-1 font-mono uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2 rounded-xl bg-[#EFECE3] border border-[rgba(45,41,38,0.12)] text-xs text-[#181615] placeholder-[#7A746E] focus:outline-none focus:bg-[#FAF7F2] focus:border-[#C2A26F] transition"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-2.5 rounded-md font-semibold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
          >
            {isSubmitting
              ? 'Signing in...'
              : mode === 'signin'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        {/* Continue in Local Vault (Guest Mode) */}
        <div className="pt-2 border-t border-[rgba(45,41,38,0.08)] flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onContinueOffline}
            className="text-xs text-[#7A746E] hover:text-[#181615] transition cursor-pointer flex items-center gap-1.5"
          >
            <span>Continue as Guest (Offline Mode)</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
          <span className="text-[10px] text-[#7A746E] uppercase font-mono">
            Local data saved on device
          </span>
        </div>
      </div>
    </div>
  )
}

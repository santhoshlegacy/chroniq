import React, { useState } from 'react'
import { ChroniqLogo } from './ChroniqLogo'
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
        setSuccessMessage('Welcome back! Synchronizing your mandates...')
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
    setImportStatus(`Successfully migrated ${res.imported} offline mandate${res.imported === 1 ? '' : 's'} to your cloud vault!`)
    setTimeout(() => setImportStatus(null), 5000)
  }

  const userDisplayName =
    profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member'
  const userAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url

  // ──────── Authenticated User View ────────
  if (user) {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 px-4 animate-in fade-in duration-200">
        <div className="bg-[#1B1C1E] border border-[#DAC58F]/15 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* User Header */}
          <div className="flex items-center gap-4 pb-6 border-b border-[#DAC58F]/12">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userDisplayName}
                className="w-16 h-16 rounded-2xl object-cover border border-[#DAC58F]/30 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#121315] border border-[#DAC58F]/30 text-[#F2CA50] text-xl font-bold flex items-center justify-center shadow-md font-serif">
                {userDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white truncate font-serif">
                  {userDisplayName}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#56481E] text-[#DAC58F] border border-[#DAC58F]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DAC58F]" />
                  <span>Synchronized</span>
                </span>
              </div>
              <p className="text-xs text-[#99907C] truncate mt-0.5 font-mono">{user.email}</p>
              <p className="text-[11px] text-[#DAC58F] mt-1 font-mono uppercase tracking-wider">
                Horological Series IX • Private Suite
              </p>
            </div>
          </div>

          {/* Sync Status Card */}
          <div className="p-4 rounded-xl bg-[#121315] border border-[#DAC58F]/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#99907C]">Storage Architecture</span>
              <span className="text-white font-medium flex items-center gap-1 font-mono">
                <span className="material-symbols-outlined text-sm text-[#DAC58F]">cloud_done</span>
                Supabase Cloud Vault
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#99907C]">Row-Level Security</span>
              <span className="text-white font-medium flex items-center gap-1 font-mono">
                <span className="material-symbols-outlined text-sm text-emerald-400">lock</span>
                Strict User Isolation
              </span>
            </div>
          </div>

          {/* Local Migration Banner if applicable */}
          {unmigratedLocalCount > 0 && (
            <div className="p-4 rounded-xl bg-[#56481E]/30 border border-[#DAC58F]/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Offline Mandates Awaiting Migration
                  </span>
                  <span className="text-[11px] text-[#D0C5AF]">
                    You have <strong className="text-[#F2CA50]">{unmigratedLocalCount} offline tasks</strong> saved locally on this browser.
                  </span>
                </div>
              </div>
              <button
                onClick={handleMigrate}
                className="w-full py-2 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-[#F2CA50] text-[#141211] font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Migrate to Cloud Vault
              </button>
              {importStatus && <p className="text-xs text-emerald-400 text-center">{importStatus}</p>}
            </div>
          )}

          {/* Sign Out Action */}
          <div className="pt-2 flex justify-between items-center">
            <button
              onClick={onContinueOffline}
              className="text-xs text-[#99907C] hover:text-white transition cursor-pointer"
            >
              Back to Ledger
            </button>
            <button
              onClick={() => logout()}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-[#292A2C] hover:bg-[#343537] text-white text-xs font-medium border border-[#DAC58F]/15 flex items-center gap-1.5 transition cursor-pointer"
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
      <div className="bg-[#1B1C1E] border border-[#DAC58F]/20 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Subtle Ambient Backlight */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#DAC58F]/10 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl border border-[#DAC58F]/30 bg-[#0D0E10] flex items-center justify-center shadow-lg p-2">
            <ChroniqLogo className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-serif pt-1">
            {mode === 'signin' ? 'Enter Executive Suite' : 'Create Sovereign Account'}
          </h1>
          <p className="text-xs text-[#99907C] max-w-xs mx-auto leading-relaxed">
            {mode === 'signin'
              ? 'Access synchronized reminders, multi-device web push, and encrypted mandate history.'
              : 'Join the horological cadence of precision personal productivity.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex p-1 rounded-xl bg-[#121315] border border-[#DAC58F]/15">
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              clearAuthError()
              setSuccessMessage(null)
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F2CA50] text-[#141211] shadow-sm'
                : 'text-[#99907C] hover:text-[#E3E2E5]'
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
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F2CA50] text-[#141211] shadow-sm'
                : 'text-[#99907C] hover:text-[#E3E2E5]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error / Success Messages */}
        {authError && (
          <div className="p-3 rounded-xl bg-[#93000A]/30 border border-[#FFB4AB]/20 text-[#FFDAD6] text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{authError}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-[#56481E]/40 border border-[#DAC58F]/30 text-[#DAC58F] text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1-Click Google OAuth Button */}
        <button
          type="button"
          onClick={() => loginWithGoogle()}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-[#121315] hover:bg-[#24262A] border border-[#DAC58F]/20 text-white font-medium text-xs flex items-center justify-center gap-2.5 transition shadow-sm cursor-pointer"
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
          <div className="flex-grow border-t border-[#DAC58F]/10"></div>
          <span className="flex-shrink mx-3 text-[10px] uppercase font-mono tracking-widest text-[#99907C]">
            Or with email
          </span>
          <div className="flex-grow border-t border-[#DAC58F]/10"></div>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-[11px] font-medium text-[#D0C5AF] block mb-1 font-mono uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="executive@chroniq.io"
              className="w-full px-3.5 py-2 rounded-xl bg-[#121315] border border-[#DAC58F]/20 text-xs text-white placeholder-[#99907C]/60 focus:outline-none focus:border-[#DAC58F] transition"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#D0C5AF] block mb-1 font-mono uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2 rounded-xl bg-[#121315] border border-[#DAC58F]/20 text-xs text-white placeholder-[#99907C]/60 focus:outline-none focus:border-[#DAC58F] transition"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F2CA50] text-[#141211] font-semibold text-xs uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSubmitting
              ? 'Calibrating...'
              : mode === 'signin'
              ? 'Sign In to Suite'
              : 'Create Account'}
          </button>
        </form>

        {/* Continue in Local Vault (Guest Mode) */}
        <div className="pt-2 border-t border-[#DAC58F]/10 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onContinueOffline}
            className="text-xs text-[#99907C] hover:text-[#DAC58F] transition cursor-pointer flex items-center gap-1.5"
          >
            <span>Continue in Local Vault (Guest Mode)</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
          <span className="text-[10px] text-[#99907C]/60 uppercase font-mono">
            Local data preserved on device
          </span>
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import {
  ShieldCheck,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Mail,
  Lock,
  Sparkles,
  Bell,
  HardDrive,
  CloudUpload,
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useTaskStore } from '@/store/useTaskStore'
import logoImg from '@/assets/logo.png'

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
        setSuccessMessage('Welcome back! Syncing your tasks...')
      }
    } else {
      const res = await signUpWithEmail(email, password)
      if (!res.error) {
        setSuccessMessage('Account created! Check your email to confirm if verification is enabled, or sign in.')
      }
    }
    setIsSubmitting(false)
  }

  const handleMigrate = async () => {
    const res = await importLocalTasksToCloud()
    setImportStatus(`Successfully migrated ${res.imported} offline task${res.imported === 1 ? '' : 's'} to your cloud account!`)
    setTimeout(() => setImportStatus(null), 5000)
  }

  const userDisplayName =
    profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member'
  const userAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url

  // ──────── Authenticated User View ────────
  if (user) {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 px-4 animate-in fade-in duration-200">
        <div className="surface-panel rounded-2xl p-6 sm:p-8 space-y-6">
          {/* User Header */}
          <div className="flex items-center space-x-4 pb-6 border-b border-white/[0.08]">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userDisplayName}
                className="w-16 h-16 rounded-2xl object-cover border border-white/[0.12] shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1E2B40] to-[#121826] border border-[#5EEAD4]/30 text-[#5EEAD4] text-xl font-bold flex items-center justify-center shadow-md font-['Outfit']">
                {userDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white truncate font-['Outfit']">{userDisplayName}</h2>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                  <Cloud className="w-2.5 h-2.5" />
                  <span>Cloud Active</span>
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] truncate mt-0.5">{user.email}</p>
              <p className="text-[11px] text-[#64748B] mt-1 font-mono">
                Member since {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Sync & Security Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#161F2E] border border-white/[0.04] space-y-1">
              <div className="flex items-center space-x-2 text-xs font-semibold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Row-Level Security</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                Your tasks are encrypted and strictly isolated to your user ID.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#161F2E] border border-white/[0.04] space-y-1">
              <div className="flex items-center space-x-2 text-xs font-semibold text-white">
                <Bell className="w-4 h-4 text-[#5EEAD4]" />
                <span>Web Push Delivery</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                VAPID reminders deliver automated check-ins directly to this device.
              </p>
            </div>
          </div>

          {/* Migration Banner if offline tasks exist */}
          {unmigratedLocalCount > 0 && (
            <div className="p-4 rounded-xl bg-[#161F2E] border border-[#5EEAD4]/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-white font-medium">
                  <CloudUpload className="w-4 h-4 text-[#5EEAD4]" />
                  <span>{unmigratedLocalCount} Offline Tasks Available</span>
                </div>
                <button
                  onClick={handleMigrate}
                  className="px-3 py-1 rounded-lg btn-primary text-xs font-semibold cursor-pointer"
                >
                  Migrate to Cloud
                </button>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Tasks created while in guest mode can be uploaded to your cloud account to sync across all devices.
              </p>
              {importStatus && (
                <p className="text-xs text-emerald-400 font-medium">{importStatus}</p>
              )}
            </div>
          )}

          {/* Sign Out Button */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={onContinueOffline}
              className="text-xs text-[#94A3B8] hover:text-white transition cursor-pointer"
            >
              Return to Tasks →
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-[#161F2E] hover:bg-rose-950/40 border border-white/[0.08] hover:border-rose-500/30 text-xs font-semibold text-rose-400 transition flex items-center space-x-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ──────── Unauthenticated Login / Signup View ────────
  return (
    <div className="max-w-md mx-auto py-8 sm:py-12 px-4 animate-in fade-in duration-200">
      <div className="surface-panel rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl overflow-hidden border border-white/[0.12] bg-[#121826] flex items-center justify-center shadow-xl">
            <img
              src={logoImg}
              alt="Chroniq"
              className="w-full h-full object-cover scale-[2.2] translate-y-[22%]"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-['Outfit']">
            {mode === 'signin' ? 'Welcome back to Chroniq' : 'Create your Chroniq account'}
          </h1>
          <p className="text-xs text-[#94A3B8] max-w-xs mx-auto">
            Own your time. Finish what matters. Precision cadence & background reminders.
          </p>
        </div>

        {/* Tab Selector: Sign In / Create Account */}
        <div className="flex items-center p-1 rounded-xl bg-[#161F2E] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              clearAuthError()
              setSuccessMessage(null)
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              mode === 'signin'
                ? 'bg-[#1E2B40] text-white font-semibold shadow-xs'
                : 'text-[#94A3B8] hover:text-white'
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
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#1E2B40] text-white font-semibold shadow-xs'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Banners */}
        {authError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{authError}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{successMessage}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-[#0A0E17] font-semibold text-xs transition flex items-center justify-center space-x-2.5 shadow-md cursor-pointer disabled:opacity-50"
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

        {/* Divider */}
        <div className="flex items-center space-x-3">
          <div className="h-px bg-white/[0.08] flex-1" />
          <span className="text-[11px] text-[#64748B] uppercase tracking-wider">or with email</span>
          <div className="h-px bg-white/[0.08] flex-1" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#161F2E] border border-white/[0.06] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#5EEAD4]/50 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#161F2E] border border-white/[0.06] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#5EEAD4]/50 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full py-2.5 rounded-xl btn-primary text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>{mode === 'signin' ? 'Sign In to Chroniq' : 'Create Account'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Offline Guest Mode Button */}
        <div className="pt-2 border-t border-white/[0.06] text-center">
          <button
            type="button"
            onClick={onContinueOffline}
            className="text-xs text-[#94A3B8] hover:text-[#5EEAD4] transition flex items-center justify-center space-x-1.5 mx-auto cursor-pointer"
          >
            <HardDrive className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Continue in Offline Guest Mode</span>
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="pt-2 grid grid-cols-3 gap-2 text-center text-[10px] text-[#64748B]">
          <div className="p-2 rounded-lg bg-[#161F2E]/60 border border-white/[0.03]">
            <Sparkles className="w-3.5 h-3.5 text-[#5EEAD4] mx-auto mb-1" />
            <span>10m Warnings</span>
          </div>
          <div className="p-2 rounded-lg bg-[#161F2E]/60 border border-white/[0.03]">
            <Cloud className="w-3.5 h-3.5 text-[#C4B5FD] mx-auto mb-1" />
            <span>Cross-Device</span>
          </div>
          <div className="p-2 rounded-lg bg-[#161F2E]/60 border border-white/[0.03]">
            <Bell className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
            <span>Web Push</span>
          </div>
        </div>
      </div>
    </div>
  )
}


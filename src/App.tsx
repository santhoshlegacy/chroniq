import { useState, useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { ReminderHero } from './components/ReminderHero'
import { StatsGrid } from './components/StatsGrid'
import { QuickAddTask } from './components/QuickAddTask'
import { TaskFilterBar } from './components/TaskFilterBar'
import { TaskList } from './components/TaskList'
import { TaskModal } from './components/TaskModal'
import { SettingsModal } from './components/SettingsModal'
import { InstallModal } from './components/InstallModal'
import { useTaskStore } from './store/useTaskStore'
import { useSettingsStore } from './store/useSettingsStore'
import { useAuthStore } from './store/useAuthStore'
import type { Task } from './types'
import { Download, X, ShieldCheck, WifiOff, AlertTriangle, CloudUpload, CheckCircle2 } from 'lucide-react'
import logoImg from './assets/logo.png'
import './App.css'

export function App() {
  const { syncWithSupabase, errorMessage, clearError, unmigratedLocalCount, importLocalTasksToCloud } = useTaskStore()
  const { refreshPermission, syncSettingsWithSupabase } = useSettingsStore()
  const { initializeAuth, user, authError, clearAuthError } = useAuthStore()

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isInstallOpen, setIsInstallOpen] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  // PWA & Installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isBannerDismissed, setIsBannerDismissed] = useState(true)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    initializeAuth()
    syncWithSupabase()
    syncSettingsWithSupabase()
    refreshPermission()

    // Detect standalone mode
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    setIsStandalone(standaloneMode)

    // Check banner dismissal
    const dismissed = localStorage.getItem('chroniq_install_banner_dismissed') === 'true'
    setIsBannerDismissed(dismissed)

    // Capture beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    // Capture appinstalled event
    const handleAppInstalled = () => {
      setIsStandalone(true)
      setDeferredPrompt(null)
      setIsBannerDismissed(true)
      localStorage.setItem('chroniq_install_banner_dismissed', 'true')
    }

    const handleOnline = () => {
      setIsOnline(true)
      syncWithSupabase()
    }
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [initializeAuth, syncWithSupabase, syncSettingsWithSupabase, refreshPermission])

  // Sync settings and tasks when user logs in or out
  useEffect(() => {
    if (user) {
      syncWithSupabase()
      syncSettingsWithSupabase()
    }
  }, [user, syncWithSupabase, syncSettingsWithSupabase])

  const handleDismissBanner = () => {
    localStorage.setItem('chroniq_install_banner_dismissed', 'true')
    setIsBannerDismissed(true)
  }

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsStandalone(true)
      setIsBannerDismissed(true)
      localStorage.setItem('chroniq_install_banner_dismissed', 'true')
    }
    setDeferredPrompt(null)
  }

  const handleOpenNewTask = () => {
    setTaskToEdit(null)
    setIsTaskModalOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task)
    setIsTaskModalOpen(true)
  }

  const handleImportLocalTasks = async () => {
    const res = await importLocalTasksToCloud()
    setImportStatus(`Successfully migrated ${res.imported} task${res.imported === 1 ? '' : 's'} to your cloud account!`)
    setTimeout(() => setImportStatus(null), 5000)
  }

  return (
    <div className="min-h-screen bg-[#080B12] text-[#E7ECF4] relative selection:bg-[#70DFFF]/20 selection:text-[#70DFFF] flex flex-col justify-between">
      <div>
        {/* Navigation */}
        <Navbar
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenNewTask={handleOpenNewTask}
          onOpenInstall={() => setIsInstallOpen(true)}
          isStandalone={isStandalone}
        />

        {/* Offline Status Warning Banner */}
        {!isOnline && (
          <div className="bg-[#1C1F2B] border-b border-amber-500/20 py-2 px-4 text-xs text-amber-200">
            <div className="max-w-6xl mx-auto flex items-center space-x-2">
              <WifiOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>
                Offline mode active. Your local tasks remain saved on this device. Cloud sync and scheduler triggers will resume once connection is restored.
              </span>
            </div>
          </div>
        )}

        {/* Auth Error Banner (Honest error states) */}
        {authError && (
          <div className="bg-rose-950/40 border-b border-rose-500/20 py-2 px-4 text-xs text-rose-200">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span>{authError}</span>
              </div>
              <button
                onClick={clearAuthError}
                className="text-rose-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Database/Network Error Banner */}
        {errorMessage && (
          <div className="bg-rose-950/40 border-b border-rose-500/20 py-2 px-4 text-xs text-rose-200">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={clearError}
                className="text-rose-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Local Offline Tasks Migration Banner */}
        {user && unmigratedLocalCount > 0 && !importStatus && (
          <div className="bg-[#151B28] border-b border-[#70DFFF]/20 py-2.5 px-4 text-xs text-[#E7ECF4]">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <CloudUpload className="w-4 h-4 text-[#70DFFF] flex-shrink-0" />
                <span>
                  You have <strong className="text-white font-medium">{unmigratedLocalCount} offline tasks</strong> saved on this device. Migrate them into your authenticated cloud account?
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleImportLocalTasks}
                  className="px-2.5 py-1 rounded-md bg-[#70DFFF] text-[#080B12] font-semibold hover:bg-[#58CFEF] transition cursor-pointer text-[11px]"
                >
                  Import to Cloud
                </button>
              </div>
            </div>
          </div>
        )}

        {importStatus && (
          <div className="bg-emerald-950/40 border-b border-emerald-500/20 py-2 px-4 text-xs text-emerald-300">
            <div className="max-w-6xl mx-auto flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{importStatus}</span>
            </div>
          </div>
        )}

        {/* PWA Installation Callout Banner */}
        {!isStandalone && !isBannerDismissed && (
          <div className="bg-[#111827] border-b border-white/[0.06] py-2 px-4 text-xs">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-[#94A3B8]">
                <Download className="w-3.5 h-3.5 text-[#70DFFF] flex-shrink-0" />
                <span>
                  Install Chroniq as a Progressive Web App directly for offline access and native home screen integration.
                </span>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => {
                    if (deferredPrompt) {
                      handleInstallPwa()
                    } else {
                      setIsInstallOpen(true)
                    }
                  }}
                  className="px-2.5 py-1 rounded-md bg-[#151B28] hover:bg-[#1C2436] text-[#70DFFF] font-medium border border-white/[0.06] transition cursor-pointer text-[11px]"
                >
                  {deferredPrompt ? 'Install Now' : 'Install Guide'}
                </button>
                <button
                  onClick={handleDismissBanner}
                  className="p-1 rounded-md text-[#64748B] hover:text-[#94A3B8] transition cursor-pointer"
                  title="Dismiss banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* 1. Dashboard Introduction & Scheduled Rhythm Strip */}
          <ReminderHero />

          {/* 2. Executive Productivity Summary */}
          <StatsGrid />

          {/* 3. Integrated Quick Add Field */}
          <QuickAddTask />

          {/* 4. Task Navigation & Filters */}
          <TaskFilterBar onOpenNewTask={handleOpenNewTask} />

          {/* 5. Primary Work Focus: Task List */}
          <TaskList
            onEditTask={handleEditTask}
            onOpenNewTask={handleOpenNewTask}
          />
        </main>
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false)
          setTaskToEdit(null)
        }}
        taskToEdit={taskToEdit}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <InstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallPwa={handleInstallPwa}
        isStandalone={isStandalone}
      />

      {/* Understated, Refined Footer */}
      <footer className="border-t border-white/[0.06] py-6 text-xs text-[#64748B] bg-[#080B12]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-5 h-5 rounded-md overflow-hidden border border-white/[0.1] bg-[#111827] flex-shrink-0 flex items-center justify-center">
              <img
                src={logoImg}
                alt="Chroniq"
                className="w-full h-full object-cover scale-[2.2] translate-y-[22%]"
              />
            </div>
            <span className="font-semibold text-white/90 font-['Outfit']">Chroniq</span>
            <span>—</span>
            <span>Own your time. Finish what matters.</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-[#64748B]">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-User RLS • 5-Slot Reminder Rhythm</span>
            </span>
            <span>•</span>
            <button
              onClick={() => setIsInstallOpen(true)}
              className="hover:text-[#94A3B8] transition cursor-pointer"
            >
              Install App (PWA)
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

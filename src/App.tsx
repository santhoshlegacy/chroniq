import { useState, useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { BottomNav, type NavTab } from './components/BottomNav'
import { ReminderHero } from './components/ReminderHero'
import { StatsGrid } from './components/StatsGrid'
import { QuickAddTask } from './components/QuickAddTask'
import { TaskFilterBar } from './components/TaskFilterBar'
import { TaskList } from './components/TaskList'
import { TaskModal } from './components/TaskModal'
import { TaskDetailModal } from './components/TaskDetailModal'
import { SettingsModal } from './components/SettingsModal'
import { SettingsView } from './components/SettingsView'
import { AuthPage } from './components/AuthPage'
import { InstallModal } from './components/InstallModal'
import { useTaskStore } from './store/useTaskStore'
import { useSettingsStore } from './store/useSettingsStore'
import { useAuthStore } from './store/useAuthStore'
import type { Task } from './types'
import { Download, X, ShieldCheck, WifiOff, AlertTriangle, CloudUpload, CheckCircle2 } from 'lucide-react'
import logoImg from './assets/logo.png'
import './App.css'

export function App() {
  const { tasks, syncWithSupabase, errorMessage, clearError, unmigratedLocalCount, importLocalTasksToCloud } = useTaskStore()
  const { permission, refreshPermission, syncSettingsWithSupabase } = useSettingsStore()
  const { initializeAuth, user, authError, clearAuthError } = useAuthStore()

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<NavTab>('tasks')

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
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

  // ── Client-side In-App Deadline Monitor (10m Before & Exact Deadline) ──
  useEffect(() => {
    if (permission !== 'granted') return

    const notifiedKeys = new Set<string>()

    const checkDeadlines = () => {
      const now = Date.now()
      const pendingWithDue = tasks.filter(
        (t) => t.status !== 'completed' && t.archived_at === null && t.due_at !== null
      )

      for (const t of pendingWithDue) {
        if (!t.due_at) continue
        const dueTime = new Date(t.due_at).getTime()
        if (isNaN(dueTime)) continue

        const diffMins = (dueTime - now) / 60000

        // 10 minutes BEFORE deadline
        if (diffMins >= 8.5 && diffMins <= 10.5) {
          const key10m = `client:10m:${t.id}:${dueTime}`
          if (!notifiedKeys.has(key10m)) {
            notifiedKeys.add(key10m)
            try {
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                void navigator.serviceWorker.ready.then((reg) => {
                  void reg.showNotification('Chroniq — Due in 10 Minutes', {
                    body: `"${t.title}" is due in 10 minutes.`,
                    icon: '/icons/icon-192.png',
                    tag: `chroniq-10m-${t.id}`,
                  })
                })
              }
            } catch {
              // Notification fallback
            }
          }
        }

        // Exact deadline (Due now) — Strict window prevents late notifications
        if (diffMins >= -0.5 && diffMins <= 1.5) {
          const keyDue = `client:due:${t.id}:${dueTime}`
          if (!notifiedKeys.has(keyDue)) {
            notifiedKeys.add(keyDue)
            try {
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                void navigator.serviceWorker.ready.then((reg) => {
                  void reg.showNotification('Chroniq — Task Due Now', {
                    body: `"${t.title}" is due now!`,
                    icon: '/icons/icon-192.png',
                    tag: `chroniq-due-${t.id}`,
                  })
                })
              }
            } catch {
              // Notification fallback
            }
          }
        }
      }
    }

    checkDeadlines()
    const timer = setInterval(checkDeadlines, 30000)
    return () => clearInterval(timer)
  }, [tasks, permission])

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
    <div className="min-h-screen bg-[#0A0E17] text-[#F3F4F8] relative selection:bg-[#5EEAD4]/20 selection:text-[#5EEAD4] flex flex-col justify-between">
      <div>
        {/* Navigation Header with Desktop Tabs */}
        <Navbar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenSettings={() => setActiveTab('settings')}
          onOpenNewTask={handleOpenNewTask}
          onOpenInstall={() => setIsInstallOpen(true)}
          isStandalone={isStandalone}
        />

        {/* Offline Status Warning Banner */}
        {!isOnline && (
          <div className="bg-[#182233] border-b border-amber-500/20 py-2 px-4 text-xs text-amber-200">
            <div className="max-w-6xl mx-auto flex items-center space-x-2">
              <WifiOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>
                Offline mode active. Your local tasks remain saved on this device. Cloud sync and scheduler triggers will resume once connection is restored.
              </span>
            </div>
          </div>
        )}

        {/* Auth Error Banner */}
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
          <div className="bg-[#121826] border-b border-[#5EEAD4]/20 py-2.5 px-4 text-xs text-[#F3F4F8]">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <CloudUpload className="w-4 h-4 text-[#5EEAD4] flex-shrink-0" />
                <span>
                  You have <strong className="text-white font-medium">{unmigratedLocalCount} offline tasks</strong> saved on this device. Migrate them into your authenticated cloud account?
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleImportLocalTasks}
                  className="px-3 py-1 rounded-lg btn-primary font-semibold transition cursor-pointer text-[11px]"
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
          <div className="bg-[#121826] border-b border-white/[0.06] py-2 px-4 text-xs">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-[#94A3B8]">
                <Download className="w-3.5 h-3.5 text-[#5EEAD4] flex-shrink-0" />
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
                  className="px-2.5 py-1 rounded-lg bg-[#182233] hover:bg-[#1E2B40] text-[#5EEAD4] font-medium border border-white/[0.08] transition cursor-pointer text-[11px]"
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

        {/* ──────── TABBED VIEWS ROUTER ──────── */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 sm:pb-20">
          {/* VIEW 1: TASKS / FOCUS */}
          {activeTab === 'tasks' && (
            <div className="animate-in fade-in duration-200">
              {/* Top Greeting */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-['Outfit']">
                    Focus on what matters.
                  </h1>
                  <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
                    Your daily focus window. Click any task to inspect details or update progress.
                  </p>
                </div>
              </div>

              {/* Quick Add Task Input */}
              <QuickAddTask />

              {/* Task Navigation & Filters */}
              <TaskFilterBar onOpenNewTask={handleOpenNewTask} />

              {/* Primary Work Focus: Task List */}
              <TaskList
                onEditTask={handleEditTask}
                onOpenNewTask={handleOpenNewTask}
                onSelectTask={(task) => setSelectedTask(task)}
              />
            </div>
          )}

          {/* VIEW 2: SCHEDULE & CADENCE */}
          {activeTab === 'schedule' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Reminder Hero & Cadence Strip */}
              <ReminderHero />

              {/* Executive Productivity Summary */}
              <StatsGrid />
            </div>
          )}

          {/* VIEW 3: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="animate-in fade-in duration-200">
              <SettingsView />
            </div>
          )}

          {/* VIEW 4: AUTH / ACCOUNT */}
          {activeTab === 'account' && (
            <div className="animate-in fade-in duration-200">
              <AuthPage onContinueOffline={() => setActiveTab('tasks')} />
            </div>
          )}
        </main>
      </div>

      {/* Floating Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Modals */}
      {/* 1. Floating Task Detail Modal (Bottom Sheet / Dialog) */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onEdit={handleEditTask}
      />

      {/* 2. Task Edit/Create Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false)
          setTaskToEdit(null)
        }}
        taskToEdit={taskToEdit}
      />

      {/* 3. Quick Settings Modal (if opened via quick shortcuts) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* 4. PWA Installation Guide Modal */}
      <InstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallPwa={handleInstallPwa}
        isStandalone={isStandalone}
      />

      {/* Understated, Refined Luxury Footer */}
      <footer className="border-t border-white/[0.06] py-6 text-xs text-[#64748B] bg-[#0A0E17] mb-16 sm:mb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-5 h-5 rounded-md overflow-hidden border border-white/[0.1] bg-[#121826] flex-shrink-0 flex items-center justify-center">
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
              <span>Multi-User RLS • 10m Smart Reminders</span>
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

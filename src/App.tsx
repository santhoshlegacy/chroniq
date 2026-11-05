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
import { SplashScreen } from './components/SplashScreen'
import { InAppToast } from './components/InAppToast'
import logoUrl from './assets/logo.png'
import { useTaskStore } from './store/useTaskStore'
import { useSettingsStore } from './store/useSettingsStore'
import { useAuthStore } from './store/useAuthStore'
import type { Task } from './types'
import { Download, X, WifiOff, AlertTriangle, CloudUpload, CheckCircle2 } from 'lucide-react'
import './App.css'

export function App() {
  const { tasks, syncWithSupabase, errorMessage, clearError, unmigratedLocalCount, importLocalTasksToCloud } = useTaskStore()
  const { refreshPermission, syncSettingsWithSupabase } = useSettingsStore()
  const { initializeAuth, user, authError, clearAuthError } = useAuthStore()

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<NavTab>('tasks')

  // TrueSynk Cinematic Splash Screen
  const [showSplash, setShowSplash] = useState(() => {
    return sessionStorage.getItem('chroniq_splash_seen') !== 'true'
  })

  // In-App Toast Notification
  const [activeToast, setActiveToast] = useState<{ task: Task; type: '10m' | 'due' } | null>(null)

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isInstallOpen, setIsInstallOpen] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  // PWA & Installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(
    typeof window !== 'undefined' ? (window as any).__deferredInstallPrompt : null
  )
  const [isStandalone, setIsStandalone] = useState(false)
  const [isBannerDismissed, setIsBannerDismissed] = useState(false)
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
            setActiveToast({ task: t, type: '10m' })
            try {
              if ('Notification' in window && Notification.permission === 'granted') {
                if ('serviceWorker' in navigator) {
                  void navigator.serviceWorker.ready.then((reg) => {
                    void reg.showNotification('Chroniq — Due in 10 Minutes', {
                      body: `"${t.title}" is due in 10 minutes.`,
                      icon: logoUrl,
                      badge: logoUrl,
                      tag: `chroniq-10m-${t.id}`,
                    })
                  })
                }
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
            setActiveToast({ task: t, type: 'due' })
            try {
              if ('Notification' in window && Notification.permission === 'granted') {
                if ('serviceWorker' in navigator) {
                  void navigator.serviceWorker.ready.then((reg) => {
                    void reg.showNotification('Chroniq — Task Due Now', {
                      body: `"${t.title}" is due now!`,
                      icon: logoUrl,
                      badge: logoUrl,
                      tag: `chroniq-due-${t.id}`,
                    })
                  })
                }
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
  }, [tasks])

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
    setImportStatus(`Successfully migrated ${res.imported} task${res.imported === 1 ? '' : 's'} to your cloud storage!`)
    setTimeout(() => setImportStatus(null), 5000)
  }

  const handleCompleteSplash = () => {
    sessionStorage.setItem('chroniq_splash_seen', 'true')
    setShowSplash(false)
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] relative selection:bg-[#C2A26F]/30 selection:text-[#181615] flex flex-col justify-between font-sans">
      {/* TrueSynk Cinematic Splash Screen */}
      {showSplash && <SplashScreen onEnter={handleCompleteSplash} />}

      <div className="relative z-10">
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
          <div className="bg-[#F4EFEB] border-b border-[rgba(45,41,38,0.08)] py-2.5 px-4 text-xs text-[#2D2926]">
            <div className="editorial-container flex items-center space-x-2">
              <WifiOff className="w-3.5 h-3.5 text-[#745A2E] flex-shrink-0" />
              <span>
                Offline mode active. Your tasks remain saved securely on this device. Cloud sync will resume once connection is restored.
              </span>
            </div>
          </div>
        )}

        {/* Auth Error Banner */}
        {authError && (
          <div className="bg-[#FFDAD6] border-b border-[#BA1A1A]/20 py-2.5 px-4 text-xs text-[#93000A]">
            <div className="editorial-container flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#BA1A1A] flex-shrink-0" />
                <span>{authError}</span>
              </div>
              <button
                onClick={clearAuthError}
                className="text-[#93000A] hover:text-[#BA1A1A] p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Database/Network Error Banner */}
        {errorMessage && (
          <div className="bg-[#FFDAD6] border-b border-[#BA1A1A]/20 py-2.5 px-4 text-xs text-[#93000A]">
            <div className="editorial-container flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#BA1A1A] flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={clearError}
                className="text-[#93000A] hover:text-[#BA1A1A] p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Local Offline Tasks Migration Banner */}
        {user && unmigratedLocalCount > 0 && !importStatus && (
          <div className="bg-[#F4EFEB] border-b border-[#C2A26F]/30 py-2.5 px-4 text-xs text-[#2D2926]">
            <div className="editorial-container flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <CloudUpload className="w-4 h-4 text-[#745A2E] flex-shrink-0" />
                <span>
                  You have <strong className="text-[#181615] font-semibold">{unmigratedLocalCount} offline tasks</strong> saved on this device. Sync them to your cloud storage?
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleImportLocalTasks}
                  className="px-3 py-1 rounded-md bg-[#181615] hover:bg-[#2D2926] text-[#FAF7F2] font-semibold text-[11px] transition cursor-pointer"
                >
                  Import to Cloud
                </button>
              </div>
            </div>
          </div>
        )}

        {importStatus && (
          <div className="bg-[#4A6B56]/15 border-b border-[#4A6B56]/30 py-2 px-4 text-xs text-[#4A6B56]">
            <div className="editorial-container flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#4A6B56]" />
              <span>{importStatus}</span>
            </div>
          </div>
        )}

        {/* PWA Installation Callout Banner */}
        {!isStandalone && !isBannerDismissed && (
          <div className="editorial-container my-3 sm:my-4">
            <div className="bg-[#F4EFEB] border border-[rgba(45,41,38,0.1)] rounded-xl py-2.5 px-4 text-xs flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center space-x-2 text-[#7A746E] min-w-0">
                <Download className="w-3.5 h-3.5 text-[#745A2E] flex-shrink-0" />
                <span className="truncate sm:overflow-visible">
                  Install Chroniq for quick home screen access and offline support.
                </span>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const prompt = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__deferredInstallPrompt : null)
                    if (prompt) {
                      handleInstallPwa()
                    } else {
                      setIsInstallOpen(true)
                    }
                  }}
                  className="px-3 py-1 rounded-md bg-[#1C1917] hover:bg-[#2D2926] text-[#FAF7F2] font-semibold transition cursor-pointer text-[11px] shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3 h-3 text-[#C2A26F]" />
                  <span>Install App</span>
                </button>
                <button
                  onClick={handleDismissBanner}
                  className="p-1 rounded-md text-[#7A746E] hover:text-[#181615] transition cursor-pointer"
                  title="Dismiss banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ──────── TABBED VIEWS ROUTER ──────── */}
        <main className="editorial-container py-8 sm:py-12 pb-32 sm:pb-28">
          {/* Active In-App Toast Notification Stack */}
          {activeToast && (
            <div className="mb-6">
              <InAppToast
                task={activeToast.task}
                type={activeToast.type}
                onAcknowledge={() => setActiveToast(null)}
                onSnooze={() => {
                  setActiveToast(null)
                  setTimeout(() => {
                    setActiveToast({ task: activeToast.task, type: activeToast.type })
                  }, 5 * 60 * 1000)
                }}
                onDismiss={() => setActiveToast(null)}
              />
            </div>
          )}

          {/* VIEW 1: TASKS / FOCUS */}
          {activeTab === 'tasks' && (
            <div className="animate-in fade-in duration-200">
              {/* Editorial Header */}
              <div className="mb-8 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[rgba(45,41,38,0.08)] pb-5">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#745A2E] mb-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#745A2E]" />
                    <span>True Synk</span>
                    <span className="text-[#7A746E]">•</span>
                    <span className="text-[#7A746E]">Smart Reminders &amp; Focus</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-serif text-[#181615] tracking-tight">
                    Focus on What Matters.
                  </h1>
                  <p className="text-xs sm:text-sm text-[#7A746E] mt-1 max-w-xl">
                    Manage your daily tasks, view details, and track your progress.
                  </p>
                </div>
              </div>

              {/* Frictionless Inscription Quick Add Bar */}
              <QuickAddTask />

              {/* Editorial Filter Horizon Bar */}
              <TaskFilterBar onOpenNewTask={handleOpenNewTask} />

              {/* Master Ledger Task List */}
              <TaskList
                onEditTask={handleEditTask}
                onOpenNewTask={handleOpenNewTask}
                onSelectTask={(task) => setSelectedTask(task)}
              />
            </div>
          )}

          {/* VIEW 2: SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="animate-in fade-in duration-200 space-y-8">
              {/* Reminder Hero & Schedule Strip */}
              <ReminderHero />

              {/* Executive Productivity Summary */}
              <StatsGrid />
            </div>
          )}

          {/* VIEW 3: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="animate-in fade-in duration-200">
              <SettingsView
                onOpenInstall={() => setIsInstallOpen(true)}
                isStandalone={isStandalone}
              />
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

      {/* Floating Bottom Navigation Bar with Quick-Add */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onQuickAdd={handleOpenNewTask}
      />

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

      {/* 3. Quick Settings Modal */}
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

      {/* Footer */}
      <footer className="relative z-10 border-t border-[rgba(45,41,38,0.08)] py-8 text-xs text-[#7A746E] bg-[#FAF7F2] mb-16 sm:mb-0">
        <div className="editorial-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-[rgba(45,41,38,0.12)] bg-[#F4EFEB] flex-shrink-0 flex items-center justify-center p-0.5 shadow-xs">
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
            <span className="font-semibold text-[#181615] font-serif">Chroniq</span>
            <span>—</span>
            <span>Smart Reminders &amp; Precision Task Management</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] font-mono text-[#7A746E]">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#745A2E]" />
              <span>Cloud Synced • 10m Push Alerts</span>
            </span>
            <span>•</span>
            <button
              onClick={() => setShowSplash(true)}
              className="hover:text-[#181615] transition cursor-pointer"
            >
              Splash Screen
            </button>
            <span>•</span>
            <button
              onClick={() => setIsInstallOpen(true)}
              className="hover:text-[#181615] transition cursor-pointer"
            >
              Install App
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

import React from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { useAuthStore } from '@/store/useAuthStore'

export type NavTab = 'tasks' | 'schedule' | 'settings' | 'account'

interface BottomNavProps {
  activeTab: NavTab
  onSelectTab: (tab: NavTab) => void
  onQuickAdd?: () => void
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab, onQuickAdd }) => {
  const { tasks } = useTaskStore()
  const { user } = useAuthStore()

  const pendingCount = tasks.filter((t) => t.status !== 'completed' && t.archived_at === null).length

  const tabs: { id: NavTab; label: string; icon: string; badge?: number }[] = [
    {
      id: 'tasks',
      label: 'Tasks',
      icon: 'checklist',
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: 'schedule',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'tune',
    },
    {
      id: 'account',
      label: user ? 'Account' : 'Sign In',
      icon: 'workspace_premium',
    },
  ]

  return (
    <>
      {/* Floating Quick Inscribe Button (Mobile & Desktop) */}
      {onQuickAdd && (
        <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-8 z-50">
          <button
            onClick={onQuickAdd}
            aria-label="Chroniq Quick Add"
            type="button"
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F2CA50] text-[#141211] shadow-[0_8px_24px_rgba(212,175,55,0.35)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer group"
          >
            <span className="material-symbols-outlined text-[24px] font-bold group-hover:rotate-90 transition-transform duration-300">
              add
            </span>
          </button>
        </div>
      )}

      {/* Luxury Dock Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 bg-[#121315]/90 backdrop-blur-2xl border-t border-[#DAC58F]/15 shadow-[0_-8px_32px_rgba(0,0,0,0.6)]">
        <div className="max-w-md mx-auto flex items-center justify-around h-14 px-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                type="button"
                className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-all duration-200 cursor-pointer relative ${
                  isActive ? 'text-[#F2CA50] font-semibold' : 'text-[#99907C] hover:text-[#E3E2E5]'
                }`}
              >
                {/* Active Satin Pill */}
                {isActive && (
                  <div className="absolute inset-x-1.5 -inset-y-0.5 rounded-xl bg-[#56481E]/40 border border-[#DAC58F]/20 -z-10 shadow-sm" />
                )}

                <div className="relative flex items-center justify-center">
                  <span
                    className={`material-symbols-outlined text-[22px] transition-transform duration-200 ${
                      isActive ? 'scale-110' : ''
                    }`}
                  >
                    {tab.icon}
                  </span>

                  {/* Badge Counter */}
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-[#D4AF37] text-[#141211] text-[9px] font-bold flex items-center justify-center tabular-nums shadow-sm">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] uppercase tracking-wider mt-0.5 ${
                    isActive ? 'text-[#F2CA50] font-bold' : 'text-[#99907C]'
                  }`}
                >
                  {tab.label}
                </span>

                {/* Subtitle Dot for active tab */}
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-[#DAC58F] mt-0.5 shadow-[0_0_4px_#DAC58F]" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}

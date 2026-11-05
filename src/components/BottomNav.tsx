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
        <div className="fixed bottom-20 right-5 sm:bottom-24 sm:right-12 z-50">
          <button
            onClick={onQuickAdd}
            aria-label="Chroniq Quick Inscribe"
            type="button"
            className="w-12 h-12 rounded-full bg-[#181615] text-[#FAF7F2] shadow-[0_8px_24px_rgba(45,41,38,0.22)] flex items-center justify-center hover:bg-[#2D2926] hover:scale-105 active:scale-95 transition-all cursor-pointer group border border-[rgba(45,41,38,0.12)]"
          >
            <span className="material-symbols-outlined text-[24px] text-[#FEDAA3] font-bold group-hover:rotate-90 transition-transform duration-300">
              add
            </span>
          </button>
        </div>
      )}

      {/* Luxury Dock Navigation Bar in Frosted Silk Glass */}
      <nav className="fixed bottom-0 inset-x-0 z-40 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 bg-[#FAF7F2]/92 backdrop-blur-2xl border-t border-[rgba(45,41,38,0.1)] shadow-[0_-8px_32px_rgba(45,41,38,0.06)]">
        <div className="max-w-md mx-auto flex items-center justify-around h-14 px-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                type="button"
                className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-all duration-200 cursor-pointer relative ${
                  isActive ? 'text-[#181615] font-semibold' : 'text-[#7A746E] hover:text-[#181615]'
                }`}
              >
                {/* Active Satin Pill in Ecru Travertine */}
                {isActive && (
                  <div className="absolute inset-x-1.5 -inset-y-0.5 rounded-lg bg-[#EFECE3] border border-[rgba(45,41,38,0.08)] -z-10 shadow-xs" />
                )}

                <div className="relative flex items-center justify-center">
                  <span
                    className={`material-symbols-outlined text-[22px] transition-transform duration-200 ${
                      isActive ? 'scale-110 text-[#745A2E]' : ''
                    }`}
                  >
                    {tab.icon}
                  </span>

                  {/* Badge Counter */}
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-[#745A2E] text-[#FAF7F2] text-[9px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] uppercase tracking-wider mt-0.5 ${
                    isActive ? 'text-[#181615] font-bold' : 'text-[#7A746E]'
                  }`}
                >
                  {tab.label}
                </span>

                {/* Subtitle Dot for active tab */}
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-[#745A2E] mt-0.5" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}

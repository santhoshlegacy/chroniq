import React from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { useAuthStore } from '@/store/useAuthStore'

export type NavTab = 'tasks' | 'schedule' | 'settings' | 'account'

interface BottomNavProps {
  activeTab: NavTab
  onSelectTab: (tab: NavTab) => void
  onQuickAdd?: () => void
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
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
      {/* Clean Navigation Bar in Frosted Silk Glass */}
      <nav className="fixed bottom-0 inset-x-0 z-40 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 bg-[#FAF7F2]/95 backdrop-blur-2xl border-t border-[rgba(45,41,38,0.1)] shadow-[0_-4px_24px_rgba(45,41,38,0.04)]">
        <div className="max-w-md mx-auto flex items-center justify-around h-14 px-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                type="button"
                className={`flex flex-col items-center justify-center min-w-[64px] h-full py-1 transition-all duration-200 cursor-pointer relative ${
                  isActive ? 'text-[#181615]' : 'text-[#7A746E] hover:text-[#181615]'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <span
                    className={`material-symbols-outlined text-[22px] transition-colors duration-200 ${
                      isActive ? 'text-[#181615]' : 'text-[#7A746E]'
                    }`}
                  >
                    {tab.icon}
                  </span>

                  {/* Badge Counter */}
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-[#181615] text-[#FAF7F2] text-[9px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[11px] font-medium tracking-tight mt-0.5 transition-colors ${
                    isActive ? 'text-[#181615] font-semibold' : 'text-[#7A746E]'
                  }`}
                >
                  {tab.label}
                </span>

                {/* Clean Underline Indicator for active tab (No awkward misaligned square) */}
                {isActive && (
                  <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-[#181615]" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}

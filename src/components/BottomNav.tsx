import React from 'react'
import { CheckSquare, Calendar, Settings, User } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { useAuthStore } from '@/store/useAuthStore'

export type NavTab = 'tasks' | 'schedule' | 'settings' | 'account'

interface BottomNavProps {
  activeTab: NavTab
  onSelectTab: (tab: NavTab) => void
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const { tasks } = useTaskStore()
  const { user } = useAuthStore()

  const pendingCount = tasks.filter((t) => t.status !== 'completed' && t.archived_at === null).length

  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: 'account',
      label: user ? 'Account' : 'Sign In',
      icon: <User className="w-4 h-4" />,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 z-40 sm:max-w-md w-full px-2 sm:px-0">
      <div className="bottom-dock-glass rounded-t-2xl sm:rounded-2xl py-1.5 px-2 flex items-center justify-around shadow-2xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-180 cursor-pointer flex-1 ${
                isActive
                  ? 'text-white'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {/* Active Tab Background Pill */}
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-white/[0.08] border border-white/[0.1] -z-10 shadow-xs" />
              )}

              <div className="relative">
                <span className={isActive ? 'text-[#5EEAD4]' : 'text-[#94A3B8]'}>
                  {tab.icon}
                </span>

                {/* Badge Indicator */}
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#5EEAD4] text-[#0A0E17] text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-1 font-medium tracking-tight ${isActive ? 'text-white font-semibold' : 'text-[#94A3B8]'}`}>
                {tab.label}
              </span>

              {/* Active Indicator Dot */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#5EEAD4] mt-0.5" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}


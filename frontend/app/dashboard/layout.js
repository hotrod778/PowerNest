'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, Home, Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck, Sun, TrendingUp, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ProtectedRoute from '../../components/ProtectedRoute'
import RouteProgress from '../../components/ui/RouteProgress'
import DashboardSidebar from '../../components/layout/DashboardSidebar'
import ThemeToggle from '../../components/ui/ThemeToggle'

const rolePathMap = {
  '/dashboard/admin': 'ADMIN',
  '/dashboard/seller': 'SELLER',
  '/dashboard/buyer': 'BUYER',
  '/dashboard/investor': 'INVESTOR',
}

export default function DashboardLayout({ children }) {
  const { user, logout, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return

    const requiredRole = rolePathMap[pathname]
    const normalizedRole = String(user.role || '').toUpperCase()
    const canAccessAdmin = requiredRole === 'ADMIN' && Boolean(user.is_admin)

    if (requiredRole && !canAccessAdmin && normalizedRole !== requiredRole) {
      router.replace(user.is_admin ? '/dashboard/admin' : `/dashboard/${normalizedRole.toLowerCase()}`)
    }
  }, [isAuthenticated, isLoading, pathname, router, user])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedCollapse = localStorage.getItem('sidebar-collapsed')
    setSidebarCollapsed(savedCollapse === 'true')

  }, [])

  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar-collapsed', String(next))
      }
      return next
    })
  }, [])

  const roleColors = useMemo(
    () => ({
      ADMIN: 'text-primary-600 bg-primary-50',
      SELLER: 'text-yellow-500 bg-yellow-50',
      BUYER: 'text-blue-500 bg-blue-50',
      INVESTOR: 'text-green-500 bg-green-50',
    }),
    []
  )

  const roleIcons = useMemo(
    () => ({
      ADMIN: ShieldCheck,
      SELLER: Sun,
      BUYER: Zap,
      INVESTOR: TrendingUp,
    }),
    []
  )

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    )
  }

  const normalizedRole = user.is_admin ? 'ADMIN' : String(user.role || '').toUpperCase()
  const RoleIcon = roleIcons[normalizedRole] || Home

  return (
    <ProtectedRoute>
      <RouteProgress />

      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden bg-slate-900/30 backdrop-blur-[1px]"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <DashboardSidebar
          user={user}
          pathname={pathname}
          sidebarOpen={sidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarOpen={setSidebarOpen}
          logout={logout}
          roleColors={roleColors}
          roleIcons={roleIcons}
          normalizedRole={normalizedRole}
          isAdmin={Boolean(user.is_admin)}
        />

        <div className="flex-1 min-w-0">
          <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-gray-200 dark:border-slate-700 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5 cursor-pointer" />
                </button>

                <button
                  onClick={toggleSidebarCollapse}
                  className="hidden lg:inline-flex p-2 rounded-xl hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  aria-label="Toggle sidebar collapse"
                >
                  {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5 cursor-pointer" /> : <PanelLeftClose className="h-5 w-5 cursor-pointer" />}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <ThemeToggle />

                <button
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5 text-gray-600 dark:text-slate-300 cursor-pointer hover:text-primary-500 transition-colors" />
                  <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full" />
                </button>

                <div className="flex items-center gap-3 pl-1">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{user.email}</p>
                  </div>
                  <button
                    className={`p-2 rounded-xl ${roleColors[normalizedRole] || 'text-gray-500 bg-gray-50 dark:bg-slate-800 dark:text-slate-300'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}
                    aria-label="Current role"
                  >
                    <RoleIcon className="h-4 w-4 cursor-pointer" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="bg-gray-50 dark:bg-slate-950 min-h-[calc(100vh-4rem)]">
            <Suspense
              fallback={
                <div className="p-6 max-w-7xl mx-auto">
                  <div className="skeleton h-72 rounded-2xl" />
                </div>
              }
            >
              <div key={pathname} className="fade-in">
                {children}
              </div>
            </Suspense>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

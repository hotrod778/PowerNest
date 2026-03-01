'use client'

import Link from 'next/link'
import {
  Home,
  Sun,
  Zap,
  TrendingUp,
  ShieldCheck,
  Settings,
  LogOut,
  X,
  CircleDollarSign,
  ChevronRight,
} from 'lucide-react'
import PowerNestLogo from '../ui/PowerNestLogo'

const roleNavMap = {
  SELLER: [
    { name: 'Energy Listings', href: '/dashboard/listings', icon: Sun, matcher: '/listings' },
    { name: 'Orders', href: '/dashboard/orders', icon: Zap, matcher: '/orders' },
    { name: 'Projects', href: '/dashboard/projects', icon: TrendingUp, matcher: '/projects' },
  ],
  BUYER: [
    { name: 'Browse Energy', href: '/dashboard/browse', icon: Sun, matcher: '/browse' },
    { name: 'Purchase History', href: '/dashboard/history', icon: Zap, matcher: '/history' },
  ],
  INVESTOR: [
    { name: 'Projects', href: '/dashboard/projects', icon: TrendingUp, matcher: '/projects' },
    { name: 'Investments', href: '/dashboard/investments', icon: CircleDollarSign, matcher: '/investments' },
  ],
  ADMIN: [
    { name: 'Admin Overview', href: '/dashboard/admin', icon: ShieldCheck, matcher: '/admin' },
  ],
}

const baseRoleDashboards = [
  { name: 'Seller', href: '/dashboard/seller' },
  { name: 'Buyer', href: '/dashboard/buyer' },
  { name: 'Investor', href: '/dashboard/investor' },
]

function NavLink({ href, label, Icon, active, collapsed, onClick, title }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        group flex items-center ${collapsed ? 'justify-center' : 'justify-start'} gap-3
        px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
        ${
          active
            ? 'bg-primary-100 text-primary-700 shadow-soft'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }
      `}
      title={title}
    >
      <Icon className="h-5 w-5 shrink-0 cursor-pointer transition-colors duration-200 group-hover:text-primary-500" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}

export default function DashboardSidebar({
  user,
  normalizedRole,
  pathname,
  sidebarOpen,
  sidebarCollapsed,
  setSidebarOpen,
  logout,
  roleColors,
  roleIcons,
  isAdmin,
}) {
  const role = normalizedRole || String(user.role || '').toUpperCase()
  const roleDashboards = isAdmin
    ? [{ name: 'Admin', href: '/dashboard/admin' }, ...baseRoleDashboards]
    : baseRoleDashboards

  const navItems = [
    {
      name: 'Dashboard',
      href: `/dashboard/${role.toLowerCase()}`,
      icon: Home,
      current: pathname === `/dashboard/${role.toLowerCase()}`,
    },
    ...(roleNavMap[role] || []).map((item) => ({
      ...item,
      current: pathname?.includes(item.matcher),
    })),
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: pathname?.includes('/settings'),
    },
  ]

  const RoleIcon = roleIcons[role] || Home

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 shadow-soft
        transform transition-all duration-300 ease-out lg:translate-x-0 lg:static
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${sidebarCollapsed ? 'w-24' : 'w-72'}
      `}
    >
      <div className="h-16 px-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <PowerNestLogo collapsed={sidebarCollapsed} className="logo-glow" textClassName="text-2xl font-bold text-gray-900" />

        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5 cursor-pointer" />
        </button>
      </div>

      <div className="flex flex-col h-[calc(100%-4rem)]">
        <div className="px-4 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${roleColors[role] || 'text-gray-500 bg-gray-50 dark:bg-slate-800 dark:text-slate-300'}`}>
              <RoleIcon className="h-5 w-5 cursor-pointer" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{isAdmin ? 'ADMIN' : user.role}</p>
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <div className="mt-3 bg-primary-50/70 dark:bg-slate-800 rounded-xl px-3 py-2 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-300">Wallet</span>
              <span className="text-base font-semibold text-gray-900 dark:text-slate-100">${Number(user.wallet_balance || 0).toFixed(2)}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              href={item.href}
              label={item.name}
              Icon={item.icon}
              active={item.current}
              collapsed={sidebarCollapsed}
              onClick={() => setSidebarOpen(false)}
              title={sidebarCollapsed ? item.name : undefined}
            />
          ))}

          {!sidebarCollapsed && (
            <div className="pt-4 mt-4 border-t border-gray-100">
              <p className="px-3 pb-2 text-[11px] font-semibold tracking-wide uppercase text-gray-500 dark:text-slate-400">Role Dashboards</p>
              <div className="space-y-1">
                {roleDashboards.map((roleLink) => (
                  <Link
                    key={roleLink.name}
                    href={roleLink.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-200
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                      ${pathname === roleLink.href ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                    `}
                  >
                    <span>{roleLink.name}</span>
                    <ChevronRight className="h-4 w-4 cursor-pointer" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={logout}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}
            title={sidebarCollapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0 cursor-pointer" />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}

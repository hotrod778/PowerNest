'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'

const normalizeRole = (value) => String(value || '').toUpperCase()
const getDefaultDashboardPath = (user) => {
  if (!user) return '/'
  if (user.is_admin) return '/dashboard/admin'
  return `/dashboard/${normalizeRole(user.role).toLowerCase()}`
}

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated || !user) {
      router.replace('/')
      return
    }

    if (allowedRoles.length > 0) {
      const role = normalizeRole(user.role)
      const normalizedAllowedRoles = allowedRoles.map(normalizeRole)
      const isAllowed =
        normalizedAllowedRoles.includes(role) ||
        (normalizedAllowedRoles.includes('ADMIN') && Boolean(user.is_admin))
      if (!isAllowed) {
        router.replace(getDefaultDashboardPath(user))
        return
      }
    }

    if (pathname === '/dashboard') {
      router.replace(getDefaultDashboardPath(user))
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router, pathname])

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    )
  }

  return children
}

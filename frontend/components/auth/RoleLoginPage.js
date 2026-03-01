'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PowerNestLogo from '../ui/PowerNestLogo'
import ThemeToggle from '../ui/ThemeToggle'

const roleRouteMap = {
  SELLER: 'seller',
  BUYER: 'buyer',
  INVESTOR: 'investor',
}

export default function RoleLoginPage({ role, title, subtitle, icon: Icon }) {
  const router = useRouter()
  const { login, isAuthenticated, isLoading, user, error, clearError } = useAuth()

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const roleKey = roleRouteMap[role]

  useEffect(() => {
    if (isLoading) return

    if (isAuthenticated && user?.is_admin) {
      router.replace('/dashboard/admin')
      return
    }

    if (isAuthenticated && user?.role === role) {
      router.replace(`/dashboard/${roleKey}`)
      return
    }

    if (isAuthenticated && user?.role && user.role !== role) {
      router.replace(`/dashboard/${String(user.role).toLowerCase()}`)
    }
  }, [isAuthenticated, isLoading, role, roleKey, router, user])

  const onChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }))
    setLocalError('')
    clearError()
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setLocalError('')
    setSuccessMessage('')
    clearError()

    if (!formData.email || !formData.password) {
      setLocalError('Email and password are required.')
      setSubmitting(false)
      return
    }

    const result = await login(formData.email, formData.password)
    if (!result.success) {
      setSubmitting(false)
      return
    }

    if (result.user?.is_admin) {
      setSuccessMessage('Login successful. Redirecting to admin dashboard...')
      router.replace('/dashboard/admin')
      return
    }

    if (result.user?.role !== role) {
      setSubmitting(false)
      setLocalError(`This account belongs to ${result.user?.role || 'another role'}. Please use that login route.`)
      return
    }

    setSuccessMessage('Login successful. Redirecting to your dashboard...')
    router.replace(`/dashboard/${roleKey}`)
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 px-4 py-10 sm:px-6 lg:px-8 flex items-center justify-center">
      <section className="w-full max-w-md bg-white dark:bg-slate-900 border border-primary-100 dark:border-slate-700 rounded-xl shadow-soft p-7 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <PowerNestLogo href="/" textClassName="text-xl font-bold text-primary-800 dark:text-slate-100" iconClassName="h-5 w-5" />
          <ThemeToggle />
        </div>

        <div className="text-center mb-7">
          <div className="mx-auto h-14 w-14 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
            <Icon className="h-7 w-7 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-primary-800">{title}</h1>
          <p className="text-sm text-primary-700/80 mt-1">{subtitle}</p>
        </div>

        {(localError || error) && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {localError || error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 inline-flex items-center gap-2 w-full">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label">Role</label>
            <input value={role} disabled className="input-field bg-primary-100 text-primary-800 border-primary-200" />
          </div>

          <div>
            <label htmlFor="email" className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-500" />
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={onChange}
                placeholder="you@example.com"
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-500" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={onChange}
                placeholder="Enter password"
                className="input-field pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-500 hover:text-primary-700 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-4 w-4 cursor-pointer" /> : <Eye className="h-4 w-4 cursor-pointer" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full inline-flex items-center justify-center gap-2">
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Logging in...
              </>
            ) : (
              <>
                Login
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-primary-700">
          New here?{' '}
          <Link href={`/register/${roleKey}`} className="text-primary-600 hover:text-primary-800 font-semibold">
            Register as {roleKey.charAt(0).toUpperCase() + roleKey.slice(1)}
          </Link>
        </p>
      </section>
    </main>
  )
}

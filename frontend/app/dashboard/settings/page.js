'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Moon,
  Palette,
  Shield,
  SunMedium,
  User,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ToastProvider'
import { apiService, formatCurrency } from '../../../services/api'

const PASSWORD_MIN_LENGTH = 8

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'billing', label: 'Billing', icon: CreditCard },
]

const getPasswordStrength = (value) => {
  if (!value) return { label: 'Not set', color: 'text-gray-500', value: 0 }
  if (value.length < PASSWORD_MIN_LENGTH) return { label: 'Weak', color: 'text-red-500', value: 33 }
  if (!/[A-Z]/.test(value) || !/[0-9]/.test(value)) return { label: 'Medium', color: 'text-yellow-500', value: 66 }
  return { label: 'Strong', color: 'text-green-600', value: 100 }
}

export default function SettingsPage() {
  const { user, updateProfile, loadUser } = useAuth()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('profile')
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [billingActionLoading, setBillingActionLoading] = useState(false)
  const [themeMode, setThemeMode] = useState('light')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [notificationPreferences, setNotificationPreferences] = useState({
    productUpdates: true,
    orderUpdates: true,
    weeklyReports: false,
    investmentAlerts: true,
  })

  useEffect(() => {
    if (!user) return
    setProfileForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      location: user.location || '',
    })
  }, [user])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedTheme = localStorage.getItem('theme') || 'light'
    setThemeMode(savedTheme)
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')

    const savedNotifications = localStorage.getItem('settings-notifications')
    if (savedNotifications) {
      try {
        setNotificationPreferences(JSON.parse(savedNotifications))
      } catch {
        // Ignore malformed stored prefs.
      }
    }
  }, [])

  const passwordStrength = useMemo(() => getPasswordStrength(passwordForm.newPassword), [passwordForm.newPassword])

  const handleProfileField = useCallback((event) => {
    const { name, value } = event.target
    setProfileForm((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handlePasswordField = useCallback((event) => {
    const { name, value } = event.target
    setPasswordForm((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleProfileSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      setUpdatingProfile(true)

      try {
        const response = await updateProfile(profileForm)
        if (!response.success) throw new Error(response.error || 'Unable to update profile')

        showToast({
          title: 'Profile updated',
          message: 'Your profile information was updated successfully.',
          type: 'success',
        })
      } catch (error) {
        showToast({
          title: 'Update failed',
          message: error.message || 'Failed to update profile.',
          type: 'error',
        })
      } finally {
        setUpdatingProfile(false)
      }
    },
    [profileForm, showToast, updateProfile]
  )

  const handlePasswordSubmit = useCallback(
    async (event) => {
      event.preventDefault()

      if (!passwordForm.currentPassword) {
        showToast({ title: 'Current password required', message: 'Enter your current password.', type: 'warning' })
        return
      }
      if (passwordForm.newPassword.length < PASSWORD_MIN_LENGTH) {
        showToast({
          title: 'Password too short',
          message: `New password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
          type: 'warning',
        })
        return
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        showToast({ title: 'Password mismatch', message: 'New password and confirm password must match.', type: 'error' })
        return
      }

      setUpdatingPassword(true)
      try {
        await apiService.auth.changePassword({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        })

        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })

        showToast({
          title: 'Password updated',
          message: 'Your password has been changed successfully.',
          type: 'success',
        })
      } catch (error) {
        showToast({
          title: 'Password update failed',
          message: error.response?.data?.message || 'Could not update password.',
          type: 'error',
        })
      } finally {
        setUpdatingPassword(false)
      }
    },
    [passwordForm, showToast]
  )

  const setTheme = useCallback(
    (nextTheme) => {
      setThemeMode(nextTheme)
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', nextTheme)
        window.dispatchEvent(new Event('theme-changed'))
      }
      document.documentElement.classList.toggle('dark', nextTheme === 'dark')
      showToast({
        title: 'Theme updated',
        message: `${nextTheme === 'dark' ? 'Dark' : 'Light'} mode enabled.`,
        type: 'success',
      })
    },
    [showToast]
  )

  const toggleNotification = useCallback((key) => {
    setNotificationPreferences((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      if (typeof window !== 'undefined') {
        localStorage.setItem('settings-notifications', JSON.stringify(next))
      }
      return next
    })
  }, [])

  const handleAddFunds = useCallback(async () => {
    const rawAmount = window.prompt('Enter amount to add to wallet (USD):')
    if (!rawAmount) return

    const amount = Number(rawAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast({ title: 'Invalid amount', message: 'Enter a valid positive amount.', type: 'error' })
      return
    }

    const role = String(user?.role || '').toUpperCase()
    if (!role) return

    setBillingActionLoading(true)
    try {
      if (role === 'BUYER') {
        await apiService.buyer.addFunds({ amount })
      } else if (role === 'INVESTOR') {
        await apiService.investor.addFunds({ amount })
      } else {
        throw new Error('Wallet top-up is only available for buyer and investor accounts.')
      }

      await loadUser()
      showToast({
        title: 'Funds added',
        message: `${formatCurrency(amount)} added to wallet.`,
        type: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Billing action failed',
        message: error.response?.data?.message || error.message || 'Unable to add funds.',
        type: 'error',
      })
    } finally {
      setBillingActionLoading(false)
    }
  }, [loadUser, showToast, user?.role])

  const handleWithdrawRequest = useCallback(async () => {
    const role = String(user?.role || '').toUpperCase()
    if (role !== 'SELLER' && role !== 'INVESTOR') {
      showToast({
        title: 'Not available',
        message: 'Withdraw requests are available for seller and investor accounts.',
        type: 'warning',
      })
      return
    }

    const rawAmount = window.prompt('Enter withdrawal amount (USD):')
    if (!rawAmount) return

    const amount = Number(rawAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast({ title: 'Invalid amount', message: 'Enter a valid positive amount.', type: 'error' })
      return
    }

    setBillingActionLoading(true)
    try {
      if (role === 'SELLER') {
        await apiService.seller.createWithdrawRequest({ amount })
      } else {
        await apiService.investor.withdrawEarnings({ amount })
      }

      showToast({
        title: 'Request submitted',
        message: 'Withdrawal request sent for admin review.',
        type: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Request failed',
        message: error.response?.data?.message || 'Unable to submit withdrawal request.',
        type: 'error',
      })
    } finally {
      setBillingActionLoading(false)
    }
  }, [showToast, user?.role])

  const renderProfileTab = () => (
    <form onSubmit={handleProfileSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="label">Full Name</label>
          <input type="text" name="name" className="input-field" value={profileForm.name} onChange={handleProfileField} required />
        </div>
        <div>
          <label className="label">Email Address</label>
          <input type="email" name="email" className="input-field" value={profileForm.email} onChange={handleProfileField} required />
        </div>
        <div>
          <label className="label">Phone Number</label>
          <input type="tel" name="phone" className="input-field" value={profileForm.phone} onChange={handleProfileField} placeholder="+1 (555) 123-4567" />
        </div>
        <div>
          <label className="label">Location</label>
          <input type="text" name="location" className="input-field" value={profileForm.location} onChange={handleProfileField} placeholder="San Francisco, CA" />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={updatingProfile}
          className="bg-primary-500 text-white px-4 py-2 rounded-xl hover:bg-primary-600 transition-all duration-200 disabled:opacity-70"
        >
          {updatingProfile ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </form>
  )

  const renderPasswordInput = (label, name, show, toggleShow, placeholder) => (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          name={name}
          value={passwordForm[name]}
          onChange={handlePasswordField}
          className="input-field pr-10"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-5 w-5 cursor-pointer" /> : <Eye className="h-5 w-5 cursor-pointer" />}
        </button>
      </div>
    </div>
  )

  const renderSecurityTab = () => (
    <form onSubmit={handlePasswordSubmit} className="space-y-6">
      {renderPasswordInput('Current Password', 'currentPassword', showCurrentPassword, () => setShowCurrentPassword((prev) => !prev), 'Enter your current password')}
      {renderPasswordInput('New Password', 'newPassword', showNewPassword, () => setShowNewPassword((prev) => !prev), 'Enter your new password')}
      {renderPasswordInput('Confirm Password', 'confirmPassword', showConfirmPassword, () => setShowConfirmPassword((prev) => !prev), 'Re-enter your new password')}

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500">Password strength</p>
          <p className={`text-xs font-semibold ${passwordStrength.color}`}>{passwordStrength.label}</p>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${passwordStrength.value}%` }} />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={updatingPassword}
          className="bg-primary-500 text-white px-4 py-2 rounded-xl hover:bg-primary-600 transition-all duration-200 disabled:opacity-70"
        >
          {updatingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </form>
  )

  const notificationRows = [
    { key: 'productUpdates', label: 'Product Updates', hint: 'Platform improvements and new features' },
    { key: 'orderUpdates', label: 'Order Updates', hint: 'Purchase/order status updates' },
    { key: 'weeklyReports', label: 'Weekly Reports', hint: 'Summary of usage, earnings, and ROI' },
    { key: 'investmentAlerts', label: 'Investment Alerts', hint: 'Funding milestones and payout alerts' },
  ]

  const renderNotificationsTab = () => (
    <div className="space-y-4">
      {notificationRows.map((row) => (
        <div key={row.key} className="flex items-center justify-between rounded-2xl border border-gray-100 p-4 bg-white">
          <div>
            <p className="font-semibold text-gray-900">{row.label}</p>
            <p className="text-sm text-gray-600">{row.hint}</p>
          </div>
          <button
            type="button"
            onClick={() => toggleNotification(row.key)}
            className={`relative h-7 w-12 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${notificationPreferences[row.key] ? 'bg-primary-500' : 'bg-gray-300'}`}
            aria-label={`Toggle ${row.label}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all duration-200 ${notificationPreferences[row.key] ? 'left-6' : 'left-1'}`}
            />
          </button>
        </div>
      ))}
      <div className="rounded-xl bg-primary-50 p-4 text-sm text-primary-800 flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 mt-0.5" />
        Preferences are saved instantly.
      </div>
    </div>
  )

  const renderAppearanceTab = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Choose your preferred dashboard theme.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setTheme('light')}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${themeMode === 'light' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200'}`}
        >
          <div className="flex items-center gap-2">
            <SunMedium className="h-5 w-5 cursor-pointer" />
            <span className="font-semibold text-gray-900">Light Mode</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Bright, minimal interface for daytime usage.</p>
        </button>

        <button
          onClick={() => setTheme('dark')}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${themeMode === 'dark' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200'}`}
        >
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 cursor-pointer" />
            <span className="font-semibold text-gray-900">Dark Mode</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Lower glare and comfortable nighttime viewing.</p>
        </button>
      </div>
    </div>
  )

  const renderBillingTab = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 p-5 bg-white">
        <p className="text-sm text-gray-600">Wallet Balance</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(Number(user?.wallet_balance || 0))}</p>
      </div>

      <div className="rounded-2xl border border-gray-100 p-5 bg-white">
        <p className="font-semibold text-gray-900">Billing Actions</p>
        <p className="text-sm text-gray-600 mt-1">
          {String(user?.role || '').toUpperCase() === 'SELLER'
            ? 'Seller accounts currently have read-only wallet settings.'
            : 'Add funds to wallet to continue purchases and investments.'}
        </p>

        <div className="mt-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAddFunds}
              disabled={billingActionLoading}
              className="bg-primary-500 text-white px-4 py-2 rounded-xl hover:bg-primary-600 transition-all duration-200 disabled:opacity-70"
            >
              {billingActionLoading ? 'Processing...' : 'Add Funds'}
            </button>
            <button
              onClick={handleWithdrawRequest}
              disabled={billingActionLoading}
              className="btn-outline"
            >
              Request Withdrawal
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const tabContentByKey = {
    profile: renderProfileTab(),
    security: renderSecurityTab(),
    notifications: renderNotificationsTab(),
    appearance: renderAppearanceTab(),
    billing: renderBillingTab(),
  }

  return (
    <div className="p-6 max-w-7xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account preferences and platform experience.</p>
      </div>

      <section className="surface-card p-4 sm:p-6 mb-6">
        <nav className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium
                  transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                  ${isActive ? 'bg-primary-100 text-primary-700 shadow-soft' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                `}
              >
                <Icon className="h-4 w-4 cursor-pointer" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </section>

      <section key={activeTab} className="surface-card p-6 transition-all duration-200 fade-in">
        {tabContentByKey[activeTab]}
      </section>
    </div>
  )
}

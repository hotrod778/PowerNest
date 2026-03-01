'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  BarChart3,
  FileCheck2,
  Wallet,
  Settings2,
  Shield,
  Users,
} from 'lucide-react'
import { apiService, formatCurrency } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ToastProvider'
import DashboardSkeleton from '../../../components/ui/DashboardSkeleton'
import EmptyState from '../../../components/ui/EmptyState'

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'approvals', label: 'Approvals', icon: FileCheck2 },
  { id: 'withdrawals', label: 'Withdrawals', icon: Wallet },
  { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
  { id: 'settings', label: 'Settings', icon: Settings2 },
]

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'

  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [users, setUsers] = useState([])
  const [pending, setPending] = useState(null)
  const [withdrawals, setWithdrawals] = useState([])
  const [disputes, setDisputes] = useState([])
  const [commissionSettings, setCommissionSettings] = useState(null)

  const fetchAdminData = useCallback(async () => {
    setLoading(true)
    try {
      const [
        analyticsResponse,
        usersResponse,
        pendingResponse,
        withdrawalsResponse,
        disputesResponse,
        settingsResponse,
      ] = await Promise.all([
        apiService.admin.getAnalytics(),
        apiService.admin.getUsers(),
        apiService.admin.getPendingApprovals(),
        apiService.admin.getWithdrawals(),
        apiService.admin.getDisputes(),
        apiService.admin.getCommissionSettings(),
      ])

      setAnalytics(analyticsResponse.data?.analytics || null)
      setUsers(usersResponse.data?.users || [])
      setPending(pendingResponse.data?.pending || null)
      setWithdrawals(withdrawalsResponse.data?.withdrawals || [])
      setDisputes(disputesResponse.data?.disputes || [])
      setCommissionSettings(settingsResponse.data?.settings || null)
    } catch (error) {
      showToast({
        title: 'Admin data unavailable',
        message: error.response?.data?.message || 'Failed to load admin dashboard.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (!user?.is_admin) return
    fetchAdminData()
  }, [fetchAdminData, user?.is_admin])

  const onTabChange = useCallback(
    (tab) => {
      router.replace(`/dashboard/admin?tab=${tab}`)
    },
    [router]
  )

  const refreshAndToast = useCallback(
    async (action, successMessage) => {
      try {
        await action()
        await fetchAdminData()
        showToast({ title: 'Success', message: successMessage, type: 'success' })
      } catch (error) {
        showToast({
          title: 'Action failed',
          message: error.response?.data?.message || 'Unable to complete request.',
          type: 'error',
        })
      }
    },
    [fetchAdminData, showToast]
  )

  const overviewCards = useMemo(
    () => [
      {
        label: 'Users',
        value: analytics?.users?.total || 0,
      },
      {
        label: 'Energy Traded',
        value: `${Number(analytics?.transactions?.totalEnergyTraded || 0).toFixed(2)} kWh`,
      },
      {
        label: 'Platform Revenue',
        value: formatCurrency(analytics?.transactions?.platformRevenue || 0),
      },
      {
        label: 'Carbon Saved',
        value: `${Number(analytics?.transactions?.totalCarbonSaved || 0).toFixed(2)} kg`,
      },
    ],
    [analytics]
  )

  if (!user?.is_admin) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <EmptyState
          icon={Shield}
          title="Admin access required"
          description="Your account is not configured for admin actions."
        />
      </div>
    )
  }

  if (loading) return <DashboardSkeleton />

  return (
    <div className="p-6 max-w-7xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Control Center</h1>
        <p className="text-gray-600 mt-2">Platform moderation, analytics, and payout controls.</p>
      </div>

      <section className="surface-card p-4 sm:p-6 mb-6">
        <nav className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-primary-100 text-primary-700 shadow-soft' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </section>

      {activeTab === 'overview' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewCards.map((card) => (
              <div key={card.label} className="card">
                <p className="text-sm text-gray-600">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="surface-card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Top Sellers</h2>
            <div className="space-y-2">
              {(analytics?.leaderboards?.topSellers || []).slice(0, 5).map((seller) => (
                <div key={seller.email} className="flex items-center justify-between text-sm">
                  <span className="text-gray-800">{seller.name}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(seller.total_revenue || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'users' && (
        <section className="surface-card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Users</h2>
          <div className="space-y-3">
            {users.slice(0, 12).map((managedUser) => (
              <div key={managedUser.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900">{managedUser.name}</p>
                  <p className="text-sm text-gray-600">
                    {managedUser.email} • {managedUser.role}
                  </p>
                </div>
                <button
                  onClick={() =>
                    refreshAndToast(
                      () => apiService.admin.setUserSuspension(managedUser.id, !managedUser.is_suspended),
                      managedUser.is_suspended ? 'User unsuspended' : 'User suspended'
                    )
                  }
                  className="btn-outline text-sm"
                >
                  {managedUser.is_suspended ? 'Unsuspend' : 'Suspend'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'approvals' && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="surface-card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Seller Approvals</h2>
            <div className="space-y-3">
              {(pending?.sellers || []).slice(0, 8).map((seller) => (
                <div key={seller.id} className="rounded-xl border border-gray-100 p-3">
                  <p className="font-semibold text-gray-900">{seller.name}</p>
                  <p className="text-sm text-gray-600">{seller.email}</p>
                  <button
                    onClick={() => refreshAndToast(() => apiService.admin.approveSeller(seller.id), 'Seller approved')}
                    className="btn-primary text-sm mt-3"
                  >
                    Approve Seller
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Listing Approvals</h2>
            <div className="space-y-3">
              {(pending?.listings || []).slice(0, 8).map((listing) => (
                <div key={listing.id} className="rounded-xl border border-gray-100 p-3">
                  <p className="font-semibold text-gray-900">{listing.energy_type} • {listing.location}</p>
                  <p className="text-sm text-gray-600">{listing.seller?.name}</p>
                  <button
                    onClick={() => refreshAndToast(() => apiService.admin.approveListing(listing.id), 'Listing approved')}
                    className="btn-primary text-sm mt-3"
                  >
                    Approve Listing
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Approvals</h2>
            <div className="space-y-3">
              {(pending?.projects || []).slice(0, 8).map((project) => (
                <div key={project.id} className="rounded-xl border border-gray-100 p-3">
                  <p className="font-semibold text-gray-900">{project.project_name}</p>
                  <p className="text-sm text-gray-600">{project.seller?.name}</p>
                  <button
                    onClick={() => refreshAndToast(() => apiService.admin.approveProject(project.id), 'Project approved')}
                    className="btn-primary text-sm mt-3"
                  >
                    Approve Project
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'withdrawals' && (
        <section className="surface-card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Withdrawal Queue</h2>
          <div className="space-y-3">
            {withdrawals.slice(0, 15).map((request) => (
              <div key={request.id} className="rounded-xl border border-gray-100 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{request.requester?.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(request.amount)} • {request.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-outline text-sm"
                    onClick={() => refreshAndToast(() => apiService.admin.reviewWithdrawal(request.id, { action: 'APPROVE' }), 'Withdrawal approved')}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-outline text-sm"
                    onClick={() => refreshAndToast(() => apiService.admin.reviewWithdrawal(request.id, { action: 'REJECT' }), 'Withdrawal rejected')}
                  >
                    Reject
                  </button>
                  <button
                    className="btn-primary text-sm"
                    onClick={() => refreshAndToast(() => apiService.admin.reviewWithdrawal(request.id, { action: 'MARK_PAID' }), 'Withdrawal marked paid')}
                  >
                    Mark Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'disputes' && (
        <section className="surface-card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Dispute Management</h2>
          <div className="space-y-3">
            {disputes.slice(0, 12).map((dispute) => (
              <div key={dispute.id} className="rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{dispute.reason}</p>
                  <p className="text-sm text-gray-600">Txn: {dispute.transaction?.receipt_code || dispute.transaction_id} • {dispute.status}</p>
                </div>
                <button
                  className="btn-outline text-sm"
                  onClick={() =>
                    refreshAndToast(
                      () => apiService.admin.resolveDispute(dispute.id, { status: 'RESOLVED', resolution_notes: 'Resolved by admin.' }),
                      'Dispute resolved'
                    )
                  }
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="surface-card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Commission Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-sm text-gray-600">Energy Commission</p>
              <p className="text-xl font-bold text-gray-900">{Number(commissionSettings?.commission_rate || 0) * 100}%</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-sm text-gray-600">Investment Fee</p>
              <p className="text-xl font-bold text-gray-900">{Number(commissionSettings?.investment_fee_rate || 0) * 100}%</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-sm text-gray-600">Withdrawal Fee</p>
              <p className="text-xl font-bold text-gray-900">{Number(commissionSettings?.withdrawal_fee_rate || 0) * 100}%</p>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

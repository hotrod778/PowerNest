'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useRouter } from 'next/navigation'
import { useToast } from '../../../components/ToastProvider'
import { apiService, formatCurrency } from '../../../services/api'
import LazyAreaChart from '../../../components/charts/LazyAreaChart'
import DashboardSkeleton from '../../../components/ui/DashboardSkeleton'
import StatCard from '../../../components/ui/StatCard'
import EmptyState from '../../../components/ui/EmptyState'
import {
  ShoppingCart,
  DollarSign,
  Leaf,
  TrendingUp,
} from 'lucide-react'

export default function BuyerDashboard() {
  const { user, loadUser } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()

  const [stats, setStats] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsResponse, purchasesResponse] = await Promise.all([
        apiService.buyer.getDashboard(),
        apiService.buyer.getPurchaseHistory(),
      ])

      const dashboard = statsResponse.data?.dashboard || null
      const transactions = purchasesResponse.data?.transactions || []

      if (dashboard) {
        const totalPurchases = (dashboard.completedPurchases || 0) + (dashboard.pendingPurchases || 0)
        setStats({
          totalPurchases,
          totalSpent: dashboard.totalSpent || 0,
          co2Saved: dashboard.co2Reduction || 0,
          savings: dashboard.savings || 0,
          raw: dashboard,
        })
      } else {
        setStats(null)
      }

      setPurchases(transactions)
    } catch (error) {
      showToast({
        title: 'Could not load dashboard',
        message: error.response?.data?.message || 'Please try again.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const handleAddFunds = useCallback(async () => {
    const input = window.prompt('Enter amount to add to your wallet (USD):')
    if (!input) return

    const amount = parseFloat(input)
    if (Number.isNaN(amount) || amount <= 0) {
      showToast({ title: 'Invalid amount', message: 'Please enter a positive number.', type: 'error' })
      return
    }

    try {
      await apiService.buyer.addFunds({ amount })
      await loadUser()
      showToast({
        title: 'Funds added',
        message: `Successfully added ${formatCurrency(amount)} to your wallet.`,
        type: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Add funds failed',
        message: error.response?.data?.message || 'Failed to add funds.',
        type: 'error',
      })
    }
  }, [loadUser, showToast])

  const statCards = useMemo(
    () => [
      {
        title: 'Total Purchases',
        value: stats?.totalPurchases || 0,
        icon: ShoppingCart,
        accent: 'bg-primary-50 text-primary-500',
      },
      {
        title: 'Total Spent',
        value: stats?.totalSpent || 0,
        icon: DollarSign,
        format: 'currency',
        accent: 'bg-blue-50 text-blue-500',
      },
      {
        title: 'CO2 Saved',
        value: stats?.co2Saved || 0,
        icon: Leaf,
        suffix: ' kg',
        accent: 'bg-green-50 text-green-500',
      },
      {
        title: 'Wallet Balance',
        value: Number(user?.wallet_balance || 0),
        icon: TrendingUp,
        format: 'currency',
        accent: 'bg-yellow-50 text-yellow-500',
      },
    ],
    [stats, user?.wallet_balance]
  )

  if (loading) return <DashboardSkeleton />

  return (
    <div className="p-6 max-w-7xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Buyer Dashboard</h1>
        <p className="text-gray-600 mt-2">Track your energy purchases and savings</p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </section>

      <div className="mb-8">
        <button type="button" onClick={handleAddFunds} className="btn-outline text-sm">
          + Add Funds
        </button>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <LazyAreaChart
          title="Monthly Energy Purchased"
          label="kWh"
          dataPoints={(stats?.raw?.monthlyPurchases || []).map((m) => ({
            label: new Date(m.month).toLocaleDateString('en-US', {
              month: 'short',
              year: '2-digit',
            }),
            value: Number(m.total_energy || 0),
          }))}
        />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Purchases</h2>
            <button className="btn-primary text-sm" onClick={() => router.push('/dashboard/browse')}>
              Browse Energy
            </button>
          </div>

          <div className="space-y-4">
            {purchases.length > 0 ? (
              purchases.slice(0, 5).map((purchase) => (
                <div key={purchase.id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{purchase.listing?.energy_type}</h3>
                      <p className="text-sm text-gray-600">{purchase.energy_units} kWh</p>
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(purchase.total_price)}</p>
                    </div>
                    <span
                      className={`badge ${
                        purchase.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : purchase.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {purchase.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={ShoppingCart}
                title="No purchases yet"
                description="Start by exploring clean energy listings from trusted sellers."
                actionText="Browse Energy Listings"
                onAction={() => router.push('/dashboard/browse')}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ToastProvider'
import { useRouter } from 'next/navigation'
import { apiService, formatCurrency } from '../../../services/api'
import LazyAreaChart from '../../../components/charts/LazyAreaChart'
import DashboardSkeleton from '../../../components/ui/DashboardSkeleton'
import StatCard from '../../../components/ui/StatCard'
import EmptyState from '../../../components/ui/EmptyState'
import {
  Sun,
  Plus,
  Package,
  DollarSign,
  TrendingUp,
  Activity,
} from 'lucide-react'

export default function SellerDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()

  const [stats, setStats] = useState(null)
  const [listings, setListings] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsResponse, listingsResponse, ordersResponse] = await Promise.all([
        apiService.seller.getDashboard(),
        apiService.seller.getListings(),
        apiService.seller.getOrders(),
      ])

      const dashboard = statsResponse.data?.dashboard || {}
      const nextListings = listingsResponse.data?.listings || []
      const nextOrders = ordersResponse.data?.orders || []

      setStats({
        totalListings: nextListings.length,
        activeOrders: nextOrders.filter((o) => o.status === 'PENDING').length,
        totalRevenue: dashboard.totalRevenue || 0,
        raw: dashboard,
      })
      setListings(nextListings)
      setOrders(nextOrders)
    } catch (error) {
      showToast({
        title: 'Could not load dashboard',
        message: error.response?.data?.message || 'Please retry.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const handleUpdateOrderStatus = useCallback(
    async (orderId, status) => {
      try {
        await apiService.seller.updateOrderStatus(orderId, { status })
        setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)))
        showToast({ title: 'Order updated', message: `Order marked as ${status}.`, type: 'success' })
      } catch (error) {
        showToast({
          title: 'Update failed',
          message: error.response?.data?.message || 'Failed to update order status.',
          type: 'error',
        })
      }
    },
    [showToast]
  )

  const statCards = useMemo(
    () => [
      { title: 'Total Listings', value: stats?.totalListings || 0, icon: Package, accent: 'bg-primary-50 text-primary-500' },
      { title: 'Active Orders', value: stats?.activeOrders || 0, icon: Activity, accent: 'bg-green-50 text-green-500' },
      {
        title: 'Total Revenue',
        value: stats?.totalRevenue || 0,
        icon: DollarSign,
        format: 'currency',
        accent: 'bg-blue-50 text-blue-500',
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
        <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your energy listings and track your earnings</p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <LazyAreaChart
          title="Monthly Revenue (last 12 months)"
          label="Revenue (USD)"
          dataPoints={(stats?.raw?.monthlySales || []).map((m) => ({
            label: new Date(m.month).toLocaleDateString('en-US', {
              month: 'short',
              year: '2-digit',
            }),
            value: Number(m.total_revenue || 0),
          }))}
        />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Listings</h2>
            <button onClick={() => router.push('/dashboard/listings')} className="btn-primary text-sm flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Add Listing
            </button>
          </div>

          <div className="space-y-4">
            {listings.length > 0 ? (
              listings.slice(0, 5).map((listing) => (
                <div key={listing.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary-50 rounded-xl">
                        <Sun className="h-5 w-5 text-primary-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{listing.energy_type}</h3>
                        <p className="text-sm text-gray-600">{listing.capacity_kwh} kWh available</p>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(listing.price_per_kwh)}/kWh</p>
                      </div>
                    </div>
                    <span className={`badge ${listing.available_units > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {listing.available_units > 0 ? 'Available' : 'Sold Out'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Package}
                title="No listings yet"
                description="Create your first listing to start selling renewable energy."
                actionText="Create Your First Listing"
                onAction={() => router.push('/dashboard/listings')}
              />
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
            <button className="text-primary-600 hover:text-primary-800 text-sm" onClick={() => router.push('/dashboard/orders')}>
              View All
            </button>
          </div>

          <div className="space-y-4">
            {orders.length > 0 ? (
              orders.slice(0, 5).map((order) => (
                <div key={order.id} className="card">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{order.buyer?.name || 'Unknown Buyer'}</h3>
                      <p className="text-sm text-gray-600">{order.energy_units} kWh</p>
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(order.total_price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`badge ${
                          order.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status}
                      </span>
                      {order.status === 'PENDING' ? (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'COMPLETED')}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Mark Complete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Activity}
                title="No orders yet"
                description="Orders will appear once buyers start purchasing your energy."
              />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

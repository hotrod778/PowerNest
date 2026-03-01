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
  Briefcase,
  DollarSign,
  ArrowUp,
  PieChart,
  Activity,
} from 'lucide-react'

export default function InvestorDashboard() {
  const { user, loadUser } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()

  const [stats, setStats] = useState(null)
  const [investments, setInvestments] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsResponse, investmentsResponse, projectsResponse] = await Promise.all([
        apiService.investor.getDashboard(),
        apiService.investor.getInvestments(),
        apiService.investor.getProjects(),
      ])

      setStats(statsResponse.data?.dashboard || null)
      setInvestments(investmentsResponse.data?.investments || [])
      setProjects(projectsResponse.data?.projects || [])
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

  const handleInvest = useCallback(
    async (projectId, amount) => {
      try {
        const response = await apiService.investor.investProject({ project_id: projectId, amount_invested: amount })
        if (response.data) {
          const created = response.data.investment || response.data
          setInvestments((prev) => [created, ...prev])
          showToast({
            title: 'Investment successful',
            message: 'Your investment was completed successfully.',
            type: 'success',
          })
          await fetchDashboardData()
          await loadUser()
        }
      } catch (error) {
        showToast({
          title: 'Investment failed',
          message: error.response?.data?.message || 'Failed to invest. Please try again.',
          type: 'error',
        })
      }
    },
    [fetchDashboardData, loadUser, showToast]
  )

  const handleAddFunds = useCallback(async () => {
    const input = window.prompt('Enter amount to add to your wallet (USD):')
    if (!input) return

    const amount = parseFloat(input)
    if (Number.isNaN(amount) || amount <= 0) {
      showToast({ title: 'Invalid amount', message: 'Please enter a positive number.', type: 'error' })
      return
    }

    try {
      await apiService.investor.addFunds({ amount })
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
        title: 'Total Invested',
        value: stats?.totalInvested || 0,
        icon: Briefcase,
        format: 'currency',
        accent: 'bg-primary-50 text-primary-500',
      },
      {
        title: 'Total Returns',
        value: stats?.totalReturns || 0,
        icon: ArrowUp,
        format: 'currency',
        accent: 'bg-green-50 text-green-500',
      },
      {
        title: 'Active Projects',
        value: stats?.activeProjects || 0,
        icon: PieChart,
        accent: 'bg-blue-50 text-blue-500',
      },
      {
        title: 'Wallet Balance',
        value: Number(user?.wallet_balance || 0),
        icon: DollarSign,
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
        <h1 className="text-3xl font-bold text-gray-900">Investor Dashboard</h1>
        <p className="text-gray-600 mt-2">Track your investments and returns</p>
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

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <LazyAreaChart
          title="Monthly Investments"
          label="Amount (USD)"
          dataPoints={(stats?.monthlyInvestments || []).map((m) => ({
            label: new Date(m.month).toLocaleDateString('en-US', {
              month: 'short',
              year: '2-digit',
            }),
            value: Number(m.total_invested || 0),
          }))}
        />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Investment Opportunities</h2>
            <button className="text-primary-600 hover:text-primary-800 text-sm" onClick={() => router.push('/dashboard/projects')}>
              View All
            </button>
          </div>

          <div className="space-y-4">
            {projects.length > 0 ? (
              projects.slice(0, 5).map((project) => (
                <div key={project.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.project_name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-medium text-gray-900">ROI: {project.roi_percentage}%</p>
                        <p className="text-sm text-gray-600">Duration: {project.duration_months} months</p>
                        <p className="text-sm text-gray-600">
                          Raised: {formatCurrency(project.current_funding)} / {formatCurrency(project.total_required)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span
                        className={`badge ${
                          project.risk_level === 'LOW'
                            ? 'bg-green-100 text-green-800'
                            : project.risk_level === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {project.risk_level}
                      </span>
                      <button onClick={() => handleInvest(project.id, 1000)} className="btn-primary text-sm">
                        Invest
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState icon={Briefcase} title="No opportunities" description="No active investment opportunities are available right now." />
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Investments</h2>
            <button className="text-primary-600 hover:text-primary-800 text-sm" onClick={() => router.push('/dashboard/investments')}>
              View All
            </button>
          </div>

          <div className="space-y-4">
            {investments.length > 0 ? (
              investments.slice(0, 5).map((investment) => (
                <div key={investment.id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{investment.project?.project_name}</h3>
                      <p className="text-sm text-gray-600">Invested: {formatCurrency(investment.amount_invested)}</p>
                      <p className="text-sm font-medium text-green-600">
                        Returns: {formatCurrency(investment.returns_generated)}
                      </p>
                    </div>
                    <span
                      className={`badge ${
                        investment.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : investment.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {investment.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Activity}
                title="No investments yet"
                description="Start investing in renewable energy projects to build your portfolio."
              />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

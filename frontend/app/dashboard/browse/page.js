'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ToastProvider'
import { apiService, getEnergyTypeColor, formatCurrency } from '../../../services/api'
import DashboardSkeleton from '../../../components/ui/DashboardSkeleton'
import EmptyState from '../../../components/ui/EmptyState'
import {
  Sun,
  Wind,
  Zap,
  MapPin,
  DollarSign,
  Filter,
  Search,
  Star,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react'

const ENERGY_TYPES = [
  { value: 'SOLAR', label: 'Solar', icon: Sun },
  { value: 'WIND', label: 'Wind', icon: Wind },
  { value: 'BIOGAS', label: 'Biogas', icon: Zap },
  { value: 'HYDRO', label: 'Hydro', icon: Zap },
  { value: 'GEOTHERMAL', label: 'Geothermal', icon: Zap },
]

export default function BrowseEnergy() {
  const { user, loadUser } = useAuth()
  const { showToast } = useToast()

  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [purchasingId, setPurchasingId] = useState(null)
  const [quantities, setQuantities] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState(null)
  const [filters, setFilters] = useState({
    energy_type: '',
    location: '',
    min_price: '',
    max_price: '',
    page: 1,
    limit: 12,
  })

  const getDefaultUnits = useCallback((listing) => {
    const available = Number(listing.available_units)
    if (!Number.isFinite(available) || available <= 0) return 1
    return available >= 1 ? 1 : Number(available.toFixed(2))
  }, [])

  const normalizedParams = useMemo(() => {
    const params = { ...filters }
    Object.keys(params).forEach((key) => {
      if (params[key] === '' || params[key] === null) delete params[key]
    })
    return params
  }, [filters])

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiService.buyer.getListings(normalizedParams)
      setListings(response.data?.listings || [])
      setPagination(response.data?.pagination || null)
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load listings'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [normalizedParams])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1,
    }))
  }, [])

  const handleSearch = useCallback(
    (event) => {
      event.preventDefault()
      handleFilterChange('location', searchTerm)
    },
    [handleFilterChange, searchTerm]
  )

  const handlePurchase = useCallback(
    async (listing, requestedUnits) => {
      const energyUnits = Number(requestedUnits)
      const availableUnits = Number(listing.available_units)

      if (!Number.isFinite(energyUnits) || energyUnits <= 0) {
        showToast({ title: 'Invalid quantity', message: 'Enter kWh greater than 0.', type: 'error' })
        return
      }

      if (energyUnits > availableUnits) {
        showToast({ title: 'Not enough units', message: `Only ${availableUnits} kWh available.`, type: 'error' })
        return
      }

      setPurchasingId(listing.id)

      try {
        const response = await apiService.buyer.purchaseEnergy({ listing_id: listing.id, energy_units: energyUnits })

        if (response.data.transaction) {
          await loadUser()
          showToast({
            title: 'Purchase initiated',
            message: `${energyUnits} kWh purchased from ${listing.seller.name}.`,
            type: 'success',
          })
          fetchListings()
          return
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'Purchase failed'

        if (msg.toLowerCase().includes('insufficient wallet balance')) {
          const estimatedTotal = energyUnits * Number(listing.price_per_kwh) * 1.03
          const topUp = window.confirm(`Insufficient balance. Add ${formatCurrency(estimatedTotal)} and retry?`)

          if (topUp) {
            try {
              await apiService.buyer.addFunds({ amount: Number(estimatedTotal.toFixed(2)) })
              await loadUser()
              await apiService.buyer.purchaseEnergy({ listing_id: listing.id, energy_units: energyUnits })

              showToast({
                title: 'Purchase completed',
                message: `${energyUnits} kWh purchased after wallet top-up.`,
                type: 'success',
              })
              fetchListings()
              return
            } catch (topUpError) {
              showToast({
                title: 'Top-up failed',
                message: topUpError.response?.data?.message || 'Unable to add funds and purchase.',
                type: 'error',
              })
              return
            }
          }
        }

        showToast({ title: 'Purchase failed', message: msg, type: 'error' })
      } finally {
        setPurchasingId(null)
      }
    },
    [fetchListings, loadUser, showToast]
  )

  if (loading) return <DashboardSkeleton />

  return (
    <div className="p-6 max-w-7xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Browse Renewable Energy</h1>
        <p className="text-gray-600 mt-2">Find and purchase clean energy from local producers</p>
      </div>

      <section className="surface-card p-6 mb-6">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-500 mr-2" />
          <h3 className="text-xl font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-center">
          <form onSubmit={handleSearch} className="lg:col-span-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 h-14"
              />
            </div>
          </form>

          <select
            value={filters.energy_type}
            onChange={(e) => handleFilterChange('energy_type', e.target.value)}
            className="input-field h-14 lg:col-span-2"
          >
            <option value="">All Types</option>
            {ENERGY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Min Price ($)"
            value={filters.min_price}
            onChange={(e) => handleFilterChange('min_price', e.target.value)}
            className="input-field h-14 lg:col-span-2"
          />

          <input
            type="number"
            placeholder="Max Price ($)"
            value={filters.max_price}
            onChange={(e) => handleFilterChange('max_price', e.target.value)}
            className="input-field h-14 lg:col-span-2"
          />
        </div>
      </section>

      {error ? (
        <div className="surface-card p-6 mb-6 border-red-100">
          <p className="text-red-700 font-medium">{error}</p>
          <button onClick={fetchListings} className="btn-outline mt-4 text-sm">
            Retry
          </button>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {listings.map((listing) => {
              const EnergyIcon = ENERGY_TYPES.find((t) => t.value === listing.energy_type)?.icon || Sun
              return (
                <article key={listing.id} className="card h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-primary-50 rounded-xl">
                        <EnergyIcon className="h-5 w-5 text-primary-500" />
                      </div>
                      <span className={`badge ${getEnergyTypeColor(listing.energy_type)}`}>{listing.energy_type}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      {Number(listing.seller.average_rating || 0) > 0
                        ? `${Number(listing.seller.average_rating).toFixed(1)} (${listing.seller.total_ratings || 0})`
                        : 'New'}
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-2">{listing.seller.name}</h3>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {listing.location}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Zap className="h-4 w-4 mr-2" />
                      {listing.available_units} kWh available
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      {formatCurrency(listing.price_per_kwh)} per kWh
                    </div>
                  </div>

                  {listing.description ? <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[3rem]">{listing.description}</p> : null}

                  <div className="mt-auto space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Wallet</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(user?.wallet_balance || 0)}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">kWh</label>
                        <input
                          type="number"
                          min="0.01"
                          max={Number(listing.available_units)}
                          step="0.01"
                          value={quantities[listing.id] ?? ''}
                          onChange={(e) => setQuantities((prev) => ({ ...prev, [listing.id]: e.target.value }))}
                          placeholder="1"
                          className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Total transactions</p>
                        <p className="font-semibold text-gray-900">{listing._count.transactions}</p>
                      </div>
                      <button
                        onClick={() => handlePurchase(listing, quantities[listing.id] || getDefaultUnits(listing))}
                        disabled={purchasingId === listing.id}
                        className="btn-primary text-sm min-w-[118px] inline-flex items-center justify-center"
                      >
                        {purchasingId === listing.id ? 'Processing...' : 'Purchase'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>

          {listings.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No matching listings"
              description="Try changing filters or searching a different location."
            />
          ) : null}

          {pagination && pagination.pages > 1 ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleFilterChange('page', pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-xl border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 py-1 text-sm font-medium text-gray-900">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => handleFilterChange('page', pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="p-2 rounded-xl border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

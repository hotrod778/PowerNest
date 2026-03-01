'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ToastProvider'
import { apiService, formatCurrency } from '../../../services/api'
import { 
  Sun, 
  Plus, 
  Edit, 
  Trash2,
  Package,
  DollarSign,
  Activity
} from 'lucide-react'

export default function ListingsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    energy_type: 'SOLAR',
    capacity_kwh: '',
    price_per_kwh: '',
    location: '',
    description: ''
  })

  useEffect(() => {
    fetchListings()
  }, [])

  const fetchListings = async () => {
    try {
      const response = await apiService.seller.getListings()
      setListings(response.data?.listings || [])
    } catch (error) {
      showToast({
        title: 'Listings unavailable',
        message: error.response?.data?.message || 'Failed to load listings.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateListing = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        capacity_kwh: parseFloat(formData.capacity_kwh),
        price_per_kwh: parseFloat(formData.price_per_kwh),
        // If you want available_units to track capacity initially, you can set it equal here
        available_units: parseFloat(formData.capacity_kwh)
      }

      const response = await apiService.seller.createListing(payload)
      if (response.data) {
        const created = response.data.listing || response.data
        setListings(prev => [created, ...prev])
        setShowCreateForm(false)
        setFormData({
          energy_type: 'SOLAR',
          capacity_kwh: '',
          price_per_kwh: '',
          location: '',
          description: ''
        })
        showToast({
          title: 'Listing created',
          message: 'Energy listing created successfully.',
          type: 'success',
        })
      }
    } catch (error) {
      showToast({
        title: 'Listing failed',
        message: 'Failed to create listing. Please try again.',
        type: 'error',
      })
    }
  }

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return

    try {
      await apiService.seller.deleteListing(listingId)
      setListings(prev => prev.filter(listing => listing.id !== listingId))
      showToast({
        title: 'Listing deleted',
        message: 'The listing was deleted successfully.',
        type: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Delete failed',
        message: 'Failed to delete listing.',
        type: 'error',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Energy Listings</h1>
          <p className="text-gray-600 mt-2">Manage your renewable energy offerings</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Listing
        </button>
      </div>

      {/* Create Listing Form */}
      {showCreateForm && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Create New Listing</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleCreateListing} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Energy Type</label>
                <select
                  value={formData.energy_type}
                  onChange={(e) => setFormData({...formData, energy_type: e.target.value})}
                  className="input-field"
                >
                  <option value="SOLAR">Solar</option>
                  <option value="WIND">Wind</option>
                  <option value="BIOGAS">Biogas</option>
                  <option value="HYDRO">Hydro</option>
                  <option value="GEOTHERMAL">Geothermal</option>
                </select>
              </div>
              
              <div>
                <label className="label">Capacity (kWh)</label>
                <input
                  type="number"
                  value={formData.capacity_kwh}
                  onChange={(e) => setFormData({...formData, capacity_kwh: e.target.value})}
                  className="input-field"
                  placeholder="1000"
                  required
                />
              </div>
              
              <div>
                <label className="label">Price per kWh</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price_per_kwh}
                  onChange={(e) => setFormData({...formData, price_per_kwh: e.target.value})}
                  className="input-field"
                  placeholder="0.12"
                  required
                />
              </div>
              
              <div>
                <label className="label">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="input-field"
                  placeholder="California, USA"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="input-field"
                rows={3}
                placeholder="Describe your energy offering..."
              />
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create Listing
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.length > 0 ? (
          listings.map(listing => (
            <div key={listing.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <Sun className="h-5 w-5 text-primary-500" />
                  </div>
                  <span className="badge bg-primary-100 text-primary-800">
                    {listing.energy_type}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="text-blue-600 hover:text-blue-800">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteListing(listing.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-2">{listing.energy_type} Energy</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Package className="h-4 w-4 mr-2" />
                  {listing.capacity_kwh} kWh capacity
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Activity className="h-4 w-4 mr-2" />
                  {listing.available_units} kWh available
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  {formatCurrency(listing.price_per_kwh)} per kWh
                </div>
              </div>

              {listing.description && (
                <p className="text-sm text-gray-600 mb-4">{listing.description}</p>
              )}

              <div className="flex items-center justify-between">
                <span className={`text-sm ${
                  listing.available_units > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {listing.available_units > 0 ? 'Available' : 'Sold Out'}
                </span>
                <span className="text-sm text-gray-500">
                  {listing._count?.transactions || 0} orders
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full card text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-600 mb-4">Create your first energy listing to start selling</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              Create Your First Listing
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

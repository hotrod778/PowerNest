'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ToastProvider'
import { apiService, formatCurrency } from '../../../services/api'
import { 
  Briefcase, 
  Plus, 
  DollarSign,
  TrendingUp
} from 'lucide-react'

export default function ProjectsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    project_name: '',
    description: '',
    total_required: '',
    roi_percentage: '',
    duration_months: '',
    risk_level: 'LOW',
    location: '',
    energy_type: 'SOLAR'
  })
  const isSeller = user?.role === 'SELLER'
  const isInvestor = user?.role === 'INVESTOR'

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = isInvestor
        ? await apiService.investor.getProjects()
        : await apiService.seller.getProjects()
      setProjects(response.data?.projects || [])
    } catch (error) {
      showToast({
        title: 'Projects unavailable',
        message: error.response?.data?.message || 'Failed to load projects.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        total_required: parseFloat(formData.total_required),
        roi_percentage: parseFloat(formData.roi_percentage),
        duration_months: parseInt(formData.duration_months, 10)
      }

      const response = await apiService.seller.createProject(payload)
      if (response.data) {
        const created = response.data.project || response.data
        setProjects(prev => [created, ...prev])
        setShowCreateForm(false)
        setFormData({
          project_name: '',
          description: '',
          total_required: '',
          roi_percentage: '',
          duration_months: '',
          risk_level: 'LOW',
          location: '',
          energy_type: 'SOLAR'
        })
        showToast({
          title: 'Project created',
          message: 'Investment project created successfully.',
          type: 'success',
        })
      }
    } catch (error) {
      showToast({
        title: 'Project failed',
        message: 'Failed to create project. Please try again.',
        type: 'error',
      })
    }
  }

  const handleInvestProject = async (projectId) => {
    const rawAmount = window.prompt('Enter investment amount (USD):')
    if (!rawAmount) return

    const amount = Number(rawAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast({
        title: 'Invalid amount',
        message: 'Please enter a valid positive amount.',
        type: 'error',
      })
      return
    }

    try {
      await apiService.investor.investProject({
        project_id: projectId,
        amount_invested: amount,
      })
      showToast({
        title: 'Investment successful',
        message: `Invested ${formatCurrency(amount)} successfully.`,
        type: 'success',
      })
      fetchProjects()
    } catch (error) {
      showToast({
        title: 'Investment failed',
        message: error.response?.data?.message || 'Unable to complete investment.',
        type: 'error',
      })
    }
  }

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'LOW': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'HIGH': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFundingProgress = (current, total) => {
    return Math.min((current / total) * 100, 100)
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
          <h1 className="text-3xl font-bold text-gray-900">Investment Projects</h1>
          <p className="text-gray-600 mt-2">
            {isSeller
              ? 'Create and manage your renewable energy investment projects'
              : 'Browse active renewable energy projects available for funding'}
          </p>
        </div>
        {isSeller && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Project
          </button>
        )}
      </div>

      {/* Create Project Form */}
      {isSeller && showCreateForm && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Project Name</label>
                <input
                  type="text"
                  value={formData.project_name}
                  onChange={(e) => setFormData({...formData, project_name: e.target.value})}
                  className="input-field"
                  placeholder="Solar Farm Expansion"
                  required
                />
              </div>
              
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
                <label className="label">Total Required ($)</label>
                <input
                  type="number"
                  value={formData.total_required}
                  onChange={(e) => setFormData({...formData, total_required: e.target.value})}
                  className="input-field"
                  placeholder="100000"
                  required
                />
              </div>
              
              <div>
                <label className="label">ROI Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.roi_percentage}
                  onChange={(e) => setFormData({...formData, roi_percentage: e.target.value})}
                  className="input-field"
                  placeholder="12.5"
                  required
                />
              </div>
              
              <div>
                <label className="label">Duration (months)</label>
                <input
                  type="number"
                  value={formData.duration_months}
                  onChange={(e) => setFormData({...formData, duration_months: e.target.value})}
                  className="input-field"
                  placeholder="24"
                  required
                />
              </div>
              
              <div>
                <label className="label">Risk Level</label>
                <select
                  value={formData.risk_level}
                  onChange={(e) => setFormData({...formData, risk_level: e.target.value})}
                  className="input-field"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
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
                rows={4}
                placeholder="Describe your renewable energy project..."
                required
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
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length > 0 ? (
          projects.map(project => (
            <div key={project.id} className="card">
              <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary-50 rounded-lg">
                  <Briefcase className="h-5 w-5 text-primary-500" />
                </div>
                <span className={`badge ${getRiskColor(project.risk_level)}`}>
                    {project.risk_level}
                  </span>
                </div>
                {isSeller && (
                  <div className="text-xs font-medium text-gray-500">
                    Seller View
                  </div>
                )}
              </div>

              <h3 className="font-semibold text-gray-900 mb-2">{project.project_name}</h3>
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">ROI</span>
                  <span className="font-semibold text-green-600">{project.roi_percentage}%</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium">{project.duration_months} months</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Energy Type</span>
                  <span className="font-medium">{project.energy_type}</span>
                </div>
                
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Funding Progress</span>
                    <span className="font-medium">
                      {formatCurrency(project.current_funding)} / {formatCurrency(project.total_required)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getFundingProgress(project.current_funding, project.total_required)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {getFundingProgress(project.current_funding, project.total_required).toFixed(1)}% funded
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm gap-3">
                  <div>
                    <span className="text-gray-600">Investors</span>
                    <span className="font-medium ml-2">{project._count?.investments || 0}</span>
                  </div>
                  {isInvestor && (
                    <button
                      onClick={() => handleInvestProject(project.id)}
                      className="btn-primary text-sm"
                    >
                      Invest
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full card text-center py-12">
            <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-4">
              {isSeller
                ? 'Create your first investment project to attract funding'
                : 'No active projects are available for investment right now.'}
            </p>
            {isSeller && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary"
              >
                Create Your First Project
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

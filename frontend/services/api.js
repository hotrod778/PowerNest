import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 10000,
})

export const authAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 10000,
})

const responseCache = new Map()
const inflightRequests = new Map()

const buildCacheKey = (url, config = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''
  return JSON.stringify({ url, params: config?.params || {}, token })
}

const invalidateCache = (prefix = '') => {
  if (!prefix) {
    responseCache.clear()
    inflightRequests.clear()
    return
  }

  const matchesPrefix = (key) => {
    try {
      const parsed = JSON.parse(key)
      return String(parsed.url || '').startsWith(prefix)
    } catch {
      return false
    }
  }

  Array.from(responseCache.keys()).forEach((key) => {
    if (matchesPrefix(key)) responseCache.delete(key)
  })

  Array.from(inflightRequests.keys()).forEach((key) => {
    if (matchesPrefix(key)) inflightRequests.delete(key)
  })
}

const cachedGet = async (url, config = {}, ttlMs = 12000) => {
  const key = buildCacheKey(url, config)
  const now = Date.now()

  const cached = responseCache.get(key)
  if (cached && cached.expiry > now) {
    return cached.value
  }

  const inflight = inflightRequests.get(key)
  if (inflight) return inflight

  const request = api
    .get(url, config)
    .then((response) => {
      responseCache.set(key, {
        value: response,
        expiry: now + ttlMs,
      })
      inflightRequests.delete(key)
      return response
    })
    .catch((error) => {
      inflightRequests.delete(key)
      throw error
    })

  inflightRequests.set(key, request)
  return request
}

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }

    return Promise.reject(error)
  }
)

authAPI.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

authAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

const clearRoleCaches = (role) => {
  invalidateCache(`/${role}/dashboard`)
  invalidateCache(`/${role}/history`)
  invalidateCache(`/${role}/listings`)
  invalidateCache(`/${role}/orders`)
  invalidateCache(`/${role}/projects`)
  invalidateCache(`/${role}/investments`)
  if (role === 'admin') {
    invalidateCache('/admin/')
  }
}

export const apiService = {
  cache: {
    invalidate: invalidateCache,
    clearAll: () => invalidateCache(),
  },

  auth: {
    login: async (credentials) => {
      const response = await authAPI.post('/auth/login', credentials)
      invalidateCache()
      return response
    },
    register: (userData) => authAPI.post('/auth/register', userData),
    getProfile: () => authAPI.get('/auth/profile'),
    validateSession: () => authAPI.get('/auth/session'),
    logout: () => authAPI.post('/auth/logout'),
    updateProfile: (userData) => authAPI.put('/auth/profile', userData),
    changePassword: (passwordData) => authAPI.put('/auth/change-password', passwordData),
  },

  seller: {
    createListing: async (listingData) => {
      const response = await api.post('/seller/listing', listingData)
      clearRoleCaches('seller')
      return response
    },
    getListings: () => cachedGet('/seller/listings', {}, 8000),
    updateListing: async (id, listingData) => {
      const response = await api.put(`/seller/listing/${id}`, listingData)
      clearRoleCaches('seller')
      return response
    },
    deleteListing: async (id) => {
      const response = await api.delete(`/seller/listing/${id}`)
      clearRoleCaches('seller')
      return response
    },
    getOrders: () => cachedGet('/seller/orders', {}, 6000),
    updateOrderStatus: async (id, statusData) => {
      const response = await api.put(`/seller/orders/${id}`, statusData)
      clearRoleCaches('seller')
      return response
    },
    getDashboard: () => cachedGet('/seller/dashboard', {}, 6000),
    createProject: async (projectData) => {
      const response = await api.post('/seller/project', projectData)
      clearRoleCaches('seller')
      return response
    },
    getProjects: () => cachedGet('/seller/projects', {}, 10000),
    createWithdrawRequest: async (payload) => {
      const response = await api.post('/seller/wallet/withdraw-request', payload)
      clearRoleCaches('seller')
      return response
    },
    getWithdrawRequests: () => cachedGet('/seller/wallet/withdraw-requests', {}, 4000),
  },

  buyer: {
    getListings: (params) => cachedGet('/buyer/listings', { params }, 8000),
    getListing: (id) => cachedGet(`/buyer/listings/${id}`, {}, 8000),
    purchaseEnergy: async (purchaseData) => {
      const response = await api.post('/buyer/purchase', purchaseData)
      clearRoleCaches('buyer')
      invalidateCache('/seller/orders')
      return response
    },
    getPurchaseHistory: (params) => cachedGet('/buyer/history', { params }, 6000),
    getDashboard: () => cachedGet('/buyer/dashboard', {}, 6000),
    addFunds: async (amount) => {
      const response = await api.post('/buyer/wallet/add-funds', amount)
      clearRoleCaches('buyer')
      return response
    },
    createRating: (ratingData) => api.post('/buyer/rating', ratingData),
    createDispute: (payload) => api.post('/disputes', payload),
    getDisputes: () => cachedGet('/disputes/mine', {}, 4000),
  },

  investor: {
    getProjects: (params) => cachedGet('/investor/projects', { params }, 10000),
    getProject: (id) => cachedGet(`/investor/projects/${id}`, {}, 10000),
    investProject: async (investmentData) => {
      const response = await api.post('/investor/invest', investmentData)
      clearRoleCaches('investor')
      return response
    },
    getInvestments: (params) => cachedGet('/investor/investments', { params }, 6000),
    getDashboard: () => cachedGet('/investor/dashboard', {}, 6000),
    addFunds: async (amount) => {
      const response = await api.post('/investor/wallet/add-funds', amount)
      clearRoleCaches('investor')
      return response
    },
    withdrawEarnings: async (amount) => {
      const response = await api.post('/investor/wallet/withdraw', amount)
      clearRoleCaches('investor')
      return response
    },
    getWithdrawRequests: () => cachedGet('/investor/wallet/withdraw-requests', {}, 4000),
  },

  admin: {
    getAnalytics: () => cachedGet('/admin/analytics', {}, 8000),
    getUsers: (params) => cachedGet('/admin/users', { params }, 5000),
    setUserSuspension: async (id, suspended = true) => {
      const response = await api.patch(`/admin/users/${id}/suspend`, { suspended })
      clearRoleCaches('admin')
      return response
    },
    getPendingApprovals: () => cachedGet('/admin/pending-approvals', {}, 4000),
    approveSeller: async (id) => {
      const response = await api.post(`/admin/approve/seller/${id}`)
      clearRoleCaches('admin')
      return response
    },
    approveListing: async (id) => {
      const response = await api.post(`/admin/approve/listing/${id}`)
      clearRoleCaches('admin')
      return response
    },
    approveProject: async (id) => {
      const response = await api.post(`/admin/approve/project/${id}`)
      clearRoleCaches('admin')
      return response
    },
    getTransactions: (params) => cachedGet('/admin/transactions', { params }, 5000),
    getWithdrawals: (params) => cachedGet('/admin/withdrawals', { params }, 4000),
    reviewWithdrawal: async (id, payload) => {
      const response = await api.patch(`/admin/withdrawals/${id}`, payload)
      clearRoleCaches('admin')
      return response
    },
    getDisputes: (params) => cachedGet('/admin/disputes', { params }, 4000),
    resolveDispute: async (id, payload) => {
      const response = await api.patch(`/admin/disputes/${id}`, payload)
      clearRoleCaches('admin')
      return response
    },
    getCommissionSettings: () => cachedGet('/admin/settings/commissions', {}, 5000),
    updateCommissionSettings: async (payload) => {
      const response = await api.patch('/admin/settings/commissions', payload)
      clearRoleCaches('admin')
      return response
    },
    getSystemHealth: () => cachedGet('/admin/health', {}, 5000),
  },

  wallet: {
    getSummary: () => cachedGet('/wallet/summary', {}, 4000),
    getLedger: (params) => cachedGet('/wallet/ledger', { params }, 3000),
  },
}

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const getEnergyTypeColor = (energyType) => {
  const colors = {
    SOLAR: 'bg-yellow-100 text-yellow-800',
    WIND: 'bg-blue-100 text-blue-800',
    BIOGAS: 'bg-green-100 text-green-800',
    HYDRO: 'bg-cyan-100 text-cyan-800',
    GEOTHERMAL: 'bg-orange-100 text-orange-800',
  }
  return colors[energyType] || 'bg-gray-100 text-gray-800'
}

export const getRiskLevelColor = (riskLevel) => {
  const colors = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-red-100 text-red-800',
  }
  return colors[riskLevel] || 'bg-gray-100 text-gray-800'
}

export const getTransactionStatusColor = (status) => {
  const colors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    REFUNDED: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export default api

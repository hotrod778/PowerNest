'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext()

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
}

const AUTH_ACTIONS = {
  AUTH_BOOTSTRAP_SUCCESS: 'AUTH_BOOTSTRAP_SUCCESS',
  AUTH_BOOTSTRAP_FAILURE: 'AUTH_BOOTSTRAP_FAILURE',
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  LOAD_USER_SUCCESS: 'LOAD_USER_SUCCESS',
  CLEAR_ERROR: 'CLEAR_ERROR',
}

const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.AUTH_BOOTSTRAP_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }

    case AUTH_ACTIONS.AUTH_BOOTSTRAP_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }

    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      }

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }

    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.REGISTER_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      }

    case AUTH_ACTIONS.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        error: null,
      }

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      }

    default:
      return state
  }
}

const safeBase64Decode = (input) => {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '==='.slice((normalized.length + 3) % 4)
    return atob(padded)
  } catch {
    return null
  }
}

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null
  const tokenParts = token.split('.')
  if (tokenParts.length !== 3) return null

  const decoded = safeBase64Decode(tokenParts[1])
  if (!decoded) return null

  try {
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

const isTokenExpired = (payload) => {
  if (!payload?.exp) return false
  return payload.exp * 1000 <= Date.now()
}

const normalizeRole = (value) => {
  const role = String(value || '').toUpperCase()
  return ['SELLER', 'BUYER', 'INVESTOR', 'ADMIN'].includes(role) ? role : null
}

const extractUserFromToken = (token) => {
  const payload = decodeJwtPayload(token)
  if (!payload || isTokenExpired(payload)) return null

  const role = normalizeRole(payload.role)
  const id = payload.id || payload.userId

  if (!role || !id) return null

  return { id, role, is_admin: Boolean(payload.is_admin) }
}

const normalizeUser = (user, fallback = null) => {
  const source = user || fallback
  if (!source) return null

  const role = normalizeRole(source.role || fallback?.role)
  const id = source.id || source.userId || fallback?.id || fallback?.userId

  if (!role || !id) return null
  return {
    ...source,
    id,
    role,
    is_admin: Boolean(source.is_admin || fallback?.is_admin),
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  const setAuthToken = useCallback((token) => {
    if (typeof window === 'undefined') return

    if (token) {
      localStorage.setItem('token', token)
      authAPI.defaults.headers.common.Authorization = `Bearer ${token}`
    } else {
      localStorage.removeItem('token')
      delete authAPI.defaults.headers.common.Authorization
    }
  }, [])

  const bootstrapAuth = useCallback(async () => {
    if (typeof window === 'undefined') {
      dispatch({ type: AUTH_ACTIONS.AUTH_BOOTSTRAP_FAILURE })
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      dispatch({ type: AUTH_ACTIONS.AUTH_BOOTSTRAP_FAILURE })
      return
    }

    const tokenUser = extractUserFromToken(token)
    if (!tokenUser) {
      setAuthToken(null)
      localStorage.removeItem('user')
      dispatch({ type: AUTH_ACTIONS.AUTH_BOOTSTRAP_FAILURE })
      return
    }

    let user = tokenUser
    const storedUserRaw = localStorage.getItem('user')

    if (storedUserRaw) {
      try {
        const parsed = JSON.parse(storedUserRaw)
        const normalizedParsed = normalizeUser(parsed, tokenUser)
        if (normalizedParsed?.id === tokenUser.id && normalizedParsed?.role === tokenUser.role) {
          user = normalizedParsed
        }
      } catch {
        // Ignore malformed storage and fallback to token-derived user.
      }
    }

    setAuthToken(token)

    try {
      const sessionResponse = await authAPI.get('/auth/session')
      const serverUser = normalizeUser(sessionResponse?.data?.user, user)
      if (!serverUser) throw new Error('Invalid session payload')

      localStorage.setItem('user', JSON.stringify(serverUser))
      dispatch({
        type: AUTH_ACTIONS.AUTH_BOOTSTRAP_SUCCESS,
        payload: { user: serverUser, token },
      })
    } catch {
      setAuthToken(null)
      localStorage.removeItem('user')
      dispatch({ type: AUTH_ACTIONS.AUTH_BOOTSTRAP_FAILURE })
    }
  }, [setAuthToken])

  const login = useCallback(async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START })

    try {
      const response = await authAPI.post('/auth/login', { email, password })
      const { user, token } = response.data || {}
      const normalizedUser = normalizeUser(user)

      if (!normalizedUser || !token) {
        throw new Error('Invalid login response from server')
      }

      setAuthToken(token)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(normalizedUser))
      }

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user: normalizedUser, token },
      })

      return { success: true, user: normalizedUser, token }
    } catch (error) {
      const apiError = error.response?.data
      const validationDetail = apiError?.details?.[0]?.message
      const errorMessage =
        apiError?.message ||
        apiError?.error ||
        validationDetail ||
        error.message ||
        'Login failed'

      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }, [setAuthToken])

  const register = useCallback(async (userData, rolePath) => {
    dispatch({ type: AUTH_ACTIONS.REGISTER_START })

    try {
      const endpoint = rolePath ? `/auth/register/${rolePath}` : '/auth/register'
      const response = await authAPI.post(endpoint, userData)
      const { user, token } = response.data || {}
      const normalizedUser = normalizeUser(user)

      if (!normalizedUser || !token) {
        throw new Error('Invalid registration response from server')
      }

      setAuthToken(token)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(normalizedUser))
      }

      dispatch({
        type: AUTH_ACTIONS.REGISTER_SUCCESS,
        payload: { user: normalizedUser, token },
      })

      return { success: true, user: normalizedUser, token }
    } catch (error) {
      const apiError = error.response?.data
      const validationDetail = apiError?.details?.[0]?.message
      const errorMessage =
        apiError?.message ||
        apiError?.error ||
        validationDetail ||
        error.message ||
        'Registration failed'

      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAILURE,
        payload: errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }, [setAuthToken])

  const logout = useCallback(() => {
    setAuthToken(null)

    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
    }

    dispatch({ type: AUTH_ACTIONS.LOGOUT })
  }, [setAuthToken])

  const loadUser = useCallback(async () => {
    try {
      const response = await authAPI.get('/auth/profile')
      const user = normalizeUser(response?.data?.user, state.user)

      if (!user) {
        throw new Error('Invalid profile response')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user))
      }

      dispatch({ type: AUTH_ACTIONS.LOAD_USER_SUCCESS, payload: { user } })
      return { success: true, user }
    } catch (error) {
      logout()
      return { success: false, error: 'Failed to load user profile' }
    }
  }, [logout, state.user])

  const updateProfile = useCallback(async (userData) => {
    try {
      const response = await authAPI.put('/auth/profile', userData)
      const user = normalizeUser(response?.data?.user, state.user)

      if (user && typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user))
      }

      dispatch({ type: AUTH_ACTIONS.LOAD_USER_SUCCESS, payload: { user } })
      return { success: true, user }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed'
      return { success: false, error: errorMessage }
    }
  }, [state.user])

  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR })
  }, [])

  const hasRole = useCallback((role) => {
    const requested = normalizeRole(role)
    if (requested === 'ADMIN') {
      return Boolean(state.user?.is_admin)
    }

    return normalizeRole(state.user?.role) === requested
  }, [state.user?.role, state.user?.is_admin])

  useEffect(() => {
    bootstrapAuth()
  }, [bootstrapAuth])

  const value = useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    loadUser,
    updateProfile,
    clearError,
    hasRole,
  }), [state, login, register, logout, loadUser, updateProfile, clearError, hasRole])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext

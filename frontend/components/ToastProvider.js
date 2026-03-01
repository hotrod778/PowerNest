'use client'

import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({ title, message, type = 'success', duration = 4000 }) => {
      const id = ++idCounter
      const toast = { id, title, message, type }
      setToasts((current) => [...current, toast])

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration)
      }
    },
    [removeToast]
  )

  const value = {
    showToast,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`max-w-sm w-full rounded-xl shadow-soft border px-4 py-3 bg-white animate-slide-up ${
              toast.type === 'error'
                ? 'border-red-200'
                : toast.type === 'warning'
                  ? 'border-yellow-200'
                  : 'border-primary-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                {toast.title && (
                  <p className="text-sm font-semibold text-gray-900">
                    {toast.title}
                  </p>
                )}
                {toast.message && (
                  <p className="mt-1 text-sm text-gray-700">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-3 text-gray-400 hover:text-gray-600"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}


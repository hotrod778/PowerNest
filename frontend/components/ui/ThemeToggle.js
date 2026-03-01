'use client'

import { useCallback, useEffect, useState } from 'react'
import { Moon, SunMedium } from 'lucide-react'

const getCurrentThemeIsDark = () => {
  if (typeof window === 'undefined') return false
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') return true
  if (saved === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export default function ThemeToggle({ className = '', onToggle }) {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const isDark = getCurrentThemeIsDark()
    setDarkMode(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  useEffect(() => {
    const syncTheme = () => {
      setDarkMode(document.documentElement.classList.contains('dark'))
    }

    window.addEventListener('theme-changed', syncTheme)
    window.addEventListener('storage', syncTheme)
    return () => {
      window.removeEventListener('theme-changed', syncTheme)
      window.removeEventListener('storage', syncTheme)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', next ? 'dark' : 'light')
        window.dispatchEvent(new Event('theme-changed'))
      }
      if (onToggle) onToggle(next)
      return next
    })
  }, [onToggle])

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${className}`}
      aria-label="Toggle theme"
    >
      {darkMode ? (
        <SunMedium className="h-5 w-5 text-yellow-400 cursor-pointer" />
      ) : (
        <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300 cursor-pointer" />
      )}
    </button>
  )
}


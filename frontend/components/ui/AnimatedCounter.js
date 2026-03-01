'use client'

import { useEffect, useRef, useState } from 'react'

const formatNumber = (value, format) => {
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (format === 'decimal') {
    return new Intl.NumberFormat('en-US').format(value)
  }

  return String(value)
}

export default function AnimatedCounter({ value = 0, duration = 700, format = 'decimal', suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const start = performance.now()
    const from = displayValue
    const to = Number(value) || 0

    const tick = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (to - from) * eased
      setDisplayValue(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <span>
      {formatNumber(format === 'decimal' ? Math.round(displayValue) : displayValue, format)}
      {suffix}
    </span>
  )
}

'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function RouteProgress() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    setVisible(true)
    setProgress(18)

    const step1 = setTimeout(() => setProgress(62), 80)
    const step2 = setTimeout(() => setProgress(90), 220)
    const done = setTimeout(() => {
      setProgress(100)
      timerRef.current = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 180)
    }, 320)

    return () => {
      clearTimeout(step1)
      clearTimeout(step2)
      clearTimeout(done)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div className="fixed left-0 top-0 right-0 z-[70] h-0.5 bg-transparent pointer-events-none">
      <div
        className="h-full bg-primary-500 transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

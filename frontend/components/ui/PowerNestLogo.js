'use client'

import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function PowerNestLogo({
  href = '/',
  collapsed = false,
  iconClassName = 'h-5 w-5',
  className = '',
  textClassName = 'text-2xl font-bold text-gray-900 dark:text-slate-100',
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-3 rounded-xl px-1 py-1 transition-all duration-200 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${className}`.trim()}
      aria-label="Go to PowerNest home"
    >
      <span className="h-9 w-9 rounded-xl bg-primary-100 flex items-center justify-center shadow-soft">
        <Zap className={`${iconClassName} text-primary-500`} />
      </span>
      {!collapsed && <span className={textClassName}>PowerNest</span>}
    </Link>
  )
}

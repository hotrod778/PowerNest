'use client'

import { memo } from 'react'
import AnimatedCounter from './AnimatedCounter'

function StatCard({ title, value, icon: Icon, format = 'decimal', accent = 'bg-primary-50 text-primary-500', suffix = '' }) {
  return (
    <article className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            <AnimatedCounter value={value} format={format} suffix={suffix} />
          </p>
        </div>
        <div className={`p-3 rounded-xl ${accent}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </article>
  )
}

export default memo(StatCard)

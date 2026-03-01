import React from 'react'
import Skeleton from './Skeleton'

export default function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto fade-in">
      <div className="mb-8">
        <Skeleton className="h-10 w-72 mb-3" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}

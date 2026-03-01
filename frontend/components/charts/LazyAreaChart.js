'use client'

import dynamic from 'next/dynamic'
import Skeleton from '../ui/Skeleton'

const AreaChart = dynamic(
  () => import('./AreaChart').then((mod) => mod.AreaChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-72 w-full" />,
  }
)

export default AreaChart

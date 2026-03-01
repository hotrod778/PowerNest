'use client'

import { memo, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

function AreaChartComponent({ title, label, dataPoints }) {
  const hasData = dataPoints && dataPoints.length > 0

  const data = useMemo(() => {
    if (!hasData) return null

    return {
      labels: dataPoints.map((p) => p.label),
      datasets: [
        {
          label,
          data: dataPoints.map((p) => p.value),
          fill: true,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    }
  }, [dataPoints, hasData, label])

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${label}: ${context.parsed.y.toLocaleString()}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 6 },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(209, 213, 219, 0.4)' },
        },
      },
    }),
    [label]
  )

  if (!hasData) {
    return (
      <div className="card h-full flex flex-col justify-center items-center text-center">
        <p className="text-sm font-medium text-gray-700">{title}</p>
        <p className="text-xs text-gray-500 mt-1">No data available yet</p>
      </div>
    )
  }

  return (
    <div className="card h-72">
      <p className="text-sm font-medium text-gray-700 mb-3">{title}</p>
      <div className="h-60">
        <Line options={options} data={data} />
      </div>
    </div>
  )
}

export const AreaChart = memo(AreaChartComponent)

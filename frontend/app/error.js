'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-primary-800 mb-3">Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          We hit an unexpected error while loading this page.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-outline">
            Try Again
          </button>
          <Link href="/" className="btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    </main>
  )
}

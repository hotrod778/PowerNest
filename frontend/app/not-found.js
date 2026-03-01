import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold text-primary-800 mb-3">404</h1>
        <p className="text-gray-600 mb-6">The page you are looking for does not exist.</p>
        <Link href="/" className="btn-primary">
          Back to Home
        </Link>
      </div>
    </main>
  )
}

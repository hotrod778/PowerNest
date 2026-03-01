'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, Leaf, Sun, TrendingUp, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PowerNestLogo from '../components/ui/PowerNestLogo'
import ThemeToggle from '../components/ui/ThemeToggle'

const roles = [
  {
    key: 'seller',
    title: 'Seller',
    description: 'List and sell your renewable energy to verified buyers.',
    icon: Sun,
  },
  {
    key: 'buyer',
    title: 'Buyer',
    description: 'Purchase clean energy directly from trusted producers.',
    icon: Zap,
  },
  {
    key: 'investor',
    title: 'Investor',
    description: 'Fund high-impact projects and track long-term returns.',
    icon: TrendingUp,
  },
]

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [navigatingRole, setNavigatingRole] = useState('')

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role) {
      if (user.is_admin) {
        router.replace('/dashboard/admin')
      } else {
        router.replace(`/dashboard/${String(user.role).toLowerCase()}`)
      }
    }
  }, [isLoading, isAuthenticated, user, router])

  const onSelectRole = (role) => {
    setNavigatingRole(role)
    router.push(`/login/${role}`)
  }

  const onGetStarted = () => {
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-primary-800 dark:text-slate-100 p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <PowerNestLogo href="/" textClassName="text-xl font-bold text-primary-800 dark:text-slate-100" iconClassName="h-6 w-6" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="btn-outline text-sm py-2">
              Sign In
            </Link>
            <Link href="/register/seller" className="bg-primary-500 text-white px-4 py-2 rounded-xl hover:bg-primary-600 transition-all duration-200">
              Register
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-12">
          <article className="space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-800 text-sm font-medium shadow-soft">
              <Leaf className="h-4 w-4" />
              PowerNest Marketplace
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-800 leading-tight">
              Choose Your Role to Continue
            </h1>
            <p className="text-gray-600 text-lg">
              Connect sellers, buyers, and investors through one clean renewable energy platform.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onGetStarted}
                className="bg-primary-500 text-white px-4 py-2 rounded-xl hover:bg-primary-600 transition-all duration-200 inline-flex items-center gap-2"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
              <a href="#roles" className="btn-secondary text-sm py-2">
                Explore Roles
              </a>
            </div>
          </article>

          <aside className="rounded-2xl border border-primary-100 bg-gradient-soft p-6 shadow-soft">
            <h2 className="text-xl font-semibold text-primary-800 mb-3">Why PowerNest</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-primary-500 mt-1.5" />
                Fast role-based onboarding and secure dashboard access.
              </li>
              <li className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-primary-500 mt-1.5" />
                Real-time marketplace for renewable listings and transactions.
              </li>
              <li className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-primary-500 mt-1.5" />
                Unified experience with smooth navigation and responsive UI.
              </li>
            </ul>
          </aside>
        </section>

        <section id="roles" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map(({ key, title, description, icon: Icon }) => (
            <article
              key={key}
              className="group rounded-2xl border border-primary-100 bg-white p-6 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:scale-[1.02]"
            >
              <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4 transition-colors duration-200 group-hover:bg-primary-500">
                <Icon className="h-6 w-6 text-primary-600 transition-colors duration-200 group-hover:text-white" />
              </div>
              <h2 className="text-xl font-semibold text-primary-800">{title}</h2>
              <p className="mt-2 text-sm text-gray-600 min-h-[44px]">{description}</p>

              <button
                type="button"
                onClick={() => onSelectRole(key)}
                disabled={navigatingRole === key}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-white font-medium transition-all duration-200 hover:bg-primary-600 disabled:opacity-70"
              >
                {navigatingRole === key ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    Login
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}

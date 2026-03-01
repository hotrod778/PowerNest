'use client'

import { TrendingUp } from 'lucide-react'
import RoleLoginPage from '../../../components/auth/RoleLoginPage'

export default function InvestorLoginPage() {
  return (
    <RoleLoginPage
      role="INVESTOR"
      title="Investor Login"
      subtitle="Sign in to manage portfolio and track returns."
      icon={TrendingUp}
    />
  )
}

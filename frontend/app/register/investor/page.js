'use client'

import { TrendingUp } from 'lucide-react'
import RoleRegisterPage from '../../../components/auth/RoleRegisterPage'

export default function InvestorRegisterPage() {
  return (
    <RoleRegisterPage
      role="INVESTOR"
      title="Investor Registration"
      subtitle="Create your investor account to fund green projects."
      icon={TrendingUp}
    />
  )
}

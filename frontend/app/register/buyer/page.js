'use client'

import { Zap } from 'lucide-react'
import RoleRegisterPage from '../../../components/auth/RoleRegisterPage'

export default function BuyerRegisterPage() {
  return (
    <RoleRegisterPage
      role="BUYER"
      title="Buyer Registration"
      subtitle="Create your buyer account to purchase renewable energy."
      icon={Zap}
    />
  )
}

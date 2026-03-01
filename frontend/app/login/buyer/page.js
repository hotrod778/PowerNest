'use client'

import { Zap } from 'lucide-react'
import RoleLoginPage from '../../../components/auth/RoleLoginPage'

export default function BuyerLoginPage() {
  return (
    <RoleLoginPage
      role="BUYER"
      title="Buyer Login"
      subtitle="Sign in to browse and purchase clean energy."
      icon={Zap}
    />
  )
}

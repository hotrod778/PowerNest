'use client'

import { Sun } from 'lucide-react'
import RoleLoginPage from '../../../components/auth/RoleLoginPage'

export default function SellerLoginPage() {
  return (
    <RoleLoginPage
      role="SELLER"
      title="Seller Login"
      subtitle="Access your seller dashboard and manage listings."
      icon={Sun}
    />
  )
}

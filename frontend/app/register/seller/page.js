'use client'

import { Sun } from 'lucide-react'
import RoleRegisterPage from '../../../components/auth/RoleRegisterPage'

export default function SellerRegisterPage() {
  return (
    <RoleRegisterPage
      role="SELLER"
      title="Seller Registration"
      subtitle="Create your seller account and start trading clean energy."
      icon={Sun}
    />
  )
}

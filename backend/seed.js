const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create sample users
  const saltRounds = 12
  const hashedPassword = await bcrypt.hash('password123', saltRounds)

  // Create sellers
  const seller1 = await prisma.user.create({
    data: {
      name: 'Solar Energy Co.',
      email: 'seller1@greengrid.com',
      password: hashedPassword,
      role: 'SELLER',
      is_verified: true,
      wallet_balance: 5000.00,
      phone: '+1-555-0101',
      location: 'California, USA'
    }
  })

  const seller2 = await prisma.user.create({
    data: {
      name: 'Wind Power Ltd.',
      email: 'seller2@greengrid.com',
      password: hashedPassword,
      role: 'SELLER',
      is_verified: true,
      wallet_balance: 3000.00,
      phone: '+1-555-0102',
      location: 'Texas, USA'
    }
  })

  // Create buyers
  const buyer1 = await prisma.user.create({
    data: {
      name: 'John Doe',
      email: 'buyer1@greengrid.com',
      password: hashedPassword,
      role: 'BUYER',
      wallet_balance: 2000.00,
      phone: '+1-555-0201',
      location: 'New York, USA'
    }
  })

  const buyer2 = await prisma.user.create({
    data: {
      name: 'Jane Smith',
      email: 'buyer2@greengrid.com',
      password: hashedPassword,
      role: 'BUYER',
      wallet_balance: 1500.00,
      phone: '+1-555-0202',
      location: 'California, USA'
    }
  })

  // Create investors
  const investor1 = await prisma.user.create({
    data: {
      name: 'Green Ventures Fund',
      email: 'investor1@greengrid.com',
      password: hashedPassword,
      role: 'INVESTOR',
      wallet_balance: 50000.00,
      phone: '+1-555-0301',
      location: 'New York, USA'
    }
  })

  const investor2 = await prisma.user.create({
    data: {
      name: 'Sustainable Capital',
      email: 'investor2@greengrid.com',
      password: hashedPassword,
      role: 'INVESTOR',
      wallet_balance: 75000.00,
      phone: '+1-555-0302',
      location: 'California, USA'
    }
  })

  const admin = await prisma.user.create({
    data: {
      name: 'PowerNest Admin',
      email: 'admin@greengrid.com',
      password: hashedPassword,
      role: 'SELLER',
      is_admin: true,
      is_verified: true,
      wallet_balance: 100000.00,
      location: 'Head Office',
    }
  })

  console.log('✅ Users created successfully')

  // Create energy listings
  const listing1 = await prisma.energyListing.create({
    data: {
      seller_id: seller1.id,
      is_approved: true,
      approved_by: admin.id,
      approved_at: new Date(),
      energy_type: 'SOLAR',
      capacity_kwh: 1000.00,
      price_per_kwh: 0.12,
      location: 'California, USA',
      available_units: 750.00,
      description: 'High-quality solar energy from our California solar farm installation.'
    }
  })

  const listing2 = await prisma.energyListing.create({
    data: {
      seller_id: seller1.id,
      is_approved: true,
      approved_by: admin.id,
      approved_at: new Date(),
      energy_type: 'SOLAR',
      capacity_kwh: 500.00,
      price_per_kwh: 0.15,
      location: 'California, USA',
      available_units: 200.00,
      description: 'Premium solar energy with battery storage backup.'
    }
  })

  const listing3 = await prisma.energyListing.create({
    data: {
      seller_id: seller2.id,
      is_approved: true,
      approved_by: admin.id,
      approved_at: new Date(),
      energy_type: 'WIND',
      capacity_kwh: 2000.00,
      price_per_kwh: 0.10,
      location: 'Texas, USA',
      available_units: 1500.00,
      description: 'Clean wind energy from our Texas wind farm.'
    }
  })

  const listing4 = await prisma.energyListing.create({
    data: {
      seller_id: seller2.id,
      is_approved: true,
      approved_by: admin.id,
      approved_at: new Date(),
      energy_type: 'BIOGAS',
      capacity_kwh: 300.00,
      price_per_kwh: 0.08,
      location: 'Texas, USA',
      available_units: 100.00,
      description: 'Renewable biogas energy from agricultural waste.'
    }
  })

  console.log('✅ Energy listings created successfully')

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      seller_id: seller1.id,
      is_approved: true,
      approved_by: admin.id,
      approved_at: new Date(),
      project_name: 'California Solar Expansion',
      description: 'Expand our solar farm capacity by 5MW to serve more households in California.',
      total_required: 100000.00,
      current_funding: 25000.00,
      roi_percentage: 12.50,
      duration_months: 24,
      risk_level: 'LOW',
      location: 'California, USA',
      energy_type: 'SOLAR'
    }
  })

  const project2 = await prisma.project.create({
    data: {
      seller_id: seller2.id,
      is_approved: true,
      approved_by: admin.id,
      approved_at: new Date(),
      project_name: 'Texas Wind Farm Development',
      description: 'Build a new 10MW wind farm in West Texas to generate clean energy.',
      total_required: 200000.00,
      current_funding: 50000.00,
      roi_percentage: 15.00,
      duration_months: 36,
      risk_level: 'MEDIUM',
      location: 'Texas, USA',
      energy_type: 'WIND'
    }
  })

  const project3 = await prisma.project.create({
    data: {
      seller_id: seller1.id,
      is_approved: true,
      approved_by: admin.id,
      approved_at: new Date(),
      project_name: 'Biogas Plant Construction',
      description: 'Construct a biogas plant that converts agricultural waste into renewable energy.',
      total_required: 75000.00,
      current_funding: 20000.00,
      roi_percentage: 18.00,
      duration_months: 30,
      risk_level: 'HIGH',
      location: 'California, USA',
      energy_type: 'BIOGAS'
    }
  })

  console.log('✅ Projects created successfully')

  // Create sample transactions
  const transaction1 = await prisma.transaction.create({
    data: {
      buyer_id: buyer1.id,
      seller_id: seller1.id,
      listing_id: listing1.id,
      energy_units: 100.00,
      price_per_kwh: 0.12,
      total_price: 12.00,
      commission: 0.03,
      status: 'COMPLETED',
      escrow_status: 'RELEASED',
      completed_at: new Date()
    }
  })

  const transaction2 = await prisma.transaction.create({
    data: {
      buyer_id: buyer2.id,
      seller_id: seller2.id,
      listing_id: listing3.id,
      energy_units: 250.00,
      price_per_kwh: 0.10,
      total_price: 25.00,
      commission: 0.03,
      status: 'COMPLETED',
      escrow_status: 'RELEASED',
      completed_at: new Date()
    }
  })

  const transaction3 = await prisma.transaction.create({
    data: {
      buyer_id: buyer1.id,
      seller_id: seller1.id,
      listing_id: listing2.id,
      energy_units: 50.00,
      price_per_kwh: 0.15,
      total_price: 7.50,
      commission: 0.03,
      status: 'PENDING'
    }
  })

  console.log('✅ Transactions created successfully')

  // Create sample investments
  const investment1 = await prisma.investment.create({
    data: {
      investor_id: investor1.id,
      project_id: project1.id,
      amount_invested: 15000.00,
      roi_percentage: 12.50,
      returns_generated: 1875.00,
      service_fee: 0.01,
      status: 'ACTIVE'
    }
  })

  const investment2 = await prisma.investment.create({
    data: {
      investor_id: investor2.id,
      project_id: project2.id,
      amount_invested: 25000.00,
      roi_percentage: 15.00,
      returns_generated: 3750.00,
      service_fee: 0.01,
      status: 'ACTIVE'
    }
  })

  const investment3 = await prisma.investment.create({
    data: {
      investor_id: investor1.id,
      project_id: project3.id,
      amount_invested: 10000.00,
      roi_percentage: 18.00,
      returns_generated: 0.00,
      service_fee: 0.01,
      status: 'ACTIVE'
    }
  })

  console.log('✅ Investments created successfully')

  // Create sample ratings
  await prisma.rating.create({
    data: {
      user_id: buyer1.id,
      target_id: seller1.id,
      rating: 5,
      comment: 'Excellent solar energy provider! Very reliable and competitive prices.'
    }
  })

  await prisma.rating.create({
    data: {
      user_id: buyer2.id,
      target_id: seller2.id,
      rating: 4,
      comment: 'Good wind energy supply. Consistent and clean energy.'
    }
  })

  console.log('✅ Ratings created successfully')

  console.log('🎉 Database seeding completed successfully!')
  console.log('\n📧 Sample Login Credentials:')
  console.log('Seller: seller1@greengrid.com / password123')
  console.log('Buyer: buyer1@greengrid.com / password123')
  console.log('Investor: investor1@greengrid.com / password123')
  console.log('Admin: admin@greengrid.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

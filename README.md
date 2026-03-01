# PowerNest - Renewable Energy Marketplace Platform

A full-stack production-ready web application that connects renewable energy producers, consumers, and investors in a sustainable energy marketplace.

## 🌱 Features

- **Multi-role Platform**: Sellers (energy producers), Buyers (consumers), and Investors
- **Energy Trading**: Buy and sell renewable energy (Solar, Wind, Biogas)
- **Investment Opportunities**: Fund renewable energy projects with ROI tracking
- **Real-time Analytics**: Dashboards with charts and insights
- **Secure Authentication**: JWT-based auth with role-based access control
- **Wallet System**: Integrated payment and escrow system
- **Admin Console**: Approvals, suspensions, disputes, withdrawals, commissions
- **Carbon Impact Tracking**: Monitor CO₂ reduction and sustainability metrics

## 🛠 Tech Stack

### Frontend
- Next.js 14 (App Router)
- Tailwind CSS
- Chart.js
- Axios
- Context API

### Backend
- Node.js
- Express.js
- JWT Authentication
- bcrypt
- PostgreSQL with Prisma ORM

### Deployment
- Frontend: Vercel
- Backend: Render/Railway
- Database: Neon/Supabase

## 📁 Project Structure

```
GreenGrid/
├── frontend/          # Next.js application
├── backend/           # Express.js API
├── database/          # Prisma schema and migrations
├── docs/              # Documentation
└── docker-compose.yml # Container configuration
```

## 🚀 Quick Start

1. Clone the repository
2. Set up environment variables
3. Install dependencies
4. Run database migrations
5. Start development servers

See detailed setup and architecture docs:

- `/docs/SETUP.md`
- `/docs/ARCHITECTURE.md`
- `/docs/API_REFERENCE.md`
- `/docs/PRODUCTION_CHECKLIST.md`

## 📊 Platform Impact

- Connect renewable energy producers with consumers
- Enable sustainable investments
- Reduce carbon footprint through green energy trading
- Create transparent energy marketplace

## 📄 License

MIT License - see LICENSE file for details

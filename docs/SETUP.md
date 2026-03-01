# GreenGrid Setup Guide

This guide will help you set up the GreenGrid Renewable Energy Marketplace Platform on your local machine.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v13 or higher)
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd GreenGrid
```

### 2. Install Dependencies

Install backend dependencies:
```bash
cd backend
npm install
```

Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### 3. Database Setup

#### Option A: Local PostgreSQL

1. Create a new PostgreSQL database:
```sql
CREATE DATABASE greengrid_db;
```

2. Copy the environment file:
```bash
cd ../backend
cp .env.example .env
```

3. Update the `.env` file with your database credentials:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/greengrid_db"
JWT_SECRET="your_super_secret_jwt_key_here_change_in_production"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Option B: Neon/Supabase (Recommended)

1. Create a new PostgreSQL database on [Neon](https://neon.tech) or [Supabase](https://supabase.com)
2. Copy the connection string
3. Update the `DATABASE_URL` in your `.env` file

### 4. Database Migration and Seeding

```bash
cd ../backend

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed the database with sample data
npm run db:seed
```

### 5. Start the Development Servers

Start the backend server:
```bash
cd backend
npm run dev
```

In a new terminal, start the frontend server:
```bash
cd frontend
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

## 🔑 Sample Login Credentials

After seeding the database, you can use these credentials to test the application:

### Seller Account
- **Email**: seller1@greengrid.com
- **Password**: password123
- **Role**: Energy Producer

### Buyer Account
- **Email**: buyer1@greengrid.com
- **Password**: password123
- **Role**: Energy Consumer

### Investor Account
- **Email**: investor1@greengrid.com
- **Password**: password123
- **Role**: Investor

### Admin Account
- **Email**: admin@greengrid.com
- **Password**: password123
- **Capability**: Platform admin (`is_admin=true`)

## 📁 Project Structure

```
GreenGrid/
├── backend/                 # Node.js/Express API
│   ├── controllers/         # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── routes/            # API routes
│   ├── config/            # Database configuration
│   ├── package.json
│   └── server.js          # Main server file
├── frontend/               # Next.js application
│   ├── app/               # App Router pages
│   ├── components/        # Reusable components
│   ├── context/           # React context
│   ├── services/          # API services
│   ├── package.json
│   └── tailwind.config.js
├── database/              # Database schema and seeds
│   ├── schema.prisma      # Prisma schema
│   └── seed.js           # Sample data
└── docs/                 # Documentation
```

## 🛠 Available Scripts

### Backend Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with hot reload
npm test           # Run tests
npm run db:migrate # Run database migrations
npm run db:generate # Generate Prisma client
npm run db:seed    # Seed database with sample data
```

### Frontend Scripts

```bash
npm start          # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

## 🔧 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/greengrid_db"

# JWT
JWT_SECRET="your_super_secret_jwt_key_here_change_in_production"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV="development"

# CORS
FRONTEND_URL="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

If port `5000` is unavailable on your machine, use `PORT=5001` and update frontend `NEXT_PUBLIC_API_URL` accordingly.

### Frontend (.env.local)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# JWT Configuration
NEXT_PUBLIC_JWT_SECRET=your_jwt_secret_key_here
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check your database URL in `.env`
   - Verify database exists

2. **Prisma Client Generation Error**
   ```bash
   npx prisma generate
   ```

3. **Migration Conflicts**
   ```bash
   npx prisma migrate reset
   npm run db:seed
   ```

4. **Port Already in Use**
   - Kill processes using the port:
   ```bash
   # For port 5000
   lsof -ti:5000 | xargs kill -9
   
   # For port 3000
   lsof -ti:3000 | xargs kill -9
   ```

5. **CORS Issues**
   - Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL
   - Check that the frontend is running on the correct port

### Database Reset

If you need to reset the entire database:

```bash
cd backend
npx prisma migrate reset
npm run db:seed
```

## 📚 API Documentation

Use `/docs/API_REFERENCE.md` for the full endpoint list, including admin moderation, disputes, withdrawal queue, and wallet ledger APIs.

## 🎨 Design System

The application uses a consistent design system with:

- **Primary Color**: #3B82F6 (Blue)
- **Background**: #FFFFFF (White)
- **Text**: #1E3A8A (Dark Blue)
- **Border**: #E5E7EB (Gray)
- **Components**: Tailwind CSS with custom utility classes

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Rate limiting
- CORS protection
- Input validation with Joi
- SQL injection prevention with Prisma ORM

## 📈 Performance Features

- Server-side rendering with Next.js
- Optimized database queries with Prisma
- Responsive design with Tailwind CSS
- Component-based architecture
- Efficient state management with React Context

## 🚀 Next Steps

After setup, you can:

1. Explore the dashboard features
2. Create energy listings (as seller)
3. Browse and purchase energy (as buyer)
4. Invest in projects (as investor)
5. Review the API documentation
6. Customize the design and features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review the error logs
3. Ensure all environment variables are set correctly
4. Verify database connection and migrations

Happy coding! 🌱

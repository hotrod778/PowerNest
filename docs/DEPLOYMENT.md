# GreenGrid Deployment Guide

## 🚀 Production Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Connect Vercel to repository
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL=https://your-backend-url.com/api`

### Backend (Render/Railway)

1. Deploy PostgreSQL database (Neon/Supabase)
2. Deploy backend with environment variables:
   - `DATABASE_URL` (from database provider)
   - `JWT_SECRET` (generate strong secret)
   - `FRONTEND_URL=https://your-domain.vercel.app`
3. Run migrations on deploy:
   - `npm run db:deploy`
   - `npm run db:generate`

### Environment Variables

**Backend:**
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="strong_secret_key"
FRONTEND_URL="https://your-domain.com"
NODE_ENV="production"
```

**Frontend:**
```env
NEXT_PUBLIC_API_URL="https://your-backend-url.com/api"
```

## 🐳 Docker Deployment

```bash
# Build and run containers
docker-compose up -d

# Run database migrations
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npm run db:seed
```

## 📊 Monitoring

- Backend health: `/health` endpoint
- Admin health: `/api/admin/health`
- Error tracking: Add Sentry
- Performance: Vercel Analytics
- Database: Prisma Studio

## 🔒 Security

- Use HTTPS in production
- Set strong JWT secrets
- Enable rate limiting
- Monitor API usage
- Regular security updates

# Production + Testing Checklist

## Environment Variables

Backend `.env`:

```env
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
JWT_SECRET="replace_with_long_random_secret"
JWT_EXPIRES_IN="7d"
PORT=5001
NODE_ENV="production"
FRONTEND_URL="https://your-frontend-domain.com"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200
```

Frontend `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
```

## Deployment Steps

1. Install backend/frontend dependencies.
2. Run `npm run db:deploy` in `backend/`.
3. Run `npm run db:generate` in `backend/`.
4. Build frontend: `npm run build` in `frontend/`.
5. Start backend + frontend with process manager (PM2/systemd/docker).
6. Smoke-test `GET /health` and admin health endpoint.

## Security Checklist

- Use HTTPS only.
- Rotate `JWT_SECRET` before production.
- Restrict CORS origin to deployed frontend domain.
- Verify admin users have `is_admin=true`.
- Ensure DB backups are configured.
- Monitor auth failures and rate-limit events.

## QA Flow (E2E)

1. Register seller, verify in admin, create listing.
2. Register buyer, add funds, purchase listing.
3. Seller completes order, verify seller payout and buyer history.
4. Register investor, add funds, invest in approved project.
5. Create withdrawal requests from seller/investor.
6. Approve and mark withdrawals paid in admin.
7. Raise dispute from buyer/seller and resolve in admin.
8. Verify wallet ledger for all roles.

## Performance Checklist

- Confirm Next.js build success with no warnings.
- Enable CDN caching for static assets.
- Run DB indexes health checks for hot queries.
- Avoid unbounded list endpoints (use pagination everywhere).

## Monitoring Checklist

- API latency (p95, p99)
- Error rate by endpoint
- Failed auth attempts
- Pending withdrawals/disputes backlog
- Transaction completion rate

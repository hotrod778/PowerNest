# PowerNest API Reference

Base URL:

- Local: `http://localhost:5001/api` (or your configured `PORT`)

## Auth

- `POST /auth/register`
- `POST /auth/register/:role` (`seller|buyer|investor`)
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`
- `GET /auth/profile`
- `PUT /auth/profile`
- `PUT /auth/change-password`

## Seller

- `POST /seller/listing`
- `GET /seller/listings`
- `PUT /seller/listing/:id`
- `DELETE /seller/listing/:id`
- `GET /seller/orders`
- `PUT /seller/orders/:id` (`COMPLETED|CANCELLED|REFUNDED`)
- `GET /seller/dashboard`
- `POST /seller/project`
- `GET /seller/projects`
- `POST /seller/wallet/withdraw-request`
- `GET /seller/wallet/withdraw-requests`

## Buyer

- `GET /buyer/listings`
- `GET /buyer/listings/:id`
- `POST /buyer/purchase`
- `GET /buyer/history`
- `GET /buyer/dashboard`
- `POST /buyer/wallet/add-funds`
- `POST /buyer/rating`

## Investor

- `GET /investor/projects`
- `GET /investor/projects/:id`
- `POST /investor/invest`
- `GET /investor/investments`
- `GET /investor/dashboard`
- `POST /investor/wallet/add-funds`
- `POST /investor/wallet/withdraw`
- `GET /investor/wallet/withdraw-requests`

## Wallet

- `GET /wallet/summary`
- `GET /wallet/ledger`

## Disputes

- `POST /disputes`
- `GET /disputes/mine`

## Admin (requires `is_admin=true`)

- `GET /admin/analytics`
- `GET /admin/users`
- `PATCH /admin/users/:id/suspend`
- `GET /admin/pending-approvals`
- `POST /admin/approve/seller/:id`
- `POST /admin/approve/listing/:id`
- `POST /admin/approve/project/:id`
- `GET /admin/transactions`
- `GET /admin/withdrawals`
- `PATCH /admin/withdrawals/:id`
- `GET /admin/disputes`
- `PATCH /admin/disputes/:id`
- `GET /admin/settings/commissions`
- `PATCH /admin/settings/commissions`
- `GET /admin/health`

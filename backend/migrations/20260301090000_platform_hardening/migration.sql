-- Platform hardening migration: admin controls, wallet ledger, disputes, escrow

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EscrowStatus') THEN
    CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'RELEASED', 'REFUNDED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletTransactionDirection') THEN
    CREATE TYPE "WalletTransactionDirection" AS ENUM ('DEBIT', 'CREDIT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletTransactionCategory') THEN
    CREATE TYPE "WalletTransactionCategory" AS ENUM (
      'FUNDING',
      'PURCHASE',
      'SALE',
      'INVESTMENT',
      'WITHDRAWAL',
      'REFUND',
      'COMMISSION',
      'ESCROW_RELEASE',
      'ESCROW_REFUND',
      'SYSTEM_ADJUSTMENT'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WithdrawalStatus') THEN
    CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeStatus') THEN
    CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');
  END IF;
END $$;

-- Users hardening flags
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_suspended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- Listings and projects approval fields
ALTER TABLE "energy_listings"
  ADD COLUMN IF NOT EXISTS "is_approved" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "approved_by" TEXT,
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);

ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "is_approved" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "approved_by" TEXT,
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);

-- Escrow and receipts in transactions
ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "escrow_status" "EscrowStatus" NOT NULL DEFAULT 'HELD',
  ADD COLUMN IF NOT EXISTS "receipt_code" TEXT;

-- New wallet ledger table
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "balance_before" DECIMAL(12,2) NOT NULL,
  "balance_after" DECIMAL(12,2) NOT NULL,
  "direction" "WalletTransactionDirection" NOT NULL,
  "category" "WalletTransactionCategory" NOT NULL,
  "reference_id" TEXT,
  "reference_type" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "wallet_transactions_user_id_created_at_idx"
  ON "wallet_transactions"("user_id", "created_at");

-- Withdrawal requests
CREATE TABLE IF NOT EXISTS "withdrawal_requests" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "fee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  "net_amount" DECIMAL(12,2) NOT NULL,
  "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "reviewed_by" TEXT,
  "review_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "withdrawal_requests_status_created_at_idx"
  ON "withdrawal_requests"("status", "created_at");

-- Disputes
CREATE TABLE IF NOT EXISTS "disputes" (
  "id" TEXT PRIMARY KEY,
  "transaction_id" TEXT NOT NULL,
  "created_by" TEXT NOT NULL,
  "assigned_admin" TEXT,
  "reason" TEXT NOT NULL,
  "description" TEXT,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "resolution_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "disputes_status_created_at_idx"
  ON "disputes"("status", "created_at");

-- Platform settings
CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" INTEGER PRIMARY KEY,
  "commission_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.03,
  "investment_fee_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.01,
  "withdrawal_fee_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.005,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "platform_settings" ("id", "commission_rate", "investment_fee_rate", "withdrawal_fee_rate")
VALUES (1, 0.03, 0.01, 0.005)
ON CONFLICT ("id") DO NOTHING;

-- Constraints & foreign keys
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_receipt_code_key" UNIQUE ("receipt_code");

ALTER TABLE "energy_listings"
  ADD CONSTRAINT "energy_listings_approved_by_fkey"
  FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_approved_by_fkey"
  FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "wallet_transactions"
  ADD CONSTRAINT "wallet_transactions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "withdrawal_requests"
  ADD CONSTRAINT "withdrawal_requests_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "withdrawal_requests"
  ADD CONSTRAINT "withdrawal_requests_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_transaction_id_fkey"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_assigned_admin_fkey"
  FOREIGN KEY ("assigned_admin") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


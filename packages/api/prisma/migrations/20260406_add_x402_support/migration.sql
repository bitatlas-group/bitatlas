-- x402 anonymous vault access + storage lifecycle
-- Phase 2: Allow files with no user (x402 anonymous uploads)
-- Phase 3: Add per-file expiry for storage lifecycle enforcement

-- Make user_id nullable so anonymous x402 files can be stored without a user record.
-- PostgreSQL FK constraints do NOT enforce NULL values, so the existing FK to users
-- is preserved and still enforces referential integrity for authenticated user files.
ALTER TABLE "files" ALTER COLUMN "user_id" DROP NOT NULL;

-- Add per-file expiry timestamp. Set on x402 anonymous uploads (30 days included).
-- NULL means the file does not expire (authenticated user files).
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ;

-- Index to efficiently query for expired files during cleanup.
CREATE INDEX IF NOT EXISTS "files_expires_at_idx" ON "files"("expires_at");

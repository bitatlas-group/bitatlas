-- Add access_token column for x402 anonymous file access control.
-- Only the uploader (who receives the token) can download/renew the file.
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "access_token" VARCHAR(64);

-- Index for fast lookup by access token
CREATE INDEX IF NOT EXISTS "files_access_token_idx" ON "files"("access_token") WHERE "access_token" IS NOT NULL;

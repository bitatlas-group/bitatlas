-- Baseline migration: captures existing schema as of 2026-03-28
-- This migration should be marked as applied on existing databases using:
--   prisma migrate resolve --applied 20260328_init

CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" VARCHAR(255) NOT NULL,
    "encryption_salt" VARCHAR(255) NOT NULL,
    "emergency_salt" VARCHAR(255),
    "plan" VARCHAR(20) NOT NULL DEFAULT 'free',
    "storage_used_bytes" BIGINT NOT NULL DEFAULT 0,
    "storage_limit_bytes" BIGINT NOT NULL DEFAULT 1073741824,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(255),
    "size_bytes" BIGINT NOT NULL,
    "original_size_bytes" BIGINT,
    "storage_key" VARCHAR(500) NOT NULL,
    "owner_encrypted_key" TEXT NOT NULL,
    "owner_iv" TEXT NOT NULL,
    "file_iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "emergency_encrypted_key" TEXT,
    "emergency_iv" TEXT,
    "folder_id" UUID,
    "category" VARCHAR(50),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "files_user_id_idx" ON "files"("user_id");
CREATE INDEX IF NOT EXISTS "files_folder_id_idx" ON "files"("folder_id");
CREATE INDEX IF NOT EXISTS "files_category_idx" ON "files"("category");
CREATE INDEX IF NOT EXISTS "files_deleted_at_idx" ON "files"("deleted_at");

CREATE TABLE IF NOT EXISTS "folders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "folders_user_id_idx" ON "folders"("user_id");

CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "key_prefix" VARCHAR(10) NOT NULL,
    "name" VARCHAR(255),
    "permissions" TEXT[] DEFAULT ARRAY['read','write']::TEXT[],
    "last_used_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys"("user_id");
CREATE INDEX IF NOT EXISTS "api_keys_key_hash_idx" ON "api_keys"("key_hash");

CREATE TABLE IF NOT EXISTS "emergency_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "unlock_phrase_hint" TEXT,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "activated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "emergency_contacts_user_id_idx" ON "emergency_contacts"("user_id");

CREATE TABLE IF NOT EXISTS "agent_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "api_key_id" UUID,
    "agent_name" VARCHAR(255),
    "actions_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "agent_sessions_user_id_idx" ON "agent_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "agent_sessions_api_key_id_idx" ON "agent_sessions"("api_key_id");

-- Foreign keys
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

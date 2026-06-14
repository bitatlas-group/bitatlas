-- Zero-knowledge share links.
-- The server stores only a random id + lifecycle metadata; never any key
-- material. The raw file key travels in the URL fragment, assembled client-side.
CREATE TABLE IF NOT EXISTS "shares" (
    "id" VARCHAR(32) NOT NULL,
    "file_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "max_downloads" INTEGER,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shares_file_id_idx" ON "shares"("file_id");
CREATE INDEX IF NOT EXISTS "shares_created_by_idx" ON "shares"("created_by");

ALTER TABLE "shares" ADD CONSTRAINT "shares_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

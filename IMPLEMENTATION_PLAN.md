# BitAtlas — Full Implementation Plan

_Created: 2026-03-21 | Author: Lobbi 🦞_

---

## Current State Assessment

### What Exists ✅
| Component | Status | Notes |
|-----------|--------|-------|
| Landing page | Live | Next.js at bitatlas.com, design system applied |
| Encryption SDK | Complete | `fileEncryption.ts` + `keyDerivation.ts` — AES-256-GCM, PBKDF2-SHA256 |
| MCP Server | Scaffold only | `index.js` exists but no real API integration |
| Architecture doc | Complete | Zero-knowledge design, key derivation flow, agent integration spec |
| Design system | Complete | DESIGN.md — surfaces, typography, components |
| Infrastructure | Partial | Docker on Hetzner (89.167.36.119), Nginx, SSL, coexisting with LegacyShield |

### What's Missing ❌
- **Backend API** (no server, no database, no auth)
- **Database schema** (PostgreSQL not set up for BitAtlas)
- **Object storage** (S3/MinIO not configured for BitAtlas)
- **Vault UI** (no authenticated app, just a landing page)
- **User auth** (no registration, login, sessions)
- **File upload/download** (encryption SDK exists but nothing connects it)
- **MCP Server** (stub only — no real tools implemented)
- **Agent key management** (spec exists, no implementation)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   CLIENTS                            │
│                                                      │
│  Browser (Vault UI)    AI Agent (MCP Server)         │
│  ┌──────────────┐      ┌──────────────────┐         │
│  │ Next.js App   │      │ @bitatlas/mcp    │         │
│  │ + Web Crypto  │      │ + Node crypto    │         │
│  │ + SDK         │      │ + SDK            │         │
│  └──────┬───────┘      └────────┬─────────┘         │
│         │                       │                    │
│    All encryption/decryption happens HERE             │
└─────────┼───────────────────────┼────────────────────┘
          │ HTTPS (encrypted blobs + metadata only)
          ▼                       ▼
┌─────────────────────────────────────────────────────┐
│                BACKEND API                           │
│  Express/Fastify on Node.js                          │
│                                                      │
│  /auth    — register, login, sessions, API keys      │
│  /vault   — file metadata CRUD, presigned URLs       │
│  /share   — emergency contacts, agent access         │
│  /admin   — usage, billing, account management       │
│                                                      │
│  ⚠️ Server NEVER sees plaintext files or keys        │
└──────────┬──────────────────────┬────────────────────┘
           │                      │
     ┌─────▼─────┐        ┌──────▼──────┐
     │ PostgreSQL │        │ MinIO (S3)  │
     │ Metadata   │        │ Encrypted   │
     │ Keys (enc) │        │ Blobs       │
     │ Users      │        │             │
     └────────────┘        └─────────────┘
```

---

## Phase 1: Backend Foundation (Week 1–2)

**Goal**: Working API with auth, database, and storage.

### 1.1 Database Setup
- [ ] Create BitAtlas PostgreSQL database on existing server
- [ ] Schema design:

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  password_hash VARCHAR(255) NOT NULL,        -- bcrypt
  encryption_salt VARCHAR(255) NOT NULL,       -- for client-side PBKDF2
  emergency_salt VARCHAR(255),                 -- for emergency key derivation
  plan VARCHAR(20) DEFAULT 'free',             -- free | pro | lifetime
  storage_used_bytes BIGINT DEFAULT 0,
  storage_limit_bytes BIGINT DEFAULT 1073741824, -- 1GB free
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files (metadata only — server never has plaintext)
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,                  -- can be encrypted name
  mime_type VARCHAR(255),
  size_bytes BIGINT NOT NULL,                  -- encrypted blob size
  original_size_bytes BIGINT,                  -- original file size
  storage_key VARCHAR(500) NOT NULL,           -- S3 object key
  -- Encryption metadata (all Base64-encoded)
  owner_encrypted_key TEXT NOT NULL,
  owner_iv TEXT NOT NULL,
  file_iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  emergency_encrypted_key TEXT,
  emergency_iv TEXT,
  -- Organization
  folder_id UUID REFERENCES folders(id),
  category VARCHAR(50),                        -- identity, financial, legal, medical, digital
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Folders
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES folders(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys (for MCP/agent access)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL,              -- hashed API key
  key_prefix VARCHAR(10) NOT NULL,             -- "ba_xxxx" for display
  name VARCHAR(255),
  permissions TEXT[] DEFAULT '{read,write}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency Contacts
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  unlock_phrase_hint TEXT,                     -- hint only, never the phrase
  activated BOOLEAN DEFAULT false,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Sessions (audit trail)
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  api_key_id UUID REFERENCES api_keys(id),
  agent_name VARCHAR(255),
  actions_count INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
```

### 1.2 API Server
- [ ] Initialize Express/Fastify project at `packages/api/`
- [ ] Structure:
  ```
  packages/api/
  ├── src/
  │   ├── server.ts
  │   ├── config.ts
  │   ├── routes/
  │   │   ├── auth.ts        # register, login, logout, refresh
  │   │   ├── vault.ts       # files CRUD, upload URL, download URL
  │   │   ├── folders.ts     # folder management
  │   │   ├── keys.ts        # API key management
  │   │   ├── emergency.ts   # emergency contacts
  │   │   └── status.ts      # health check
  │   ├── middleware/
  │   │   ├── auth.ts        # JWT + API key validation
  │   │   ├── rateLimit.ts
  │   │   └── validation.ts
  │   ├── services/
  │   │   ├── storage.ts     # MinIO/S3 presigned URLs
  │   │   ├── user.ts
  │   │   └── file.ts
  │   └── db/
  │       ├── client.ts      # Prisma or pg client
  │       └── migrations/
  ├── prisma/
  │   └── schema.prisma
  └── package.json
  ```

### 1.3 Object Storage
- [ ] Configure MinIO bucket `bitatlas-vault` on existing MinIO instance (or separate)
- [ ] Presigned URL generation for direct upload/download (server never touches blobs)
- [ ] CORS config for browser direct upload
- [ ] Lifecycle policies for orphaned objects

### 1.4 Authentication
- [ ] Registration: email + password → bcrypt hash + generate encryption salt
- [ ] Login: verify password → issue JWT (access + refresh tokens)
- [ ] API Key auth: `Authorization: Bearer ba_xxxxx` → hash and lookup
- [ ] Rate limiting: 10 req/s per user, 100 req/s per API key

---

## Phase 2: Vault UI (Week 2–3)

**Goal**: Users can register, log in, upload/download encrypted files.

### 2.1 Auth Pages
- [ ] `/register` — email, password, confirm password
  - Client generates encryption salt
  - Client derives master key (PBKDF2) — never sent to server
  - Server stores email + bcrypt(password) + encryption_salt
- [ ] `/login` — email, password
  - Server returns JWT + encryption_salt
  - Client re-derives master key from password + salt
  - Master key held in memory only (never persisted)
- [ ] `/forgot-password` — email reset flow
  - ⚠️ Password reset = loss of encryption key unless emergency key exists
  - Must clearly warn user about this

### 2.2 Vault Dashboard
- [ ] File list view (grid + list toggle)
  - File name, type, size, uploaded date, category
  - Encryption status indicator (Vault Indicator chip from design system)
- [ ] Folder navigation (breadcrumb)
- [ ] Category filters: Identity, Financial, Legal, Medical, Digital Assets
- [ ] Search by file name

### 2.3 File Operations
- [ ] **Upload flow**:
  1. User selects file(s)
  2. SDK encrypts each file client-side (existing `encryptFile()`)
  3. API returns presigned S3 upload URL
  4. Browser uploads encrypted blob directly to S3
  5. API stores encryption metadata
  6. UI shows progress + "Encrypted ✓" confirmation
- [ ] **Download flow**:
  1. User clicks file
  2. API returns presigned download URL + encryption metadata
  3. Browser downloads encrypted blob from S3
  4. SDK decrypts client-side (existing `decryptFile()`)
  5. Browser triggers file save / shows preview
- [ ] **Delete**: soft delete with 30-day recovery, then hard delete blob + metadata
- [ ] **Preview**: in-browser decryption + render for images, PDFs, text files

### 2.4 Settings
- [ ] Account info, email change
- [ ] API key management (generate, revoke, list)
- [ ] Emergency contacts management
- [ ] Storage usage display
- [ ] Password change (requires re-encryption of all file keys via `reencryptFileKey()`)
- [ ] Export/download all (bulk decrypt)
- [ ] Delete account

---

## Phase 3: MCP Server (Week 3–4)

**Goal**: AI agents can interact with the vault via MCP tools.

### 3.1 MCP Tools Implementation
```typescript
// Tools to implement:
const tools = [
  {
    name: "bitatlas_list_files",
    description: "List files in the vault, optionally filtered by folder or category",
    params: { folder_id?, category?, search?, limit?, offset? }
  },
  {
    name: "bitatlas_get_file",
    description: "Get file metadata and download+decrypt a file from the vault",
    params: { file_id }
    // Agent decrypts using provided master key
  },
  {
    name: "bitatlas_upload_file",
    description: "Encrypt and upload a file to the vault",
    params: { file_path, name?, category?, folder_id? }
    // Agent encrypts using provided master key before upload
  },
  {
    name: "bitatlas_delete_file",
    description: "Delete a file from the vault",
    params: { file_id }
  },
  {
    name: "bitatlas_search",
    description: "Search vault by file name or tags",
    params: { query, category? }
  },
  {
    name: "bitatlas_create_folder",
    description: "Create a new folder in the vault",
    params: { name, parent_id? }
  },
  {
    name: "bitatlas_vault_status",
    description: "Get vault usage stats — file count, storage used, plan limits",
    params: {}
  }
];
```

### 3.2 Agent Auth Flow
- [ ] User generates API key in dashboard
- [ ] Agent config uses `BITATLAS_API_KEY` + `BITATLAS_MASTER_KEY`
- [ ] Master key derived client-side, provided to agent as env var
- [ ] All crypto operations happen in agent's Node.js runtime

### 3.3 Publish
- [ ] Publish `@bitatlas/mcp-server` to npm
- [ ] Register on MCP registries (Smithery, Glama, mcpso)
- [ ] Update `server.json` with correct API URL

---

## Phase 4: Emergency Access (Week 4–5)

**Goal**: Trusted contacts can access vault files using unlock phrase.

### 4.1 Emergency Setup
- [ ] User creates emergency contact with unlock phrase
- [ ] Client derives emergency key from unlock phrase + emergency_salt
- [ ] All existing file keys re-encrypted with emergency key (`reencryptFileKey()`)
- [ ] Emergency encrypted keys stored alongside owner encrypted keys

### 4.2 Emergency Activation
- [ ] Emergency contact requests access (email verification)
- [ ] Waiting period (configurable: 24h–7d) with owner notification
- [ ] If owner doesn't cancel → emergency contact gets access
- [ ] Emergency contact enters unlock phrase → derives emergency key → decrypts

### 4.3 Integration with LegacyShield
- [ ] LegacyShield can use BitAtlas as storage backend
- [ ] Shared emergency contact model
- [ ] Cross-product unlock flow

---

## Phase 5: Polish & Scale (Week 5–6)

### 5.1 Security Hardening
- [ ] CSRF protection
- [ ] Content Security Policy headers
- [ ] Rate limiting per endpoint
- [ ] Brute force protection on login
- [ ] Audit logging (all vault operations)
- [ ] Input validation (zod schemas)
- [ ] Penetration testing checklist

### 5.2 Performance
- [ ] Large file support (chunked upload/download with streaming encryption)
- [ ] File deduplication (hash of encrypted blob)
- [ ] CDN for static assets
- [ ] Database indexes optimization

### 5.3 Billing
- [ ] Free tier: 1GB, 100 files
- [ ] Pro tier: 50GB, unlimited files, priority agent access — €9/month
- [ ] Lifetime: 100GB — €149 one-time
- [ ] Stripe integration
- [ ] Usage tracking and enforcement

### 5.4 Mobile
- [ ] Responsive vault UI (works on phone/tablet)
- [ ] PWA support (offline file list, pending uploads queue)
- [ ] Share sheet integration (upload from other apps)

---

## Infrastructure Plan

### Shared Server (89.167.36.119)
```
Port Allocation:
  3000 → LegacyShield Web
  3001 → BitAtlas Web
  4000 → LegacyShield API
  4001 → BitAtlas API (new)
  5432 → PostgreSQL (shared, separate databases)
  9000 → MinIO (shared, separate buckets)
  6379 → Redis (shared)
```

### Docker Compose (bitatlas prod)
```yaml
services:
  api:
    build:
      context: .
      dockerfile: packages/api/Dockerfile
    env_file: .env.prod
    ports:
      - "127.0.0.1:4001:4001"
    depends_on:
      - postgres
      - minio
    networks:
      - internal

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    environment:
      - NEXT_PUBLIC_API_URL=https://api.bitatlas.com
    ports:
      - "127.0.0.1:3001:3001"
    depends_on:
      - api
    networks:
      - internal
```

### Nginx Updates Needed
- [ ] `api.bitatlas.com` → proxy to `127.0.0.1:4001` (currently returns static JSON stub)

---

## Execution Priority

| Priority | What | Why | Effort |
|----------|------|-----|--------|
| 🔴 P0 | Backend API + DB | Nothing works without it | 3–4 days |
| 🔴 P0 | Auth (register/login) | Gate to everything | 1–2 days |
| 🔴 P0 | File upload/download | Core product | 2–3 days |
| 🟡 P1 | Vault UI | User-facing value | 2–3 days |
| 🟡 P1 | MCP Server | Agent story (differentiator) | 2 days |
| 🟡 P1 | API key management | Enables agent access | 1 day |
| 🟢 P2 | Emergency access | LegacyShield integration | 2–3 days |
| 🟢 P2 | Billing/Stripe | Revenue | 1–2 days |
| 🟢 P2 | Mobile/PWA | Reach | 2 days |

**Total estimated time to MVP: ~3 weeks of focused dev work.**

---

## Key Decisions (Resolved 2026-03-21)

1. **ORM**: ✅ **Prisma** — consistency with LegacyShield, typed client, fast iteration
2. **Framework**: ✅ **Express** — same stack as LegacyShield, zero learning curve
3. **Session strategy**: ✅ **JWT + Redis** — instant revocation, active session tracking, Redis already running
4. **MinIO**: ✅ **Shared instance, separate bucket** — zero extra overhead, easy to split later
5. **File name encryption**: ✅ **Plaintext names** — simpler UX, server-side search/sort, content is what matters
6. **Repo structure**: ✅ **Separate repos** — different products, different lifecycles, extract shared packages later if needed

---

_Ready to start building. Say the word and I'll begin with Phase 1._ 🦞

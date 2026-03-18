# BitAtlas Technical Architecture 🦞

**Zero Knowledge Cloud Drive for Humans and Agents**

BitAtlas uses a **client-side encryption architecture** where all encryption and decryption operations occur in the user's browser or at the SDK level. The backend API never has access to plaintext documents or encryption keys, implementing a true zero-knowledge system.

---

## 1. Core Architectural Principles

1. **Zero-knowledge**: Server never has access to plaintext documents or encryption keys.
2. **Client-side cryptography**: All encryption/decryption occurs locally using the Web Crypto API or Node.js crypto module.
3. **Defense in depth**: Multiple security layers (TLS 1.3, encryption at rest, encrypted blobs, 2FA).
4. **Minimal trust**: Even if servers are compromised, encrypted data remains secure.
5. **Agent-native**: Designed to be integrated with AI agents via MCP while maintaining full security boundaries.
6. **European data sovereignty**: 100% EU-hosted infrastructure, no data leaves European jurisdiction.

---

## 2. Encryption Design

### 2.1 Key Derivation Flow

```
User enters password
        ↓
PBKDF2-SHA256 (100,000 iterations) + salt
        ↓
Master Key (256-bit AES-GCM)
        ↓
Used to encrypt/decrypt individual file keys
```

**Password → Login Hash (for authentication):**
```
User password + salt → bcrypt (10 rounds) → Password hash (stored in DB)
```

**Password → Master Key (for encryption):**
```
User password + user-specific salt → PBKDF2-SHA256 (100k iterations) → Master key (never sent to server)
```

**Important**: These are **separate processes**. The login hash is stored server-side for authentication. The master key is derived client-side and never leaves the local environment.

### 2.2 File Encryption Flow

```
1. User (or Agent) selects file to upload.
2. Generate a random file key (256-bit AES-GCM).
3. Encrypt the file with the file key using AES-256-GCM.
   ↳ Produces: Encrypted blob + IV + Auth tag.
4. Encrypt the file key with the owner's master key (AES-256-GCM).
   ↳ ownerEncryptedKey + ownerIV.
5. (Optional) Encrypt the file key with an emergency key (AES-256-GCM).
   ↳ emergencyEncryptedKey + emergencyIV.
6. Upload to server:
   - Encrypted blob → S3 Object Storage (EU-only).
   - ownerEncryptedKey, IV, authTag → PostgreSQL (EU-only).
```

### 2.3 File Decryption Flow

```
1. User (or Agent) requests a file.
2. Server returns:
   - Presigned URL to the encrypted blob.
   - ownerEncryptedKey, IV, authTag, and relevant IVs for keys.
3. Client:
   a. Decrypt ownerEncryptedKey using the derived master key → file key.
   b. Download the encrypted blob.
   c. Decrypt the blob using the file key, IV, and authTag → plaintext file.
4. Render in UI or process by Agent.
```

---

## 3. Technology Stack

### 3.1 Cryptography
- **AES-256-GCM**: Industry standard for authenticated encryption. Provides both confidentiality and integrity.
- **PBKDF2-SHA256**: For key derivation from passwords, using 100,000 iterations.
- **Web Crypto API**: Native browser support for cryptographic operations.
- **Node.js Crypto**: For server-side (where keys are NOT present) and MCP server operations.

### 3.2 Backend & Storage
- **Infrastructure**: Hosted on European providers (e.g., Hetzner Cloud).
- **Database**: PostgreSQL for metadata management.
- **Object Storage**: S3-compatible storage for encrypted blobs.

---

## 4. Agent Integration (MCP)

BitAtlas is natively designed for the **Model Context Protocol (MCP)**. This allows AI agents to interact with your secure vault while maintaining the zero-knowledge guarantee.

1. **Authentication**: The agent uses an API key to communicate with the BitAtlas backend.
2. **Decryption**: The agent must be provided with the user's derived master key (or a session-specific derived key) to perform decryption operations locally within its environment.
3. **Security Boundaries**: The master key stays with the agent's runtime and is never sent back to the BitAtlas servers.

---

Built with ❤️ by [BitAtlas Group](https://github.com/bitatlas-group)

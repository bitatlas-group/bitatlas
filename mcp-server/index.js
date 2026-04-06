#!/usr/bin/env node
'use strict';

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_URL = process.env.BITATLAS_API_URL || 'https://api.bitatlas.com';
const API_KEY = process.env.BITATLAS_API_KEY;
const MASTER_KEY_HEX = process.env.BITATLAS_MASTER_KEY;
const X402_WALLET_KEY = process.env.BITATLAS_WALLET_PRIVATE_KEY;

if (!API_KEY && !X402_WALLET_KEY) {
  console.error('Warning: No BITATLAS_API_KEY or BITATLAS_WALLET_PRIVATE_KEY configured.');
  console.error('Vault tools will fail. Set one of:');
  console.error('  BITATLAS_API_KEY  — get one at https://bitatlas.com/dashboard/settings');
  console.error('  BITATLAS_WALLET_PRIVATE_KEY — EVM wallet key to pay per-request via x402');
}

/** Returns the master key as a 32-byte Buffer. Throws if not configured or invalid. */
function getMasterKey() {
  if (!MASTER_KEY_HEX) {
    throw new Error(
      'BITATLAS_MASTER_KEY is required for encrypt/decrypt operations. ' +
      'Set it to your hex-encoded 256-bit master key (64 hex characters).'
    );
  }
  const key = Buffer.from(MASTER_KEY_HEX, 'hex');
  if (key.length !== 32) {
    throw new Error(
      `BITATLAS_MASTER_KEY must be a 64-character hex string (32 bytes). Got ${MASTER_KEY_HEX.length} characters.`
    );
  }
  return key;
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

// Existing axios client — used when BITATLAS_API_KEY is set
const axiosApi = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Build an x402 payment client wrapping the native fetch.
 * Returns an axios-compatible interface: { get, post, delete }.
 * Used when BITATLAS_WALLET_PRIVATE_KEY is set and no API key is configured.
 */
function createX402Client(x402Fetch, baseUrl) {
  async function request(method, urlPath, opts = {}) {
    const url = new URL(baseUrl + urlPath);
    if (opts.params) {
      for (const [k, v] of Object.entries(opts.params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    const fetchOpts = { method: method.toUpperCase() };
    if (opts.body !== undefined) {
      fetchOpts.headers = { 'Content-Type': 'application/json' };
      fetchOpts.body = JSON.stringify(opts.body);
    }

    const res = await x402Fetch(url.toString(), fetchOpts);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const err = new Error(
        errorData.error || errorData.message || `HTTP ${res.status}`
      );
      err.response = { data: errorData, status: res.status };
      throw err;
    }

    const data = await res.json();
    return { data };
  }

  return {
    get: (urlPath, opts) => request('GET', urlPath, opts),
    post: (urlPath, body, opts) => request('POST', urlPath, { ...opts, body }),
    delete: (urlPath, opts) => request('DELETE', urlPath, opts),
  };
}

/**
 * Resolve the active API client at startup.
 * Priority: API key > wallet key > unauthenticated (status only).
 */
function buildApiClient() {
  if (API_KEY) {
    return axiosApi;
  }

  if (X402_WALLET_KEY) {
    try {
      const { wrapFetch } = require('@x402/fetch');
      const { ExactEvmScheme } = require('@x402/evm/exact/client');
      const evmScheme = new ExactEvmScheme(X402_WALLET_KEY);
      const x402Fetch = wrapFetch(fetch, [evmScheme]);
      console.error('[x402] Using wallet-based x402 payments for vault access');
      return createX402Client(x402Fetch, API_URL);
    } catch (err) {
      console.error('[x402] Failed to initialize x402 client:', err.message);
      console.error('[x402] Ensure @x402/fetch and @x402/evm are installed (npm install in mcp-server/)');
    }
  }

  // No auth — unauthenticated client (only /status will work)
  return axios.create({ baseURL: API_URL });
}

const api = buildApiClient();

// ---------------------------------------------------------------------------
// Node.js Crypto — ported from sdk/encryption/fileEncryption.ts
//
// Protocol (matches Web Crypto SDK):
//   - File blob in S3       = AES-256-GCM ciphertext only (NO auth tag)
//   - authTag in DB         = 16-byte GCM auth tag for the file (base64)
//   - ownerEncryptedKey     = base64(encryptedFileKey || 16-byte key auth tag)
//   - ownerIV               = base64 IV used to encrypt the file key
//   - fileIV                = base64 IV used to encrypt the file
// ---------------------------------------------------------------------------

/**
 * AES-256-GCM encrypt.
 * Returns { combined: Buffer (ciphertext + 16-byte authTag), iv: Buffer }.
 * Appending the auth tag matches the Web Crypto API output format.
 */
function aesGcmEncrypt(plaintext, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag(); // always 16 bytes for GCM
  return { combined: Buffer.concat([ciphertext, authTag]), iv };
}

/**
 * AES-256-GCM decrypt.
 * Expects combined = ciphertext || 16-byte authTag (last 16 bytes = tag).
 */
function aesGcmDecrypt(combined, key, iv) {
  const authTag = combined.slice(-16);
  const ciphertext = combined.slice(0, -16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Encrypt a file buffer using a random per-file key wrapped with the master key.
 *
 * Returns:
 *   encryptedBlob     — Buffer (ciphertext only, no auth tag) — uploaded to S3
 *   ownerEncryptedKey — base64(encrypted file key + key auth tag)
 *   ownerIV           — base64 IV used for key encryption
 *   fileIV            — base64 IV used for file encryption
 *   authTag           — base64 file auth tag (stored in DB separately)
 */
function encryptFileBuffer(fileBuffer, masterKey) {
  // 1. Generate a random 256-bit file key
  const fileKey = crypto.randomBytes(32);

  // 2. Encrypt the file
  const fileIV = crypto.randomBytes(12);
  const fileCipher = crypto.createCipheriv('aes-256-gcm', fileKey, fileIV);
  const encryptedBlob = Buffer.concat([fileCipher.update(fileBuffer), fileCipher.final()]);
  const fileAuthTag = fileCipher.getAuthTag();

  // 3. Encrypt the file key with the master key
  const { combined: ownerEncKeyBuf, iv: ownerIV } = aesGcmEncrypt(fileKey, masterKey);

  return {
    encryptedBlob,
    ownerEncryptedKey: ownerEncKeyBuf.toString('base64'),
    ownerIV: ownerIV.toString('base64'),
    fileIV: fileIV.toString('base64'),
    authTag: fileAuthTag.toString('base64'),
  };
}

/**
 * Decrypt a file buffer.
 *   encryptedBlob — ciphertext-only Buffer (auth tag is stored separately)
 *   authTag       — base64 string of the 16-byte file auth tag
 */
function decryptFileBuffer(encryptedBlob, ownerEncryptedKey, ownerIV, fileIV, authTag, masterKey) {
  // 1. Decrypt the file key
  const ownerEncKeyBuf = Buffer.from(ownerEncryptedKey, 'base64');
  const ownerIVBuf = Buffer.from(ownerIV, 'base64');
  const fileKey = aesGcmDecrypt(ownerEncKeyBuf, masterKey, ownerIVBuf);

  // 2. Decrypt the file content (Node.js needs authTag set separately)
  const fileIVBuf = Buffer.from(fileIV, 'base64');
  const authTagBuf = Buffer.from(authTag, 'base64');
  const blobBuf = Buffer.isBuffer(encryptedBlob) ? encryptedBlob : Buffer.from(encryptedBlob);

  const decipher = crypto.createDecipheriv('aes-256-gcm', fileKey, fileIVBuf);
  decipher.setAuthTag(authTagBuf);
  return Buffer.concat([decipher.update(blobBuf), decipher.final()]);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEXT_MIME_PREFIXES = [
  'text/',
  'application/json',
  'application/xml',
  'application/javascript',
  'application/typescript',
  'application/yaml',
  'application/x-yaml',
  'application/x-sh',
  'application/x-python',
];

function isTextMime(mimeType) {
  if (!mimeType) return false;
  return TEXT_MIME_PREFIXES.some((p) => mimeType.startsWith(p));
}

const MIME_MAP = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.ts': 'application/typescript',
  '.tsx': 'application/typescript',
  '.jsx': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.yaml': 'application/yaml',
  '.yml': 'application/yaml',
  '.csv': 'text/csv',
  '.sh': 'text/x-sh',
  '.py': 'text/x-python',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

function guessMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

function formatFileMeta(f) {
  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    sizeBytes: f.originalSizeBytes || f.sizeBytes,
    category: f.category || null,
    folderId: f.folderId || null,
    expiresAt: f.expiresAt || null,
    createdAt: f.createdAt,
  };
}

function ok(str) {
  return { content: [{ type: 'text', text: str }] };
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'bitatlas-vault', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'bitatlas_vault_status',
      description: 'Get vault health status, file count, and storage usage.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'bitatlas_list_files',
      description: 'List files in the vault. Optionally filter by folder, category, or search term.',
      inputSchema: {
        type: 'object',
        properties: {
          folderId: { type: 'string', description: 'Filter by folder ID' },
          category: {
            type: 'string',
            enum: ['identity', 'financial', 'legal', 'medical', 'digital'],
            description: 'Filter by category',
          },
          search: { type: 'string', description: 'Search by file name' },
        },
      },
    },
    {
      name: 'bitatlas_search',
      description: 'Search vault files by a query string, optionally narrowed to a category.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (file name)' },
          category: {
            type: 'string',
            enum: ['identity', 'financial', 'legal', 'medical', 'digital'],
            description: 'Narrow results to this category',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'bitatlas_get_file',
      description:
        'Get file metadata and download + decrypt the file content. ' +
        'Returns decrypted content as UTF-8 text for text files, or base64 for binary files. ' +
        'Requires BITATLAS_MASTER_KEY.',
      inputSchema: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'File UUID' },
        },
        required: ['file_id'],
      },
    },
    {
      name: 'bitatlas_upload_file',
      description:
        'Read a local file, encrypt it client-side with AES-256-GCM, and upload it to the vault. ' +
        'Requires BITATLAS_MASTER_KEY. Files over 100 MB are not supported via MCP.',
      inputSchema: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Absolute or relative path to the local file' },
          name: { type: 'string', description: 'Override display name (defaults to the filename)' },
          category: {
            type: 'string',
            enum: ['identity', 'financial', 'legal', 'medical', 'digital'],
            description: 'File category',
          },
          folder_id: { type: 'string', description: 'Destination folder ID (omit for root)' },
        },
        required: ['file_path'],
      },
    },
    {
      name: 'bitatlas_delete_file',
      description: 'Permanently delete a file from the vault.',
      inputSchema: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'File UUID to delete' },
        },
        required: ['file_id'],
      },
    },
    {
      name: 'bitatlas_create_folder',
      description: 'Create a new folder in the vault.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Folder name' },
          parent_id: { type: 'string', description: 'Parent folder ID (omit to create at root)' },
        },
        required: ['name'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    // -----------------------------------------------------------------------
    // bitatlas_vault_status
    // -----------------------------------------------------------------------
    if (name === 'bitatlas_vault_status') {
      const statusRes = await axios.get(`${API_URL}/status`);
      let vaultInfo = null;
      try {
        const filesRes = await api.get('/vault/files');
        const files = filesRes.data.files || [];
        const totalBytes = files.reduce((sum, f) => sum + (Number(f.sizeBytes) || 0), 0);
        vaultInfo = {
          fileCount: files.length,
          storageUsedBytes: totalBytes,
          storageUsedMB: (totalBytes / 1048576).toFixed(2),
        };
      } catch {
        vaultInfo = { note: 'Vault access unavailable (check auth config)' };
      }

      return ok(JSON.stringify({
        status: statusRes.data.status,
        checks: statusRes.data.checks,
        vault: vaultInfo,
      }, null, 2));
    }

    // -----------------------------------------------------------------------
    // bitatlas_list_files
    // -----------------------------------------------------------------------
    if (name === 'bitatlas_list_files') {
      const params = {};
      if (args.folderId) params.folderId = args.folderId;
      if (args.category) params.category = args.category;
      if (args.search) params.search = args.search;

      const res = await api.get('/vault/files', { params });
      const files = res.data.files || [];
      return ok(JSON.stringify(files.map(formatFileMeta), null, 2));
    }

    // -----------------------------------------------------------------------
    // bitatlas_search
    // -----------------------------------------------------------------------
    if (name === 'bitatlas_search') {
      if (!args.query) throw new Error('query is required');
      const params = { search: args.query };
      if (args.category) params.category = args.category;

      const res = await api.get('/vault/files', { params });
      const files = res.data.files || [];
      return ok(
        `Found ${files.length} file(s) matching "${args.query}":\n\n` +
        JSON.stringify(files.map(formatFileMeta), null, 2)
      );
    }

    // -----------------------------------------------------------------------
    // bitatlas_get_file
    // -----------------------------------------------------------------------
    if (name === 'bitatlas_get_file') {
      if (!args.file_id) throw new Error('file_id is required');
      const masterKey = getMasterKey();

      // Fetch metadata and pre-signed download URL in parallel
      const [metaRes, urlRes] = await Promise.all([
        api.get(`/vault/files/${args.file_id}`),
        api.get(`/vault/files/${args.file_id}/download-url`),
      ]);
      const meta = metaRes.data;
      const downloadUrl = urlRes.data.downloadUrl;
      const encMeta = urlRes.data.encryptionMetadata;

      // Download the encrypted blob (no auth headers needed for presigned URLs)
      const blobRes = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
      const encryptedBlob = Buffer.from(blobRes.data);

      if (encryptedBlob.length > 50 * 1024 * 1024) {
        return ok(JSON.stringify({
          id: meta.id,
          name: meta.name,
          mimeType: meta.mimeType,
          sizeBytes: meta.originalSizeBytes || meta.sizeBytes,
          warning:
            `File is ${(encryptedBlob.length / 1048576).toFixed(1)} MB. ` +
            'Decrypting files this large in memory is not recommended. ' +
            'Download manually via the web vault.',
        }, null, 2));
      }

      const decrypted = decryptFileBuffer(
        encryptedBlob,
        encMeta.ownerEncryptedKey,
        encMeta.ownerIv,
        encMeta.fileIv,
        encMeta.authTag,
        masterKey
      );

      const asText = isTextMime(meta.mimeType);
      return ok(JSON.stringify({
        id: meta.id,
        name: meta.name,
        mimeType: meta.mimeType,
        sizeBytes: decrypted.length,
        category: meta.category || null,
        folderId: meta.folderId || null,
        expiresAt: meta.expiresAt || null,
        createdAt: meta.createdAt,
        encoding: asText ? 'utf8' : 'base64',
        content: asText ? decrypted.toString('utf8') : decrypted.toString('base64'),
      }, null, 2));
    }

    // -----------------------------------------------------------------------
    // bitatlas_upload_file
    // -----------------------------------------------------------------------
    if (name === 'bitatlas_upload_file') {
      if (!args.file_path) throw new Error('file_path is required');
      const masterKey = getMasterKey();

      const filePath = path.resolve(args.file_path);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const stats = fs.statSync(filePath);
      if (stats.size > 100 * 1024 * 1024) {
        throw new Error(
          `File is ${(stats.size / 1048576).toFixed(1)} MB. ` +
          'Files over 100 MB are not supported via MCP (memory limit). ' +
          'Use the web vault for large files.'
        );
      }

      const fileBuffer = fs.readFileSync(filePath);
      const fileName = args.name || path.basename(filePath);
      const mimeType = guessMime(filePath);

      // Encrypt client-side
      const encrypted = encryptFileBuffer(fileBuffer, masterKey);

      // Get presigned upload URL (API generates the storage key server-side)
      const urlRes = await api.post('/vault/files/upload-url', {
        fileName,
        contentType: 'application/octet-stream',
      });
      const { uploadUrl, storageKey } = urlRes.data;

      // Upload encrypted blob directly to S3 (no auth headers for presigned PUT)
      await axios.put(uploadUrl, encrypted.encryptedBlob, {
        headers: { 'Content-Type': 'application/octet-stream' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      // Save metadata to API
      const payload = {
        name: fileName,
        mimeType,
        sizeBytes: encrypted.encryptedBlob.length,
        originalSizeBytes: fileBuffer.length,
        storageKey,
        ownerEncryptedKey: encrypted.ownerEncryptedKey,
        ownerIv: encrypted.ownerIV,
        fileIv: encrypted.fileIV,
        authTag: encrypted.authTag,
      };
      if (args.folder_id) payload.folderId = args.folder_id;
      if (args.category) payload.category = args.category;

      const fileRes = await api.post('/vault/files', payload);
      const created = fileRes.data;

      return ok(JSON.stringify({
        success: true,
        id: created.id,
        name: fileName,
        mimeType,
        originalSizeBytes: fileBuffer.length,
        encryptedSizeBytes: encrypted.encryptedBlob.length,
        category: args.category || null,
        folderId: args.folder_id || null,
        expiresAt: created.expiresAt || null,
        message: `"${fileName}" encrypted and uploaded successfully.`,
      }, null, 2));
    }

    // -----------------------------------------------------------------------
    // bitatlas_delete_file
    // -----------------------------------------------------------------------
    if (name === 'bitatlas_delete_file') {
      if (!args.file_id) throw new Error('file_id is required');
      await api.delete(`/vault/files/${args.file_id}`);
      return ok(`File ${args.file_id} deleted successfully.`);
    }

    // -----------------------------------------------------------------------
    // bitatlas_create_folder
    // -----------------------------------------------------------------------
    if (name === 'bitatlas_create_folder') {
      if (!args.name) throw new Error('name is required');
      const payload = { name: args.name };
      if (args.parent_id) payload.parentId = args.parent_id;

      const res = await api.post('/folders', payload);
      return ok(JSON.stringify({
        success: true,
        id: res.data.id,
        name: res.data.name,
        parentId: res.data.parentId || null,
      }, null, 2));
    }

    throw new Error(`Unknown tool: ${name}`);

  } catch (err) {
    const msg =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      err.message;
    return {
      isError: true,
      content: [{ type: 'text', text: `Error: ${msg}` }],
    };
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('BitAtlas MCP Server running on stdio');
  console.error(`API: ${API_URL}`);
  if (API_KEY) {
    console.error('Auth: API key');
  } else if (X402_WALLET_KEY) {
    console.error('Auth: x402 wallet payments');
  } else {
    console.error('Auth: none (vault tools unavailable)');
  }
  console.error(`Master key: ${MASTER_KEY_HEX ? 'configured' : 'NOT SET (encrypt/decrypt unavailable)'}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

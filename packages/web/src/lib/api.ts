/**
 * BitAtlas API Client
 * Fetch wrapper with JWT auth, auto-refresh on 401, typed endpoints.
 *
 * Refresh token + encryption salt persist to localStorage so a page reload
 * doesn't log the user out. The master encryption key is intentionally NOT
 * persisted — the user must re-enter their password to decrypt files.
 */

const REFRESH_KEY = 'bitatlas.refreshToken';
const SALT_KEY = 'bitatlas.encryptionSalt';

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _onUnauthorized: (() => void) | null = null;
let _isRefreshing = false;

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.bitatlas.com';

function readPersistedRefresh(): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(REFRESH_KEY); } catch { return null; }
}

function writePersistedRefresh(token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem(REFRESH_KEY, token);
    else window.localStorage.removeItem(REFRESH_KEY);
  } catch { /* ignore */ }
}

export function persistEncryptionSalt(salt: string) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(SALT_KEY, salt); } catch { /* ignore */ }
}

export function readPersistedEncryptionSalt(): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(SALT_KEY); } catch { return null; }
}

export function clearPersistedEncryptionSalt() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(SALT_KEY); } catch { /* ignore */ }
}

export function setTokens(access: string, refresh: string) {
  _accessToken = access;
  _refreshToken = refresh;
  writePersistedRefresh(refresh);
}

export function clearTokens() {
  _accessToken = null;
  _refreshToken = null;
  writePersistedRefresh(null);
  clearPersistedEncryptionSalt();
}

/**
 * Attempt to restore an authenticated session from a persisted refresh token.
 * Returns the rehydrated user (and a fresh access token in memory) on success,
 * or null if no refresh token is stored or it's no longer valid.
 */
export async function restoreSession(): Promise<User | null> {
  const refresh = readPersistedRefresh();
  if (!refresh) return null;

  try {
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!refreshRes.ok) {
      writePersistedRefresh(null);
      clearPersistedEncryptionSalt();
      return null;
    }
    const data = await refreshRes.json();
    setTokens(data.accessToken, data.refreshToken);
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (!meRes.ok) {
      clearTokens();
      return null;
    }
    return (await meRes.json()) as User;
  } catch {
    return null;
  }
}

export function setUnauthorizedHandler(fn: () => void) {
  _onUnauthorized = fn;
}

// ── Core request wrapper ──────────────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry && _refreshToken) {
    if (!_isRefreshing) {
      _isRefreshing = true;
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: _refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setTokens(data.accessToken, data.refreshToken);
          _isRefreshing = false;
          return request<T>(path, options, false);
        }
      } catch {
        // refresh failed — fall through to unauthorized
      }
      _isRefreshing = false;
    }
    clearTokens();
    _onUnauthorized?.();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

// ── Upload to presigned URL (no auth header, raw binary) ─────────────────────
export async function uploadToPresignedUrl(
  url: string,
  data: ArrayBuffer,
  contentType: string
): Promise<void> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: data,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
}

// ── Auth endpoints ────────────────────────────────────────────────────────────
export const authApi = {
  register: async (email: string, password: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),

  me: () => request<User>('/auth/me'),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
};

// ── Vault file endpoints ──────────────────────────────────────────────────────
export const vaultApi = {
  listFiles: async (params?: { folderId?: string; category?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.folderId) qs.set('folderId', params.folderId);
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    const query = qs.toString();
    const res = await request<{ files: VaultFile[]; total: number }>(`/vault/files${query ? `?${query}` : ''}`);
    return res.files;
  },

  getFile: (id: string) => request<VaultFile>(`/vault/files/${id}`),

  createFile: (data: CreateFilePayload) =>
    request<VaultFile>('/vault/files', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateFile: (id: string, data: { folderId?: string | null; name?: string }) =>
    request<VaultFile>(`/vault/files/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteFile: (id: string) =>
    request<void>(`/vault/files/${id}`, { method: 'DELETE' }),

  getUploadUrl: async (fileName: string, contentType: string) => {
    const res = await request<{ uploadUrl: string; storageKey: string }>('/vault/files/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType }),
    });
    return { url: res.uploadUrl, storageKey: res.storageKey };
  },

  getDownloadUrl: async (id: string) => {
    const res = await request<{ downloadUrl: string; encryptionMetadata: { ownerEncryptedKey: string; ownerIv: string; fileIv: string; authTag: string; emergencyEncryptedKey?: string | null; emergencyIv?: string | null } }>(`/vault/files/${id}/download-url`);
    return { url: res.downloadUrl, encryptionMetadata: res.encryptionMetadata };
  },
};

// ── Folder endpoints ──────────────────────────────────────────────────────────
export const foldersApi = {
  list: async () => {
    const res = await request<{ folders: Folder[] }>('/folders');
    return res.folders;
  },

  create: (name: string, parentId?: string) =>
    request<Folder>('/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parentId }),
    }),

  update: (id: string, name: string) =>
    request<Folder>(`/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  delete: (id: string) => request<void>(`/folders/${id}`, { method: 'DELETE' }),
};

// ── API Key endpoints ─────────────────────────────────────────────────────────
export const keysApi = {
  list: async () => {
    const res = await request<{ keys: ApiKeyRecord[] }>('/keys');
    return res.keys;
  },

  create: (name: string) =>
    request<ApiKeyRecord & { key: string }>('/keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  delete: (id: string) => request<void>(`/keys/${id}`, { method: 'DELETE' }),
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  encryptionSalt: string;
}

export interface VaultFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  originalSizeBytes: number;
  storageKey: string;
  ownerEncryptedKey: string;
  ownerIv: string;
  fileIv: string;
  authTag: string;
  folderId: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFilePayload {
  name: string;
  mimeType: string;
  sizeBytes: number;
  originalSizeBytes: number;
  storageKey: string;
  ownerEncryptedKey: string;
  ownerIv: string;
  fileIv: string;
  authTag: string;
  folderId?: string | null;
  category?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
}

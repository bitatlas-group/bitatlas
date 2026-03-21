'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { keysApi, type ApiKeyRecord } from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuth();

  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<{ name: string; apiKey: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    setLoadingKeys(true);
    try {
      const data = await keysApi.list();
      setApiKeys(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoadingKeys(false);
    }
  }

  async function handleCreateKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const { key, apiKey } = await keysApi.create(newKeyName.trim());
      setApiKeys((prev) => [key, ...prev]);
      setCreatedKey({ name: key.name, apiKey });
      setNewKeyName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteKey(id: string) {
    if (!confirm('Revoke this API key? Any integrations using it will stop working.')) return;
    try {
      await keysApi.delete(id);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke key');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <h1 className="font-headline font-extrabold text-2xl text-primary tracking-tight mb-8">
        Settings
      </h1>

      {/* Error banner */}
      {error && (
        <div className="mb-6 bg-error-container text-on-error-container text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            error
          </span>
          {error}
          <button onClick={() => setError(null)} className="ml-auto hover:opacity-70">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
          </button>
        </div>
      )}

      {/* Account section */}
      <section className="mb-10">
        <h2 className="font-headline font-bold text-base text-on-surface-variant uppercase tracking-widest mb-4">
          Account
        </h2>
        <div className="bg-surface-container-lowest rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
              <span
                className="material-symbols-outlined text-on-primary"
                style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}
              >
                person
              </span>
            </div>
            <div>
              <p className="font-headline font-semibold text-on-surface">{user?.email}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Member since {user?.createdAt ? formatDate(user.createdAt) : '—'}
              </p>
            </div>
          </div>

          {/* Encryption status */}
          <div className="mt-4 flex items-center gap-2 bg-tertiary-container px-3 py-2 rounded-xl">
            <span
              className="material-symbols-outlined text-tertiary-fixed-dim"
              style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
            >
              shield_lock
            </span>
            <span className="text-xs font-bold text-tertiary-fixed-dim">
              Zero-knowledge encryption active — AES-256-GCM
            </span>
          </div>
        </div>
      </section>

      {/* API Keys section */}
      <section>
        <h2 className="font-headline font-bold text-base text-on-surface-variant uppercase tracking-widest mb-4">
          API Keys
        </h2>
        <p className="text-sm text-on-surface-variant mb-6">
          Use API keys to give agents and integrations access to your vault. Keys are shown only
          once — copy and store them securely.
        </p>

        {/* One-time display of newly created key */}
        {createdKey && (
          <div className="mb-6 bg-tertiary-container rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <span
                className="material-symbols-outlined text-tertiary-fixed-dim flex-shrink-0"
                style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
              >
                key
              </span>
              <div>
                <p className="font-headline font-bold text-tertiary-fixed-dim text-sm">
                  {createdKey.name} — copy now, won&apos;t be shown again
                </p>
                <p className="text-xs text-on-tertiary-container mt-0.5">
                  Store this in your agent&apos;s environment as BITATLAS_API_KEY
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-tertiary/20 text-tertiary-fixed text-xs font-mono px-3 py-2 rounded-xl break-all">
                {createdKey.apiKey}
              </code>
              <button
                onClick={() => copyToClipboard(createdKey.apiKey)}
                className="flex-shrink-0 flex items-center gap-1.5 bg-on-tertiary text-tertiary px-3 py-2 rounded-xl text-xs font-headline font-bold hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="mt-3 text-xs text-on-tertiary-container hover:text-tertiary-fixed-dim transition-colors"
            >
              I&apos;ve saved it — dismiss
            </button>
          </div>
        )}

        {/* Create new key */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 mb-4">
          <p className="font-headline font-semibold text-sm text-on-surface mb-3">
            Create new API key
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
              placeholder="e.g. Production Agent, Dev environment"
              className="flex-1 bg-surface-container-highest rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button
              onClick={handleCreateKey}
              disabled={creating || !newKeyName.trim()}
              className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-on-primary px-4 py-2.5 rounded-xl font-headline font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? (
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  add
                </span>
              )}
              Generate
            </button>
          </div>
        </div>

        {/* Key list */}
        {loadingKeys ? (
          <div className="flex items-center gap-2 py-4 text-on-surface-variant text-sm">
            <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>
              progress_activity
            </span>
            Loading keys…
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="py-8 text-center text-sm text-on-surface-variant bg-surface-container-lowest rounded-2xl">
            No API keys yet. Create one to connect your agents.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="bg-surface-container-lowest rounded-2xl px-5 py-4 flex items-center gap-4"
              >
                <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
                  <span
                    className="material-symbols-outlined text-on-surface-variant"
                    style={{ fontSize: '18px' }}
                  >
                    vpn_key
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-headline font-semibold text-sm text-on-surface">
                    {key.name}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    <code className="font-mono">{key.prefix}••••••••</code>
                    {' · '}
                    Created {formatDate(key.createdAt)}
                    {key.lastUsedAt && ` · Last used ${formatDate(key.lastUsedAt)}`}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-error transition-colors px-3 py-1.5 rounded-lg hover:bg-error-container/30"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    delete
                  </span>
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

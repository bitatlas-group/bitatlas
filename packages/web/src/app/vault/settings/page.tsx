'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { keysApi, type ApiKeyRecord } from '@/lib/api';
import { Loader2, AlertCircle, X, Key, Plus, ShieldCheck, Trash2, Copy, Check } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';

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
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="px-6 py-8 max-w-3xl">
      <h1 className="text-[28px] font-semibold text-ink-900 tracking-tight mb-8">Settings</h1>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-[13px] px-4 py-3 rounded-xl">
          <AlertCircle size={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Account section */}
      <section className="mb-10">
        <h2 className="text-[11px] font-semibold text-ink-400 uppercase tracking-[0.2em] mb-4">Account</h2>
        <div className="bg-white border border-ink-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} className="text-brand-500" />
            </div>
            <div>
              <p className="font-medium text-ink-900">{user?.email}</p>
              <p className="text-[12px] text-ink-400 mt-0.5">
                Member since {user?.createdAt ? formatDate(user.createdAt) : '—'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 bg-brand-50 border border-brand-100 px-3 py-2 rounded-xl">
            <ShieldCheck size={13} className="text-brand-500 shrink-0" />
            <span className="text-[12px] font-semibold text-brand-600">
              Zero-knowledge encryption active — AES-256-GCM
            </span>
          </div>
        </div>
      </section>

      {/* API Keys section */}
      <section>
        <h2 className="text-[11px] font-semibold text-ink-400 uppercase tracking-[0.2em] mb-4">API Keys</h2>
        <p className="text-[14px] text-ink-500 mb-6">
          Use API keys to give agents and integrations access to your vault. Keys are shown only once — copy and store them securely.
        </p>

        {/* One-time display of newly created key */}
        {createdKey && (
          <div className="mb-6 bg-brand-50 border border-brand-100 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <Key size={16} className="text-brand-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-brand-600 text-[14px]">
                  {createdKey.name} — copy now, won&apos;t be shown again
                </p>
                <p className="text-[12px] text-brand-500 mt-0.5">
                  Store this in your agent&apos;s environment as <code className="font-mono">BITATLAS_API_KEY</code>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-white border border-brand-100 text-ink-700 text-[12px] font-mono px-3 py-2 rounded-xl break-all">
                {createdKey.apiKey}
              </code>
              <button
                onClick={() => copyToClipboard(createdKey.apiKey)}
                className="shrink-0 flex items-center gap-1.5 bg-brand-500 text-white px-3 py-2 rounded-xl text-[12px] font-semibold hover:bg-brand-600 transition-colors"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="mt-3 text-[12px] text-brand-500 hover:text-brand-600 transition-colors"
            >
              I&apos;ve saved it — dismiss
            </button>
          </div>
        )}

        {/* Create new key */}
        <div className="bg-white border border-ink-100 rounded-2xl p-5 mb-4 shadow-sm">
          <p className="font-semibold text-[14px] text-ink-900 mb-3">Create new API key</p>
          <div className="flex items-center gap-3">
            <Input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
              placeholder="e.g. Production Agent, Dev environment"
              className="flex-1"
            />
            <Button
              onClick={handleCreateKey}
              disabled={creating || !newKeyName.trim()}
              variant="primary"
              size="md"
              iconLeft={creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            >
              Generate
            </Button>
          </div>
        </div>

        {/* Key list */}
        {loadingKeys ? (
          <div className="flex items-center gap-2 py-4 text-ink-500 text-[14px]">
            <Loader2 size={16} className="animate-spin" />
            Loading keys…
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="py-8 text-center text-[14px] text-ink-400 bg-white border border-ink-100 rounded-2xl shadow-sm">
            No API keys yet. Create one to connect your agents.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {apiKeys.map((key) => (
              <div key={key.id} className="bg-white border border-ink-100 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-ink-50 flex items-center justify-center shrink-0">
                  <Key size={16} className="text-ink-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14px] text-ink-900">{key.name}</p>
                  <p className="text-[12px] text-ink-400 mt-0.5">
                    <code className="font-mono">{key.prefix}••••••••</code>
                    {' · '}Created {formatDate(key.createdAt)}
                    {key.lastUsedAt && ` · Last used ${formatDate(key.lastUsedAt)}`}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                >
                  <Trash2 size={13} />
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

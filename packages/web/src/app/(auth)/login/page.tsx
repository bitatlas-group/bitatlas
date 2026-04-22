'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { BitatlasLogo } from '@/design-system/logo/BitatlasLogo';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { IconShield } from '@/design-system/icons';
import { Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { initMasterKey } = useCrypto();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { encryptionSalt } = await login(email, password);
      await initMasterKey(password, encryptionSalt);
      router.replace('/vault');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex justify-center mb-10">
        <Link href="/">
          <BitatlasLogo size={32} color="#3B82F6" wordColor="#FFFFFF" />
        </Link>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-ink-100">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold text-ink-900 tracking-tight">
            Welcome back
          </h1>
          <p className="text-ink-500 text-[14px] mt-1">
            Sign in to access your encrypted vault
          </p>
        </div>

        {/* Encryption indicator */}
        <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 px-3 py-2 rounded-xl mb-6">
          <IconShield size={14} className="text-brand-500 shrink-0" />
          <span className="text-[11px] font-semibold text-brand-600 uppercase tracking-wider">
            End-to-end encrypted — we never see your key
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-ink-400 uppercase tracking-[0.16em]">
              Email
            </label>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-ink-400 uppercase tracking-[0.16em]">
              Password
            </label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 text-[13px] px-4 py-3 rounded-xl border border-red-100">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            className="mt-2 w-full justify-center"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Deriving encryption key…
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </div>

      {/* Footer link */}
      <p className="text-center text-[14px] text-ink-400 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-brand-400 font-medium hover:text-brand-500 transition-colors">
          Create one free
        </Link>
      </p>
    </div>
  );
}

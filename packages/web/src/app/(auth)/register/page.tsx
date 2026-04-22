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

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { initMasterKey } = useCrypto();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Honeypot — bots fill this, humans don't see it
    if (website) return;

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }

    setLoading(true);
    try {
      const { encryptionSalt } = await register(email, password);
      await initMasterKey(password, encryptionSalt);
      router.replace('/vault');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
            Create your vault
          </h1>
          <p className="text-ink-500 text-[14px] mt-1">
            Free forever. No credit card required.
          </p>
        </div>

        {/* Zero-knowledge notice */}
        <div className="flex items-start gap-3 bg-brand-50 border border-brand-100 px-3 py-3 rounded-xl mb-6">
          <IconShield size={14} className="text-brand-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-brand-600 leading-relaxed">
            Your password derives your encryption key via PBKDF2 — 100,000 iterations.
            We never receive or store your key. If you lose your password, your data
            cannot be recovered.
          </p>
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min. 12 characters"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-ink-400 uppercase tracking-[0.16em]">
              Confirm Password
            </label>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {/* Honeypot — hidden from humans, bots auto-fill it */}
          <div className="absolute opacity-0 top-0 left-0 h-0 w-0 -z-10" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              type="text"
              id="website"
              name="website"
              autoComplete="off"
              tabIndex={-1}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
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
                Creating vault…
              </>
            ) : (
              'Create Vault'
            )}
          </Button>
        </form>
      </div>

      {/* Footer link */}
      <p className="text-center text-[14px] text-ink-400 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-400 font-medium hover:text-brand-500 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

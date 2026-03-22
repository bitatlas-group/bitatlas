'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { initMasterKey } = useCrypto();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
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
          <Image
            src="/logo-full.jpg"
            alt="BitAtlas"
            width={280}
            height={76}
            className="h-16 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Card */}
      <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-xl shadow-primary/5">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-headline font-extrabold text-2xl text-primary tracking-tight">
            Create your vault
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Free forever. No credit card required.
          </p>
        </div>

        {/* Zero-knowledge notice */}
        <div className="flex items-start gap-3 bg-tertiary-container px-3 py-3 rounded-xl mb-6">
          <span
            className="material-symbols-outlined text-tertiary-fixed-dim mt-0.5 flex-shrink-0"
            style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
          >
            shield_lock
          </span>
          <p className="text-xs text-tertiary-fixed-dim leading-relaxed">
            Your password derives your encryption key via PBKDF2 — 100,000 iterations.
            We never receive or store your key. If you lose your password, your data
            cannot be recovered.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-headline font-semibold text-on-surface-variant uppercase tracking-widest">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-surface-container-highest rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-body text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-headline font-semibold text-on-surface-variant uppercase tracking-widest">
              Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min. 8 characters"
              className="w-full bg-surface-container-highest rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-body text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-headline font-semibold text-on-surface-variant uppercase tracking-widest">
              Confirm Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-surface-container-highest rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-body text-sm"
            />
          </div>

          {error && (
            <div className="bg-error-container text-on-error-container text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                error
              </span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-gradient-to-br from-primary to-primary-container text-on-primary py-3.5 rounded-xl font-headline font-bold text-sm tracking-tight hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span
                  className="material-symbols-outlined animate-spin"
                  style={{ fontSize: '18px' }}
                >
                  progress_activity
                </span>
                Creating vault…
              </>
            ) : (
              'Create Vault'
            )}
          </button>
        </form>
      </div>

      {/* Footer link */}
      <p className="text-center text-sm text-on-surface-variant mt-6">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-primary font-headline font-semibold hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

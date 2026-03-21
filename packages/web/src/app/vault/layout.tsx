'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { authApi, foldersApi, type Folder } from '@/lib/api';

// ── Inner layout — uses useSearchParams, must be inside Suspense ──────────────
function VaultLayoutInner({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { clearMasterKey } = useCrypto();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedFolderId = searchParams.get('folderId');

  const [folders, setFolders] = useState<Folder[]>([]);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else {
      loadFolders();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadFolders() {
    try {
      const data = await foldersApi.list();
      setFolders(data);
    } catch {
      // silently fail
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      const folder = await foldersApi.create(newFolderName.trim());
      setFolders((prev) => [...prev, folder]);
      setNewFolderName('');
      setCreatingFolder(false);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore API errors on logout
    }
    clearMasterKey();
    logout();
    router.replace('/login');
  }

  if (!user) return null;

  const navItems = [
    { href: '/vault', icon: 'grid_view', label: 'My Vault' },
    { href: '/vault/settings', icon: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-60 flex-shrink-0 bg-surface-container-low flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5">
          <Link href="/">
            <Image
              src="/logo-full.jpg"
              alt="BitAtlas"
              width={120}
              height={33}
              className="h-7 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Nav items */}
        <nav className="px-3 flex flex-col gap-0.5">
          {navItems.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-headline font-semibold ${
                  active
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '20px',
                    fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {icon}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Folders section */}
        <div className="px-3 mt-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
              Folders
            </span>
            <button
              onClick={() => setCreatingFolder(true)}
              className="text-on-surface-variant hover:text-primary transition-colors"
              title="New folder"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                add
              </span>
            </button>
          </div>

          {/* New folder input */}
          {creatingFolder && (
            <div className="px-3 mb-2">
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') {
                    setCreatingFolder(false);
                    setNewFolderName('');
                  }
                }}
                onBlur={() => {
                  if (!newFolderName.trim()) setCreatingFolder(false);
                }}
                placeholder="Folder name"
                className="w-full bg-surface-container-highest rounded-lg px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}

          {/* All files link */}
          <Link
            href="/vault"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
              pathname === '/vault' && !selectedFolderId
                ? 'bg-surface-container text-on-surface font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container/60'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              home
            </span>
            All files
          </Link>

          {folders.map((folder) => (
            <Link
              key={folder.id}
              href={`/vault?folderId=${folder.id}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                selectedFolderId === folder.id
                  ? 'bg-surface-container text-on-surface font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container/60'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                folder
              </span>
              <span className="truncate">{folder.name}</span>
            </Link>
          ))}
        </div>

        {/* Bottom: user + logout */}
        <div className="px-4 py-4 mt-auto">
          <div className="bg-surface-container rounded-2xl px-3 py-3">
            <p className="text-xs font-headline font-semibold text-on-surface truncate">
              {user.email}
            </p>
            <button
              onClick={handleLogout}
              className="mt-2 flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-error transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                logout
              </span>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

// ── Exported layout — wraps inner in Suspense for useSearchParams ─────────────
export default function VaultLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <VaultLayoutInner>{children}</VaultLayoutInner>
    </Suspense>
  );
}

'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { useFolders } from '@/contexts/FolderContext';
import { authApi } from '@/lib/api';

function VaultLayoutInner({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { clearMasterKey } = useCrypto();
  const { folders, createFolder } = useFolders();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedFolderId = searchParams.get('folderId');

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, selectedFolderId]);

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName.trim());
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
      {/* ── Mobile header ── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4"
        style={{ height: '56px', backgroundColor: '#F3F1EE', borderBottom: '1px solid #E5E7EB' }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#1A2332' }}>
            menu
          </span>
        </button>
        <Link href="/">
          <Image
            src="/logo-full.jpg"
            alt="BitAtlas"
            width={140}
            height={38}
            className="h-8 w-auto object-contain"
          />
        </Link>
        <div style={{ width: '32px' }} /> {/* Spacer for centering */}
      </div>

      {/* ── Mobile sidebar backdrop ── */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed md:relative z-40 md:z-auto
          w-64 md:w-60 flex-shrink-0 bg-surface-container-low flex flex-col h-full
          transition-transform duration-200 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo + close (mobile) */}
        <div className="px-5 py-5 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/logo-full.jpg"
              alt="BitAtlas"
              width={200}
              height={55}
              className="h-10 w-auto object-contain"
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#6B7280' }}>
              close
            </span>
          </button>
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
                  style={{ fontSize: '20px', fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
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
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            </button>
          </div>

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

          <Link
            href="/vault"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
              pathname === '/vault' && !selectedFolderId
                ? 'bg-surface-container text-on-surface font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container/60'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>home</span>
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
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>folder</span>
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
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>logout</span>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}

export default function VaultLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <VaultLayoutInner>{children}</VaultLayoutInner>
    </Suspense>
  );
}

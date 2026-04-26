'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { useFolders } from '@/contexts/FolderContext';
import { authApi } from '@/lib/api';
import { BitatlasLogo } from '@/design-system/logo/BitatlasLogo';
import {
  Settings, FolderPlus, Home, Folder as FolderIcon,
  LogOut, Menu, X, ShieldCheck,
} from 'lucide-react';

function VaultLayoutInner({ children }: { children: ReactNode }) {
  const { user, bootstrapped, logout } = useAuth();
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
    if (bootstrapped && !user) {
      router.replace('/login');
    }
  }, [user, bootstrapped]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeSidebar = pathname + (selectedFolderId ?? '');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to route param change
    setSidebarOpen(false);
  }, [closeSidebar]);

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
    { href: '/vault/settings', Icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-ink-50 overflow-hidden">

      {/* ── Mobile header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14 bg-white border-b border-ink-100">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-ink-500 hover:text-ink-900 transition-colors p-1"
        >
          <Menu size={22} />
        </button>
        <Link href="/" className="flex items-center">
          <BitatlasLogo size={22} color="#2563EB" wordColor="#081220" />
        </Link>
        <div className="w-8" />
      </div>

      {/* ── Mobile sidebar backdrop ── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed md:relative z-40 md:z-auto
          w-60 flex-shrink-0 bg-ink-900 flex flex-col h-full
          transition-transform duration-200 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo + close (mobile) */}
        <div className="px-5 py-5 flex items-center justify-between">
          <Link href="/">
            <BitatlasLogo size={24} color="#3B82F6" wordColor="#FFFFFF" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-ink-400 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="px-3 flex flex-col gap-0.5">
          {navItems.map(({ href, Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[14px] font-medium ${
                  active
                    ? 'bg-brand-500 text-white'
                    : 'text-ink-400 hover:bg-ink-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Folders section */}
        <div className="px-3 mt-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink-600">
              Folders
            </span>
            <button
              onClick={() => setCreatingFolder(true)}
              className="text-ink-500 hover:text-white transition-colors"
              title="New folder"
            >
              <FolderPlus size={16} />
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
                  if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }
                }}
                onBlur={() => {
                  if (!newFolderName.trim()) setCreatingFolder(false);
                }}
                placeholder="Folder name"
                className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-1.5 text-[13px] text-white placeholder:text-ink-500 outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          )}

          <Link
            href="/vault"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] transition-all ${
              pathname === '/vault' && !selectedFolderId
                ? 'bg-ink-800 text-white font-semibold'
                : 'text-ink-500 hover:bg-ink-800/60 hover:text-ink-200'
            }`}
          >
            <Home size={14} />
            All files
          </Link>

          {folders.map((folder) => (
            <Link
              key={folder.id}
              href={`/vault?folderId=${folder.id}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] transition-all ${
                selectedFolderId === folder.id
                  ? 'bg-ink-800 text-white font-semibold'
                  : 'text-ink-500 hover:bg-ink-800/60 hover:text-ink-200'
              }`}
            >
              <FolderIcon size={14} />
              <span className="truncate">{folder.name}</span>
            </Link>
          ))}
        </div>

        {/* Bottom: user + logout */}
        <div className="px-4 py-4 mt-auto border-t border-ink-800">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck size={14} className="text-brand-400" />
            </div>
            <p className="text-[13px] font-medium text-ink-200 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[12px] text-ink-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
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

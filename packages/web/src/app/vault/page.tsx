'use client';

import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { useFolders } from '@/contexts/FolderContext';
import { vaultApi, uploadToPresignedUrl, type VaultFile, type Folder } from '@/lib/api';
import {
  Loader2, Search, Upload, Download, X, Home, Folder as FolderIcon,
  FolderPlus, ChevronRight, AlertCircle, FileImage, Video, Music,
  FileText, Sheet, AlignLeft, File, Trash2, FolderInput, Lock, Eye,
  MoreVertical, UploadCloud, ShieldCheck,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function FileTypeIcon({ mimeType, size = 24 }: { mimeType: string; size?: number }) {
  const cls = "text-ink-400";
  if (mimeType.startsWith('image/'))                                 return <FileImage size={size} className={cls} />;
  if (mimeType.startsWith('video/'))                                 return <Video size={size} className={cls} />;
  if (mimeType.startsWith('audio/'))                                 return <Music size={size} className={cls} />;
  if (mimeType === 'application/pdf')                                return <FileText size={size} className={cls} />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <Sheet size={size} className={cls} />;
  if (mimeType.includes('word') || mimeType.includes('document'))   return <FileText size={size} className={cls} />;
  if (mimeType.startsWith('text/'))                                  return <AlignLeft size={size} className={cls} />;
  return <File size={size} className={cls} />;
}

function canPreview(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('text/');
}

type SortField = 'date' | 'name' | 'size';
type SortDir = 'asc' | 'desc';

export default function VaultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-ink-400" />
        </div>
      }
    >
      <VaultContent />
    </Suspense>
  );
}

function VaultContent() {
  const { user } = useAuth();
  const { encryptFile, decryptFile } = useCrypto();
  const { folders, createFolder: createFolderCtx } = useFolders();
  const searchParams = useSearchParams();
  const folderId = searchParams.get('folderId') ?? undefined;

  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [moveTarget, setMoveTarget] = useState<VaultFile | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await vaultApi.listFiles({ folderId, search: search || undefined });
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [folderId, search]);

  useEffect(() => {
    if (user) { loadFiles(); }
  }, [user, loadFiles]);

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'size') cmp = a.originalSizeBytes - b.originalSizeBytes;
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [files, sortField, sortDir]);

  const currentFolder = useMemo(() => {
    if (!folderId) return null;
    return folders.find(f => f.id === folderId) ?? null;
  }, [folders, folderId]);

  const visibleFolders = useMemo(() => {
    return folders.filter(f => (folderId ? f.parentId === folderId : !f.parentId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [folders, folderId]);

  function handleSort(field: SortField) {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'name' ? 'asc' : 'desc'); }
  }

  // ── Upload ──────────────────────────────────────────────────────────────────
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    e.target.value = '';
    if (!file) return;
    setUploading(true); setError(null);
    try {
      setUploadStatus('Encrypting…');
      const encrypted = await encryptFile(file);
      setUploadStatus('Getting upload URL…');
      const { url, storageKey } = await vaultApi.getUploadUrl(file.name, file.type || 'application/octet-stream');
      setUploadStatus('Uploading…');
      const encryptedBuffer = await encrypted.encryptedBlob.arrayBuffer();
      await uploadToPresignedUrl(url, encryptedBuffer, file.type || 'application/octet-stream');
      setUploadStatus('Saving metadata…');
      await vaultApi.createFile({
        name: file.name, mimeType: file.type || 'application/octet-stream',
        sizeBytes: encryptedBuffer.byteLength, originalSizeBytes: file.size, storageKey,
        ownerEncryptedKey: encrypted.ownerEncryptedKey, ownerIv: encrypted.ownerIv,
        fileIv: encrypted.fileIv, authTag: encrypted.authTag,
        folderId: folderId ?? null, category: null,
      });
      await loadFiles();
    } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploading(false); setUploadStatus(''); }
  }

  // ── Decrypt helper ──────────────────────────────────────────────────────────
  async function decryptVaultFile(file: VaultFile): Promise<ArrayBuffer> {
    const { url, encryptionMetadata } = await vaultApi.getDownloadUrl(file.id);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Download failed');
    const encryptedBlob = await res.blob();
    const meta = encryptionMetadata || file;
    return decryptFile(encryptedBlob, meta.ownerEncryptedKey, meta.ownerIv, meta.fileIv, meta.authTag);
  }

  // ── Download ────────────────────────────────────────────────────────────────
  async function handleDownload(file: VaultFile) {
    setDownloading(file.id); setError(null);
    try {
      const decrypted = await decryptVaultFile(file);
      const blob = new Blob([decrypted], { type: file.mimeType });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl; link.download = file.name; link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) { setError(err instanceof Error ? err.message : 'Decryption failed'); }
    finally { setDownloading(null); }
  }

  // ── Preview ─────────────────────────────────────────────────────────────────
  async function handlePreview(file: VaultFile) {
    setPreviewFile(file); setPreviewUrl(null); setPreviewText(null); setPreviewLoading(true);
    try {
      const decrypted = await decryptVaultFile(file);
      if (file.mimeType.startsWith('text/')) {
        setPreviewText(new TextDecoder().decode(decrypted));
      } else {
        const blob = new Blob([decrypted], { type: file.mimeType });
        setPreviewUrl(URL.createObjectURL(blob));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
      setPreviewFile(null);
    } finally { setPreviewLoading(false); }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null); setPreviewUrl(null); setPreviewText(null);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(fileId: string) {
    if (!confirm('Permanently delete this file? This cannot be undone.')) return;
    try { await vaultApi.deleteFile(fileId); setFiles(prev => prev.filter(f => f.id !== fileId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Delete failed'); }
  }

  // ── Move ───────────────────────────────────────────────────────────────────
  async function handleMoveToFolder(fileId: string, targetFolderId: string | null) {
    setError(null);
    try { await vaultApi.updateFile(fileId, { folderId: targetFolderId }); setMoveTarget(null); await loadFiles(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to move file'); }
  }

  return (
    <div className="bg-ink-50 min-h-screen flex flex-col">

      {/* Search + upload */}
      <div className="px-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-300" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full h-12 bg-white rounded-xl pl-10 pr-4 text-[15px] text-ink-900 placeholder:text-ink-300 outline-none focus:ring-2 focus:ring-brand-500/20 border border-ink-100 transition-all"
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center w-12 h-12 bg-ink-900 rounded-xl hover:bg-ink-800 transition-colors disabled:opacity-50 shrink-0"
          >
            {uploading
              ? <Loader2 size={20} className="animate-spin text-white" />
              : <Upload size={20} className="text-white" />
            }
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="px-4 mt-4 flex items-center gap-1.5 min-h-[44px]">
        {currentFolder ? (
          <>
            <Link
              href="/vault"
              className="flex items-center gap-1 text-[13px] no-underline text-ink-400 hover:text-ink-700 transition-colors py-2 -my-2"
            >
              <Home size={14} />
              <span className="font-medium">All files</span>
            </Link>
            <ChevronRight size={12} className="text-ink-200" />
            <span className="text-[13px] font-bold text-ink-900 truncate">{currentFolder.name}</span>
          </>
        ) : (
          <div className="flex items-center gap-1 text-[13px]">
            <Home size={14} className="text-ink-900" />
            <span className="font-bold text-ink-900">All files</span>
          </div>
        )}
      </div>

      {/* Sort — hidden when empty so the empty state takes the focal point */}
      {!(loading || (sortedFiles.length === 0 && visibleFolders.length === 0)) && (
        <div className="px-4 mt-3 flex items-center gap-2">
          <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-[0.1em]">Sort</span>
          {(['date', 'name', 'size'] as SortField[]).map(field => {
            const active = sortField === field;
            return (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className={active
                  ? 'bg-white border border-ink-200 rounded-full px-3.5 py-1 text-[13px] font-semibold text-ink-900 cursor-pointer'
                  : 'bg-transparent border-none px-2 py-1 text-[13px] font-medium text-ink-400 cursor-pointer hover:text-ink-700 transition-colors'
                }
              >
                {active ? `${field.charAt(0).toUpperCase() + field.slice(1)}${sortDir === 'desc' ? ' ↓' : ' ↑'}` : field.charAt(0).toUpperCase() + field.slice(1)}
              </button>
            );
          })}
        </div>
      )}

      {/* Upload progress */}
      {uploading && uploadStatus && (
        <div className="mx-4 mt-4 flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
          <Loader2 size={16} className="animate-spin text-brand-500 shrink-0" />
          <span className="text-[14px] text-brand-600">{uploadStatus}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-700">
          <AlertCircle size={14} className="shrink-0" />
          <span className="text-[14px] flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 transition-colors">
            <X size={18} />
          </button>
        </div>
      )}

      {/* File + Folder list */}
      <div className="flex-1 px-4 mt-4 pb-6 flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 size={32} className="animate-spin text-ink-400" />
            <p className="text-[14px] text-ink-400">Loading your vault…</p>
          </div>
        ) : sortedFiles.length === 0 && visibleFolders.length === 0 ? (
          <EmptyState
            inFolder={!!currentFolder}
            onUpload={() => fileInputRef.current?.click()}
            onCreateFolder={async (name) => {
              const folder = await createFolderCtx(name, folderId ?? undefined);
              return folder;
            }}
          />
        ) : (
          <>
            {visibleFolders.map(folder => (
              <FolderCard key={folder.id} folder={folder} />
            ))}
            {sortedFiles.map(file => (
              <FileCard
                key={file.id}
                file={file}
                downloading={downloading === file.id}
                onTap={() => handlePreview(file)}
                onDownload={() => handleDownload(file)}
                onDelete={() => handleDelete(file.id)}
                onMoveOpen={() => setMoveTarget(file)}
              />
            ))}
          </>
        )}
      </div>

      {/* ── Bottom Sheet: Move to Folder ── */}
      {moveTarget && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMoveTarget(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[60vh] flex flex-col animate-slide-up shadow-lg">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-ink-200" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-ink-100">
              <div>
                <h3 className="text-[16px] font-semibold text-ink-900">Move to folder</h3>
                <p className="text-[13px] text-ink-400 mt-0.5 truncate max-w-[250px]">{moveTarget.name}</p>
              </div>
              <button onClick={() => setMoveTarget(null)} className="text-ink-400 hover:text-ink-700 transition-colors p-1">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              <button
                onClick={() => handleMoveToFolder(moveTarget.id, null)}
                disabled={!moveTarget.folderId}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-ink-50 transition-colors disabled:opacity-40 text-[15px] text-ink-900"
              >
                <Home size={18} className="text-ink-400" />
                All files <span className="text-[12px] text-ink-400">(root)</span>
                {!moveTarget.folderId && <span className="text-[12px] text-ink-400 ml-auto">current</span>}
              </button>
              {folders.map(folder => {
                const isCurrent = moveTarget.folderId === folder.id;
                return (
                  <button
                    key={folder.id}
                    onClick={() => handleMoveToFolder(moveTarget.id, folder.id)}
                    disabled={isCurrent}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-ink-50 transition-colors disabled:opacity-40 text-[15px]"
                    style={{ color: isCurrent ? '#94A3B8' : '#081220' }}
                  >
                    <FolderIcon size={18} className={isCurrent ? 'text-ink-300' : 'text-ink-400'} />
                    {folder.name}
                    {isCurrent && <span className="text-[12px] text-ink-400 ml-auto">current</span>}
                  </button>
                );
              })}
              {creatingFolder ? (
                <div className="px-4 py-2">
                  <input
                    autoFocus
                    type="text"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === 'Enter' && newFolderName.trim()) {
                        const folder = await createFolderCtx(newFolderName.trim());
                        setNewFolderName(''); setCreatingFolder(false);
                        if (moveTarget) handleMoveToFolder(moveTarget.id, folder.id);
                      }
                      if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }
                    }}
                    placeholder="Folder name…"
                    className="w-full bg-ink-50 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 border border-ink-100 text-ink-900"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setCreatingFolder(true)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-ink-50 transition-colors text-[15px] text-ink-400"
                >
                  <FolderPlus size={18} className="text-ink-300" />
                  New folder
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── File Preview Modal ── */}
      {previewFile && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={closePreview} />
          <div className="fixed inset-0 z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-white font-semibold text-sm truncate">{previewFile.name}</p>
                <p className="text-white/50 text-xs">{formatBytes(previewFile.originalSizeBytes)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { closePreview(); handleDownload(previewFile); }}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
                >
                  <Download size={18} className="text-white" />
                </button>
                <button
                  onClick={closePreview}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
                >
                  <X size={18} className="text-white" />
                </button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-auto p-4">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={32} className="animate-spin text-white" />
                  <p className="text-[14px] text-white/70">Decrypting preview…</p>
                </div>
              ) : previewUrl && previewFile.mimeType.startsWith('image/') ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previewUrl} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-lg" />
              ) : previewUrl && previewFile.mimeType === 'application/pdf' ? (
                <iframe src={previewUrl} title={previewFile.name} className="w-full h-full rounded-lg bg-white" />
              ) : previewText !== null ? (
                <pre className="bg-white rounded-xl p-4 text-sm max-w-full max-h-full overflow-auto w-full text-ink-900 font-mono" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {previewText}
                </pre>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10">
                    <Eye size={40} className="text-white/50" />
                  </div>
                  <p className="text-[14px] text-white/70">Preview not available for this file type</p>
                  <button
                    onClick={() => { closePreview(); handleDownload(previewFile); }}
                    className="flex items-center gap-2 bg-white text-ink-900 px-5 py-2.5 rounded-xl font-semibold text-[14px] hover:bg-ink-50 transition-colors"
                  >
                    <Download size={16} />
                    Download instead
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />

      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>
    </div>
  );
}

// ── Folder Card ───────────────────────────────────────────────────────────────
function FolderCard({ folder }: { folder: Folder }) {
  return (
    <Link
      href={`/vault?folderId=${folder.id}`}
      className="bg-white rounded-2xl flex items-start gap-3 p-4 shadow-sm border border-ink-100 hover:border-ink-200 transition-all active:scale-[0.98] no-underline"
    >
      <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-50 shrink-0">
        <FolderIcon size={22} className="text-amber-600 fill-amber-200" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[15px] text-ink-900 leading-snug">{folder.name}</p>
        <span className="text-[12px] text-ink-400 mt-1 block">Folder</span>
      </div>
      <ChevronRight size={16} className="text-ink-200 mt-2.5 shrink-0" />
    </Link>
  );
}

// ── File Card ─────────────────────────────────────────────────────────────────
function FileCard({
  file, downloading, onTap, onDownload, onDelete, onMoveOpen,
}: {
  file: VaultFile;
  downloading: boolean;
  onTap: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onMoveOpen: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const previewable = canPreview(file.mimeType);

  return (
    <div
      className="bg-white rounded-2xl relative p-4 shadow-sm border border-ink-100 hover:border-ink-200 transition-all"
      style={{ cursor: previewable ? 'pointer' : 'default' }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-menu]')) return;
        if (previewable) onTap();
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-ink-50 shrink-0">
          <FileTypeIcon mimeType={file.mimeType} size={22} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[15px] text-ink-900 leading-snug line-clamp-2" title={file.name}>
            {file.name}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[12px] text-ink-400">{formatBytes(file.originalSizeBytes)}</span>
            <span className="text-[12px] text-ink-400">{formatDate(file.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-800 px-2.5 py-0.5">
              <Lock size={9} className="text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-[0.06em]">Encrypted</span>
            </span>
            {previewable && <span className="text-[11px] text-ink-400">Tap to preview</span>}
          </div>
        </div>

        {/* Menu */}
        <div className="relative shrink-0" data-menu>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
            className="text-ink-300 hover:text-ink-500 transition-colors p-1"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 bg-white rounded-xl z-20 overflow-hidden shadow-lg border border-ink-100 min-w-[160px]">
                <button
                  onClick={() => { setMenuOpen(false); onDownload(); }}
                  disabled={downloading}
                  className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-ink-50 transition-colors text-[14px] text-ink-700 disabled:opacity-50"
                >
                  {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Download
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onMoveOpen(); }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-ink-50 transition-colors text-[14px] text-ink-700"
                >
                  <FolderInput size={14} />
                  Move to folder
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-red-50 transition-colors text-[14px] text-red-600"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  inFolder,
  onUpload,
  onCreateFolder,
}: {
  inFolder: boolean;
  onUpload: () => void;
  onCreateFolder: (name: string) => Promise<unknown>;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onCreateFolder(trimmed);
      setName('');
      setCreating(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-96 gap-6 px-4">
      <div className="flex items-center justify-center w-24 h-24 rounded-3xl bg-ink-100">
        <ShieldCheck size={48} className="text-ink-300" />
      </div>
      <div className="text-center max-w-[320px]">
        <h3 className="font-semibold text-[20px] text-ink-900">
          {inFolder ? 'This folder is empty' : 'Your vault is empty'}
        </h3>
        <p className="mt-2 text-[14px] text-ink-400 leading-relaxed">
          {inFolder
            ? 'Upload files here, or move existing files into this folder. Everything is encrypted in your browser before it leaves your device.'
            : 'Files and folders you create live here. Everything is encrypted in your browser before it ever reaches our servers.'}
        </p>
      </div>

      {creating ? (
        <div className="w-full max-w-[320px] flex flex-col gap-2">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') { setCreating(false); setName(''); }
            }}
            placeholder="Folder name"
            disabled={busy}
            className="w-full h-12 bg-white rounded-xl px-4 text-[15px] text-ink-900 placeholder:text-ink-300 outline-none focus:ring-2 focus:ring-brand-500/20 border border-ink-100 transition-all"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setCreating(false); setName(''); }}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-ink-700 px-4 py-3 rounded-xl font-semibold text-[14px] border border-ink-100 hover:bg-ink-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-ink-900 text-white px-4 py-3 rounded-xl font-semibold text-[14px] hover:bg-ink-800 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <FolderPlus size={16} />}
              Create
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[420px] flex flex-col sm:flex-row gap-2">
          <button
            onClick={onUpload}
            className="flex-1 flex items-center justify-center gap-2 bg-ink-900 text-white px-6 py-3 rounded-xl font-semibold text-[14px] hover:bg-ink-800 transition-colors order-1 sm:order-2"
          >
            <UploadCloud size={16} />
            Upload a file
          </button>
          {!inFolder && (
            <button
              onClick={() => setCreating(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-ink-900 px-6 py-3 rounded-xl font-semibold text-[14px] border border-ink-100 hover:bg-ink-50 transition-colors order-2 sm:order-1"
            >
              <FolderPlus size={16} />
              New folder
            </button>
          )}
        </div>
      )}
    </div>
  );
}

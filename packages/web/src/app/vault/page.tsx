'use client';

import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { useFolders } from '@/contexts/FolderContext';
import { vaultApi, foldersApi, uploadToPresignedUrl, type VaultFile, type Folder } from '@/lib/api';

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

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video_file';
  if (mimeType.startsWith('audio/')) return 'audio_file';
  if (mimeType === 'application/pdf') return 'picture_as_pdf';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table_chart';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'description';
  if (mimeType.startsWith('text/')) return 'article';
  return 'insert_drive_file';
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
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '32px', color: '#6B7280' }}>
            progress_activity
          </span>
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

  // Modal states
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

  // Folders visible in the current view: root folders when no folderId, children when inside a folder
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

  // ── Decrypt helper (shared by download + preview) ───────────────────────────
  async function decryptVaultFile(file: VaultFile): Promise<ArrayBuffer> {
    const { url } = await vaultApi.getDownloadUrl(file.id);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Download failed');
    const encryptedBlob = await res.blob();
    return decryptFile(encryptedBlob, file.ownerEncryptedKey, file.ownerIv, file.fileIv, file.authTag);
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

  // ── Move to folder ─────────────────────────────────────────────────────────
  async function handleMoveToFolder(fileId: string, targetFolderId: string | null) {
    setError(null);
    try { await vaultApi.updateFile(fileId, { folderId: targetFolderId }); setMoveTarget(null); await loadFiles(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to move file'); }
  }

  return (
    <div style={{ backgroundColor: '#F3F1EE', minHeight: '100vh' }} className="flex flex-col">
      {/* Search + upload */}
      <div className="px-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ fontSize: '20px', color: '#9CA3AF' }}>search</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files..."
              className="w-full bg-white rounded-xl pl-11 pr-4 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              style={{ height: '48px', fontSize: '15px', color: '#1A2332' }} />
          </div>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-60 shrink-0"
            style={{ width: '48px', height: '48px', backgroundColor: '#1A2332', borderRadius: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white' }}>
              {uploading ? 'progress_activity' : 'upload_file'}
            </span>
          </button>
        </div>
      </div>

      {/* Sort */}
      <div className="px-4 mt-4 flex items-center gap-2">
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sort</span>
        {(['date', 'name', 'size'] as SortField[]).map(field => {
          const active = sortField === field;
          return (
            <button key={field} onClick={() => handleSort(field)}
              style={active
                ? { backgroundColor: 'white', border: '1px solid #D1D5DB', borderRadius: '999px', padding: '4px 14px', fontSize: '13px', fontWeight: '600', color: '#1A2332', cursor: 'pointer' }
                : { background: 'none', border: 'none', padding: '4px 8px', fontSize: '13px', fontWeight: '500', color: '#6B7280', cursor: 'pointer' }}>
              {active ? `${field.charAt(0).toUpperCase() + field.slice(1)}${sortDir === 'desc' ? ' ↓' : ' ↑'}` : field.charAt(0).toUpperCase() + field.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Upload progress */}
      {uploading && uploadStatus && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: '#DBEAFE' }}>
          <span className="material-symbols-outlined animate-spin shrink-0" style={{ fontSize: '18px', color: '#1E40AF' }}>progress_activity</span>
          <span style={{ fontSize: '14px', color: '#1E40AF' }}>{uploadStatus}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
          <span className="material-symbols-outlined shrink-0" style={{ fontSize: '16px' }}>error</span>
          <span style={{ fontSize: '14px', flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Folder + File list */}
      <div className="flex-1 px-4 mt-4 pb-6 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '32px', color: '#6B7280' }}>progress_activity</span>
              <p style={{ fontSize: '14px', color: '#6B7280' }}>Loading your vault…</p>
            </div>
          </div>
        ) : sortedFiles.length === 0 && visibleFolders.length === 0 ? (
          <EmptyState onUpload={() => fileInputRef.current?.click()} />
        ) : (
          <>
            {/* Folder cards */}
            {visibleFolders.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {visibleFolders.map(folder => (
                  <FolderCard key={folder.id} folder={folder} />
                ))}
              </div>
            )}
            {/* File cards */}
            {sortedFiles.map(file => (
              <FileCard key={file.id} file={file} downloading={downloading === file.id}
                onTap={() => handlePreview(file)}
                onDownload={() => handleDownload(file)}
                onDelete={() => handleDelete(file.id)}
                onMoveOpen={() => setMoveTarget(file)} />
            ))}
          </>
        )}
      </div>

      {/* ── Bottom Sheet: Move to Folder ── */}
      {moveTarget && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMoveTarget(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[60vh] flex flex-col animate-slide-up"
            style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.15)' }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#D1D5DB' }} />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3" style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A2332' }}>Move to folder</h3>
                <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }} className="truncate max-w-[250px]">{moveTarget.name}</p>
              </div>
              <button onClick={() => setMoveTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#6B7280' }}>close</span>
              </button>
            </div>
            {/* Folder list */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              <button onClick={() => handleMoveToFolder(moveTarget.id, null)} disabled={!moveTarget.folderId}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
                style={{ fontSize: '15px', color: '#1A2332', background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#6B7280' }}>home</span>
                All files
                {!moveTarget.folderId && <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: 'auto' }}>current</span>}
              </button>
              {folders.map(folder => {
                const isCurrent = moveTarget.folderId === folder.id;
                return (
                  <button key={folder.id} onClick={() => handleMoveToFolder(moveTarget.id, folder.id)} disabled={isCurrent}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
                    style={{ fontSize: '15px', color: isCurrent ? '#9CA3AF' : '#1A2332', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: isCurrent ? '#9CA3AF' : '#6B7280' }}>folder</span>
                    {folder.name}
                    {isCurrent && <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: 'auto' }}>current</span>}
                  </button>
                );
              })}
              {/* New folder inline */}
              {creatingFolder ? (
                <div className="px-4 py-2">
                  <input autoFocus type="text" value={newFolderName}
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
                    className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    style={{ color: '#1A2332' }} />
                </div>
              ) : (
                <button onClick={() => setCreatingFolder(true)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                  style={{ fontSize: '15px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#9CA3AF' }}>create_new_folder</span>
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
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-white font-semibold text-sm truncate">{previewFile.name}</p>
                <p className="text-white/50 text-xs">{formatBytes(previewFile.originalSizeBytes)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => { closePreview(); handleDownload(previewFile); }}
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white' }}>download</span>
                </button>
                <button onClick={closePreview}
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white' }}>close</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center overflow-auto p-4">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: '32px', color: 'white' }}>progress_activity</span>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Decrypting preview…</p>
                </div>
              ) : previewUrl && previewFile.mimeType.startsWith('image/') ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previewUrl} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-lg" />
              ) : previewUrl && previewFile.mimeType === 'application/pdf' ? (
                <iframe src={previewUrl} title={previewFile.name} className="w-full h-full rounded-lg bg-white" />
              ) : previewText !== null ? (
                <pre className="bg-white rounded-xl p-4 text-sm max-w-full max-h-full overflow-auto w-full"
                  style={{ color: '#1A2332', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {previewText}
                </pre>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center rounded-2xl" style={{ width: '80px', height: '80px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'rgba(255,255,255,0.5)', fontVariationSettings: "'FILL' 1" }}>
                      {getFileIcon(previewFile.mimeType)}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Preview not available for this file type</p>
                  <button onClick={() => { closePreview(); handleDownload(previewFile); }}
                    className="flex items-center gap-2 rounded-xl font-semibold"
                    style={{ backgroundColor: 'white', color: '#1A2332', padding: '10px 20px', fontSize: '14px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                    Download instead
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />

      {/* Animation for bottom sheet */}
      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}

// ── Folder Card ───────────────────────────────────────────────────────────────
function FolderCard({ folder }: { folder: Folder }) {
  return (
    <Link
      href={`/vault?folderId=${folder.id}`}
      className="rounded-2xl flex items-center gap-3 transition-all active:scale-[0.98]"
      style={{ backgroundColor: 'white', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', textDecoration: 'none' }}
    >
      <div className="flex items-center justify-center rounded-lg shrink-0"
        style={{ width: '40px', height: '40px', backgroundColor: '#FEF3C7' }}>
        <span className="material-symbols-outlined"
          style={{ fontSize: '22px', color: '#D97706', fontVariationSettings: "'FILL' 1" }}>
          folder
        </span>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-semibold truncate" style={{ fontSize: '14px', color: '#111827' }}>
          {folder.name}
        </span>
        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Folder</span>
      </div>
      <span className="material-symbols-outlined ml-auto shrink-0" style={{ fontSize: '18px', color: '#D1D5DB' }}>
        chevron_right
      </span>
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
  const icon = getFileIcon(file.mimeType);
  const previewable = canPreview(file.mimeType);

  return (
    <div
      className="rounded-2xl relative"
      style={{ backgroundColor: 'white', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', cursor: previewable ? 'pointer' : 'default' }}
      onClick={(e) => {
        // Don't trigger preview if clicking the menu
        if ((e.target as HTMLElement).closest('[data-menu]')) return;
        if (previewable) onTap();
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center rounded-lg shrink-0"
          style={{ width: '44px', height: '44px', backgroundColor: '#F3F4F6' }}>
          <span className="material-symbols-outlined"
            style={{ fontSize: '24px', color: '#374151', fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold leading-snug line-clamp-2" style={{ fontSize: '15px', color: '#111827' }} title={file.name}>
            {file.name}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{formatBytes(file.originalSizeBytes)}</span>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{formatDate(file.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 rounded-full"
              style={{ backgroundColor: '#0C5C4C', padding: '2px 10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '10px', color: 'white', fontVariationSettings: "'FILL' 1" }}>lock</span>
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Encrypted</span>
            </span>
            {previewable && (
              <span style={{ fontSize: '11px', color: '#6B7280' }}>Tap to preview</span>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="relative shrink-0" data-menu>
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9CA3AF' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>more_vert</span>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 rounded-xl z-20 overflow-hidden"
                style={{ backgroundColor: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '160px' }}>
                <button onClick={() => { setMenuOpen(false); onDownload(); }} disabled={downloading}
                  className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
                  style={{ fontSize: '14px', color: '#1A2332', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {downloading ? 'progress_activity' : 'download'}
                  </span>
                  Download
                </button>
                <button onClick={() => { setMenuOpen(false); onMoveOpen(); }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  style={{ fontSize: '14px', color: '#1A2332', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>drive_file_move</span>
                  Move to folder
                </button>
                <button onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-red-50 transition-colors"
                  style={{ fontSize: '14px', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
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

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-6">
      <div className="flex items-center justify-center"
        style={{ width: '96px', height: '96px', borderRadius: '32px', backgroundColor: 'rgba(26,35,50,0.06)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'rgba(26,35,50,0.25)' }}>shield_lock</span>
      </div>
      <div className="text-center" style={{ maxWidth: '280px' }}>
        <h3 className="font-bold text-xl" style={{ color: '#1A2332' }}>Your vault is empty</h3>
        <p className="mt-2" style={{ fontSize: '14px', color: '#6B7280' }}>
          Upload files to encrypt them client-side with AES-256-GCM before they ever reach our servers.
        </p>
      </div>
      <button onClick={onUpload}
        className="flex items-center gap-2 rounded-xl font-semibold transition-all hover:opacity-90"
        style={{ backgroundColor: '#1A2332', color: 'white', padding: '12px 24px', fontSize: '14px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload_file</span>
        Upload your first file
      </button>
    </div>
  );
}

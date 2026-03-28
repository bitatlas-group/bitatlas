'use client';

import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { vaultApi, foldersApi, uploadToPresignedUrl, type VaultFile, type Folder } from '@/lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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

type SortField = 'date' | 'name' | 'size';
type SortDir = 'asc' | 'desc';

export default function VaultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <span
            className="material-symbols-outlined animate-spin"
            style={{ fontSize: '32px', color: '#6B7280' }}
          >
            progress_activity
          </span>
        </div>
      }
    >
      <VaultContent />
    </Suspense>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
function VaultContent() {
  const { user } = useAuth();
  const { encryptFile, decryptFile } = useCrypto();
  const searchParams = useSearchParams();
  const folderId = searchParams.get('folderId') ?? undefined;

  const [files, setFiles] = useState<VaultFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [moveTarget, setMoveTarget] = useState<VaultFile | null>(null);

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

  const loadFolders = useCallback(async () => {
    try {
      const data = await foldersApi.list();
      setFolders(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadFiles();
      loadFolders();
    }
  }, [user, loadFiles, loadFolders]);

  const sortedFiles = useMemo(() => {
    const sorted = [...files].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === 'size') {
        cmp = a.originalSizeBytes - b.originalSizeBytes;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [files, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  }

  // ── Upload flow ─────────────────────────────────────────────────────────────
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      setUploadStatus('Encrypting…');
      const encrypted = await encryptFile(file);

      setUploadStatus('Getting upload URL…');
      const { url, storageKey } = await vaultApi.getUploadUrl(
        file.name,
        file.type || 'application/octet-stream'
      );

      setUploadStatus('Uploading…');
      const encryptedBuffer = await encrypted.encryptedBlob.arrayBuffer();
      await uploadToPresignedUrl(url, encryptedBuffer, file.type || 'application/octet-stream');

      setUploadStatus('Saving metadata…');
      await vaultApi.createFile({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: encryptedBuffer.byteLength,
        originalSizeBytes: file.size,
        storageKey,
        ownerEncryptedKey: encrypted.ownerEncryptedKey,
        ownerIv: encrypted.ownerIv,
        fileIv: encrypted.fileIv,
        authTag: encrypted.authTag,
        folderId: folderId ?? null,
        category: null,
      });

      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  }

  // ── Download flow ───────────────────────────────────────────────────────────
  async function handleDownload(file: VaultFile) {
    setDownloading(file.id);
    setError(null);
    try {
      const { url } = await vaultApi.getDownloadUrl(file.id);

      const res = await fetch(url);
      if (!res.ok) throw new Error('Download failed');
      const encryptedBlob = await res.blob();

      const decrypted = await decryptFile(
        encryptedBlob,
        file.ownerEncryptedKey,
        file.ownerIv,
        file.fileIv,
        file.authTag
      );

      const blob = new Blob([decrypted], { type: file.mimeType });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decryption failed');
    } finally {
      setDownloading(null);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(fileId: string) {
    if (!confirm('Permanently delete this file? This cannot be undone.')) return;
    try {
      await vaultApi.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  // ── Move to folder ─────────────────────────────────────────────────────────
  async function handleMoveToFolder(fileId: string, targetFolderId: string | null) {
    setError(null);
    try {
      await vaultApi.updateFile(fileId, { folderId: targetFolderId });
      setMoveTarget(null);
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move file');
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: '#F3F1EE', minHeight: '100vh' }} className="flex flex-col">
      {/* Search + upload row */}
      <div className="px-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span
              className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ fontSize: '20px', color: '#9CA3AF' }}
            >
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-white rounded-xl pl-11 pr-4 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              style={{ height: '48px', fontSize: '15px', color: '#1A2332' }}
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title={uploading ? uploadStatus : 'Upload file'}
            className="flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#1A2332',
              borderRadius: '10px',
            }}
          >
            {uploading ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px', color: 'white' }}>
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white' }}>
                upload_file
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sort row */}
      <div className="px-4 mt-4 flex items-center gap-2">
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Sort
        </span>
        {(['date', 'name', 'size'] as SortField[]).map((field) => {
          const active = sortField === field;
          const label = field.charAt(0).toUpperCase() + field.slice(1);
          const arrow = sortDir === 'desc' ? ' ↓' : ' ↑';
          return (
            <button
              key={field}
              onClick={() => handleSort(field)}
              style={
                active
                  ? { backgroundColor: 'white', border: '1px solid #D1D5DB', borderRadius: '999px', padding: '4px 14px', fontSize: '13px', fontWeight: '600', color: '#1A2332', cursor: 'pointer' }
                  : { background: 'none', border: 'none', padding: '4px 8px', fontSize: '13px', fontWeight: '500', color: '#6B7280', cursor: 'pointer' }
              }
            >
              {active ? `${label}${arrow}` : label}
            </button>
          );
        })}
      </div>

      {/* Upload progress */}
      {uploading && uploadStatus && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: '#DBEAFE' }}>
          <span className="material-symbols-outlined animate-spin shrink-0" style={{ fontSize: '18px', color: '#1E40AF' }}>
            progress_activity
          </span>
          <span style={{ fontSize: '14px', color: '#1E40AF' }}>{uploadStatus}</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
          <span className="material-symbols-outlined shrink-0" style={{ fontSize: '16px' }}>error</span>
          <span style={{ fontSize: '14px', flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', fontSize: '20px', lineHeight: 1, padding: '0 2px' }}
          >
            ×
          </button>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 px-4 mt-4 pb-6 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '32px', color: '#6B7280' }}>
                progress_activity
              </span>
              <p style={{ fontSize: '14px', color: '#6B7280' }}>Loading your vault…</p>
            </div>
          </div>
        ) : sortedFiles.length === 0 ? (
          <EmptyState onUpload={() => fileInputRef.current?.click()} />
        ) : (
          sortedFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              folders={folders}
              currentFolderId={folderId}
              downloading={downloading === file.id}
              onDownload={() => handleDownload(file)}
              onDelete={() => handleDelete(file.id)}
              onMove={(targetFolderId) => handleMoveToFolder(file.id, targetFolderId)}
              moveOpen={moveTarget?.id === file.id}
              onMoveToggle={() => setMoveTarget(moveTarget?.id === file.id ? null : file)}
            />
          ))
        )}
      </div>

      {/* Move modal backdrop */}
      {moveTarget && (
        <div className="fixed inset-0 z-30 bg-black/30" onClick={() => setMoveTarget(null)} />
      )}

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
    </div>
  );
}

// ── File Card ─────────────────────────────────────────────────────────────────
function FileCard({
  file,
  folders,
  currentFolderId,
  downloading,
  onDownload,
  onDelete,
  onMove,
  moveOpen,
  onMoveToggle,
}: {
  file: VaultFile;
  folders: Folder[];
  currentFolderId?: string;
  downloading: boolean;
  onDownload: () => void;
  onDelete: () => void;
  onMove: (folderId: string | null) => void;
  moveOpen: boolean;
  onMoveToggle: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const icon = getFileIcon(file.mimeType);

  return (
    <div
      className="rounded-2xl relative"
      style={{ backgroundColor: 'white', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
    >
      <div className="flex items-start gap-3">
        {/* File icon */}
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{ width: '44px', height: '44px', backgroundColor: '#F3F4F6' }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '24px', color: '#374151', fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>

        {/* File info — takes remaining space */}
        <div className="flex-1 min-w-0">
          <p className="font-bold leading-snug line-clamp-2" style={{ fontSize: '15px', color: '#111827' }} title={file.name}>
            {file.name}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{formatBytes(file.originalSizeBytes)}</span>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{formatDate(file.createdAt)}</span>
          </div>
          {/* Encrypted badge */}
          <div className="mt-2">
            <span
              className="inline-flex items-center gap-1 rounded-full"
              style={{ backgroundColor: '#0C5C4C', padding: '2px 10px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '10px', color: 'white', fontVariationSettings: "'FILL' 1" }}>
                lock
              </span>
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Encrypted
              </span>
            </span>
          </div>
        </div>

        {/* Three-dot menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9CA3AF' }}
            aria-label="More options"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>more_vert</span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-8 rounded-xl z-20 overflow-hidden"
                style={{ backgroundColor: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '160px' }}
              >
                <button
                  onClick={() => { setMenuOpen(false); onDownload(); }}
                  disabled={downloading}
                  className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
                  style={{ fontSize: '14px', color: '#1A2332', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {downloading ? (
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                  )}
                  Download
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onMoveToggle(); }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  style={{ fontSize: '14px', color: '#1A2332', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>drive_file_move</span>
                  Move to folder
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-red-50 transition-colors"
                  style={{ fontSize: '14px', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Move to folder panel */}
      {moveOpen && (
        <div
          className="mt-3 rounded-xl overflow-hidden"
          style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
        >
          <div className="px-3 py-2" style={{ borderBottom: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Move to
            </span>
          </div>
          {/* Root / All files option */}
          <button
            onClick={() => onMove(null)}
            disabled={!file.folderId}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-left hover:bg-gray-100 transition-colors disabled:opacity-40"
            style={{ fontSize: '14px', color: '#1A2332', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#6B7280' }}>home</span>
            All files (root)
          </button>
          {folders.map((folder) => {
            const isCurrent = file.folderId === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => onMove(folder.id)}
                disabled={isCurrent}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-left hover:bg-gray-100 transition-colors disabled:opacity-40"
                style={{ fontSize: '14px', color: isCurrent ? '#9CA3AF' : '#1A2332', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: isCurrent ? '#9CA3AF' : '#6B7280' }}>
                  folder
                </span>
                {folder.name}
                {isCurrent && <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: 'auto' }}>current</span>}
              </button>
            );
          })}
          {folders.length === 0 && (
            <p className="px-3 py-3" style={{ fontSize: '13px', color: '#9CA3AF' }}>
              No folders yet. Create one from the sidebar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-6">
      <div
        className="flex items-center justify-center"
        style={{ width: '96px', height: '96px', borderRadius: '32px', backgroundColor: 'rgba(26,35,50,0.06)' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'rgba(26,35,50,0.25)' }}>
          shield_lock
        </span>
      </div>
      <div className="text-center" style={{ maxWidth: '280px' }}>
        <h3 className="font-bold text-xl" style={{ color: '#1A2332' }}>Your vault is empty</h3>
        <p className="mt-2" style={{ fontSize: '14px', color: '#6B7280' }}>
          Upload files to encrypt them client-side with AES-256-GCM before they ever reach our servers.
        </p>
      </div>
      <button
        onClick={onUpload}
        className="flex items-center gap-2 rounded-xl font-semibold transition-all hover:opacity-90"
        style={{ backgroundColor: '#1A2332', color: 'white', padding: '12px 24px', fontSize: '14px' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload_file</span>
        Upload your first file
      </button>
    </div>
  );
}

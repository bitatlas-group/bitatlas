'use client';

import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { vaultApi, uploadToPresignedUrl, type VaultFile } from '@/lib/api';

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

// ── Root export — wraps in Suspense for useSearchParams ──────────────────────
export default function VaultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-on-surface-variant" style={{ fontSize: '32px' }}>
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await vaultApi.listFiles({
        folderId,
        search: search || undefined,
      });
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [folderId, search]);

  useEffect(() => {
    if (user) loadFiles();
  }, [user, loadFiles]);

  // ── Sorted files ────────────────────────────────────────────────────────────
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

  // ── Sort toggle ─────────────────────────────────────────────────────────────
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
      const { url, storageKey } = await vaultApi.getUploadUrl(file.name, file.type || 'application/octet-stream');

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
        ownerIV: encrypted.ownerIV,
        fileIV: encrypted.iv,
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
        file.ownerIV,
        file.fileIV,
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="px-8 py-6 bg-surface-container-low border-b border-outline-variant/30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              style={{ fontSize: '18px' }}
            >
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files…"
              className="w-full bg-surface-container-highest rounded-xl pl-9 pr-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            {uploading && (
              <div className="flex items-center gap-2 bg-tertiary-container px-3 py-2 rounded-xl">
                <span
                  className="material-symbols-outlined text-tertiary-fixed-dim animate-spin"
                  style={{ fontSize: '16px' }}
                >
                  progress_activity
                </span>
                <span className="text-xs font-bold text-tertiary-fixed-dim">{uploadStatus}</span>
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-on-primary px-5 py-2.5 rounded-xl font-headline font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                upload_file
              </span>
              Upload
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>

        {/* Sort bar */}
        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs text-on-surface-variant mr-1">Sort:</span>
          {(['date', 'name', 'size'] as SortField[]).map((field) => {
            const active = sortField === field;
            const label = field.charAt(0).toUpperCase() + field.slice(1);
            return (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {label}
                {active && (
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '14px',
                      transform: sortDir === 'asc' ? 'rotate(180deg)' : undefined,
                      display: 'inline-block',
                      transition: 'transform 0.2s',
                    }}
                  >
                    arrow_downward
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Info banner */}
      {!bannerDismissed && (
        <div className="mx-8 mt-4 flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-xl">
          <span className="material-symbols-outlined text-blue-500" style={{ fontSize: '18px' }}>
            folder_open
          </span>
          <span>
            <span className="font-semibold">Move to folder</span> — folder organisation is coming soon.
          </span>
          <button
            onClick={() => setBannerDismissed(true)}
            className="ml-auto hover:opacity-70 transition-opacity"
            aria-label="Dismiss"
          >
            <span className="material-symbols-outlined text-blue-400" style={{ fontSize: '16px' }}>
              close
            </span>
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mx-8 mt-4 bg-error-container text-on-error-container text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            error
          </span>
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto hover:opacity-70 transition-opacity"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              close
            </span>
          </button>
        </div>
      )}

      {/* File area */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <span
                className="material-symbols-outlined text-on-surface-variant animate-spin"
                style={{ fontSize: '32px' }}
              >
                progress_activity
              </span>
              <p className="text-sm text-on-surface-variant">Loading your vault…</p>
            </div>
          </div>
        ) : sortedFiles.length === 0 ? (
          <EmptyState onUpload={() => fileInputRef.current?.click()} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                downloading={downloading === file.id}
                onDownload={() => handleDownload(file)}
                onDelete={() => handleDelete(file.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── File Card ─────────────────────────────────────────────────────────────────
function FileCard({
  file,
  downloading,
  onDownload,
  onDelete,
}: {
  file: VaultFile;
  downloading: boolean;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const icon = getFileIcon(file.mimeType);

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 flex flex-col gap-3 group hover:shadow-lg hover:shadow-primary/5 transition-all">
      {/* Top row: icon + name/size + actions */}
      <div className="flex items-start gap-3">
        {/* File type icon */}
        <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/8 flex items-center justify-center">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>

        {/* Name + size */}
        <div className="flex-1 min-w-0">
          <p
            className="font-headline font-bold text-sm text-on-surface leading-tight line-clamp-2"
            title={file.name}
          >
            {file.name}
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {formatBytes(file.originalSizeBytes)}
          </p>
        </div>

        {/* Actions — visible on hover */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={onDownload}
            disabled={downloading}
            title="Download & decrypt"
            className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all disabled:opacity-50"
          >
            {downloading ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '13px' }}>
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                download
              </span>
            )}
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center hover:bg-error-container hover:text-on-error-container transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
              delete
            </span>
          </button>
        </div>
      </div>

      {/* Upload date */}
      <p className="text-xs text-on-surface-variant/70">
        Uploaded {formatDate(file.createdAt)}
      </p>

      {/* Bottom row: ENCRYPTED badge */}
      <div className="flex justify-end">
        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}
          >
            lock
          </span>
          Encrypted
        </span>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-6">
      <div className="w-24 h-24 rounded-[2rem] bg-primary/5 flex items-center justify-center">
        <span
          className="material-symbols-outlined text-primary/30"
          style={{ fontSize: '48px' }}
        >
          shield_lock
        </span>
      </div>
      <div className="text-center space-y-2">
        <h3 className="font-headline font-bold text-xl text-primary">Your vault is empty</h3>
        <p className="text-on-surface-variant text-sm max-w-xs">
          Upload files to encrypt them client-side with AES-256-GCM before they ever reach our
          servers.
        </p>
      </div>
      <button
        onClick={onUpload}
        className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-3 rounded-xl font-headline font-semibold text-sm hover:brightness-110 transition-all"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
          upload_file
        </span>
        Upload your first file
      </button>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ShieldCheck, Download, AlertCircle, Lock, FileText } from 'lucide-react';
import { decryptSharedFile, base64UrlToBytes } from '@/lib/crypto/fileEncryption';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.bitatlas.com';

type ShareMeta = {
  name: string;
  mimeType: string | null;
  sizeBytes: string;
  fileIv: string;
  authTag: string;
  downloadUrl: string;
  expiresAt: string;
  downloadsRemaining: number | null;
};

type Status =
  | { kind: 'loading' }
  | { kind: 'incomplete' }
  | { kind: 'gone' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; meta: ShareMeta; blob: Blob };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// What we are willing to render inline. Critically: text/html is NEVER rendered
// (it would make us a phishing host) — it falls through to download-only.
function previewKind(mime: string | null): 'image' | 'pdf' | 'text' | 'none' {
  if (!mime) return 'none';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'text/html') return 'none';
  if (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml') return 'text';
  return 'none';
}

export default function SharePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // 1. The key lives in the URL fragment (#k=...), which never reached the
      //    server. Read it here, client-side only.
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
      const params = new URLSearchParams(hash);
      const k = params.get('k');
      if (!k) {
        setStatus({ kind: 'incomplete' });
        return;
      }

      let rawKey: Uint8Array;
      try {
        rawKey = base64UrlToBytes(k);
        if (rawKey.length !== 32) throw new Error('bad key length');
      } catch {
        setStatus({ kind: 'incomplete' });
        return;
      }

      // 2. Resolve the share (metadata + short-lived presigned URL). No key here.
      let meta: ShareMeta;
      try {
        const res = await fetch(`${API_URL}/share/${encodeURIComponent(shareId)}`);
        if (res.status === 404) return setStatus({ kind: 'missing' });
        if (res.status === 410) return setStatus({ kind: 'gone' });
        if (!res.ok) return setStatus({ kind: 'error', message: 'Could not load this link. Please try again.' });
        meta = await res.json();
      } catch {
        return setStatus({ kind: 'error', message: 'Network error. Please try again.' });
      }

      // 3. Fetch ciphertext and decrypt in the browser.
      try {
        const blobRes = await fetch(meta.downloadUrl);
        if (!blobRes.ok) throw new Error('fetch ciphertext failed');
        const encryptedBlob = await blobRes.blob();
        const decrypted = await decryptSharedFile(encryptedBlob, rawKey, meta.fileIv, meta.authTag);
        const blob = new Blob([decrypted], { type: meta.mimeType || 'application/octet-stream' });
        if (cancelled) return;

        if (previewKind(meta.mimeType) === 'text') {
          setTextContent(await blob.text());
        }
        setStatus({ kind: 'ready', meta, blob });
      } catch {
        // A decryption failure almost always means a corrupted/altered key —
        // surface it as an incomplete link, never as a server-side error.
        setStatus({ kind: 'incomplete' });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  return (
    <main className="min-h-screen bg-ink-25 flex flex-col">
      <header className="border-b border-ink-100 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-ink-900">
            <Lock size={18} className="text-brand-500" />
            BitAtlas
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
            <ShieldCheck size={14} className="text-success" />
            Zero-knowledge
          </span>
        </div>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-10">
        {status.kind === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24 text-ink-500">
            <Loader2 className="animate-spin mb-3" />
            Decrypting in your browser…
          </div>
        )}

        {status.kind === 'incomplete' && (
          <StateCard
            icon={<AlertCircle className="text-warn" />}
            title="This link is incomplete"
            body="The decryption key is part of the link itself (after the #). It looks like it was cut off in copying. Ask the sender for the full link."
          />
        )}

        {status.kind === 'missing' && (
          <StateCard
            icon={<AlertCircle className="text-ink-400" />}
            title="This share link doesn't exist"
            body="It may have been mistyped, or the file was deleted by its owner."
          />
        )}

        {status.kind === 'gone' && (
          <StateCard
            icon={<AlertCircle className="text-ink-400" />}
            title="This share link is no longer available"
            body="It has expired, been revoked, or reached its download limit."
          />
        )}

        {status.kind === 'error' && (
          <StateCard icon={<AlertCircle className="text-danger" />} title="Something went wrong" body={status.message} />
        )}

        {status.kind === 'ready' && (
          <ReadyView meta={status.meta} blob={status.blob} textContent={textContent} />
        )}
      </div>

      <footer className="border-t border-ink-100 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-ink-500">
          <p className="font-medium text-ink-700">Encrypted with AES-256-GCM — BitAtlas never saw this file.</p>
          <p className="mt-1">
            The key travelled in the link, decrypted only in your browser.{' '}
            <Link href="/" className="text-brand-600 hover:underline">
              Get your own zero-knowledge vault →
            </Link>
          </p>
          <p className="mt-3 text-xs text-ink-400">
            See something abusive?{' '}
            <a href="mailto:abuse@bitatlas.com" className="hover:underline">
              Report this link
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}

function StateCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-white border border-ink-100 rounded-xl p-8 text-center max-w-md mx-auto">
      <div className="flex justify-center mb-3">{icon}</div>
      <h1 className="text-lg font-semibold text-ink-900">{title}</h1>
      <p className="mt-2 text-sm text-ink-500">{body}</p>
    </div>
  );
}

function ReadyView({
  meta,
  blob,
  textContent,
}: {
  meta: ShareMeta;
  blob: Blob;
  textContent: string | null;
}) {
  const objectUrl = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);

  const kind = previewKind(meta.mimeType);

  function download() {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = meta.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="bg-white border border-ink-100 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-ink-900 font-medium truncate">
            <FileText size={16} className="text-ink-400 shrink-0" />
            <span className="truncate">{meta.name}</span>
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            {formatBytes(Number(meta.sizeBytes))} · expires {new Date(meta.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            {meta.downloadsRemaining !== null && ` · ${meta.downloadsRemaining} download${meta.downloadsRemaining === 1 ? '' : 's'} left`}
          </p>
        </div>
        <button
          onClick={download}
          className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg shrink-0"
        >
          <Download size={15} />
          Download
        </button>
      </div>

      <div className="p-5">
        {kind === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={objectUrl} alt={meta.name} className="max-w-full max-h-[70vh] mx-auto rounded" />
        )}
        {kind === 'pdf' && (
          <iframe src={objectUrl} title={meta.name} className="w-full h-[75vh] rounded border border-ink-100" />
        )}
        {kind === 'text' && (
          <pre className="text-sm text-ink-800 whitespace-pre-wrap break-words max-h-[70vh] overflow-auto bg-ink-25 p-4 rounded">
            {textContent}
          </pre>
        )}
        {kind === 'none' && (
          <div className="text-center py-10 text-ink-500">
            <p className="text-sm">No inline preview for this file type.</p>
            <p className="text-xs mt-1">Use the Download button above to save it.</p>
          </div>
        )}
      </div>
    </div>
  );
}

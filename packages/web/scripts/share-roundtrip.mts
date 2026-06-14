/**
 * End-to-end crypto round-trip for share links.
 *
 * Run:  npx esbuild scripts/share-roundtrip.mts --bundle --format=esm \
 *         --platform=node --outfile=/tmp/rt.mjs && node /tmp/rt.mjs
 *
 * Proves the exact path a real share takes: wrap a file key with the owner's
 * master key (as the vault does on upload), then unwrap → base64url → fragment →
 * base64url-decode → decrypt with the raw key (as the share viewer does). Uses
 * the REAL exported web helpers, run under Web Crypto (the same primitives the
 * browser uses).
 */
import {
  unwrapRawFileKey,
  bytesToBase64Url,
  base64UrlToBytes,
  decryptSharedFile,
} from '../src/lib/crypto/fileEncryption';

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
  console.log('  ok —', msg);
}

// Standard base64 (test-setup only — mirrors the vault's owner-side encoding).
const b64 = (buf: ArrayBuffer | Uint8Array) =>
  Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString('base64');

const PLAINTEXT = 'agent artifact: the quick brown fox 🦊 + secret=hunter2';

// ── Owner side (upload): encrypt file with a per-file key, wrap key w/ master ──
const enc = new TextEncoder();
const masterKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
const fileKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

const fileIv = crypto.getRandomValues(new Uint8Array(12));
const encryptedContent = new Uint8Array(
  await crypto.subtle.encrypt({ name: 'AES-GCM', iv: fileIv }, fileKey, enc.encode(PLAINTEXT)),
);
// Vault blob layout: ciphertext only; auth tag (last 16 bytes) stored separately.
const ciphertext = encryptedContent.slice(0, -16);
const authTag = encryptedContent.slice(-16);

const fileKeyRaw = await crypto.subtle.exportKey('raw', fileKey);
const ownerIv = crypto.getRandomValues(new Uint8Array(12));
const ownerEncryptedKeyBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ownerIv }, masterKey, fileKeyRaw);

const ownerEncryptedKey = b64(ownerEncryptedKeyBuf);
const ownerIvB64 = b64(ownerIv);
const fileIvB64 = b64(fileIv);
const authTagB64 = b64(authTag);

// ── Share creation (vault UI / MCP): unwrap key, put it in the fragment ──
const rawKey = await unwrapRawFileKey(ownerEncryptedKey, ownerIvB64, masterKey);
assert(rawKey.length === 32, 'unwrapped key is 32 bytes');

const fragment = bytesToBase64Url(rawKey);
assert(!/[+/=]/.test(fragment), 'fragment is url-safe (no +, /, =)');

// ── Viewer side: decode fragment, decrypt with raw key ──
const keyFromLink = base64UrlToBytes(fragment);
assert(Buffer.from(keyFromLink).equals(Buffer.from(rawKey)), 'fragment decodes back to the same key');

const decrypted = await decryptSharedFile(new Blob([ciphertext]), keyFromLink, fileIvB64, authTagB64);
const recovered = new TextDecoder().decode(decrypted);
assert(recovered === PLAINTEXT, 'viewer recovers the original plaintext');

// ── Negative: a corrupted key must fail to decrypt (no silent wrong output) ──
const badKey = Uint8Array.from(keyFromLink);
badKey[0] ^= 0xff;
let threw = false;
try {
  await decryptSharedFile(new Blob([ciphertext]), badKey, fileIvB64, authTagB64);
} catch { threw = true; }
assert(threw, 'a tampered key is rejected by GCM auth');

console.log('\n✅ share crypto round-trip passed');

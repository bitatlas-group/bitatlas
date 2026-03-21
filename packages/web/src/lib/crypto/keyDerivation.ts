/**
 * Key Derivation Module
 * Handles password-to-key derivation for encryption
 *
 * Security: Uses PBKDF2 with 100,000 iterations
 * Keys are NEVER sent to the server
 */

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256;

/**
 * Derive master encryption key from user password
 * This key encrypts/decrypts file keys
 *
 * @param password - User's master password
 * @param salt - User-specific salt (from server)
 * @returns CryptoKey for AES-256-GCM encryption
 */
export async function deriveMasterKey(
  password: string,
  salt: string
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);
  const saltBuffer = enc.encode(salt);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive 256-bit AES-GCM key
  const masterKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false, // not extractable (cannot be exported)
    ['encrypt', 'decrypt']
  );

  return masterKey;
}

/**
 * Derive emergency access key from unlock phrase
 *
 * @param unlockPhrase - Emergency unlock phrase
 * @param salt - Salt for emergency key derivation
 * @returns CryptoKey for emergency access
 */
export async function deriveEmergencyKey(
  unlockPhrase: string,
  salt: string,
  extractable = false
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(unlockPhrase);
  const saltBuffer = enc.encode(salt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    extractable,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate random salt for key derivation
 * Uses hex encoding to match server-side generateSalt()
 * @returns Hex-encoded salt string
 */
export function generateSalt(): string {
  const saltArray = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(saltArray).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash data using SHA-256
 * @param data - Data to hash
 * @returns Base64-encoded hash
 */
export async function sha256Hash(data: string): Promise<string> {
  const enc = new TextEncoder();
  const dataBuffer = enc.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return arrayBufferToBase64(hashBuffer);
}

// Helper function
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

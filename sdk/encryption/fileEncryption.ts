/**
 * File Encryption Module
 * Handles client-side file encryption/decryption
 *
 * Architecture:
 * 1. Each file gets unique random key (file key)
 * 2. File encrypted with file key using AES-256-GCM
 * 3. File key encrypted with master key and emergency key
 * 4. Encrypted blob uploaded to server, encrypted keys stored in database
 */

export interface EncryptedFileData {
  encryptedBlob: Blob;
  ownerEncryptedKey: string;  // Base64
  ownerIV: string;            // Base64
  emergencyEncryptedKey?: string;  // Base64
  emergencyIV?: string;       // Base64
  iv: string;                 // Base64 - IV for file encryption
  authTag: string;            // Base64 - GCM auth tag
}

/**
 * Encrypt a file before upload
 *
 * @param file - File to encrypt
 * @param masterKey - Owner's master key
 * @param emergencyKey - Optional emergency key for dual-key encryption
 * @returns Encrypted file data
 */
export async function encryptFile(
  file: File,
  masterKey: CryptoKey,
  emergencyKey?: CryptoKey
): Promise<EncryptedFileData> {
  // 1. Generate random file key
  const fileKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable (so we can encrypt it with master/emergency keys)
    ['encrypt', 'decrypt']
  );

  // 2. Read file as ArrayBuffer
  const fileBuffer = await file.arrayBuffer();

  // 3. Generate random IV for file encryption
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 4. Encrypt file with file key
  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    fileKey,
    fileBuffer
  );

  // 5. Export file key as raw bytes
  const fileKeyRaw = await crypto.subtle.exportKey('raw', fileKey);

  // 6. Encrypt file key with owner's master key
  const ownerIV = crypto.getRandomValues(new Uint8Array(12));
  const ownerEncryptedKeyBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ownerIV },
    masterKey,
    fileKeyRaw
  );

  // 7. Encrypt file key with emergency key (if provided)
  let emergencyEncryptedKeyBuffer: ArrayBuffer | undefined;
  let emergencyIV: Uint8Array | undefined;

  if (emergencyKey) {
    emergencyIV = crypto.getRandomValues(new Uint8Array(12));
    emergencyEncryptedKeyBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: emergencyIV as Uint8Array<ArrayBuffer> },
      emergencyKey,
      fileKeyRaw
    );
  }

  // Extract auth tag from encrypted content (last 16 bytes for GCM)
  const encryptedArray = new Uint8Array(encryptedContent);
  const ciphertext = encryptedArray.slice(0, -16);
  const authTag = encryptedArray.slice(-16);

  return {
    encryptedBlob: new Blob([ciphertext]),
    ownerEncryptedKey: arrayBufferToBase64(ownerEncryptedKeyBuffer),
    ownerIV: arrayBufferToBase64(ownerIV),
    emergencyEncryptedKey: emergencyEncryptedKeyBuffer
      ? arrayBufferToBase64(emergencyEncryptedKeyBuffer)
      : undefined,
    emergencyIV: emergencyIV ? arrayBufferToBase64(emergencyIV) : undefined,
    iv: arrayBufferToBase64(iv),
    authTag: arrayBufferToBase64(authTag),
  };
}

/**
 * Decrypt a file after download
 *
 * @param encryptedBlob - Encrypted file blob
 * @param encryptedFileKey - File key encrypted with master/emergency key (Base64)
 * @param keyIV - IV used to encrypt file key (Base64)
 * @param fileIV - IV used to encrypt file (Base64)
 * @param authTag - GCM authentication tag (Base64)
 * @param userKey - Master key or emergency key
 * @returns Decrypted file as ArrayBuffer
 */
export async function decryptFile(
  encryptedBlob: Blob,
  encryptedFileKey: string,
  keyIV: string,
  fileIV: string,
  authTag: string,
  userKey: CryptoKey
): Promise<ArrayBuffer> {
  // 1. Decrypt file key using master/emergency key
  const encryptedKeyBuffer = base64ToArrayBuffer(encryptedFileKey);
  const keyIVBuffer = base64ToArrayBuffer(keyIV);

  const fileKeyRaw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: keyIVBuffer },
    userKey,
    encryptedKeyBuffer
  );

  // 2. Import decrypted file key
  const fileKey = await crypto.subtle.importKey(
    'raw',
    fileKeyRaw,
    'AES-GCM',
    false,
    ['decrypt']
  );

  // 3. Read encrypted blob and append auth tag
  const fileIVBuffer = base64ToArrayBuffer(fileIV);
  const authTagBuffer = base64ToArrayBuffer(authTag);
  const ciphertextBuffer = await encryptedBlob.arrayBuffer();

  // Combine ciphertext + auth tag for GCM
  const encryptedContent = new Uint8Array(
    ciphertextBuffer.byteLength + authTagBuffer.byteLength
  );
  encryptedContent.set(new Uint8Array(ciphertextBuffer), 0);
  encryptedContent.set(new Uint8Array(authTagBuffer), ciphertextBuffer.byteLength);

  // 4. Decrypt file content
  const decryptedContent = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fileIVBuffer },
    fileKey,
    encryptedContent
  );

  return decryptedContent;
}

// Helper functions
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Re-encrypt a file key with a new key (e.g. for emergency access or password change)
 */
export async function reencryptFileKey(
  encryptedFileKey: string, // encrypted with oldKey (Base64)
  keyIV: string,            // IV used with oldKey (Base64)
  oldKey: CryptoKey,
  newKey: CryptoKey
): Promise<{ encryptedKey: string; iv: string }> {
  // 1. Decrypt with old key
  const encryptedKeyBuffer = base64ToArrayBuffer(encryptedFileKey);
  const keyIVBuffer = base64ToArrayBuffer(keyIV);
  
  const fileKeyRaw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: keyIVBuffer },
    oldKey,
    encryptedKeyBuffer
  );

  // 2. Encrypt with new key
  const newIV = crypto.getRandomValues(new Uint8Array(12));
  const newEncryptedKeyBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: newIV },
    newKey,
    fileKeyRaw
  );

  return {
    encryptedKey: arrayBufferToBase64(newEncryptedKeyBuffer),
    iv: arrayBufferToBase64(newIV)
  };
}

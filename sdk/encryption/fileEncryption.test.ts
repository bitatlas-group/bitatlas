import { encryptFile, decryptFile, reencryptFileKey } from './fileEncryption';
import crypto from 'crypto';

// Force polyfill Web Crypto for this test file
Object.defineProperty(global, 'crypto', {
  value: crypto.webcrypto,
  writable: true
});

// Generate a master key for testing
async function generateKey() {
  return await global.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

describe('File Encryption System', () => {
  let masterKey: CryptoKey;
  let emergencyKey: CryptoKey;
  const mockFileContent = new TextEncoder().encode('Hello BitAtlas World');
  const mockFile = new File([mockFileContent], 'test.txt', { type: 'text/plain' });

  beforeAll(async () => {
    masterKey = await generateKey();
    emergencyKey = await generateKey();
  });

  test('Should encrypt and decrypt a file with master key', async () => {
    // 1. Encrypt
    const encrypted = await encryptFile(mockFile, masterKey);
    
    expect(encrypted.encryptedBlob).toBeDefined();
    expect(encrypted.ownerEncryptedKey).toBeDefined();
    expect(encrypted.ownerIV).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();

    // 2. Decrypt
    const decryptedBuffer = await decryptFile(
      encrypted.encryptedBlob,
      encrypted.ownerEncryptedKey,
      encrypted.ownerIV,
      encrypted.iv,
      encrypted.authTag,
      masterKey
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    expect(decryptedText).toBe('Hello BitAtlas World');
  });

  test('Should encrypt with both master and emergency keys if provided', async () => {
    const encrypted = await encryptFile(mockFile, masterKey, emergencyKey);

    expect(encrypted.emergencyEncryptedKey).toBeDefined();
    expect(encrypted.emergencyIV).toBeDefined();

    // Decrypt with EMERGENCY key
    const decryptedBuffer = await decryptFile(
      encrypted.encryptedBlob,
      encrypted.emergencyEncryptedKey!,
      encrypted.emergencyIV!,
      encrypted.iv,
      encrypted.authTag,
      emergencyKey
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    expect(decryptedText).toBe('Hello BitAtlas World');
  });

  test('Should re-encrypt file key (Rotate Key scenario)', async () => {
    // 1. Encrypt with ONLY master key initially
    const encrypted = await encryptFile(mockFile, masterKey);
    
    // Verify we can't decrypt with emergency key yet (it doesn't exist)
    expect(encrypted.emergencyEncryptedKey).toBeUndefined();

    // 2. Perform re-encryption (Master -> Emergency)
    // This simulates the "Encrypt Files" step in the wizard
    const reencryptResult = await reencryptFileKey(
      encrypted.ownerEncryptedKey,
      encrypted.ownerIV,
      masterKey,
      emergencyKey
    );

    expect(reencryptResult.encryptedKey).toBeDefined();
    expect(reencryptResult.iv).toBeDefined();

    // 3. Verify the NEW emergency key can unlock the file
    const decryptedBuffer = await decryptFile(
      encrypted.encryptedBlob,
      reencryptResult.encryptedKey,
      reencryptResult.iv,
      encrypted.iv,
      encrypted.authTag,
      emergencyKey
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    expect(decryptedText).toBe('Hello BitAtlas World');
  });

  test('Should fail decryption with wrong key', async () => {
    const encrypted = await encryptFile(mockFile, masterKey);
    const wrongKey = await generateKey();

    await expect(
      decryptFile(
        encrypted.encryptedBlob,
        encrypted.ownerEncryptedKey,
        encrypted.ownerIV,
        encrypted.iv,
        encrypted.authTag,
        wrongKey
      )
    ).rejects.toThrow();
  });
});

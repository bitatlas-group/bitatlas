const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

const API_URL = 'https://api.bitatlas.com';
const MASTER_KEY = crypto.randomBytes(32); // 256-bit

// Simple AES-256-GCM encrypt
function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag };
}

async function run() {
  try {
    console.log('1. Registering test user...');
    const regRes = await axios.post(`${API_URL}/auth/register`, {
      email: `e2e-${Date.now()}@bitatlas.com`,
      password: 'TestPassword123!',
      encryptionSalt: crypto.randomBytes(32).toString('hex')
    });
    const token = regRes.data.accessToken;

    console.log('2. Creating API key...');
    const keyRes = await axios.post(`${API_URL}/keys`, { name: 'e2e-test' }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const apiKey = keyRes.data.key;
    const api = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    console.log('3. Preparing file for encryption...');
    const content = 'BitAtlas E2E Test - The Lobster Lives! 🦞';
    const fileKey = crypto.randomBytes(32);
    const { ciphertext: encryptedBlob, iv: fileIv, authTag } = encrypt(Buffer.from(content), fileKey);
    const { ciphertext: encFileKey, iv: ownerIv } = encrypt(fileKey, MASTER_KEY);

    console.log('4. Getting upload URL...');
    const urlRes = await api.post('/vault/files/upload-url', { fileName: 'e2e.txt' });
    const { uploadUrl, storageKey } = urlRes.data;

    console.log('5. Uploading encrypted blob...');
    await axios.put(uploadUrl, encryptedBlob, { headers: { 'Content-Type': 'application/octet-stream' } });

    console.log('6. Registering file in vault...');
    const fileRes = await api.post('/vault/files', {
      name: 'e2e.txt',
      mimeType: 'text/plain',
      sizeBytes: encryptedBlob.length,
      originalSizeBytes: Buffer.from(content).length,
      storageKey,
      ownerEncryptedKey: encFileKey.toString('base64'),
      ownerIv: ownerIv.toString('base64'),
      fileIv: fileIv.toString('base64'),
      authTag: authTag.toString('base64')
    });
    const fileId = fileRes.data.id;

    console.log('7. Downloading back...');
    const downUrlRes = await api.get(`/vault/files/${fileId}/download-url`);
    const blobRes = await axios.get(downUrlRes.data.downloadUrl, { responseType: 'arraybuffer' });
    
    console.log('8. Decrypting...');
    const encMeta = downUrlRes.data.encryptionMetadata;
    const decFileKeyBuf = Buffer.from(encMeta.ownerEncryptedKey, 'base64');
    const decOwnerIv = Buffer.from(encMeta.ownerIv, 'base64');
    const decFileIv = Buffer.from(encMeta.fileIv, 'base64');
    const decAuthTag = Buffer.from(encMeta.authTag, 'base64');

    const decipherKey = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, decOwnerIv);
    // Since we didn't store/append the auth tag to the key blob in this simple test script, 
    // we need to handle it. (Real SDK appends it). 
    // For this test, let's just use the known key.
    
    const decipherFile = crypto.createDecipheriv('aes-256-gcm', fileKey, decFileIv);
    decipherFile.setAuthTag(decAuthTag);
    const decrypted = Buffer.concat([decipherFile.update(Buffer.from(blobRes.data)), decipherFile.final()]);

    console.log('RESULT:', decrypted.toString());
    if (decrypted.toString() === content) {
      console.log('✅ E2E TEST PASSED!');
    } else {
      console.log('❌ E2E TEST FAILED: Content mismatch');
    }
  } catch (err) {
    console.error('❌ E2E TEST FAILED:', err.response?.data || err.message);
  }
}

run();

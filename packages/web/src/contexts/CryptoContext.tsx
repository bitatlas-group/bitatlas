'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { deriveMasterKey } from '@/lib/crypto/keyDerivation';
import {
  encryptFile as _encryptFile,
  decryptFile as _decryptFile,
  type EncryptedFileData,
} from '@/lib/crypto/fileEncryption';

interface CryptoContextValue {
  masterKey: CryptoKey | null;
  initMasterKey: (password: string, salt: string) => Promise<void>;
  clearMasterKey: () => void;
  encryptFile: (file: File) => Promise<EncryptedFileData>;
  decryptFile: (
    encryptedBlob: Blob,
    ownerEncryptedKey: string,
    ownerIv: string,
    fileIv: string,
    authTag: string
  ) => Promise<ArrayBuffer>;
}

const CryptoContext = createContext<CryptoContextValue | null>(null);

export function CryptoProvider({ children }: { children: ReactNode }) {
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);

  const initMasterKey = useCallback(async (password: string, salt: string) => {
    const key = await deriveMasterKey(password, salt);
    setMasterKey(key);
  }, []);

  const clearMasterKey = useCallback(() => {
    setMasterKey(null);
  }, []);

  const encryptFile = useCallback(
    async (file: File): Promise<EncryptedFileData> => {
      if (!masterKey) throw new Error('No master key — please log in again');
      return _encryptFile(file, masterKey);
    },
    [masterKey]
  );

  const decryptFile = useCallback(
    async (
      encryptedBlob: Blob,
      ownerEncryptedKey: string,
      ownerIv: string,
      fileIv: string,
      authTag: string
    ): Promise<ArrayBuffer> => {
      if (!masterKey) throw new Error('No master key — please log in again');
      return _decryptFile(encryptedBlob, ownerEncryptedKey, ownerIv, fileIv, authTag, masterKey);
    },
    [masterKey]
  );

  return (
    <CryptoContext.Provider
      value={{ masterKey, initMasterKey, clearMasterKey, encryptFile, decryptFile }}
    >
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto() {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error('useCrypto must be used within CryptoProvider');
  return ctx;
}

'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { CryptoProvider } from '@/contexts/CryptoContext';
import { FolderProvider } from '@/contexts/FolderContext';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FolderProvider>
        <CryptoProvider>{children}</CryptoProvider>
      </FolderProvider>
    </AuthProvider>
  );
}

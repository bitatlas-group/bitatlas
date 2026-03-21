'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { CryptoProvider } from '@/contexts/CryptoContext';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CryptoProvider>{children}</CryptoProvider>
    </AuthProvider>
  );
}

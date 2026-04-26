'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import {
  authApi,
  setTokens,
  clearTokens,
  setUnauthorizedHandler,
  restoreSession,
  persistEncryptionSalt,
  readPersistedEncryptionSalt,
  type User,
} from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  /** True until the initial restore attempt finishes — gate UI on this. */
  bootstrapped: boolean;
  /** Salt is persisted so a refreshed session knows where to derive the master key from. */
  encryptionSalt: string | null;
  login: (email: string, password: string) => Promise<{ encryptionSalt: string }>;
  register: (email: string, password: string) => Promise<{ encryptionSalt: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [encryptionSalt, setEncryptionSalt] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setEncryptionSalt(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = await restoreSession();
      if (cancelled) return;
      if (restored) {
        setUser(restored);
        setEncryptionSalt(readPersistedEncryptionSalt());
      }
      setBootstrapped(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setTokens(data.accessToken, data.refreshToken);
    persistEncryptionSalt(data.encryptionSalt);
    setUser(data.user);
    setEncryptionSalt(data.encryptionSalt);
    return { encryptionSalt: data.encryptionSalt };
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const data = await authApi.register(email, password);
    setTokens(data.accessToken, data.refreshToken);
    persistEncryptionSalt(data.encryptionSalt);
    setUser(data.user);
    setEncryptionSalt(data.encryptionSalt);
    return { encryptionSalt: data.encryptionSalt };
  }, []);

  return (
    <AuthContext.Provider value={{ user, bootstrapped, encryptionSalt, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

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
  type User,
} from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<{ encryptionSalt: string }>;
  register: (email: string, password: string) => Promise<{ encryptionSalt: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return { encryptionSalt: data.encryptionSalt };
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const data = await authApi.register(email, password);
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return { encryptionSalt: data.encryptionSalt };
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

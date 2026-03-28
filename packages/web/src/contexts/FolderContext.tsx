'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { foldersApi, type Folder } from '@/lib/api';
import { useAuth } from './AuthContext';

interface FolderContextType {
  folders: Folder[];
  loading: boolean;
  refreshFolders: () => Promise<void>;
  createFolder: (name: string, parentId?: string) => Promise<Folder>;
}

const FolderContext = createContext<FolderContextType | null>(null);

export function FolderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshFolders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await foldersApi.list();
      setFolders(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const createFolder = useCallback(async (name: string, parentId?: string) => {
    const folder = await foldersApi.create(name, parentId);
    setFolders(prev => [...prev, folder]);
    return folder;
  }, []);

  useEffect(() => {
    if (user) refreshFolders();
  }, [user, refreshFolders]);

  return (
    <FolderContext.Provider value={{ folders, loading, refreshFolders, createFolder }}>
      {children}
    </FolderContext.Provider>
  );
}

export function useFolders() {
  const ctx = useContext(FolderContext);
  if (!ctx) throw new Error('useFolders must be used within FolderProvider');
  return ctx;
}

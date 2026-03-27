'use client';

import { useState, useEffect, useCallback } from 'react';
import { LibraryItem, ContentType } from '@/types';

const STORAGE_KEY = 'gd-content-library';

export function useLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const save = useCallback((items: LibraryItem[]) => {
    setItems(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, []);

  const addItem = useCallback(
    (item: Omit<LibraryItem, 'id' | 'createdAt'>) => {
      const newItem: LibraryItem = {
        ...item,
        id: `lib-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setItems((prev) => {
        const updated = [newItem, ...prev];
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
        return updated;
      });
      return newItem.id;
    },
    []
  );

  const removeItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const updated = prev.filter((i) => i.id !== id);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
        return updated;
      });
    },
    []
  );

  const getByType = useCallback(
    (type: ContentType) => items.filter((i) => i.contentType === type),
    [items]
  );

  return { items, addItem, removeItem, getByType, save };
}

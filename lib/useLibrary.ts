'use client';

import { useState, useEffect, useCallback } from 'react';
import { LibraryItem, LibraryItemStatus, ContentType } from '@/types';

const STORAGE_KEY = 'gd-content-library';

export function useLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Backfill status for old items that don't have it
        const parsed: LibraryItem[] = JSON.parse(stored);
        setItems(parsed.map(i => ({ ...i, status: i.status ?? 'saved' })));
      }
    } catch {
      // ignore
    }
  }, []);

  const persist = (updated: LibraryItem[]) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* quota */ }
  };

  const addItem = useCallback(
    (item: Omit<LibraryItem, 'id' | 'createdAt'>) => {
      const newItem: LibraryItem = {
        ...item,
        status: item.status ?? 'saved',
        id: `lib-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setItems((prev) => {
        const updated = [newItem, ...prev];
        persist(updated);
        return updated;
      });
      return newItem.id;
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  const updateStatus = useCallback((id: string, status: LibraryItemStatus) => {
    setItems((prev) => {
      const updated = prev.map(i => i.id === id ? { ...i, status } : i);
      persist(updated);
      return updated;
    });
  }, []);

  const getByType = useCallback(
    (type: ContentType) => items.filter((i) => i.contentType === type),
    [items]
  );

  return { items, addItem, removeItem, updateStatus, getByType };
}

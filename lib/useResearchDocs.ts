'use client';

import { useState, useEffect, useCallback } from 'react';
import { ResearchDoc } from '@/types';

const STORAGE_KEY = 'gd-research-docs';

// Persists research docs across sessions.
// extractedText is intentionally excluded from storage (too large).
// Only insights (the AI-extracted summary) are persisted.

type PersistedDoc = Omit<ResearchDoc, 'extractedText' | 'uploadedAt'> & {
  uploadedAt: string; // ISO string for JSON serialisation
};

export function useResearchDocs() {
  const [docs, setDocs] = useState<ResearchDoc[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: PersistedDoc[] = JSON.parse(stored);
        setDocs(
          parsed.map((d) => ({
            ...d,
            extractedText: '',
            uploadedAt: new Date(d.uploadedAt),
          }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  const persist = (updated: ResearchDoc[]) => {
    try {
      const toStore: PersistedDoc[] = updated.map(({ extractedText: _omit, uploadedAt, ...rest }) => ({
        ...rest,
        uploadedAt: uploadedAt instanceof Date ? uploadedAt.toISOString() : uploadedAt,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // ignore — storage quota exceeded
    }
  };

  const addDoc = useCallback((doc: ResearchDoc) => {
    setDocs((prev) => {
      const updated = [doc, ...prev];
      persist(updated);
      return updated;
    });
  }, []);

  const removeDoc = useCallback((id: string) => {
    setDocs((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  return { docs, addDoc, removeDoc };
}

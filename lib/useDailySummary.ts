'use client';

import { useState, useEffect, useCallback } from 'react';
import { DailySummaryEntry } from '@/app/api/daily-summary/route';

const STORAGE_KEY = 'gd_daily_summaries';
const MAX_ARCHIVE = 30; // keep last 30 days

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function loadArchive(): DailySummaryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveArchive(entries: DailySummaryEntry[]) {
  const trimmed = entries
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_ARCHIVE);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch { /* quota */ }
}

export interface UseDailySummaryReturn {
  today: DailySummaryEntry | null;
  archive: DailySummaryEntry[];
  isGenerating: boolean;
  error: string | null;
  regenerate: () => void;
}

export function useDailySummary(): UseDailySummaryReturn {
  const [today, setToday] = useState<DailySummaryEntry | null>(null);
  const [archive, setArchive] = useState<DailySummaryEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const date = getTodayKey();
      const res = await fetch('/api/daily-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error('Summary generation failed');
      const entry: DailySummaryEntry = await res.json();
      if ((entry as unknown as { error?: string }).error) throw new Error((entry as unknown as { error: string }).error);

      const existing = loadArchive().filter(e => e.date !== date);
      const updated = [entry, ...existing];
      saveArchive(updated);

      setToday(entry);
      setArchive(updated.filter(e => e.date !== date));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summary generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  useEffect(() => {
    const todayKey = getTodayKey();
    const allEntries = loadArchive();
    const todayEntry = allEntries.find(e => e.date === todayKey) || null;
    const pastEntries = allEntries.filter(e => e.date !== todayKey);
    setToday(todayEntry);
    setArchive(pastEntries);
  }, []);

  return { today, archive, isGenerating, error, regenerate: generate };
}

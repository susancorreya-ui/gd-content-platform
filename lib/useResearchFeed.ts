'use client';

import { useState, useEffect, useCallback } from 'react';
import { FeedItem } from '@/app/api/research-feed/route';

const CACHE_KEY = 'gd_research_feed_v13';
const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours
const CUTOFF_DATE = new Date('2026-01-01T00:00:00.000Z').getTime();

function filterRecent(items: FeedItem[]): FeedItem[] {
  return items.filter(item => {
    if (!item.publishedAt) return true; // no date — keep it, don't assume it's old
    const age = new Date(item.publishedAt).getTime();
    return isNaN(age) || age >= CUTOFF_DATE; // keep undated or within range
  });
}

interface FeedCache {
  items: FeedItem[];
  fetchedAt: string;
}

export interface UseResearchFeedReturn {
  items: FeedItem[];
  isLoading: boolean;
  error: string | null;
  fetchedAt: string | null;
  refresh: () => void;
}

export function useResearchFeed(): UseResearchFeedReturn {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/research-feed', { method: 'POST' });
      if (!res.ok) throw new Error('Feed fetch failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const cache: FeedCache = { items: data.items || [], fetchedAt: data.fetchedAt };
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ }

      setItems(filterRecent(data.items || []));
      setFetchedAt(data.fetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feed fetch failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { items: cachedItems, fetchedAt: cachedAt }: FeedCache = JSON.parse(cached);
        const age = Date.now() - new Date(cachedAt).getTime();
        if (age < CACHE_DURATION && cachedItems.length > 0) {
          setItems(filterRecent(cachedItems));
          setFetchedAt(cachedAt);
          return;
        }
      }
    } catch { /* ignore */ }
    fetchFeed();
  }, [fetchFeed]);

  return { items, isLoading, error, fetchedAt, refresh: fetchFeed };
}

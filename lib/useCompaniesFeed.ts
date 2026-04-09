'use client';

import { useState, useEffect, useCallback } from 'react';
import { CompanyUpdate } from '@/app/api/companies-feed/route';

const CACHE_KEY = 'gd_companies_feed_v9';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CUTOFF_DATE = new Date('2026-01-01T00:00:00.000Z').getTime();

function filter2026(companies: CompanyUpdate[]): CompanyUpdate[] {
  return companies.map(c => ({
    ...c,
    developments: c.developments.filter(d => {
      if (!d.publishedAt) return true;
      const ts = new Date(d.publishedAt).getTime();
      return isNaN(ts) || ts >= CUTOFF_DATE;
    }),
  }));
}

interface CompaniesFeedCache {
  companies: CompanyUpdate[];
  fetchedAt: string;
}

export interface UseCompaniesFeedReturn {
  companies: CompanyUpdate[];
  isLoading: boolean;
  error: string | null;
  fetchedAt: string | null;
  refresh: () => void;
}

export function useCompaniesFeed(): UseCompaniesFeedReturn {
  const [companies, setCompanies] = useState<CompanyUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/companies-feed', { method: 'POST' });
      if (!res.ok) throw new Error('Companies feed fetch failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const cache: CompaniesFeedCache = {
        companies: data.companies || [],
        fetchedAt: data.fetchedAt,
      };
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ }

      setCompanies(filter2026(data.companies || []));
      setFetchedAt(data.fetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Companies feed failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { companies: cachedCompanies, fetchedAt: cachedAt }: CompaniesFeedCache = JSON.parse(cached);
        const age = Date.now() - new Date(cachedAt).getTime();
        if (age < CACHE_DURATION && cachedCompanies.length > 0) {
          setCompanies(filter2026(cachedCompanies));
          setFetchedAt(cachedAt);
          return;
        }
      }
    } catch { /* ignore */ }
    fetchFeed();
  }, [fetchFeed]);

  return { companies, isLoading, error, fetchedAt, refresh: fetchFeed };
}

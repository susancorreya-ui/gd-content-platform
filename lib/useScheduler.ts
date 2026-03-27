'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScheduledPost } from '@/types';

const STORAGE_KEY = 'gd-scheduled-posts';

export function useScheduler() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPosts(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const persist = (updated: ScheduledPost[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const addPost = useCallback((post: Omit<ScheduledPost, 'id' | 'createdAt'>) => {
    const newPost: ScheduledPost = {
      ...post,
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setPosts((prev) => {
      const updated = [newPost, ...prev];
      persist(updated);
      return updated;
    });
    return newPost.id;
  }, []);

  const updatePost = useCallback((id: string, changes: Partial<ScheduledPost>) => {
    setPosts((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...changes } : p));
      persist(updated);
      return updated;
    });
  }, []);

  const removePost = useCallback((id: string) => {
    setPosts((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  const getPostsForDate = useCallback(
    (date: string) => posts.filter((p) => p.scheduledDate === date),
    [posts]
  );

  return { posts, addPost, updatePost, removePost, getPostsForDate };
}

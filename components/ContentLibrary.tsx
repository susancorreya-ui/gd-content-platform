'use client';

import { useState } from 'react';
import { LibraryItem, ContentType } from '@/types';
import OutputPanel from './OutputPanel';
import { BookOpen, Trash2, Filter } from 'lucide-react';

const TYPE_LABELS: Record<ContentType, string> = {
  blog: 'Blog Post',
  'market-snapshot': 'Market Snapshot',
  'grocer-performance': 'Grocer Performance',
  newsletter: 'Newsletter',
  'social-linkedin': 'LinkedIn Post',
  'social-twitter': 'X Thread',
  email: 'Email',
  'video-script': 'Video Script',
  'email-sequence': 'Email Sequence',
};

const TYPE_COLORS: Record<ContentType, string> = {
  blog: '#7c6ff7',
  'market-snapshot': '#3b82f6',
  'grocer-performance': '#10b981',
  newsletter: '#f59e0b',
  'social-linkedin': '#0077b5',
  'social-twitter': '#1da1f2',
  email: '#ef4444',
  'video-script': '#8b5cf6',
  'email-sequence': '#ec4899',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface ContentLibraryProps {
  items: LibraryItem[];
  onRemove: (id: string) => void;
  filterType?: ContentType;
}

export default function ContentLibrary({ items, onRemove, filterType }: ContentLibraryProps) {
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<ContentType | 'all'>(filterType ?? 'all');

  const filtered = activeFilter === 'all' ? items : items.filter((i) => i.contentType === activeFilter);

  // Get types that have items
  const presentTypes = Array.from(new Set(items.map((i) => i.contentType))) as ContentType[];

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ background: 'var(--background)', color: 'var(--text-secondary)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#f0eeff' }}>
          <BookOpen size={22} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="text-center">
          <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Library is empty</div>
          <div className="text-xs">Generate content and click &ldquo;Save to Library&rdquo; to store it here</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: List */}
      <div
        className="w-[300px] flex-shrink-0 flex flex-col border-r"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {/* Filter bar */}
        <div className="p-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Filter size={12} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Filter</span>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveFilter('all')}
              className="text-[11px] px-2 py-1 rounded-full font-medium transition-all"
              style={{
                background: activeFilter === 'all' ? 'var(--accent)' : 'var(--background)',
                color: activeFilter === 'all' ? 'white' : 'var(--text-secondary)',
              }}
            >
              All ({items.length})
            </button>
            {presentTypes.map((type) => {
              const count = items.filter((i) => i.contentType === type).length;
              return (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className="text-[11px] px-2 py-1 rounded-full font-medium transition-all"
                  style={{
                    background: activeFilter === type ? TYPE_COLORS[type] : 'var(--background)',
                    color: activeFilter === type ? 'white' : 'var(--text-secondary)',
                    border: `1px solid ${activeFilter === type ? TYPE_COLORS[type] : 'var(--border)'}`,
                  }}
                >
                  {TYPE_LABELS[type]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-xs text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              No {TYPE_LABELS[activeFilter as ContentType]} items yet
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className="w-full text-left p-3 rounded-lg transition-all"
                style={{
                  background: selected?.id === item.id ? '#f0eeff' : 'var(--background)',
                  border: `1px solid ${selected?.id === item.id ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: TYPE_COLORS[item.contentType] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px]" style={{ color: TYPE_COLORS[item.contentType] }}>
                        {TYPE_LABELS[item.contentType]}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                      if (selected?.id === item.id) setSelected(null);
                    }}
                    className="flex-shrink-0 p-1 rounded hover:bg-red-50"
                  >
                    <Trash2 size={11} color="#e74c3c" />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Preview */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>
        {selected ? (
          <>
            <div
              className="px-5 py-3 border-b flex items-center gap-3 flex-shrink-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <div
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${TYPE_COLORS[selected.contentType]}18`, color: TYPE_COLORS[selected.contentType] }}
              >
                {TYPE_LABELS[selected.contentType]}
              </div>
              <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {selected.title}
              </span>
              <span className="ml-auto text-[10px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                {timeAgo(selected.createdAt)}
              </span>
            </div>
            <OutputPanel content={selected.output} isLoading={false} contentType={selected.contentType} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
            <div className="text-sm">Select an item to preview</div>
          </div>
        )}
      </div>
    </div>
  );
}

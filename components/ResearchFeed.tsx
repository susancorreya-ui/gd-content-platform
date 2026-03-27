'use client';

import { useState } from 'react';
import { RefreshCw, ExternalLink, Send, Rss, AlertCircle, Loader2 } from 'lucide-react';
import { useResearchFeed } from '@/lib/useResearchFeed';
import { FeedItem } from '@/app/api/research-feed/route';

const PILLARS = [
  'Artificial Intelligence',
  'Automation',
  'Digital Commerce',
  'Personalization',
  'Retail Media',
  'Supply Chain',
];

const PILLAR_COLORS: Record<string, string> = {
  'Artificial Intelligence': '#6366f1',
  'Automation':              '#f59e0b',
  'Digital Commerce':        '#3b82f6',
  'Personalization':         '#ec4899',
  'Retail Media':            '#8b5cf6',
  'Supply Chain':            '#10b981',
};

interface ResearchFeedProps {
  onSendToPipeline: (topic: string, pillar: string) => void;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatFetchedAt(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function SkeletonCard() {
  return (
    <div
      className="rounded-xl p-4 animate-pulse"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-3.5 rounded w-3/4" style={{ background: 'var(--border)' }} />
          <div className="h-3 rounded w-1/2" style={{ background: 'var(--border)' }} />
          <div className="h-3 rounded w-full" style={{ background: 'var(--border)' }} />
          <div className="h-3 rounded w-2/3" style={{ background: 'var(--border)' }} />
        </div>
      </div>
    </div>
  );
}

function FeedCard({ item, onSendToPipeline }: { item: FeedItem; onSendToPipeline: (topic: string, pillar: string) => void }) {
  const pillarColor = PILLAR_COLORS[item.pillar] || '#00AA50';
  const date = formatDate(item.publishedAt);
  const [generating, setGenerating] = useState(false);

  const handlePipeline = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/suggest-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.title, description: item.description, pillar: item.pillar }),
      });
      const data = await res.json();
      onSendToPipeline(data.topic || item.title, item.pillar);
    } catch {
      onSendToPipeline(item.title, item.pillar);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="rounded-xl p-4 transition-all duration-150 group"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,170,80,0.3)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${pillarColor}20`, color: pillarColor }}
          >
            {item.pillar}
          </span>
          {item.isGD && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,170,80,0.15)', color: 'var(--accent)' }}
            >
              GD
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'; }}
            title="Open article"
          >
            <ExternalLink size={13} />
          </a>
          <button
            onClick={handlePipeline}
            disabled={generating}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background: 'rgba(0,170,80,0.12)',
              color: 'var(--accent)',
              border: '1px solid rgba(0,170,80,0.25)',
              opacity: generating ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (!generating) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,170,80,0.2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,170,80,0.12)'; }}
            title="Send to blog pipeline"
          >
            {generating
              ? <><Loader2 size={10} className="animate-spin" />Generating…</>
              : <><Send size={10} />Pipeline</>
            }
          </button>
        </div>
      </div>

      {/* Title */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-[13px] font-semibold leading-snug mb-1.5 transition-colors"
        style={{ color: 'var(--text-primary)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
      >
        {item.title}
      </a>

      {/* Description */}
      {item.description && (
        <p className="text-[12px] leading-relaxed mb-2.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {item.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted, rgba(255,255,255,0.35))' }}>
        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{item.source}</span>
        {date && (
          <>
            <span>·</span>
            <span>{date}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResearchFeed({ onSendToPipeline }: ResearchFeedProps) {
  const { items, isLoading, error, fetchedAt, refresh } = useResearchFeed();
  const [activePillar, setActivePillar] = useState<string>('All');

  const filtered = activePillar === 'All'
    ? items
    : items.filter(item => item.pillar === activePillar);

  const pillarCounts: Record<string, number> = { All: items.length };
  for (const p of PILLARS) {
    pillarCounts[p] = items.filter(i => i.pillar === p).length;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--background)' }}>

      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0,170,80,0.12)' }}
          >
            <Rss size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Intelligence Feed
            </h1>
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {fetchedAt
                ? `Updated ${formatFetchedAt(fetchedAt)} · ${items.length} articles`
                : isLoading
                  ? 'Fetching latest articles…'
                  : 'Grocery industry intelligence by pillar'}
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
          style={{
            background: 'var(--background)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Pillar filter tabs */}
      <div
        className="flex items-center gap-1.5 px-6 py-3 border-b overflow-x-auto flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {['All', ...PILLARS].map((pillar) => {
          const isActive = activePillar === pillar;
          const count = pillarCounts[pillar] || 0;
          const color = pillar === 'All' ? 'var(--accent)' : (PILLAR_COLORS[pillar] || 'var(--accent)');
          return (
            <button
              key={pillar}
              onClick={() => setActivePillar(pillar)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: isActive ? `${color}20` : 'transparent',
                color: isActive ? color : 'var(--text-secondary)',
                border: isActive ? `1px solid ${color}40` : '1px solid transparent',
              }}
            >
              {pillar === 'All' ? 'All Topics' : pillar}
              {count > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{
                    background: isActive ? `${color}30` : 'var(--border)',
                    color: isActive ? color : 'var(--text-secondary)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feed content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {error && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl mb-5"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
          >
            <AlertCircle size={16} />
            <div>
              <p className="text-[13px] font-semibold">Failed to load feed</p>
              <p className="text-[12px] opacity-80">{error}</p>
            </div>
          </div>
        )}

        {isLoading && items.length === 0 && (
          <div className="grid grid-cols-1 gap-3 max-w-3xl">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Rss size={32} style={{ color: 'var(--text-secondary)', marginBottom: 12, opacity: 0.4 }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              {activePillar === 'All' ? 'No articles yet' : `No articles for ${activePillar}`}
            </p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              Click Refresh to fetch the latest industry news
            </p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-3 max-w-3xl">
            {filtered.map((item) => (
              <FeedCard key={item.id} item={item} onSendToPipeline={onSendToPipeline} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  RefreshCw, ExternalLink, Send, Rss, AlertCircle, Loader2,
  ChevronDown, ChevronUp, Newspaper, Calendar, X, CalendarClock,
  CheckCircle2, BookMarked, Zap,
} from 'lucide-react';
import { useResearchFeed } from '@/lib/useResearchFeed';
import { FeedItem, ArticleType } from '@/app/api/research-feed/route';
import { DailySummaryEntry } from '@/app/api/daily-summary/route';

// ─── Constants ────────────────────────────────────────────────────────────────

const PILLARS = [
  'Artificial Intelligence', 'Automation', 'Digital Commerce',
  'Personalization', 'Retail Media', 'Supply Chain',
];

const PILLAR_COLORS: Record<string, string> = {
  'Artificial Intelligence': '#6366f1',
  'Automation':              '#f59e0b',
  'Digital Commerce':        '#3b82f6',
  'Personalization':         '#ec4899',
  'Retail Media':            '#8b5cf6',
  'Supply Chain':            '#10b981',
};

const TYPE_CONFIG: Record<ArticleType, { label: string; color: string; bg: string }> = {
  news:     { label: 'News',     color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  pr:       { label: 'PR',       color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  earnings: { label: 'Earnings', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff) || diff < 0) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

function timeSince(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
}

// ─── Approved summaries storage ───────────────────────────────────────────────

function loadApproved(): DailySummaryEntry[] {
  try { return JSON.parse(localStorage.getItem('gd_approved_summaries') || '[]'); } catch { return []; }
}
function saveApproved(entries: DailySummaryEntry[]) {
  try { localStorage.setItem('gd_approved_summaries', JSON.stringify(entries.slice(0, 30))); } catch {}
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderSummaryMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 style="font-size:13px;font-weight:700;margin:16px 0 6px;color:var(--text-primary)">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:14px;font-weight:700;margin:20px 0 8px;color:var(--text-primary)">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:16px;font-weight:700;margin:0 0 12px;color:var(--text-primary)">$1</h1>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline;text-underline-offset:2px">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\- (.+)$/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul style="margin:8px 0;padding-left:16px;list-style:disc">${m}</ul>`)
    .replace(/\n\n/g, '</p><p style="margin:10px 0">')
    .replace(/^(?!<[hul])(.+)$/gm, '<p style="margin:8px 0">$1</p>')
    .replace(/<p[^>]*><\/p>/g, '');
}

// ─── Daily Summary Modal ──────────────────────────────────────────────────────

interface ModalProps {
  isGenerating: boolean;
  entry: DailySummaryEntry | null;
  error: string | null;
  onClose: () => void;
  onDelete: () => void;
  onSave: (entry: DailySummaryEntry) => void;
  onPost: (entry: DailySummaryEntry) => void;
  onSchedule: (entry: DailySummaryEntry) => void;
}

function DailySummaryModal({ isGenerating, entry, error, onClose, onDelete, onSave, onPost, onSchedule }: ModalProps) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden" style={{ maxHeight: '88vh', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,170,80,0.12)' }}>
              <Newspaper size={15} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Summary</h2>
              {entry && <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{entry.dateLabel}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Searching this week&apos;s news and generating summary…</p>
              <div className="space-y-2 w-full max-w-sm animate-pulse">
                {[80, 60, 90, 50, 75].map((w, i) => (
                  <div key={i} className="h-3 rounded" style={{ background: 'var(--border)', width: `${w}%` }} />
                ))}
              </div>
            </div>
          )}
          {error && !isGenerating && (
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertCircle size={16} /><div><p className="text-[13px] font-semibold">Failed to generate</p><p className="text-[12px] opacity-80">{error}</p></div>
            </div>
          )}
          {entry && !isGenerating && (
            <>
              <div className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: renderSummaryMarkdown(entry.summary) }} />
              {entry.sources && entry.sources.length > 0 && (
                <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button onClick={() => setSourcesOpen(o => !o)} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2 transition-opacity hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
                    {sourcesOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    Sources ({entry.sources.length})
                  </button>
                  {sourcesOpen && (
                    <ul className="space-y-1.5">
                      {entry.sources.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <ExternalLink size={11} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[12px] leading-snug hover:underline" style={{ color: 'var(--accent)' }}>{s.title || s.url}</a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {entry && !isGenerating && (
          <div className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <button onClick={onDelete} className="px-4 py-2 rounded-lg text-[12px] font-medium transition-all" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
              Delete
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => onSave(entry)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all" style={{ color: 'var(--accent)', border: '1px solid rgba(0,170,80,0.35)', background: 'rgba(0,170,80,0.08)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,170,80,0.15)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,170,80,0.08)'; }}>
                <BookMarked size={13} />Save
              </button>
              <button onClick={() => onPost(entry)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all" style={{ color: 'var(--text-primary)', border: '1px solid var(--border)', background: 'transparent' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                <CheckCircle2 size={13} />Post
              </button>
              <button onClick={() => onSchedule(entry)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all" style={{ background: 'var(--accent)', color: 'white' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}>
                <CalendarClock size={13} />Schedule
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feed Card ────────────────────────────────────────────────────────────────

function FeedCard({ item, onSendToPipeline }: { item: FeedItem; onSendToPipeline: (topic: string, pillar: string) => void }) {
  const pillarColor = PILLAR_COLORS[item.pillar] || '#00AA50';
  const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.news;
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
      className="rounded-xl transition-all duration-150"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,170,80,0.25)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
    >
      <div className="p-4">
        {/* Row 1: badges */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: typeConfig.bg, color: typeConfig.color }}>
            {typeConfig.label}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${pillarColor}18`, color: pillarColor }}>
            {item.pillar}
          </span>
          {item.isGD && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,170,80,0.15)', color: 'var(--accent)' }}>GD</span>
          )}
        </div>

        {/* Row 2: source + time */}
        <div className="flex items-center gap-1.5 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={faviconUrl(item.sourceDomain)} alt="" width={14} height={14} className="rounded-sm flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.source}</span>
          {date && (
            <>
              <span style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>·</span>
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{date}</span>
            </>
          )}
        </div>

        {/* Row 3: headline */}
        <a
          href={item.url} target="_blank" rel="noopener noreferrer"
          className="block text-[13.5px] font-semibold leading-snug mb-2 transition-colors"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
        >
          {item.title}
        </a>

        {/* Row 4: description */}
        {item.description && (
          <p className="text-[12px] leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
            {item.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end px-4 py-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'; }}>
            <ExternalLink size={12} />
          </a>
          <button
            onClick={handlePipeline}
            disabled={generating}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
            style={{ background: 'rgba(0,170,80,0.1)', color: 'var(--accent)', border: '1px solid rgba(0,170,80,0.2)', opacity: generating ? 0.7 : 1 }}
            onMouseEnter={(e) => { if (!generating) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,170,80,0.18)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,170,80,0.1)'; }}
          >
            {generating ? <><Loader2 size={10} className="animate-spin" />Generating…</> : <><Send size={10} />Pipeline</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-12 rounded-full" style={{ background: 'var(--border)' }} />
        <div className="h-5 w-20 rounded-full" style={{ background: 'var(--border)' }} />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-3.5 w-3.5 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-24 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-12 rounded" style={{ background: 'var(--border)' }} />
      </div>
      <div className="space-y-1.5">
        <div className="h-4 rounded w-full" style={{ background: 'var(--border)' }} />
        <div className="h-4 rounded w-4/5" style={{ background: 'var(--border)' }} />
        <div className="h-3 rounded w-full mt-2" style={{ background: 'var(--border)' }} />
        <div className="h-3 rounded w-2/3" style={{ background: 'var(--border)' }} />
      </div>
    </div>
  );
}

// ─── Summary Tile (right panel) ───────────────────────────────────────────────

function SummaryTile({ entry }: { entry: DailySummaryEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2 text-left" style={{ background: 'var(--surface)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--sidebar-hover)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; }}>
        <div className="flex items-center gap-2 min-w-0">
          <Calendar size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{entry.dateLabel}</span>
        </div>
        {open ? <ChevronUp size={11} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} /> : <ChevronDown size={11} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />}
      </button>
      {open && (
        <div className="px-3 py-3 border-t text-[11px] leading-relaxed" style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: renderSummaryMarkdown(entry.summary) }} />
      )}
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

function RightPanel({ activePillar, onPillarChange, pillarCounts, approvedSummaries }: {
  activePillar: string;
  onPillarChange: (p: string) => void;
  pillarCounts: Record<string, number>;
  approvedSummaries: DailySummaryEntry[];
}) {
  const total = pillarCounts['All'] || 1;

  return (
    <div className="w-[240px] flex-shrink-0 border-l overflow-y-auto flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>

      {/* Key Themes */}
      <div className="px-4 pt-5 pb-4">
        <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>
          Key Themes
        </p>

        {/* All Topics */}
        <button
          onClick={() => onPillarChange('All')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl mb-3 transition-all"
          style={{
            background: activePillar === 'All' ? 'rgba(0,170,80,0.12)' : 'var(--background)',
            border: `1px solid ${activePillar === 'All' ? 'rgba(0,170,80,0.3)' : 'var(--border)'}`,
          }}
          onMouseEnter={(e) => { if (activePillar !== 'All') (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,170,80,0.2)'; }}
          onMouseLeave={(e) => { if (activePillar !== 'All') (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
        >
          <span className="text-[13px] font-semibold" style={{ color: activePillar === 'All' ? 'var(--accent)' : 'var(--text-primary)' }}>
            All Topics
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: activePillar === 'All' ? 'rgba(0,170,80,0.2)' : 'var(--border)', color: activePillar === 'All' ? 'var(--accent)' : 'var(--text-secondary)' }}>
            {pillarCounts['All'] ?? 0}
          </span>
        </button>

        {/* Individual pillars */}
        <div className="space-y-1.5">
          {PILLARS.map((pillar) => {
            const isActive = activePillar === pillar;
            const count = pillarCounts[pillar] ?? 0;
            const color = PILLAR_COLORS[pillar] || '#00AA50';
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <button
                key={pillar}
                onClick={() => onPillarChange(pillar)}
                className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                style={{
                  background: isActive ? `${color}12` : 'var(--background)',
                  border: `1px solid ${isActive ? `${color}40` : 'var(--border)'}`,
                }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}30`; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-semibold leading-tight" style={{ color: isActive ? color : 'var(--text-primary)' }}>
                    {pillar}
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: isActive ? color : 'var(--text-secondary)' }}>
                    {count}
                  </span>
                </div>
                {/* Mini progress bar */}
                <div className="h-1 rounded-full w-full" style={{ background: 'var(--border)' }}>
                  <div
                    className="h-1 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: isActive ? color : `${color}60` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Summaries */}
      {approvedSummaries.length > 0 && (
        <div className="px-4 pt-2 pb-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3 mt-4" style={{ color: 'var(--text-secondary)' }}>
            Daily Summaries
          </p>
          <div className="space-y-1.5">
            {approvedSummaries.slice(0, 5).map(entry => <SummaryTile key={entry.date} entry={entry} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ResearchFeedProps {
  onSendToPipeline: (topic: string, pillar: string) => void;
  onSaveToLibrary?: (item: { contentType: 'daily-summary'; title: string; output: string; metadata: Record<string, string>; status: 'saved' | 'scheduled' | 'posted' }) => void;
}

export default function ResearchFeed({ onSendToPipeline, onSaveToLibrary }: ResearchFeedProps) {
  const { items, isLoading, error, fetchedAt, refresh } = useResearchFeed();
  const [activePillar, setActivePillar] = useState<string>('All');
  const [activeType, setActiveType] = useState<ArticleType | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [generatedEntry, setGeneratedEntry] = useState<DailySummaryEntry | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [approvedSummaries, setApprovedSummaries] = useState<DailySummaryEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadApproved();
  });

  const handleGenerate = async () => {
    setModalOpen(true);
    setIsGenerating(true);
    setGeneratedEntry(null);
    setGenerateError(null);
    try {
      const res = await fetch('/api/daily-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedEntry(data);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = () => { setModalOpen(false); setGeneratedEntry(null); setGenerateError(null); };

  const saveToApproved = (entry: DailySummaryEntry) => {
    const updated = [entry, ...approvedSummaries.filter(e => e.date !== entry.date)];
    setApprovedSummaries(updated);
    saveApproved(updated);
  };

  const handleSave = (entry: DailySummaryEntry) => {
    saveToApproved(entry);
    onSaveToLibrary?.({ contentType: 'daily-summary', title: `Daily Summary — ${entry.dateLabel}`, output: entry.summary, metadata: {}, status: 'saved' });
    setModalOpen(false); setGeneratedEntry(null);
  };
  const handleApprove = (entry: DailySummaryEntry, status: 'posted' | 'scheduled') => {
    saveToApproved(entry);
    onSaveToLibrary?.({ contentType: 'daily-summary', title: `Daily Summary — ${entry.dateLabel}`, output: entry.summary, metadata: {}, status });
    setModalOpen(false); setGeneratedEntry(null);
  };

  // Filtering + sort newest first
  let filtered = activePillar === 'All' ? items : items.filter(i => i.pillar === activePillar);
  if (activeType !== 'all') filtered = filtered.filter(i => i.type === activeType);
  filtered = [...filtered].sort((a, b) => {
    const aT = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bT = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    if (aT === 0 && bT === 0) return 0;
    if (aT === 0) return 1;
    if (bT === 0) return -1;
    return bT - aT;
  });

  const pillarCounts: Record<string, number> = { All: items.length };
  for (const p of PILLARS) pillarCounts[p] = items.filter(i => i.pillar === p).length;

  const typeCounts = {
    all: items.length,
    news: items.filter(i => i.type === 'news').length,
    pr: items.filter(i => i.type === 'pr').length,
    earnings: items.filter(i => i.type === 'earnings').length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--background)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,170,80,0.12)' }}>
            <Zap size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Latest Signals</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {/* Live pulse */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: 'var(--accent)' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--accent)' }} />
              </span>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {fetchedAt
                  ? `Updated ${timeSince(fetchedAt)} · ${items.length} articles`
                  : isLoading ? 'Fetching latest signals…' : 'Grocery industry intelligence'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Type filter tabs */}
          <div className="flex items-center rounded-lg p-0.5 gap-0.5" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
            {(['all', 'news', 'pr', 'earnings'] as const).map(t => {
              const isActive = activeType === t;
              const count = typeCounts[t];
              return (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all"
                  style={{
                    background: isActive ? 'var(--surface)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {t === 'all' ? `All (${count})` : `${TYPE_CONFIG[t].label} (${count})`}
                </button>
              );
            })}
          </div>

          <button onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all" style={{ background: 'var(--accent)', color: 'white', opacity: isGenerating ? 0.7 : 1 }} onMouseEnter={(e) => { if (!isGenerating) (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = isGenerating ? '0.7' : '1'; }}>
            <Newspaper size={13} />Daily Summary
          </button>

          <button onClick={refresh} disabled={isLoading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all" style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)', opacity: isLoading ? 0.5 : 1 }}>
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl mb-5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertCircle size={16} />
              <div><p className="text-[13px] font-semibold">Failed to load feed</p><p className="text-[12px] opacity-80">{error}</p></div>
            </div>
          )}
          {isLoading && items.length === 0 && (
            <div className="grid grid-cols-1 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Rss size={32} style={{ color: 'var(--text-secondary)', marginBottom: 12, opacity: 0.4 }} />
              <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No articles found</p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>Click Refresh to fetch the latest signals</p>
            </div>
          )}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              {filtered.map(item => <FeedCard key={item.id} item={item} onSendToPipeline={onSendToPipeline} />)}
            </div>
          )}
        </div>

        <RightPanel activePillar={activePillar} onPillarChange={setActivePillar} pillarCounts={pillarCounts} approvedSummaries={approvedSummaries} />
      </div>

      {modalOpen && (
        <DailySummaryModal
          isGenerating={isGenerating}
          entry={generatedEntry}
          error={generateError}
          onClose={handleDelete}
          onDelete={handleDelete}
          onSave={handleSave}
          onPost={(entry) => handleApprove(entry, 'posted')}
          onSchedule={(entry) => handleApprove(entry, 'scheduled')}
        />
      )}
    </div>
  );
}

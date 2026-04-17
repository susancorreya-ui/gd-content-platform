'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ArrowRight, RefreshCw, TrendingUp, BookOpen, BarChart2, Video, Library, Upload, Mail, Newspaper as NewsletterIcon, MailCheck, CalendarDays, ChevronRight, Loader2, Building2 } from 'lucide-react';
import { FeedItem } from '@/app/api/research-feed/route';
import { useDailySummary } from '@/lib/useDailySummary';
import { useCompaniesFeed } from '@/lib/useCompaniesFeed';
import { DailySummaryEntry } from '@/app/api/daily-summary/route';

// ─── Data ─────────────────────────────────────────────────────────────────────

const PILLAR_COLORS: Record<string, string> = {
  'Artificial Intelligence': '#6366f1',
  'Automation':              '#f59e0b',
  'Digital Commerce':        '#3b82f6',
  'Personalization':         '#ec4899',
  'Retail Media':            '#8b5cf6',
  'Supply Chain':            '#10b981',
};



// ─── Company social feed ──────────────────────────────────────────────────────

const AVATAR_PALETTE = ['#6366f1','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#10b981','#ef4444','#06b6d4'];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

interface SocialPost {
  id: string;
  company: string;
  title: string;
  description: string;
  url: string;
  sourceDomain: string;
  publishedAt: string;
  pillar: string;
  type: string;
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function useCompanyPosts(): { posts: SocialPost[]; fetchedAt: string; isLoading: boolean } {
  const { companies, fetchedAt, isLoading } = useCompaniesFeed();

  const posts = useMemo(() => {
    // Deduplicate by URL — same article can appear under multiple companies
    const seenUrls = new Set<string>();
    const all: SocialPost[] = companies.flatMap(c =>
      c.developments
        .filter(d => {
          if (!d.url || seenUrls.has(d.url)) return false;
          seenUrls.add(d.url);
          return true;
        })
        .map(d => ({ ...d, company: c.company }))
    );

    // Sort newest first; undated items go to the bottom
    all.sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tb - ta;
    });

    // Interleave so the marquee mixes different companies
    const byCompany: Record<string, SocialPost[]> = {};
    for (const p of all) {
      (byCompany[p.company] ??= []).push(p);
    }
    const interleaved: SocialPost[] = [];
    const queues = Object.values(byCompany);
    let i = 0;
    while (interleaved.length < 30 && queues.some(q => q.length > 0)) {
      const q = queues[i % queues.length];
      if (q.length > 0) interleaved.push(q.shift()!);
      i++;
    }
    return interleaved;
  }, [companies]);

  return { posts, fetchedAt: fetchedAt ?? '', isLoading };
}

const TYPE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  news:     { label: 'News',     bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
  pr:       { label: 'PR',       bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  earnings: { label: 'Earnings', bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  social:   { label: 'Social',   bg: 'rgba(99,102,241,0.12)',  color: '#6366f1' },
};

function SocialPostCard({ post, fetchedAt }: { post: SocialPost; fetchedAt: string }) {
  const color = avatarColor(post.company);
  const initials = avatarInitials(post.company);
  const date = formatDate(post.publishedAt) || timeAgo(post.publishedAt) || formatDate(fetchedAt) || timeAgo(fetchedAt);
  const typeStyle = TYPE_LABELS[post.type] || TYPE_LABELS.news;
  const pillarColor = PILLAR_COLORS[post.pillar] || '#00AA50';

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        width: '280px',
        flexShrink: 0,
        textDecoration: 'none',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = color + '50';
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 4px 16px ${color}18`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
      }}
    >
      {/* Header: avatar + company + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
          background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color,
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {post.company}
          </p>
        </div>
        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '20px', background: typeStyle.bg, color: typeStyle.color, flexShrink: 0 }}>
          {typeStyle.label}
        </span>
      </div>

      {/* Headline */}
      <p style={{ fontSize: '12.5px', fontWeight: 600, lineHeight: 1.4, color: 'var(--text-primary)',
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {post.title}
      </p>

      {/* Description */}
      {post.description && (
        <p style={{ fontSize: '11.5px', lineHeight: 1.5, color: 'var(--text-secondary)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {post.description}
        </p>
      )}

      {/* Footer: pillar + date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '20px', background: pillarColor + '15', color: pillarColor }}>
          {post.pillar}
        </span>
        {date && (
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>{date}</span>
        )}
      </div>
    </a>
  );
}

function CompanySocialFeed({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { posts, fetchedAt, isLoading } = useCompanyPosts();
  const doubled = [...posts, ...posts];

  return (
    <div className="mb-8">
      <style>{`
        @keyframes gd-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes gd-ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .gd-marquee-track {
          animation: gd-marquee ${Math.max(posts.length, 1) * 4}s linear infinite;
          will-change: transform;
        }
        .gd-marquee-track:hover { animation-play-state: paused; }
        .gd-ping { animation: gd-ping 1.5s cubic-bezier(0,0,0.2,1) infinite; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Company Feed
          </h2>
          {isLoading ? (
            <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent)' }} />
          ) : posts.length > 0 ? (
            <>
              <span style={{ position: 'relative', display: 'inline-flex', width: '8px', height: '8px' }}>
                <span className="gd-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent)', opacity: 0.5 }} />
                <span style={{ position: 'relative', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-flex' }} />
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {posts.length} updates from tracked grocers
              </span>
            </>
          ) : null}
        </div>
        <button
          onClick={() => onNavigate('companies')}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', opacity: 1, transition: 'opacity 0.15s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        >
          View all companies <ArrowRight size={13} />
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl p-8 flex items-center justify-center gap-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent)' }} />
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Loading company updates…</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Building2 size={24} style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>No company data yet.</p>
          <button onClick={() => onNavigate('companies')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold"
            style={{ background: 'var(--accent)', color: 'white' }}>
            <RefreshCw size={13} /> Go to Companies
          </button>
        </div>
      ) : (
        <div style={{ overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '60px', background: 'linear-gradient(to right, var(--background), transparent)', zIndex: 1, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '60px', background: 'linear-gradient(to left, var(--background), transparent)', zIndex: 1, pointerEvents: 'none' }} />
          <div className="gd-marquee-track" style={{ display: 'flex', gap: '12px', width: 'max-content' }}>
            {doubled.map((post, i) => (
              <SocialPostCard key={`${post.id}-${i}`} post={post} fetchedAt={fetchedAt} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Daily Summary Thumbnail ──────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^\-\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}

function HomeDailySummary({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { today, archive, isGenerating } = useDailySummary();

  const entry: DailySummaryEntry | null = today ?? (archive.length > 0 ? archive[0] : null);
  const excerpt = entry ? stripMarkdown(entry.summary).slice(0, 50).trimEnd() + '…' : '';
  const accent = 'var(--accent)';

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            Daily Summary
          </h2>
          {isGenerating && <Loader2 size={11} className="animate-spin" style={{ color: accent }} />}
        </div>
        <button
          onClick={() => onNavigate('daily-summary')}
          className="flex items-center gap-1.5 text-[12px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: accent }}
        >
          View all <ArrowRight size={12} />
        </button>
      </div>

      <div
        className="rounded-2xl p-5 flex flex-col gap-3 cursor-pointer group transition-all duration-150 relative overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={() => onNavigate('daily-summary')}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = '#00AA5050';
          el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
          el.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = 'var(--border)';
          el.style.boxShadow = 'none';
          el.style.transform = 'translateY(0)';
        }}
      >
        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--accent)', opacity: 0.7, borderRadius: '16px 16px 0 0' }} />

        {isGenerating && !entry ? (
          <div className="flex items-center gap-2.5 py-2">
            <Loader2 size={15} className="animate-spin" style={{ color: accent }} />
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Generating today&rsquo;s summary&hellip;</span>
          </div>
        ) : !entry ? (
          <div className="flex items-center gap-2.5 py-2">
            <NewsletterIcon size={15} style={{ color: 'var(--text-secondary)', opacity: 0.35 }} />
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Today&rsquo;s summary will appear here at 11 AM.</span>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,170,80,0.12)', color: accent }}>
                Daily Brief
              </span>
              <span className="text-[11px] font-medium" style={{ color: accent }}>
                {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* Excerpt */}
            <p className="text-[13px] leading-relaxed line-clamp-1" style={{ color: 'var(--text-primary)' }}>
              {excerpt}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-1">
              {entry.sources?.length > 0 && (
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {entry.sources.length} sources
                </span>
              )}
              <div className="flex items-center gap-1 text-[11px] font-semibold ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: accent }}>
                Read full brief <ArrowRight size={11} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// Read top 3 signals from the research feed cache
function useLatestSignals(): { signals: FeedItem[]; fetchedAt: string | null } {
  const [signals, setSignals] = useState<FeedItem[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('gd_research_feed_v13');
      if (cached) {
        const parsed = JSON.parse(cached);
        const items: FeedItem[] = parsed.items || [];
        // Pick one article per pillar, top 3 by recency
        const seen = new Set<string>();
        const top: FeedItem[] = [];
        for (const item of items) {
          if (!seen.has(item.pillar) && top.length < 3) {
            seen.add(item.pillar);
            top.push(item);
          }
        }
        setSignals(top);
        setFetchedAt(parsed.fetchedAt || null);
      }
    } catch { /* ignore */ }
  }, []);

  return { signals, fetchedAt };
}

// ─── Signal Card ──────────────────────────────────────────────────────────────

function SignalCard({ item, onNavigate }: { item: FeedItem; onNavigate: (id: string) => void }) {
  const color = PILLAR_COLORS[item.pillar] || '#00AA50';
  const date = formatDate(item.publishedAt);

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 cursor-pointer group transition-all duration-150"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = color + '50';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
      onClick={() => onNavigate('feed')}
    >
      {/* Pillar theme */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${color}15`, color }}>
          {item.pillar}
        </span>
        {date && (
          <span className="text-[11px] font-medium" style={{ color }}>
            {date}
          </span>
        )}
      </div>

      {/* Headline */}
      <h3 className="text-[13.5px] font-semibold leading-snug flex-1" style={{ color: 'var(--text-primary)' }}>
        {item.title}
      </h3>

      {/* Description */}
      {item.description && (
        <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {item.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={faviconUrl(item.sourceDomain)} alt="" width={13} height={13} className="rounded-sm"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{item.source}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }}>
          View in Intelligence <ArrowRight size={11} />
        </div>
      </div>
    </div>
  );
}

// ─── What do you want to do today? ───────────────────────────────────────────

const TODAY_ACTIONS: {
  category: string;
  color: string;
  items: { id: string; label: string; icon: React.ReactNode; description: string }[];
}[] = [
  {
    category: 'Content',
    color: '#6366f1',
    items: [
      { id: 'blog',               label: 'Blog Post',          icon: <BookOpen size={18} />,       description: 'Long-form article for the GD blog' },
      { id: 'grocer-performance', label: 'Grocer Performance', icon: <TrendingUp size={18} />,     description: 'Grocer-specific performance report' },
      { id: 'market-snapshot',    label: 'Market Snapshot',    icon: <BarChart2 size={18} />,      description: 'Quick-hit market intelligence brief' },
      { id: 'video-script',       label: 'Video Script',       icon: <Video size={18} />,          description: 'Script for a short-form video' },
      { id: 'library',            label: 'Library',            icon: <Library size={18} />,        description: 'Browse and manage saved content' },
      { id: 'upload',             label: 'Upload Document',    icon: <Upload size={18} />,         description: 'Add a reference document to the platform' },
    ],
  },
  {
    category: 'Email',
    color: '#3b82f6',
    items: [
      { id: 'email',          label: 'Email',          icon: <Mail size={18} />,         description: 'One-off email for clients or prospects' },
      { id: 'newsletter',     label: 'Newsletter',     icon: <NewsletterIcon size={18} />, description: 'Weekly or monthly subscriber newsletter' },
      { id: 'email-sequence', label: 'Email Sequence', icon: <MailCheck size={18} />,    description: 'Multi-step nurture or drip sequence' },
    ],
  },
  {
    category: 'Social Media',
    color: '#10b981',
    items: [
      { id: 'social-scheduler', label: 'Social Media Scheduler', icon: <CalendarDays size={18} />, description: 'Plan and schedule social media posts' },
    ],
  },
];

function TodaySection({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      className="mb-8 p-5 rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, var(--surface) 60%, rgba(99,102,241,0.06))',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--accent)' }}>
            Quick Start
          </p>
          <h2 className="text-[17px] font-bold" style={{ color: 'var(--text-primary)' }}>
            What do you want to create today?
          </h2>
        </div>
        <Zap size={20} style={{ color: 'var(--accent)', opacity: 0.5 }} />
      </div>

      {/* Category toggle buttons */}
      <div className="flex gap-2 mb-3">
        {TODAY_ACTIONS.map(({ category, color }) => {
          const isOpen = open === category;
          return (
            <button
              key={category}
              onClick={() => setOpen(isOpen ? null : category)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: isOpen ? color : 'var(--background)',
                border: `1px solid ${isOpen ? color : 'var(--border)'}`,
                color: isOpen ? 'white' : 'var(--text-secondary)',
                fontSize: '12.5px', fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isOpen ? `0 4px 12px ${color}30` : 'none',
              }}
            >
              {category}
              <ChevronRight
                size={13}
                style={{
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease',
                  opacity: isOpen ? 1 : 0.5,
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Expanded sub-items */}
      {TODAY_ACTIONS.map(({ category, color, items }) =>
        open !== category ? null : (
          <div
            key={category}
            className="flex flex-wrap gap-2 p-3 rounded-xl"
            style={{ background: color + '08', border: `1px solid ${color}20` }}
          >
            {items.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px 6px 9px',
                  borderRadius: '7px',
                  background: hovered === id ? color + '18' : 'var(--surface)',
                  border: `1px solid ${hovered === id ? color + '40' : 'var(--border)'}`,
                  transition: 'all 0.13s ease',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color, display: 'flex', alignItems: 'center' }}>{icon}</span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface InsightsHomeProps {
  onNavigate: (id: string) => void;
}

export default function InsightsHome({ onNavigate }: InsightsHomeProps) {
  const router = useRouter();
  const { signals, fetchedAt } = useLatestSignals();
  const [signalTime, setSignalTime] = useState('');

  const handleNavigate = useCallback((id: string) => {
    if (id === 'social-scheduler') {
      router.push('/scheduler');
    } else {
      onNavigate(id);
    }
  }, [onNavigate, router]);

  useEffect(() => {
    if (fetchedAt) setSignalTime(timeAgo(fetchedAt));
  }, [fetchedAt]);

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--background)' }}>
      <div className="max-w-[1100px] mx-auto px-8 py-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--accent)' }}>
            {todayLabel()}
          </p>
          <h1 className="text-[28px] font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
            {greeting()}, welcome back.
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            AI-powered grocery intelligence — research, create, and schedule content in one place.
          </p>
        </div>

        {/* ── What do you want to do today? ───────────────────────────────── */}
        <TodaySection onNavigate={handleNavigate} />

        {/* ── Daily Summary ────────────────────────────────────────────────── */}
        <HomeDailySummary onNavigate={handleNavigate} />

        {/* ── Company Social Feed ─────────────────────────────────────────── */}
        <CompanySocialFeed onNavigate={onNavigate} />

        {/* ── Live Signals ────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                Latest Signals
              </h2>
              {signals.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: 'var(--accent)' }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--accent)' }} />
                  </span>
                  {signalTime && <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Updated {signalTime}</span>}
                </div>
              )}
            </div>
            <button
              onClick={() => onNavigate('feed')}
              className="flex items-center gap-1.5 text-[12px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent)' }}
            >
              View all signals <ArrowRight size={13} />
            </button>
          </div>

          {signals.length === 0 ? (
            <div className="rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Zap size={24} style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                No cached signals yet — go to Intelligence and click Refresh to load the latest news.
              </p>
              <button onClick={() => onNavigate('feed')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all"
                style={{ background: 'var(--accent)', color: 'white' }}>
                <RefreshCw size={13} />Go to Intelligence
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {signals.map(item => (
                <SignalCard key={item.id} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </div>


      </div>
    </div>
  );
}

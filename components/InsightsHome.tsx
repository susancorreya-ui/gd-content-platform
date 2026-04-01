'use client';

import { useState, useEffect, useRef } from 'react';
import { Zap, ArrowRight, RefreshCw, TrendingUp } from 'lucide-react';
import { FeedItem } from '@/app/api/research-feed/route';

// ─── Data ─────────────────────────────────────────────────────────────────────

const PILLAR_COLORS: Record<string, string> = {
  'Artificial Intelligence': '#6366f1',
  'Automation':              '#f59e0b',
  'Digital Commerce':        '#3b82f6',
  'Personalization':         '#ec4899',
  'Retail Media':            '#8b5cf6',
  'Supply Chain':            '#10b981',
};

const STATS = [
  { prefix: '$', numeric: 136,  suffix: 'B',  decimals: 0, label: 'AI value unlock in grocery by 2030',              color: '#6366f1', trend: 'McKinsey, 2024'        },
  { prefix: '$', numeric: 126,  suffix: 'B',  decimals: 0, label: 'Digital grocery sales — 13.4% of total',           color: '#3b82f6', trend: '↑ 13.4% share'        },
  { prefix: '',  numeric: 1.5,  suffix: '×',  decimals: 1, label: 'More spend from omnichannel vs single-channel',    color: '#10b981', trend: 'vs in-store only'     },
  { prefix: '',  numeric: 86,   suffix: '%',  decimals: 0, label: 'C-suite execs prioritising AI for efficiency',     color: '#f59e0b', trend: '↑ from 71% in 2023'  },
  { prefix: '$', numeric: 8.5,  suffix: 'B',  decimals: 1, label: 'US grocery retail media market size',              color: '#8b5cf6', trend: '↑ 31% YoY'           },
  { prefix: '',  numeric: 92,   suffix: '%',  decimals: 0, label: 'Shoppers say grocery lacks personalisation',        color: '#ec4899', trend: 'Opportunity gap'     },
];


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

function useCompanyPosts(): SocialPost[] {
  const [posts, setPosts] = useState<SocialPost[]>([]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('gd_companies_feed_v5');
      if (!cached) return;
      const { companies } = JSON.parse(cached);
      const cutoff = Date.now() - TWO_DAYS_MS;

      const all: SocialPost[] = (companies || []).flatMap((c: { company: string; developments: SocialPost[] }) =>
        (c.developments || []).map((d: SocialPost) => ({ ...d, company: c.company }))
      );

      // Keep posts from last 2 days; if no date keep them too (trust the source)
      const recent = all.filter(p => {
        if (!p.publishedAt) return true;
        const ts = new Date(p.publishedAt).getTime();
        return isNaN(ts) || ts >= cutoff;
      });

      recent.sort((a, b) => {
        const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return tb - ta;
      });

      // Interleave companies so the feed mixes different grocers
      const byCompany: Record<string, SocialPost[]> = {};
      for (const p of recent) {
        (byCompany[p.company] ??= []).push(p);
      }
      const interleaved: SocialPost[] = [];
      const queues = Object.values(byCompany);
      let i = 0;
      while (interleaved.length < 24 && queues.some(q => q.length > 0)) {
        const q = queues[i % queues.length];
        if (q.length > 0) interleaved.push(q.shift()!);
        i++;
      }

      setPosts(interleaved);
    } catch { /* ignore */ }
  }, []);

  return posts;
}

const TYPE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  news:     { label: 'News',     bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
  pr:       { label: 'PR',       bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  earnings: { label: 'Earnings', bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  social:   { label: 'Social',   bg: 'rgba(99,102,241,0.12)',  color: '#6366f1' },
};

function SocialPostCard({ post }: { post: SocialPost }) {
  const color = avatarColor(post.company);
  const initials = avatarInitials(post.company);
  const age = timeAgo(post.publishedAt);
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
          {age && (
            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '1px' }}>{age}</p>
          )}
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

      {/* Footer: pillar + source favicon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '20px', background: pillarColor + '15', color: pillarColor }}>
          {post.pillar}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={faviconUrl(post.sourceDomain)} alt="" width={12} height={12} style={{ borderRadius: '2px' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{post.sourceDomain}</span>
        </div>
      </div>
    </a>
  );
}

function CompanySocialFeed({ onNavigate }: { onNavigate: (id: string) => void }) {
  const posts = useCompanyPosts();

  if (posts.length === 0) return null;

  // Duplicate for seamless infinite loop
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
          animation: gd-marquee ${posts.length * 4}s linear infinite;
          will-change: transform;
        }
        .gd-marquee-track:hover {
          animation-play-state: paused;
        }
        .gd-ping { animation: gd-ping 1.5s cubic-bezier(0,0,0.2,1) infinite; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Company Feed
          </h2>
          <span style={{ position: 'relative', display: 'inline-flex', width: '8px', height: '8px' }}>
            <span className="gd-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent)', opacity: 0.5 }} />
            <span style={{ position: 'relative', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-flex' }} />
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {posts.length} updates from tracked grocers
          </span>
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

      {/* Scrolling strip */}
      <div style={{ overflow: 'hidden', position: 'relative' }}>
        {/* Fade edges */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '60px', background: 'linear-gradient(to right, var(--background), transparent)', zIndex: 1, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '60px', background: 'linear-gradient(to left, var(--background), transparent)', zIndex: 1, pointerEvents: 'none' }} />

        <div className="gd-marquee-track" style={{ display: 'flex', gap: '12px', width: 'max-content' }}>
          {doubled.map((post, i) => (
            <SocialPostCard key={`${post.id}-${i}`} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, active: boolean, duration = 1300, decimals = 0) {
  const [count, setCount] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let startTs: number | null = null;

    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / duration, 1);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };

    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [active, target, duration, decimals]);

  return count;
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────

function StatTile({
  prefix, numeric, suffix, decimals, label, color, trend, index,
}: { prefix: string; numeric: number; suffix: string; decimals: number; label: string; color: string; trend: string; index: number }) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const count = useCountUp(numeric, visible, 1300, decimals);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 80);
    return () => clearTimeout(t);
  }, [index]);

  const display = `${prefix}${count}${suffix}`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(14px)',
        transition: 'opacity 0.45s ease, transform 0.45s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        background: hovered ? `linear-gradient(135deg, var(--surface) 60%, ${color}0d)` : 'var(--surface)',
        border: `1px solid ${hovered ? color + '40' : 'var(--border)'}`,
        boxShadow: hovered ? `0 6px 24px ${color}18` : 'none',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '10px',
        position: 'relative' as const,
        overflow: 'hidden',
      }}
    >
      {/* Colored top accent bar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '3px',
        background: color,
        opacity: hovered ? 1 : 0.5,
        transition: 'opacity 0.2s ease',
        borderRadius: '16px 16px 0 0',
      }} />

      {/* Animated number */}
      <div style={{
        fontSize: '30px',
        fontWeight: 800,
        lineHeight: 1,
        color,
        letterSpacing: '-0.5px',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {display}
      </div>

      {/* Label */}
      <p style={{ fontSize: '12px', lineHeight: 1.4, color: 'var(--text-primary)', flex: 1 }}>
        {label}
      </p>

      {/* Trend badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <TrendingUp size={10} style={{ color, opacity: 0.7 }} />
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {trend}
        </span>
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
      const cached = localStorage.getItem('gd_research_feed_v5');
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
  const age = timeAgo(item.publishedAt);

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
        {age && (
          <span className="text-[11px] font-medium" style={{ color }}>
            {age}
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

// ─── Main ─────────────────────────────────────────────────────────────────────

interface InsightsHomeProps {
  onNavigate: (id: string) => void;
}

export default function InsightsHome({ onNavigate }: InsightsHomeProps) {
  const { signals, fetchedAt } = useLatestSignals();
  const [signalTime, setSignalTime] = useState('');

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

        {/* ── Industry Benchmarks ─────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              Industry Benchmarks
            </h2>
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              Source: Grocery Doppio
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {STATS.map((s, i) => <StatTile key={i} {...s} index={i} />)}
          </div>
        </div>

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

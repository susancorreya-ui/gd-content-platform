'use client';

import { useState } from 'react';
import { RefreshCw, ExternalLink, AlertCircle, Building2, TrendingUp } from 'lucide-react';
import { useCompaniesFeed } from '@/lib/useCompaniesFeed';
import { CompanyDevelopment } from '@/app/api/companies-feed/route';

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

const TYPE_LABELS: Record<string, string> = {
  news: 'News',
  pr: 'PR',
  earnings: 'Earnings',
  social: 'Social',
};

const TYPE_COLORS: Record<string, string> = {
  news: 'rgba(255,255,255,0.08)',
  pr: 'rgba(59,130,246,0.12)',
  earnings: 'rgba(16,185,129,0.12)',
  social: 'rgba(139,92,246,0.12)',
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

function formatFetchedAt(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return ''; }
}

function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-3 rounded w-24" style={{ background: 'var(--border)' }} />
        <div className="h-3 rounded w-12" style={{ background: 'var(--border)' }} />
      </div>
      <div className="space-y-2">
        <div className="h-3.5 rounded w-3/4" style={{ background: 'var(--border)' }} />
        <div className="h-3 rounded w-full" style={{ background: 'var(--border)' }} />
        <div className="h-3 rounded w-1/2" style={{ background: 'var(--border)' }} />
      </div>
    </div>
  );
}

function DevelopmentCard({ item, company }: { item: CompanyDevelopment; company: string }) {
  const pillarColor = PILLAR_COLORS[item.pillar] || '#00AA50';
  return (
    <div
      className="rounded-xl p-4 transition-all duration-150 group"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,170,80,0.3)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
    >
      {/* Badges row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,170,80,0.12)', color: 'var(--accent)' }}>
            {company}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${pillarColor}20`, color: pillarColor }}>
            {item.pillar}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: TYPE_COLORS[item.type] || TYPE_COLORS.news, color: 'var(--text-secondary)' }}>
            {TYPE_LABELS[item.type]}
          </span>
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'; }}
        >
          <ExternalLink size={12} />
        </a>
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

      {item.description && (
        <p className="text-[12px] leading-relaxed mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {item.description}
        </p>
      )}

      <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
        <span>{item.source}</span>
        {formatDate(item.publishedAt) && <><span>·</span><span>{formatDate(item.publishedAt)}</span></>}
      </div>
    </div>
  );
}

export default function CompaniesTracker() {
  const { companies, isLoading, error, fetchedAt, refresh } = useCompaniesFeed();
  const [activeCompany, setActiveCompany] = useState<string>('All');
  const [activePillar, setActivePillar] = useState<string>('All');

  // Flatten all developments for filtering
  const allDevelopments = companies.flatMap(c =>
    c.developments.map(d => ({ ...d, companyName: c.company }))
  );

  const filtered = allDevelopments.filter(d => {
    const matchCompany = activeCompany === 'All' || d.companyName === activeCompany;
    const matchPillar = activePillar === 'All' || d.pillar === activePillar;
    return matchCompany && matchPillar;
  });

  const companyNames = companies.map(c => c.company);

  const totalDevelopments = allDevelopments.length;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,170,80,0.12)' }}>
            <Building2 size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Companies</h1>
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {fetchedAt
                ? `Updated ${formatFetchedAt(fetchedAt)} · ${totalDevelopments} developments across ${companies.length} companies`
                : isLoading ? 'Fetching company developments…' : 'Top 20 grocery retailers — tech & digital developments'}
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
          style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)', opacity: isLoading ? 0.5 : 1 }}
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Company filter pills */}
      <div className="flex items-center gap-1.5 px-6 py-3 border-b overflow-x-auto flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {['All', ...companyNames].map(name => {
          const isActive = activeCompany === name;
          const count = name === 'All' ? totalDevelopments : (companies.find(c => c.company === name)?.developments.length || 0);
          const co = companies.find(c => c.company === name);
          return (
            <button
              key={name}
              onClick={() => setActiveCompany(name)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: isActive ? 'rgba(0,170,80,0.12)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                border: isActive ? '1px solid rgba(0,170,80,0.3)' : '1px solid transparent',
              }}
            >
              {name}
              {co?.isPublic && co.ticker && (
                <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                  {co.ticker}
                </span>
              )}
              {count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: isActive ? 'rgba(0,170,80,0.2)' : 'var(--border)', color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Pillar filter tabs */}
      <div className="flex items-center gap-1.5 px-6 py-2.5 border-b overflow-x-auto flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {['All', ...PILLARS].map(pillar => {
          const isActive = activePillar === pillar;
          const color = pillar === 'All' ? 'var(--accent)' : (PILLAR_COLORS[pillar] || 'var(--accent)');
          return (
            <button
              key={pillar}
              onClick={() => setActivePillar(pillar)}
              className="px-3 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: isActive ? `${color}20` : 'transparent',
                color: isActive ? color : 'var(--text-secondary)',
                border: isActive ? `1px solid ${color}40` : '1px solid transparent',
              }}
            >
              {pillar === 'All' ? 'All Pillars' : pillar}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl mb-5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
            <AlertCircle size={16} />
            <div>
              <p className="text-[13px] font-semibold">Failed to load companies feed</p>
              <p className="text-[12px] opacity-80">{error}</p>
            </div>
          </div>
        )}

        {isLoading && companies.length === 0 && (
          <div className="grid grid-cols-1 gap-3 max-w-3xl">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && companies.length > 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <TrendingUp size={32} style={{ color: 'var(--text-secondary)', marginBottom: 12, opacity: 0.4 }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No developments found</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>Try a different company or pillar filter</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-3 max-w-3xl">
            {filtered.map(item => (
              <DevelopmentCard key={item.id} item={item} company={item.companyName} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

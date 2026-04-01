'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, ExternalLink, AlertCircle, Building2,
  TrendingUp, TrendingDown, Loader2, Search, ChevronRight,
  ChevronDown, ChevronUp, Zap,
} from 'lucide-react';
import { useCompaniesFeed } from '@/lib/useCompaniesFeed';
import { CompanyUpdate, CompanyDevelopment } from '@/app/api/companies-feed/route';
import { CompanyFinancials } from '@/app/api/company-financials/route';

// ─── Config ───────────────────────────────────────────────────────────────────

const PILLAR_COLORS: Record<string, string> = {
  'Artificial Intelligence': '#6366f1',
  'Automation':              '#f59e0b',
  'Digital Commerce':        '#3b82f6',
  'Personalization':         '#ec4899',
  'Retail Media':            '#8b5cf6',
  'Supply Chain':            '#10b981',
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  news:     { label: 'News',     color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  pr:       { label: 'PR',       color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  earnings: { label: 'Earnings', color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  social:   { label: 'Social',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
};

// Stable avatar colour from company name
const AVATAR_PALETTE = [
  '#6366f1','#f59e0b','#3b82f6','#ec4899','#8b5cf6',
  '#10b981','#ef4444','#0ea5e9','#14b8a6','#f97316',
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
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

function fmtPrice(n: number | null, currency = 'USD') {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtLarge(n: number | null) {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

// ─── Financial Preview ────────────────────────────────────────────────────────

function FinancialPreview({ company }: { company: CompanyUpdate }) {
  const [data, setData] = useState<CompanyFinancials | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!company.ticker || !company.isPublic) return;
    setLoading(true); setData(null); setErr(null);
    fetch(`/api/company-financials?ticker=${encodeURIComponent(company.ticker)}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [company.ticker, company.isPublic]);

  if (!company.isPublic || !company.ticker) return null;

  const up = data?.change != null && data.change >= 0;

  return (
    <div className="mx-3 mb-3 rounded-xl p-4 flex-shrink-0" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{company.company}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
              {company.ticker}
            </span>
          </div>
          {data && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{data.exchange}</p>}
        </div>
        <a href={`https://finance.yahoo.com/quote/${company.ticker}`} target="_blank" rel="noopener noreferrer"
          className="text-[10px] transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
          <ExternalLink size={11} />
        </a>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-1">
          <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent)' }} />
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Loading…</span>
        </div>
      )}
      {err && !loading && <p className="text-[11px]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>Data unavailable</p>}
      {data && !loading && (
        <>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-[20px] font-bold" style={{ color: 'var(--text-primary)' }}>{fmtPrice(data.price, data.currency)}</span>
            {data.change != null && data.changePct != null && (
              <div className="flex items-center gap-1 pb-0.5" style={{ color: up ? '#10b981' : '#ef4444' }}>
                {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span className="text-[11px] font-semibold">
                  {up ? '+' : ''}{data.change.toFixed(2)} ({up ? '+' : ''}{data.changePct.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'Mkt Cap',   value: fmtLarge(data.marketCap) },
              { label: 'Revenue',   value: fmtLarge(data.revenue) },
              { label: 'P/E',       value: data.peRatio != null ? data.peRatio.toFixed(1) : '—' },
              { label: 'EPS',       value: data.eps != null ? `$${data.eps.toFixed(2)}` : '—' },
              { label: '52W High',  value: fmtPrice(data.week52High, data.currency) },
              { label: '52W Low',   value: fmtPrice(data.week52Low, data.currency) },
            ].map(m => (
              <div key={m.label} className="rounded-lg px-2.5 py-2" style={{ background: 'var(--surface)' }}>
                <p className="text-[9px] mb-0.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{m.label}</p>
                <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{m.value}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Development Card ─────────────────────────────────────────────────────────

function DevelopmentCard({ item, company }: { item: CompanyDevelopment & { companyName: string }; company: string }) {
  const pillarColor = PILLAR_COLORS[item.pillar] || '#00AA50';
  const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.news;
  const age = timeAgo(item.publishedAt);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl transition-all duration-150"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,170,80,0.25)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
    >
      <div className="p-4">
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,170,80,0.12)', color: 'var(--accent)' }}>
            {company}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: typeConfig.bg, color: typeConfig.color }}>
            {typeConfig.label}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${pillarColor}18`, color: pillarColor }}>
            {item.pillar}
          </span>
        </div>

        {/* Source + time */}
        <div className="flex items-center gap-1.5 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={faviconUrl(item.sourceDomain)} alt="" width={13} height={13} className="rounded-sm flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.source}</span>
          {age && <><span style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>·</span><span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>{age}</span></>}
        </div>

        {/* Headline */}
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          className="block text-[13.5px] font-semibold leading-snug mb-2 transition-colors"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
        >
          {item.title}
        </a>

        {/* Description */}
        {item.description && (
          <p className={`text-[12px] leading-relaxed ${expanded ? '' : 'line-clamp-2'}`} style={{ color: 'var(--text-secondary)' }}>
            {item.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => setExpanded(o => !o)} className="flex items-center gap-1 text-[11px] transition-opacity hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
          {expanded ? <><ChevronUp size={12} />Less</> : <><ChevronDown size={12} />Read more</>}
        </button>
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'; }}
        >
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-16 rounded-full" style={{ background: 'var(--border)' }} />
        <div className="h-5 w-12 rounded-full" style={{ background: 'var(--border)' }} />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-3.5 w-3.5 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-28 rounded" style={{ background: 'var(--border)' }} />
      </div>
      <div className="space-y-1.5">
        <div className="h-4 rounded w-full" style={{ background: 'var(--border)' }} />
        <div className="h-4 rounded w-4/5" style={{ background: 'var(--border)' }} />
        <div className="h-3 rounded w-2/3 mt-1" style={{ background: 'var(--border)' }} />
      </div>
    </div>
  );
}

// ─── Company List (right panel) ───────────────────────────────────────────────

function CompanyPanel({
  companies,
  activeCompany,
  onSelect,
  selectedCompany,
}: {
  companies: CompanyUpdate[];
  activeCompany: string;
  onSelect: (name: string) => void;
  selectedCompany: CompanyUpdate | null;
}) {
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const list = search.trim()
      ? companies.filter(c => c.company.toLowerCase().includes(search.toLowerCase()) || c.ticker?.toLowerCase().includes(search.toLowerCase()))
      : [...companies];
    return list.sort((a, b) => a.company.localeCompare(b.company));
  }, [companies, search]);



  return (
    <div className="w-[280px] flex-shrink-0 border-l flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>

      {/* Panel header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 size={15} style={{ color: 'var(--text-primary)' }} />
            <span className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>Companies</span>
          </div>
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {companies.length} tracked
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg text-[12px] outline-none"
            style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Company list */}
      <div className="flex-1 overflow-y-auto px-3 py-1 min-h-0">
        {visible.map((co, idx) => {
          const isActive = activeCompany === co.company;
          const color = avatarColor(co.company);
          const initials = co.company.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
          const count = co.developments.length;

          return (
            <div key={co.company}>
              <button
                onClick={() => onSelect(co.company)}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-left transition-all"
                style={{ background: isActive ? `${color}10` : 'transparent' }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--background)'; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white" style={{ background: color }}>
                  {initials}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-semibold truncate" style={{ color: isActive ? color : 'var(--text-primary)' }}>
                      {co.company}
                    </span>
                    {co.isPublic && co.ticker && (
                      <span className="text-[9px] font-semibold flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        {co.ticker}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${color}15`, color }}>
                      {co.revenue}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      {count} {count === 1 ? 'update' : 'updates'}
                    </span>
                  </div>
                </div>

                <ChevronRight size={13} style={{ color: isActive ? color : 'var(--text-secondary)', opacity: isActive ? 1 : 0.4, flexShrink: 0 }} />
              </button>
              {idx < visible.length - 1 && (
                <div className="h-px mx-2" style={{ background: 'var(--border)', opacity: 0.5 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Financial preview (pinned bottom) */}
      {selectedCompany && (
        <div className="flex-shrink-0 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          <FinancialPreview company={selectedCompany} />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CompaniesTracker() {
  const { companies, isLoading, error, fetchedAt, refresh } = useCompaniesFeed();
  const [activeCompany, setActiveCompany] = useState<string>('');
  const [activeType, setActiveType] = useState<string>('all');

  const allDevelopments = useMemo(() =>
    companies.flatMap(c => c.developments.map(d => ({ ...d, companyName: c.company }))),
    [companies]
  );

  const filtered = useMemo(() => {
    let list = activeCompany === ''
      ? allDevelopments
      : allDevelopments.filter(d => d.companyName === activeCompany);
    if (activeType !== 'all') list = list.filter(d => d.type === activeType);
    return list;
  }, [allDevelopments, activeCompany, activeType]);

  const selectedCompany = companies.find(c => c.company === activeCompany) || null;

  const typeCounts = useMemo(() => {
    const base = activeCompany === '' ? allDevelopments : allDevelopments.filter(d => d.companyName === activeCompany);
    return {
      all: base.length,
      news: base.filter(d => d.type === 'news').length,
      pr: base.filter(d => d.type === 'pr').length,
      earnings: base.filter(d => d.type === 'earnings').length,
    };
  }, [allDevelopments, activeCompany]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--background)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,170,80,0.12)' }}>
            <Zap size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {activeCompany === '' ? 'Company Developments' : activeCompany}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: 'var(--accent)' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--accent)' }} />
              </span>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {fetchedAt
                  ? `Updated ${timeSince(fetchedAt)} · ${allDevelopments.length} developments across ${companies.length} companies`
                  : isLoading ? 'Fetching company developments…' : 'Top 20 grocery retailers'}
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
                <button key={t} onClick={() => setActiveType(t)}
                  className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all"
                  style={{ background: isActive ? 'var(--surface)' : 'transparent', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                  {t === 'all' ? `All (${count})` : `${TYPE_CONFIG[t].label} (${count})`}
                </button>
              );
            })}
          </div>

          <button onClick={refresh} disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
            style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)', opacity: isLoading ? 0.5 : 1 }}>
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Feed */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertCircle size={16} />
              <div><p className="text-[13px] font-semibold">Failed to load companies feed</p><p className="text-[12px] opacity-80">{error}</p></div>
            </div>
          )}
          {isLoading && companies.length === 0 && (
            <div className="grid grid-cols-1 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
          {!isLoading && !error && filtered.length === 0 && companies.length > 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <TrendingUp size={32} style={{ color: 'var(--text-secondary)', marginBottom: 12, opacity: 0.4 }} />
              <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No developments found</p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>Try a different filter or refresh</p>
            </div>
          )}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              {filtered.map(item => (
                <DevelopmentCard key={item.id} item={item} company={item.companyName} />
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <CompanyPanel
          companies={companies}
          activeCompany={activeCompany}
          onSelect={setActiveCompany}
          selectedCompany={selectedCompany}
        />
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { LibraryItem, LibraryItemStatus, ContentType } from '@/types';
import { Library, Search, Trash2, X, Clock, CheckCircle2, CalendarClock, ExternalLink } from 'lucide-react';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  blog:                 'Blog Post',
  'market-snapshot':    'Market Snapshot',
  'grocer-performance': 'Grocer Performance',
  newsletter:           'Newsletter',
  'social-linkedin':    'LinkedIn Post',
  'social-twitter':     'X Thread',
  email:                'Email',
  'video-script':       'Video Script',
  'email-sequence':     'Email Sequence',
};

const TYPE_COLORS: Record<string, string> = {
  blog:                 '#7c6ff7',
  'market-snapshot':    '#3b82f6',
  'grocer-performance': '#10b981',
  newsletter:           '#f59e0b',
  'social-linkedin':    '#0077b5',
  'social-twitter':     '#1da1f2',
  email:                '#ef4444',
  'video-script':       '#8b5cf6',
  'email-sequence':     '#ec4899',
};

const STATUS_CONFIG: Record<LibraryItemStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  saved:     { label: 'Saved',     color: '#6b7280', bg: 'rgba(107,114,128,0.1)',  icon: <Clock size={10} /> },
  scheduled: { label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: <CalendarClock size={10} /> },
  posted:    { label: 'Posted',    color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircle2 size={10} /> },
};

const TYPE_FILTER_ORDER: Array<ContentType | 'all'> = [
  'all', 'blog', 'market-snapshot', 'grocer-performance', 'video-script',
  'newsletter', 'email', 'email-sequence',
  'social-linkedin', 'social-twitter',
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function excerpt(text: string, max = 150) {
  const clean = text.replace(/#{1,6}\s/g, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function LibraryCard({
  item,
  onSelect,
  onRemove,
  onUpdateStatus,
}: {
  item: LibraryItem;
  onSelect: (item: LibraryItem) => void;
  onRemove: (id: string) => void;
  onUpdateStatus: (id: string, status: LibraryItemStatus) => void;
}) {
  const typeColor = TYPE_COLORS[item.contentType] || '#00AA50';
  const typeLabel = TYPE_LABELS[item.contentType] || item.contentType;
  const status = STATUS_CONFIG[item.status ?? 'saved'];

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 cursor-pointer group transition-all duration-150"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,170,80,0.25)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
      onClick={() => onSelect(item)}
    >
      {/* Top row: type badge + status badge + delete */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `${typeColor}18`, color: typeColor }}
          >
            {typeLabel}
          </span>
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: status.bg, color: status.color }}
          >
            {status.icon}
            {status.label}
          </span>
        </div>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg flex-shrink-0"
          style={{ color: 'var(--text-secondary)' }}
          onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Title + excerpt */}
      <div>
        <h3 className="text-[14px] font-semibold leading-snug mb-1.5 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
          {item.title}
        </h3>
        <p className="text-[12px] leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
          {excerpt(item.output)}
        </p>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>{timeAgo(item.createdAt)}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Schedule */}
            <button
              title="Schedule"
              onClick={e => { e.stopPropagation(); onUpdateStatus(item.id, 'scheduled'); }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: (item.status ?? 'saved') === 'scheduled' ? '#3b82f6' : 'var(--text-secondary)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3b82f6'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = (item.status ?? 'saved') === 'scheduled' ? '#3b82f6' : 'var(--text-secondary)'; }}
            >
              <CalendarClock size={12} />
            </button>
            {/* Mark as posted */}
            <button
              title="Mark as Posted"
              onClick={e => { e.stopPropagation(); onUpdateStatus(item.id, 'posted'); }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: (item.status ?? 'saved') === 'posted' ? '#10b981' : 'var(--text-secondary)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#10b981'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = (item.status ?? 'saved') === 'posted' ? '#10b981' : 'var(--text-secondary)'; }}
            >
              <CheckCircle2 size={12} />
            </button>
            {/* Webflow */}
            <button
              title="Move to Webflow"
              onClick={e => {
                e.stopPropagation();
                fetch('/api/publish/webflow', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title: item.title, body: item.output, pillar: '', blogType: item.contentType }),
                });
              }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6366f1'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            >
              <ExternalLink size={12} />
            </button>
            {/* Delete */}
            <button
              title="Delete"
              onClick={e => { e.stopPropagation(); onRemove(item.id); }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  item, onClose, onRemove, onUpdateStatus
}: {
  item: LibraryItem;
  onClose: () => void;
  onRemove: (id: string) => void;
  onUpdateStatus: (id: string, status: LibraryItemStatus) => void;
}) {
  const typeColor = TYPE_COLORS[item.contentType] || '#00AA50';
  const typeLabel = TYPE_LABELS[item.contentType] || item.contentType;
  const status = STATUS_CONFIG[item.status ?? 'saved'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: `${typeColor}18`, color: typeColor }}>
            {typeLabel}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: status.bg, color: status.color }}>
            {status.icon}{status.label}
          </span>
          <h2 className="text-[14px] font-semibold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
            {item.title}
          </h2>
          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{timeAgo(item.createdAt)}</span>
          <button
            onClick={() => { onRemove(item.id); onClose(); }}
            className="p-1.5 rounded-lg flex-shrink-0"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg flex-shrink-0"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <pre className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans" style={{ color: 'var(--text-primary)' }}>
            {item.output}
          </pre>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <button
            onClick={() => onUpdateStatus(item.id, 'scheduled')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: (item.status ?? 'saved') === 'scheduled' ? 'rgba(59,130,246,0.12)' : 'var(--background)', border: `1px solid ${(item.status ?? 'saved') === 'scheduled' ? '#3b82f6' : 'var(--border)'}`, color: (item.status ?? 'saved') === 'scheduled' ? '#3b82f6' : 'var(--text-secondary)' }}>
            <CalendarClock size={12} />Schedule
          </button>
          <button
            onClick={() => onUpdateStatus(item.id, 'posted')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: (item.status ?? 'saved') === 'posted' ? 'rgba(16,185,129,0.12)' : 'var(--background)', border: `1px solid ${(item.status ?? 'saved') === 'posted' ? '#10b981' : 'var(--border)'}`, color: (item.status ?? 'saved') === 'posted' ? '#10b981' : 'var(--text-secondary)' }}>
            <CheckCircle2 size={12} />Mark as Posted
          </button>
          <button
            onClick={() => {
              fetch('/api/publish/webflow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: item.title, body: item.output, pillar: '', blogType: item.contentType }),
              });
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6366f1'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}>
            <ExternalLink size={12} />Move to Webflow
          </button>
          <div className="flex-1" />
          <button
            onClick={() => { onRemove(item.id); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
            <Trash2 size={12} />Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface ContentLibraryProps {
  items: LibraryItem[];
  onRemove: (id: string) => void;
  onUpdateStatus: (id: string, status: LibraryItemStatus) => void;
}

export default function ContentLibrary({ items, onRemove, onUpdateStatus }: ContentLibraryProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<LibraryItemStatus | 'all'>('all');
  const [selected, setSelected] = useState<LibraryItem | null>(null);

  const presentTypes = useMemo(
    () => TYPE_FILTER_ORDER.filter(t => t === 'all' || items.some(i => i.contentType === t)),
    [items]
  );

  const filtered = useMemo(() => {
    let list = typeFilter === 'all' ? items : items.filter(i => i.contentType === typeFilter);
    if (statusFilter !== 'all') list = list.filter(i => (i.status ?? 'saved') === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(q) || i.output.toLowerCase().includes(q));
    }
    return list;
  }, [items, typeFilter, statusFilter, search]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--background)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-5 pb-3 flex-shrink-0">
        <Library size={20} style={{ color: 'var(--text-primary)' }} />
        <h1 className="text-[20px] font-bold" style={{ color: 'var(--text-primary)' }}>Library</h1>
        <span className="text-[12px] px-2 py-0.5 rounded-full ml-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          {items.length}
        </span>
      </div>

      {/* Filters */}
      <div className="px-6 pb-4 flex-shrink-0 space-y-2.5">
        {/* Search + status */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search by title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg text-[12px] outline-none w-[200px]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1.5">
            {(['all', 'saved', 'scheduled', 'posted'] as const).map(s => {
              const isActive = statusFilter === s;
              const cfg = s !== 'all' ? STATUS_CONFIG[s] : null;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                  style={{
                    background: isActive ? (cfg ? cfg.bg : 'var(--surface)') : 'transparent',
                    color: isActive ? (cfg ? cfg.color : 'var(--text-primary)') : 'var(--text-secondary)',
                    border: `1px solid ${isActive ? (cfg ? cfg.color + '40' : 'var(--border)') : 'var(--border)'}`,
                  }}
                >
                  {cfg && cfg.icon}
                  {s === 'all' ? 'All Status' : STATUS_CONFIG[s].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content type pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {presentTypes.map(type => {
            const isActive = typeFilter === type;
            const color = type === 'all' ? '#374151' : (TYPE_COLORS[type] || '#00AA50');
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                style={{
                  background: isActive ? (type === 'all' ? '#374151' : color) : 'transparent',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
                }}
              >
                {type !== 'all' && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: isActive ? 'rgba(255,255,255,0.7)' : color }} />
                )}
                {type === 'all' ? 'All Types' : TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Library size={24} style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
            </div>
            <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Library is empty</p>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Save content from any creator to store it here
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>No results match your filters</p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {filtered.map(item => (
              <LibraryCard key={item.id} item={item} onSelect={setSelected} onRemove={onRemove} onUpdateStatus={onUpdateStatus} />
            ))}
          </div>
        )}
      </div>

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onRemove={id => { onRemove(id); setSelected(null); }} onUpdateStatus={onUpdateStatus} />}
    </div>
  );
}

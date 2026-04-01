'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, ExternalLink, Newspaper, Trash2 } from 'lucide-react';
import { DailySummaryEntry } from '@/app/api/daily-summary/route';

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

function formatGeneratedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return ''; }
}

function SummaryCard({ entry, onDelete }: { entry: DailySummaryEntry; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer transition-colors"
        style={{ background: 'var(--surface)' }}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--sidebar-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'; }}
      >
        <div className="flex items-center gap-2.5">
          <Calendar size={13} style={{ color: 'var(--accent)' }} />
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{entry.dateLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {formatGeneratedAt(entry.generatedAt)}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { e.stopPropagation(); (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            title="Remove"
          >
            <Trash2 size={12} />
          </button>
          {open
            ? <ChevronUp size={14} style={{ color: 'var(--text-secondary)' }} />
            : <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />}
        </div>
      </div>

      {/* Expanded content */}
      {open && (
        <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--background)' }}>
          <div
            className="text-[13.5px] leading-relaxed"
            style={{ color: 'var(--text-primary)' }}
            dangerouslySetInnerHTML={{ __html: renderSummaryMarkdown(entry.summary) }}
          />

          {entry.sources && entry.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setSourcesOpen(o => !o)}
                className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
              >
                {sourcesOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Sources ({entry.sources.length})
              </button>
              {sourcesOpen && (
                <ul className="space-y-1.5">
                  {entry.sources.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ExternalLink size={11} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] leading-snug hover:underline"
                        style={{ color: 'var(--accent)' }}
                      >
                        {s.title || s.url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DailySummary() {
  const [entries, setEntries] = useState<DailySummaryEntry[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('gd_approved_summaries') || '[]');
      setEntries(stored);
    } catch {}
  }, []);

  const handleDelete = (date: string) => {
    const updated = entries.filter(e => e.date !== date);
    setEntries(updated);
    try { localStorage.setItem('gd_approved_summaries', JSON.stringify(updated)); } catch {}
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,170,80,0.12)' }}>
            <Newspaper size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Summary</h1>
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {entries.length > 0 ? `${entries.length} approved ${entries.length === 1 ? 'summary' : 'summaries'}` : 'Approved and scheduled summaries'}
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-5 max-w-3xl">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Newspaper size={32} style={{ color: 'var(--text-secondary)', marginBottom: 12, opacity: 0.3 }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No summaries yet</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              Go to Intelligence, click &ldquo;Daily Summary&rdquo;, then Post or Schedule to save here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <SummaryCard key={entry.date} entry={entry} onDelete={() => handleDelete(entry.date)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

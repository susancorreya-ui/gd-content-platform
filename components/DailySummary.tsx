'use client';

import { useState } from 'react';
import { RefreshCw, Calendar, ChevronDown, ChevronUp, AlertCircle, Newspaper } from 'lucide-react';
import { useDailySummary } from '@/lib/useDailySummary';
import { DailySummaryEntry } from '@/app/api/daily-summary/route';

function renderSummaryMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 style="font-size:13px;font-weight:700;margin:16px 0 6px;color:var(--text-primary)">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:14px;font-weight:700;margin:20px 0 8px;color:var(--text-primary)">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:16px;font-weight:700;margin:0 0 12px;color:var(--text-primary)">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\- (.+)$/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul style="margin:8px 0;padding-left:16px;list-style:disc">${match}</ul>`)
    .replace(/\n\n/g, '</p><p style="margin:10px 0">')
    .replace(/^(?!<[hul])(.+)$/gm, '<p style="margin:8px 0">$1</p>')
    .replace(/<p[^>]*><\/p>/g, '');
}

function formatGeneratedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return ''; }
}

function ArchiveCard({ entry }: { entry: DailySummaryEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ background: 'var(--surface)', color: 'var(--text-primary)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--sidebar-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; }}
      >
        <div className="flex items-center gap-2.5">
          <Calendar size={13} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-[13px] font-medium">{entry.dateLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Generated {formatGeneratedAt(entry.generatedAt)}
          </span>
          {open ? <ChevronUp size={14} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />}
        </div>
      </button>
      {open && (
        <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--background)' }}>
          <div
            className="text-[13px] leading-relaxed"
            style={{ color: 'var(--text-primary)' }}
            dangerouslySetInnerHTML={{ __html: renderSummaryMarkdown(entry.summary) }}
          />
        </div>
      )}
    </div>
  );
}

export default function DailySummary() {
  const { today, archive, isGenerating, error, regenerate } = useDailySummary();

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,170,80,0.12)' }}>
            <Newspaper size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Summary</h1>
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {today
                ? `${today.dateLabel} · Generated at ${formatGeneratedAt(today.generatedAt)}`
                : isGenerating ? 'Generating today\'s brief…' : 'Grocery tech intelligence, every day'}
            </p>
          </div>
        </div>
        <button
          onClick={regenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
          style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)', opacity: isGenerating ? 0.5 : 1 }}
        >
          <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
          Regenerate
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 max-w-3xl">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
            <AlertCircle size={16} />
            <div>
              <p className="text-[13px] font-semibold">Failed to generate summary</p>
              <p className="text-[12px] opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* Generating state */}
        {isGenerating && !today && (
          <div className="rounded-xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Generating today's intelligence brief…
              </span>
            </div>
            <div className="space-y-2 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-3 rounded" style={{ background: 'var(--border)', width: `${70 + Math.random() * 30}%` }} />
              ))}
            </div>
          </div>
        )}

        {/* Today's summary */}
        {today && (
          <div className="rounded-xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                Today — {today.dateLabel}
              </span>
            </div>
            <div
              className="text-[13.5px] leading-relaxed"
              style={{ color: 'var(--text-primary)' }}
              dangerouslySetInnerHTML={{ __html: renderSummaryMarkdown(today.summary) }}
            />
          </div>
        )}

        {/* Archive */}
        {archive.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              Previous Editions
            </p>
            <div className="space-y-2">
              {archive.map(entry => (
                <ArchiveCard key={entry.date} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {!isGenerating && !today && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Newspaper size={32} style={{ color: 'var(--text-secondary)', marginBottom: 12, opacity: 0.4 }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>No summary yet</p>
            <button onClick={regenerate} className="mt-3 text-[12px]" style={{ color: 'var(--accent)' }}>Generate now</button>
          </div>
        )}
      </div>
    </div>
  );
}

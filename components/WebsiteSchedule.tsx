'use client';

import { Calendar, BookOpen, TrendingUp, Clock } from 'lucide-react';

const CONTENT_TYPES = [
  { label: 'Blog Post', icon: <BookOpen size={13} />, color: '#00AA50' },
  { label: 'Grocer Performance', icon: <TrendingUp size={13} />, color: '#3B82F6' },
];

export default function WebsiteSchedule() {
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,170,80,0.12)' }}>
            <Calendar size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Website Schedule</h1>
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              Manage and schedule content for publishing to the website
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,170,80,0.1)' }}>
            <Calendar size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-[17px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Website Publishing Calendar
          </h2>
          <p className="text-[13px] leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
            Schedule and track content going live on the website. Assign publish dates to your blogs, grocer performance reports, and other content — all in one calendar view.
          </p>

          {/* Content types this calendar will cover */}
          <div className="rounded-xl p-4 mb-6 text-left space-y-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              Content tracked in this calendar
            </p>
            {CONTENT_TYPES.map(ct => (
              <div key={ct.label} className="flex items-center gap-2.5">
                <span style={{ color: ct.color }}>{ct.icon}</span>
                <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{ct.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            <Clock size={13} />
            <span>Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}

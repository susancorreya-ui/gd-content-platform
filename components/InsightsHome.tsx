'use client';

import { BarChart2, TrendingUp, Newspaper, BookOpen, Linkedin, Twitter, Mail, Video, MailCheck } from 'lucide-react';

const CONTENT_TYPES = [
  { id: 'blog', label: 'Blog Post', icon: BookOpen, color: '#7c6ff7', desc: 'Listicle, analyst take, how-to' },
  { id: 'market-snapshot', label: 'Market Snapshot', icon: BarChart2, color: '#3b82f6', desc: 'Weekly data digest' },
  { id: 'grocer-performance', label: 'Grocer Performance', icon: TrendingUp, color: '#10b981', desc: 'Retailer scorecards' },
  { id: 'newsletter', label: 'Newsletter', icon: Newspaper, color: '#f59e0b', desc: 'Weekly roundup, 3–6 stories' },
  { id: 'social-linkedin', label: 'LinkedIn Post', icon: Linkedin, color: '#0077b5', desc: 'Professional insights' },
  { id: 'social-twitter', label: 'X Thread', icon: Twitter, color: '#1da1f2', desc: 'Data-led threads' },
  { id: 'email', label: 'Email', icon: Mail, color: '#ef4444', desc: 'Report follow-up, event invite, sales' },
  { id: 'email-sequence', label: 'Email Sequence', icon: MailCheck, color: '#ec4899', desc: '4–6 email nurture flow' },
  { id: 'video-script', label: 'Video Script', icon: Video, color: '#8b5cf6', desc: '60–90 second scripts' },
];

const RECENT_STATS = [
  { label: 'Content types', value: '8' },
  { label: 'Formats supported', value: '5' },
  { label: 'Avg. generation', value: '<30s' },
];

interface InsightsHomeProps {
  onNavigate: (id: string) => void;
}

export default function InsightsHome({ onNavigate }: InsightsHomeProps) {
  return (
    <div className="flex-1 overflow-y-auto p-8" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="mb-8">
        <div
          className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3"
          style={{ background: '#f0eeff', color: 'var(--accent)' }}
        >
          Content Engine
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          What will you create today?
        </h1>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          AI-powered content generation for the grocery industry. Ground every piece in real research.
        </p>
      </div>

      {/* Stats bar */}
      <div
        className="flex items-center gap-8 px-6 py-4 rounded-xl mb-8"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {RECENT_STATS.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3">
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{stat.label}</div>
          </div>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => onNavigate('upload')}
            className="text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            Upload Research →
          </button>
        </div>
      </div>

      {/* Content type grid */}
      <div className="grid grid-cols-3 gap-4">
        {CONTENT_TYPES.map(({ id, label, icon: Icon, color, desc }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className="p-5 rounded-xl text-left transition-all hover:shadow-md group"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = color;
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `${color}18` }}
            >
              <Icon size={16} style={{ color }} />
            </div>
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              {label}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {desc}
            </div>
          </button>
        ))}
      </div>

      {/* How it works */}
      <div className="mt-10">
        <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
          How it works
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { step: '01', title: 'Upload research', desc: 'Upload a PDF, survey, PPTX or spreadsheet. The AI extracts and structures key insights.' },
            { step: '02', title: 'Choose content type', desc: 'Select from 8 content formats. Fill in the topic fields to guide the output.' },
            { step: '03', title: 'Generate & export', desc: 'AI writes content grounded in your research. Copy or download for publishing.' },
          ].map(({ step, title, desc }) => (
            <div
              key={step}
              className="p-5 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="text-xs font-bold mb-2" style={{ color: 'var(--accent)' }}>{step}</div>
              <div className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{title}</div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

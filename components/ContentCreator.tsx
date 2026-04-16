'use client';

import { useState } from 'react';
import { ContentType, ResearchDoc, BlogType, EmailSubtype, LibraryItem } from '@/types';
import OutputPanel from './OutputPanel';
import BlogPipeline from './BlogPipeline';
import GrocerPerformancePipeline from './GrocerPerformancePipeline';
import MarketSnapshotPipeline from './MarketSnapshotPipeline';
import VideoScriptPipeline from './VideoScriptPipeline';
import NewsletterPipeline from './NewsletterPipeline';
import NurtureEmailsPipeline from './NurtureEmailsPipeline';
import { Sparkles, ChevronDown, X, Link, Loader2, BookOpen } from 'lucide-react';

// ─── Blog type options ───────────────────────────────────────────────────────

const BLOG_TYPES: { id: BlogType; label: string; desc: string }[] = [
  { id: 'standard', label: 'Standard Article', desc: 'Analytical, argument-led — 1,000–3,000 words' },
  { id: 'listicle', label: 'Listicle', desc: 'Scannable list format — 800–1,500 words' },
  { id: 'pillar-post', label: 'Pillar Post', desc: 'Definitive reference piece — 2,500–5,000 words' },
  { id: 'thought-leadership', label: 'Thought Leadership', desc: 'Named author, clear position — 800–1,800 words' },
];

const CONTENT_PILLARS = [
  'Artificial Intelligence',
  'Automation',
  'Digital Commerce',
  'Personalization',
  'Retail Media',
  'Supply Chain',
];

const EMAIL_SUBTYPES: { id: EmailSubtype; label: string; desc: string }[] = [
  { id: 'report-followup', label: 'Report Follow-Up', desc: 'After a content download' },
  { id: 'event-invite', label: 'Event / Webinar Invite', desc: 'Drive registrations' },
  { id: 'newsletter-subscribe', label: 'Newsletter Subscribe', desc: 'Grow your subscriber list' },
  { id: 'sales-outreach', label: 'Sales Outreach', desc: 'Get in touch / book a call' },
];

// ─── Field config per content type ───────────────────────────────────────────

type FieldConfig = { id: string; label: string; placeholder: string; rows?: number };

const CONTENT_CONFIG: Record<
  ContentType,
  { label: string; subtitle: string; fields: FieldConfig[] }
> = {
  blog: {
    label: 'Article',
    subtitle: 'Long-form editorial for the Grocery Doppio website',
    fields: [
      { id: 'topic', label: 'Topic / Working title', placeholder: 'e.g. How private label is reshaping grocery margins in 2025' },
      { id: 'centralIdea', label: 'Central idea / Thesis', placeholder: 'e.g. Private label growth is hitting a ceiling — grocers are over-indexing on price and underinvesting in quality signals' },
      { id: 'marketSignals', label: 'Market signals (2–3 minimum)', placeholder: 'e.g.\n- Kroger private label hit 28% share in Q4 (earnings call, Feb 2025)\n- Aldi reported 14% basket growth YoY\n- NielsenIQ: store brand repeat purchase rate down 3pts', rows: 5 },
      { id: 'primaryKeyword', label: 'Primary SEO keyword', placeholder: 'e.g. private label grocery 2025' },
      { id: 'secondaryKeywords', label: 'Secondary keywords (optional)', placeholder: 'e.g. store brand market share, private label strategy' },
    ],
  },
  'market-snapshot': {
    label: 'Market Snapshot',
    subtitle: 'Data-led weekly briefing on the state of grocery',
    fields: [
      { id: 'period', label: 'Time period', placeholder: 'e.g. Week of Feb 17, 2025 / Q1 2025' },
      { id: 'focus', label: 'Focus area', placeholder: 'e.g. Produce, Fresh Meat, Center Store, Omnichannel' },
      { id: 'context', label: 'Key events or signals (optional)', placeholder: 'e.g. Post-Super Bowl week, price war in dairy aisle', rows: 3 },
    ],
  },
  'grocer-performance': {
    label: 'Grocer Performance',
    subtitle: 'Retailer scorecard with KPIs and analyst commentary',
    fields: [
      { id: 'retailer', label: 'Retailer name', placeholder: 'e.g. Kroger, Albertsons, Walmart Grocery, Target' },
      { id: 'period', label: 'Reporting period', placeholder: 'e.g. Q4 2024, FY 2024, Week ending Feb 14' },
      { id: 'focus', label: 'Specific focus (optional)', placeholder: 'e.g. Digital performance, fresh food, loyalty program' },
    ],
  },
  newsletter: {
    label: 'Newsletter',
    subtitle: 'Weekly roundup — scannable, under 3 minutes',
    fields: [
      { id: 'week', label: 'Week of', placeholder: 'e.g. February 17, 2025' },
      { id: 'stat', label: 'Headline stat (optional)', placeholder: 'e.g. Grocery inflation hit 1.2% — lowest in 3 years' },
    ],
  },
  'social-linkedin': {
    label: 'LinkedIn Post',
    subtitle: 'Insight-led post for the Grocery Doppio LinkedIn',
    fields: [
      { id: 'insight', label: 'Core insight or data point', placeholder: 'e.g. Only 1 in 4 grocery shoppers feel loyal to any single banner' },
      { id: 'angle', label: 'Your take (optional)', placeholder: "e.g. Loyalty is dead. Here's what actually drives repeat visits." },
    ],
  },
  'social-twitter': {
    label: 'X / Twitter Thread',
    subtitle: 'Data-led thread for X / Twitter',
    fields: [
      { id: 'topic', label: 'Thread topic', placeholder: 'e.g. Why Aldi is winning while everyone else is stuck' },
      { id: 'hook', label: 'Hook stat or fact (optional)', placeholder: "e.g. Aldi's basket size grew 14% YoY while category average was flat" },
    ],
  },
  email: {
    label: 'Email',
    subtitle: 'Single email — report follow-up, event invite, subscribe, or sales',
    fields: [
      { id: 'audience', label: 'Audience', placeholder: 'e.g. Category managers at top 50 grocers / CPG brand managers' },
      { id: 'context', label: 'Specific context (optional)', placeholder: 'e.g. They downloaded the State of Grocery 2025 report last week', rows: 2 },
      { id: 'offer', label: 'Offer / CTA', placeholder: 'e.g. Book a 20-min demo / Register for webinar / Download report' },
    ],
  },
  'video-script': {
    label: 'Video Script',
    subtitle: '60–90 second script with [HOOK]/[BODY]/[CTA] structure',
    fields: [
      { id: 'topic', label: 'Video topic', placeholder: 'e.g. 3 things driving grocery inflation in 2025' },
      { id: 'format', label: 'Format', placeholder: 'e.g. LinkedIn video, YouTube Short, Webinar intro' },
      { id: 'cta', label: 'Call to action', placeholder: 'e.g. Visit grocerydoppio.com / Subscribe to newsletter' },
    ],
  },
  'email-sequence': {
    label: 'Email Sequence',
    subtitle: 'Lead nurture or event nurture — tailored to entry point and audience',
    fields: [],
  },
  'daily-summary': {
    label: 'Daily Summary',
    subtitle: 'Daily briefing on grocery industry news',
    fields: [
      { id: 'date', label: 'Date', placeholder: 'e.g. February 17, 2025' },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveTitle(fields: Record<string, string>, contentType: ContentType): string {
  const candidates = [fields.topic, fields.retailer, fields.insight, fields.goal, fields.week, fields.period];
  for (const c of candidates) {
    if (c && c.trim()) return c.trim().slice(0, 80);
  }
  return CONTENT_CONFIG[contentType].label;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ContentCreatorProps {
  contentType: ContentType;
  researchDocs: ResearchDoc[];
  onSaveToLibrary: (item: Omit<LibraryItem, 'id' | 'createdAt'>) => void;
  initialTopic?: string;
  initialPillar?: string;
}

export default function ContentCreator({ contentType, researchDocs, onSaveToLibrary, initialTopic, initialPillar }: ContentCreatorProps) {
  const config = CONTENT_CONFIG[contentType];

  // All hooks must be declared before any conditional returns
  const [fields, setFields] = useState<Record<string, string>>({});
  const [blogType, setBlogType] = useState<BlogType>('standard');
  const [contentPillar, setContentPillar] = useState('');
  const [namedAuthor, setNamedAuthor] = useState('');
  const [emailSubtype, setEmailSubtype] = useState<EmailSubtype>('report-followup');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [newsUrl, setNewsUrl] = useState('');
  const [newsArticleText, setNewsArticleText] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [recentStories, setRecentStories] = useState('');
  const [storyCount, setStoryCount] = useState(4);
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Blog always uses the full pipeline
  if (contentType === 'blog') {
    return (
      <BlogPipeline
        researchDocs={researchDocs}
        onSaveToLibrary={onSaveToLibrary}
        initialTopic={initialTopic}
        initialPillar={initialPillar}
        autoStart={!!initialTopic}
      />
    );
  }

  // Grocer Performance uses its own dedicated pipeline
  if (contentType === 'grocer-performance') {
    return <GrocerPerformancePipeline onSaveToLibrary={onSaveToLibrary} />;
  }

  // Market Snapshot uses its own dedicated pipeline
  if (contentType === 'market-snapshot') {
    return <MarketSnapshotPipeline onSaveToLibrary={onSaveToLibrary} />;
  }

  // Video Script uses its own dedicated pipeline
  if (contentType === 'video-script') {
    return <VideoScriptPipeline onSaveToLibrary={onSaveToLibrary} researchDocs={researchDocs} />;
  }

  // Newsletter uses its own dedicated pipeline
  if (contentType === 'newsletter') {
    return <NewsletterPipeline onSaveToLibrary={onSaveToLibrary} researchDocs={researchDocs} />;
  }

  // Event nurture sequence
  if (contentType === 'email-sequence') {
    return <NurtureEmailsPipeline onSaveToLibrary={onSaveToLibrary} researchDocs={researchDocs} />;
  }

  const selectedDoc = researchDocs.find((d) => d.id === selectedDocId);

  const handleFetchUrl = async () => {
    if (!newsUrl.trim()) return;
    setFetchingUrl(true);
    setUrlError('');
    setNewsArticleText('');
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newsUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewsArticleText(data.text);
    } catch (err: unknown) {
      setUrlError(err instanceof Error ? err.message : 'Could not fetch article');
    } finally {
      setFetchingUrl(false);
    }
  };

  const buildPrompt = () => {
    const parts: string[] = [];

    config.fields.forEach((f) => {
      if (fields[f.id]) parts.push(`${f.label}: ${fields[f.id]}`);
    });

    return parts.length > 0 ? parts.join('\n') : `Create a ${config.label} for Grocery Doppio.`;
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          prompt: buildPrompt(),
          researchContext: selectedDoc?.insights,
          newsArticleText: newsArticleText || undefined,
          blogType: undefined,
          emailSubtype: contentType === 'email' ? emailSubtype : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOutput(data.output);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!output) return;
    onSaveToLibrary({
      contentType,
      title: deriveTitle(fields, contentType),
      output,
      metadata: {
        ...(contentType === 'email' ? { emailSubtype } : {}),
        ...(fields.week ? { week: fields.week } : {}),
        ...(fields.retailer ? { retailer: fields.retailer } : {}),
      },
      status: 'saved',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      <div className="flex flex-1 overflow-hidden">
      {/* ── Left: Input panel ── */}
      <div
        className="w-[380px] flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="p-6 flex-1 space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              {config.label}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{config.subtitle}</p>
          </div>

          {/* Email subtype selector */}
          {contentType === 'email' && (
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Email type
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {EMAIL_SUBTYPES.map((et) => (
                  <button
                    key={et.id}
                    onClick={() => setEmailSubtype(et.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all"
                    style={{
                      background: emailSubtype === et.id ? '#f0eeff' : 'var(--background)',
                      border: `1px solid ${emailSubtype === et.id ? 'var(--accent)' : 'var(--border)'}`,
                      color: emailSubtype === et.id ? 'var(--accent)' : 'var(--text-primary)',
                    }}
                  >
                    <span className="font-medium">{et.label}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>— {et.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Standard fields */}
          {config.fields.map((field) => (
            <div key={field.id}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                {field.label}
              </label>
              <textarea
                rows={field.rows ?? 2}
                className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder={field.placeholder}
                value={fields[field.id] || ''}
                onChange={(e) => setFields({ ...fields, [field.id]: e.target.value })}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          ))}


          {false && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                News article URL (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  className="flex-1 text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="https://..."
                  value={newsUrl}
                  onChange={(e) => { setNewsUrl(e.target.value); setNewsArticleText(''); setUrlError(''); }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
                <button
                  onClick={handleFetchUrl}
                  disabled={!newsUrl.trim() || fetchingUrl}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                  style={{
                    background: newsArticleText ? '#e8fdf0' : '#f0eeff',
                    color: newsArticleText ? '#22c55e' : 'var(--accent)',
                    opacity: !newsUrl.trim() ? 0.5 : 1,
                  }}
                >
                  {fetchingUrl ? <Loader2 size={12} className="spinner" /> : <Link size={12} />}
                  {newsArticleText ? 'Loaded' : 'Fetch'}
                </button>
              </div>
              {urlError && <div className="mt-1 text-xs" style={{ color: '#c0392b' }}>{urlError}</div>}
              {newsArticleText && (
                <div className="mt-1.5 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-2" style={{ background: '#e8fdf0', color: '#16a34a' }}>
                  ✓ Article content loaded — will be embedded in the blog
                  <button onClick={() => { setNewsArticleText(''); setNewsUrl(''); }} className="ml-auto">
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Research doc selector */}
          {researchDocs.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Ground in research
              </div>
              <div className="relative">
                <select
                  className="w-full text-sm rounded-lg px-3 py-2.5 pr-8 appearance-none outline-none cursor-pointer"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: selectedDocId ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                >
                  <option value="">No research document</option>
                  {researchDocs.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
              </div>
              {selectedDoc && (
                <div className="mt-2 text-xs px-3 py-2 rounded-lg flex items-start gap-2" style={{ background: '#f0eeff', color: 'var(--accent)' }}>
                  <span className="mt-0.5">✓</span>
                  <span>Grounded in &ldquo;{selectedDoc.name}&rdquo;</span>
                  <button onClick={() => setSelectedDocId('')} className="ml-auto flex-shrink-0"><X size={12} /></button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-xs px-3 py-2.5 rounded-lg" style={{ background: '#fff0f0', color: '#c0392b' }}>
              {error}
            </div>
          )}
        </div>

        {/* Generate button */}
        <div className="p-5 border-t flex-shrink-0 space-y-2" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: isLoading ? 'var(--text-secondary)' : 'var(--accent)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <><div className="w-4 h-4 rounded-full border-2 border-t-transparent spinner" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} />Generating...</>
            ) : (
              <><Sparkles size={15} />Generate {config.label}</>
            )}
          </button>
          {output && (
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
              style={{
                background: saved ? '#e8fdf0' : 'var(--background)',
                border: `1px solid ${saved ? '#22c55e' : 'var(--border)'}`,
                color: saved ? '#16a34a' : 'var(--text-secondary)',
              }}
            >
              <BookOpen size={13} />
              {saved ? 'Saved to Library ✓' : 'Save to Library'}
            </button>
          )}
        </div>
      </div>

      {/* ── Right: Output panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>
        <OutputPanel
          content={output}
          isLoading={isLoading}
          contentType={contentType}
          onRegenerate={output ? handleGenerate : undefined}
        />
      </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  Sparkles, BookOpen, CheckCircle, Circle, ChevronDown, ChevronUp,
  ExternalLink, AlertCircle, Trash2, CalendarClock, Send, RefreshCw,
} from 'lucide-react';
import { LibraryItem } from '@/types';
import OutputPanel from './OutputPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GrowerSource {
  index: number;
  title: string;
  url: string;
  description: string;
  sourceDomain: string;
  sourceType: string;
  publishedAt: string;
  isUserProvided?: boolean;
}

interface ExtractedInsights {
  headline: string;
  sections: {
    financials: string[];
    digitalCommerce: string[];
    fulfilment: string[];
    loyalty: string[];
    retailMedia: string[];
    aiTechnology: string[];
    outlook: string[];
  };
  notFound: string[];
}

type Stage = 'idle' | 'researching' | 'checkpoint' | 'writing' | 'done';

// ─── Constants ────────────────────────────────────────────────────────────────

const RETAILERS = [
  'Ahold Delhaize', 'Albertsons', 'Aldi', 'Amazon Fresh', "BJ's Wholesale",
  'Costco', 'CVS Pharmacy', 'Dollar General', 'Food Lion', 'Giant Eagle',
  'Grocery Outlet', 'H-E-B', 'Hannaford', 'Hy-Vee', 'Instacart',
  'Kroger', 'Meijer', 'Publix', 'Safeway', "Sam's Club",
  'Stop & Shop', 'Target', "Trader Joe's", 'Walmart', 'Weis Markets',
  'Whole Foods', 'Winn-Dixie',
];

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'FY'];
const YEARS = ['2022', '2023', '2024', '2025', '2026'];

const GD_BENCHMARKS = [
  { stat: '69%', label: 'of grocery purchases are digitally influenced', color: '#6366f1' },
  { stat: '$126B', label: 'digital grocery sales — 13.4% of total', color: '#3b82f6' },
  { stat: '$8.5B', label: 'US grocery retail media market, ↑31% YoY', color: '#8b5cf6' },
  { stat: '86%', label: 'C-suite execs prioritising AI for efficiency', color: '#f59e0b' },
  { stat: '83%', label: 'shoppers enrolled in a loyalty programme', color: '#10b981' },
  { stat: '92%', label: 'shoppers say grocery lacks personalisation', color: '#ec4899' },
];

const PIPELINE_STEPS = [
  { id: 'research', label: 'Research earnings & performance', stages: ['researching'] },
  { id: 'checkpoint', label: 'Review extracted data', stages: ['checkpoint'] },
  { id: 'write', label: 'Write article in GD format', stages: ['writing'] },
  { id: 'done', label: 'Quality review & export', stages: ['done'] },
];

const SECTION_META: { key: keyof ExtractedInsights['sections']; label: string; color: string }[] = [
  { key: 'financials', label: 'Financials', color: '#6366f1' },
  { key: 'digitalCommerce', label: 'Digital Commerce', color: '#3b82f6' },
  { key: 'fulfilment', label: 'Fulfilment & Delivery', color: '#10b981' },
  { key: 'loyalty', label: 'Loyalty Programme', color: '#f59e0b' },
  { key: 'retailMedia', label: 'Retail Media', color: '#8b5cf6' },
  { key: 'aiTechnology', label: 'AI & Technology', color: '#ec4899' },
  { key: 'outlook', label: 'Future Outlook', color: '#64748b' },
];

const SOURCE_TYPE_COLORS: Record<string, string> = {
  'Press release': '#6366f1',
  'Investor relations': '#3b82f6',
  'Financial news': '#10b981',
  'Trade publication': '#f59e0b',
  'Business news': '#8b5cf6',
  'User-provided': '#ec4899',
  'Industry source': '#64748b',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ stage }: { stage: Stage }) {
  const stageIndex = PIPELINE_STEPS.findIndex(s => s.stages.includes(stage));

  return (
    <div className="space-y-2 mt-2">
      {PIPELINE_STEPS.map((step, i) => {
        const isDone = stage === 'done' || i < stageIndex;
        const isCurrent = step.stages.includes(stage);

        return (
          <div key={step.id} className="flex items-center gap-2.5">
            <div className="flex-shrink-0">
              {isDone ? (
                <CheckCircle size={14} style={{ color: '#10b981' }} />
              ) : isCurrent ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              ) : (
                <Circle size={14} style={{ color: 'var(--text-secondary)' }} />
              )}
            </div>
            <span className="text-xs" style={{
              color: isDone ? '#10b981' : isCurrent ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: isCurrent ? 600 : 400,
            }}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SourceCard({ source }: { source: GrowerSource }) {
  const typeColor = SOURCE_TYPE_COLORS[source.sourceType] || '#64748b';
  return (
    <div className="rounded-lg p-3 space-y-1.5" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-snug flex-1" style={{ color: 'var(--text-primary)' }}>
          {source.title}
        </p>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          <ExternalLink size={11} />
        </a>
      </div>
      {source.description && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {source.description.slice(0, 180)}{source.description.length > 180 ? '…' : ''}
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: `${typeColor}15`, color: typeColor }}>
          {source.sourceType}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{source.sourceDomain}</span>
        {source.publishedAt && (
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            · {new Date(source.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface GrocerPerformancePipelineProps {
  onSaveToLibrary: (item: Omit<LibraryItem, 'id' | 'createdAt'>) => void;
}

export default function GrocerPerformancePipeline({ onSaveToLibrary }: GrocerPerformancePipelineProps) {
  // Inputs
  const [retailer, setRetailer] = useState('');
  const [quarter, setQuarter] = useState('Q4');
  const [year, setYear] = useState('2024');
  const [knownData, setKnownData] = useState('');
  const [supportingLinks, setSupportingLinks] = useState('');

  // Pipeline state
  const [stage, setStage] = useState<Stage>('idle');
  const [sources, setSources] = useState<GrowerSource[]>([]);
  const [insights, setInsights] = useState<ExtractedInsights | null>(null);
  const [contextSnippet, setContextSnippet] = useState('');
  const [researchSummary, setResearchSummary] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  // UI state
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [benchmarksOpen, setBenchmarksOpen] = useState(true);
  const [saved, setSaved] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [webflowDone, setWebflowDone] = useState(false);
  const [webflowLoading, setWebflowLoading] = useState(false);

  const periodLabel = `${quarter} ${year}`;

  // ── Stage 1: Research ──────────────────────────────────────────────────────

  const handleResearch = async () => {
    if (!retailer.trim()) return;
    setStage('researching');
    setError('');
    setSources([]);
    setInsights(null);
    setOutput('');

    try {
      const res = await fetch('/api/pipeline/grocer-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retailer, quarter, year, knownData, supportingLinks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSources(data.sources || []);
      setInsights(data.insights || null);
      setContextSnippet(data.contextSnippet || '');
      setResearchSummary(data.summary || '');
      setStage('checkpoint');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed');
      setStage('idle');
    }
  };

  // ── Stage 2: Write ─────────────────────────────────────────────────────────

  const handleWrite = async () => {
    setStage('writing');
    setError('');

    try {
      const res = await fetch('/api/pipeline/grocer-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retailer, quarter, year, knownData, contextSnippet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setOutput(data.output || '');
      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Article generation failed');
      setStage('checkpoint');
    }
  };

  // ── Done actions ───────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!output) return;
    onSaveToLibrary({
      contentType: 'grocer-performance',
      title: `${retailer} ${periodLabel} Performance`,
      output,
      metadata: { retailer, period: periodLabel },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSchedule = () => {
    setScheduled(true);
    setTimeout(() => setScheduled(false), 3000);
  };

  const handleWebflow = async () => {
    if (!output) return;
    setWebflowLoading(true);
    try {
      const res = await fetch('/api/publish/webflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `${retailer} ${periodLabel} Performance`, body: output, contentType: 'grocer-performance' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);
      setWebflowDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Webflow publish failed');
    } finally {
      setWebflowLoading(false);
    }
  };

  const handleReset = () => {
    setStage('idle');
    setSources([]);
    setInsights(null);
    setContextSnippet('');
    setResearchSummary('');
    setOutput('');
    setError('');
    setSaved(false);
    setScheduled(false);
    setWebflowDone(false);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left panel ── */}
      <div
        className="w-[380px] flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="p-6 flex-1 space-y-5">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              Grocer Performance
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Earnings-led digital &amp; technology article in Grocery Doppio format
            </p>
          </div>

          {/* Retailer */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Retailer <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <input
              list="retailer-list"
              type="text"
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
              style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="e.g. Kroger, Walmart, Albertsons…"
              value={retailer}
              onChange={e => setRetailer(e.target.value)}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              disabled={stage !== 'idle'}
            />
            <datalist id="retailer-list">
              {RETAILERS.map(r => <option key={r} value={r} />)}
            </datalist>
          </div>

          {/* Reporting period */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Reporting period <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {QUARTERS.map(q => (
                <button
                  key={q}
                  onClick={() => setQuarter(q)}
                  disabled={stage !== 'idle'}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: quarter === q ? 'var(--accent)' : 'var(--background)',
                    border: `1px solid ${quarter === q ? 'var(--accent)' : 'var(--border)'}`,
                    color: quarter === q ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {YEARS.map(y => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  disabled={stage !== 'idle'}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: year === y ? 'var(--accent)' : 'var(--background)',
                    border: `1px solid ${year === y ? 'var(--accent)' : 'var(--border)'}`,
                    color: year === y ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Analyst notes */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Analyst notes (optional)
            </label>
            <textarea
              rows={3}
              className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
              style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="e.g. Comp sales +2.8%, digital +18%, loyalty members 62M, guidance raised…"
              value={knownData}
              onChange={e => setKnownData(e.target.value)}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              disabled={stage !== 'idle'}
            />
          </div>

          {/* Supporting links */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Supporting links (optional)
            </label>
            <textarea
              rows={3}
              className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
              style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder={`Paste URLs one per line:\nhttps://investors.kroger.com/...\nhttps://grocerydive.com/...`}
              value={supportingLinks}
              onChange={e => setSupportingLinks(e.target.value)}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              disabled={stage !== 'idle'}
            />
          </div>

          {/* Pipeline steps */}
          {stage !== 'idle' && (
            <div className="rounded-xl p-4" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
                Pipeline
              </p>
              <StepIndicator stage={stage} />
            </div>
          )}

          {/* Sources accordion — visible after research */}
          {stage !== 'idle' && stage !== 'researching' && sources.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <button
                onClick={() => setSourcesOpen(!sourcesOpen)}
                className="w-full flex items-center justify-between px-4 py-3"
                style={{ background: 'var(--background)' }}
              >
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Sources ({sources.length})
                </span>
                {sourcesOpen
                  ? <ChevronUp size={13} style={{ color: 'var(--text-secondary)' }} />
                  : <ChevronDown size={13} style={{ color: 'var(--text-secondary)' }} />}
              </button>
              {sourcesOpen && (
                <div className="px-3 pb-3 space-y-2" style={{ background: 'var(--surface)' }}>
                  {sources.map(s => <SourceCard key={s.index} source={s} />)}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg" style={{ background: '#fff0f0', color: '#c0392b' }}>
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* CTA buttons */}
        <div className="p-5 border-t flex-shrink-0 space-y-2" style={{ borderColor: 'var(--border)' }}>
          {stage === 'idle' && (
            <button
              onClick={handleResearch}
              disabled={!retailer.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: retailer.trim() ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: retailer.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <Sparkles size={15} />
              Research {retailer.trim() ? `${retailer} ${periodLabel}` : 'Retailer'}
            </button>
          )}

          {stage === 'checkpoint' && (
            <>
              <button
                onClick={handleWrite}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'var(--accent)' }}
              >
                <Sparkles size={15} />
                Write Article
              </button>
              <button
                onClick={handleResearch}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                <RefreshCw size={13} />
                Re-research
              </button>
            </>
          )}

          {(stage === 'researching' || stage === 'writing') && (
            <button disabled className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--text-secondary)', cursor: 'not-allowed' }}>
              <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} />
              {stage === 'researching' ? 'Researching…' : 'Writing article…'}
            </button>
          )}

          {stage === 'done' && (
            <>
              <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all" style={{ background: saved ? '#e8fdf0' : 'var(--background)', border: `1px solid ${saved ? '#22c55e' : 'var(--border)'}`, color: saved ? '#16a34a' : 'var(--text-secondary)' }}>
                <BookOpen size={13} />
                {saved ? 'Saved to Library ✓' : 'Save to Library'}
              </button>
              <button onClick={handleSchedule} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all" style={{ background: scheduled ? '#fffbeb' : 'var(--background)', border: `1px solid ${scheduled ? '#f59e0b' : 'var(--border)'}`, color: scheduled ? '#d97706' : 'var(--text-secondary)' }}>
                <CalendarClock size={13} />
                {scheduled ? 'Scheduled ✓' : 'Schedule'}
              </button>
              <button onClick={handleWebflow} disabled={webflowLoading} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all" style={{ background: webflowDone ? '#e8fdf0' : 'var(--background)', border: `1px solid ${webflowDone ? '#22c55e' : 'var(--border)'}`, color: webflowDone ? '#16a34a' : 'var(--text-secondary)' }}>
                {webflowLoading ? <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--text-secondary)', borderTopColor: 'transparent' }} /> : <Send size={13} />}
                {webflowDone ? 'Sent to Webflow ✓' : webflowLoading ? 'Publishing…' : 'Move to Webflow'}
              </button>
              <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all" style={{ background: 'var(--background)', border: '1px solid var(--border)', color: '#c0392b' }}>
                <Trash2 size={13} />
                Delete &amp; Start Over
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>
        {stage === 'idle' && <IdlePlaceholder retailer={retailer} periodLabel={periodLabel} />}
        {stage === 'researching' && <LoadingPanel message={`Searching earnings releases, investor pages, and trade press for ${retailer} ${periodLabel}…`} sub="Extracting data across Digital Commerce, Loyalty, Retail Media, AI & Technology" />}
        {stage === 'checkpoint' && insights && (
          <CheckpointPanel
            retailer={retailer}
            periodLabel={periodLabel}
            summary={researchSummary}
            insights={insights}
            sourcesCount={sources.length}
            benchmarksOpen={benchmarksOpen}
            onToggleBenchmarks={() => setBenchmarksOpen(!benchmarksOpen)}
          />
        )}
        {stage === 'writing' && <LoadingPanel message={`Writing ${retailer} ${periodLabel} performance article…`} sub="Following GD article format with British English and benchmark citations" />}
        {stage === 'done' && <OutputPanel content={output} isLoading={false} contentType="grocer-performance" onRegenerate={handleWrite} />}
      </div>
    </div>
  );
}

// ─── Right panel states ────────────────────────────────────────────────────────

function IdlePlaceholder({ retailer, periodLabel }: { retailer: string; periodLabel: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12 py-16 gap-8">
      <div className="text-center max-w-md space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2" style={{ background: '#f0eeff' }}>
          <Sparkles size={26} style={{ color: 'var(--accent)' }} />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {retailer ? `Ready to research ${retailer} ${periodLabel}` : 'Select a retailer to begin'}
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          The research agent will read published earnings releases, investor pages, and trade press — then extract structured data across all article sections before writing.
        </p>
      </div>

      <div className="w-full max-w-md rounded-2xl p-5 space-y-3" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Article structure
        </p>
        {[
          { label: 'Executive Summary', note: '60–80 words' },
          { label: 'Key Highlights', note: '4–6 KPI bullets' },
          { label: 'Digital Commerce', note: 'ecommerce + app' },
          { label: 'Fulfilment & Delivery', note: 'last-mile + dark stores' },
          { label: 'Loyalty Programme', note: 'members + personalisation' },
          { label: 'Retail Media', note: 'RMN + CPG partnerships' },
          { label: 'AI & Technology', note: 'investments + pilots' },
          { label: 'Future Outlook', note: 'strategic priorities' },
        ].map((section, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-primary)' }}>
              <span className="mr-1.5" style={{ color: 'var(--text-secondary)' }}>{i + 1}.</span>
              {section.label}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>{section.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingPanel({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-12">
      <div className="w-12 h-12 rounded-full border-4 animate-spin" style={{ borderColor: '#e0d9ff', borderTopColor: 'var(--accent)' }} />
      <div className="text-center space-y-1.5">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{message}</p>
        {sub && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
      </div>
    </div>
  );
}

function CheckpointPanel({
  retailer, periodLabel, summary, insights, sourcesCount, benchmarksOpen, onToggleBenchmarks,
}: {
  retailer: string;
  periodLabel: string;
  summary: string;
  insights: ExtractedInsights;
  sourcesCount: number;
  benchmarksOpen: boolean;
  onToggleBenchmarks: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Research complete — {retailer} {periodLabel}
        </h3>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {summary} Review what the agent extracted before writing the article.
        </p>
      </div>

      {/* Headline */}
      {insights.headline && (
        <div className="rounded-xl px-4 py-3" style={{ background: '#f0eeff', border: '1px solid var(--accent)' }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--accent)' }}>Headline finding</p>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{insights.headline}</p>
        </div>
      )}

      {/* Extracted data per section */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Extracted data ({sourcesCount} source{sourcesCount !== 1 ? 's' : ''} analysed)
        </p>
        {SECTION_META.map(({ key, label, color }) => {
          const bullets = insights.sections[key] || [];
          const isEmpty = bullets.length === 0;
          return (
            <div
              key={key}
              className="rounded-xl p-4"
              style={{
                background: isEmpty ? 'var(--background)' : 'var(--background)',
                border: `1px solid ${isEmpty ? 'var(--border)' : `${color}30`}`,
                opacity: isEmpty ? 0.6 : 1,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <p className="text-xs font-semibold" style={{ color: isEmpty ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                  {label}
                </p>
                {isEmpty && (
                  <span className="ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>No data found</span>
                )}
              </div>
              {!isEmpty && (
                <ul className="space-y-1">
                  {bullets.map((b, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Not found warning */}
      {insights.notFound?.length > 0 && !insights.notFound[0].includes('Extraction failed') && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#fffbeb', border: '1px solid #fbbf24' }}>
          <AlertCircle size={14} style={{ color: '#d97706', marginTop: 1, flexShrink: 0 }} />
          <div>
            <p className="text-xs font-medium" style={{ color: '#92400e' }}>Data gaps</p>
            <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>
              No published data found for: {insights.notFound.join(', ')}. These sections will rely on GD benchmarks and general context.
            </p>
          </div>
        </div>
      )}

      {/* GD benchmarks */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <button
          onClick={onToggleBenchmarks}
          className="w-full flex items-center justify-between px-4 py-3"
          style={{ background: 'var(--background)' }}
        >
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            GD benchmarks to cite
          </span>
          {benchmarksOpen
            ? <ChevronUp size={13} style={{ color: 'var(--text-secondary)' }} />
            : <ChevronDown size={13} style={{ color: 'var(--text-secondary)' }} />}
        </button>
        {benchmarksOpen && (
          <div className="px-4 pb-4 grid grid-cols-1 gap-2" style={{ background: 'var(--surface)' }}>
            {GD_BENCHMARKS.map((b, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
                <span className="text-sm font-bold flex-shrink-0" style={{ color: b.color }}>{b.stat}</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{b.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

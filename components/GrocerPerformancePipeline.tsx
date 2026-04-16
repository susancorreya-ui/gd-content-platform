'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Sparkles, BookOpen, CheckCircle, Circle, ChevronDown, ChevronUp,
  ExternalLink, AlertCircle, Trash2, CalendarClock, Send, RefreshCw,
  Upload, FileText, X, Loader2,
} from 'lucide-react';
import { LibraryItem } from '@/types';
import { parseDocument } from '@/lib/parsers';
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
  period: string;
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

interface UploadedDoc {
  id: string;
  name: string;
  size: number;
  rawText: string;
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

const GD_BENCHMARKS = [
  { stat: '69%', label: 'of grocery purchases are digitally influenced', color: '#6366f1' },
  { stat: '$126B', label: 'digital grocery sales — 13.4% of total', color: '#3b82f6' },
  { stat: '$8.5B', label: 'US grocery retail media market, ↑31% YoY', color: '#8b5cf6' },
  { stat: '86%', label: 'C-suite execs prioritising AI for efficiency', color: '#f59e0b' },
  { stat: '83%', label: 'shoppers enrolled in a loyalty programme', color: '#10b981' },
  { stat: '92%', label: 'shoppers say grocery lacks personalisation', color: '#ec4899' },
];

const PIPELINE_STEPS = [
  { id: 'research', label: 'Find latest earnings from IR pages & press', stages: ['researching'] },
  { id: 'checkpoint', label: 'Review & approve sources', stages: ['checkpoint'] },
  { id: 'write', label: 'Write article in GD format', stages: ['writing'] },
  { id: 'done', label: 'Review & export', stages: ['done'] },
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

const SECTION_META: { key: keyof ExtractedInsights['sections']; label: string; color: string }[] = [
  { key: 'financials', label: 'Financials', color: '#6366f1' },
  { key: 'digitalCommerce', label: 'Digital Commerce', color: '#3b82f6' },
  { key: 'fulfilment', label: 'Fulfilment & Delivery', color: '#10b981' },
  { key: 'loyalty', label: 'Loyalty Programme', color: '#f59e0b' },
  { key: 'retailMedia', label: 'Retail Media', color: '#8b5cf6' },
  { key: 'aiTechnology', label: 'AI & Technology', color: '#ec4899' },
  { key: 'outlook', label: 'Future Outlook', color: '#64748b' },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

// ─── Main component ────────────────────────────────────────────────────────────

interface GrocerPerformancePipelineProps {
  onSaveToLibrary: (item: Omit<LibraryItem, 'id' | 'createdAt'>) => void;
}

export default function GrocerPerformancePipeline({ onSaveToLibrary }: GrocerPerformancePipelineProps) {
  // Inputs
  const [retailer, setRetailer] = useState('');
  const [knownData, setKnownData] = useState('');
  const [supportingLinks, setSupportingLinks] = useState('');

  // File upload
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [uploadingName, setUploadingName] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Pipeline state
  const [stage, setStage] = useState<Stage>('idle');
  const [sources, setSources] = useState<GrowerSource[]>([]);
  const [sourceToggles, setSourceToggles] = useState<Record<number, boolean>>({});
  const [insights, setInsights] = useState<ExtractedInsights | null>(null);
  const [contextSnippet, setContextSnippet] = useState('');
  const [researchSummary, setResearchSummary] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  // UI state
  const [benchmarksOpen, setBenchmarksOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [webflowDone, setWebflowDone] = useState(false);
  const [webflowLoading, setWebflowLoading] = useState(false);

  const discoveredPeriod = insights?.period || '';
  const includedSources = sources.filter(s => sourceToggles[s.index] !== false);

  // ── Restore checkpoint from Slack deep-link ─────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('resume') !== 'checkpoint') return;
    try {
      const saved = localStorage.getItem('gd_grocer_checkpoint');
      if (!saved) return;
      const { retailer: r, sources: s, sourceToggles: t, insights: ins, contextSnippet: cs, researchSummary: rs } = JSON.parse(saved);
      if (!s?.length) return;
      setRetailer(r || '');
      setSources(s);
      setSourceToggles(t || {});
      setInsights(ins || null);
      setContextSnippet(cs || '');
      setResearchSummary(rs || '');
      setStage('checkpoint');
    } catch { /* ignore */ }
  }, []);

  // ── Slack notify ───────────────────────────────────────────────────────────

  const notifySlack = async (slackStage: 'grocer-checkpoint' | 'grocer-done') => {
    try {
      await fetch('/api/notify/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: slackStage, retailer, period: discoveredPeriod }),
      });
    } catch { /* non-blocking */ }
  };

  // ── File upload ────────────────────────────────────────────────────────────

  const processFile = async (file: File) => {
    setUploadProcessing(true);
    setUploadingName(file.name);
    setUploadError('');
    try {
      const rawText = await parseDocument(file);
      setUploadedDocs(prev => [...prev, {
        id: `upload-${Date.now()}`,
        name: file.name,
        size: file.size,
        rawText,
      }]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setUploadProcessing(false);
      setUploadingName('');
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) processFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: uploadProcessing || stage !== 'idle',
  });

  // ── Research ───────────────────────────────────────────────────────────────

  const handleResearch = async () => {
    if (!retailer.trim()) return;
    setStage('researching');
    setError('');
    setSources([]);
    setSourceToggles({});
    setInsights(null);
    setOutput('');

    try {
      const res = await fetch('/api/pipeline/grocer-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retailer, knownData, supportingLinks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const fetchedSources: GrowerSource[] = data.sources || [];
      setSources(fetchedSources);
      // Default all sources to included
      const toggles: Record<number, boolean> = {};
      fetchedSources.forEach(s => { toggles[s.index] = true; });
      setSourceToggles(toggles);
      setInsights(data.insights || null);
      setContextSnippet(data.contextSnippet || '');
      setResearchSummary(data.summary || '');
      setStage('checkpoint');

      // Save state so the Slack deep-link can restore this checkpoint
      try {
        localStorage.setItem('gd_grocer_checkpoint', JSON.stringify({
          retailer,
          sources: fetchedSources,
          sourceToggles: toggles,
          insights: data.insights,
          contextSnippet: data.contextSnippet || '',
          researchSummary: data.summary || '',
        }));
      } catch { /* ignore */ }

      notifySlack('grocer-checkpoint');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed');
      setStage('idle');
    }
  };

  // ── Write ──────────────────────────────────────────────────────────────────

  const handleWrite = async () => {
    setStage('writing');
    setError('');

    // Build context from only included sources + uploaded docs
    const uploadedContext = uploadedDocs.map(d => `Uploaded document: ${d.name}\n${d.rawText.slice(0, 4000)}`).join('\n\n---\n\n');
    const includedTitles = includedSources.map(s => s.title);
    const excludedTitles = sources.filter(s => sourceToggles[s.index] === false).map(s => s.title);

    try {
      const res = await fetch('/api/pipeline/grocer-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailer,
          period: discoveredPeriod,
          knownData,
          contextSnippet,
          includedSources: includedTitles,
          excludedSources: excludedTitles,
          uploadedContext: uploadedContext || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const sourcesSection = includedSources.length > 0
        ? `\n\n---\n\n## Sources\n\n${includedSources.map(s => `- [${s.title}](${s.url}) — ${s.sourceDomain}`).join('\n')}`
        : '';
      setOutput((data.output || '') + sourcesSection);
      setStage('done');
      notifySlack('grocer-done');
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
      title: `${retailer}${discoveredPeriod ? ` — ${discoveredPeriod}` : ''} Performance`,
      output,
      metadata: { retailer, period: discoveredPeriod },
      status: 'saved',
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
        body: JSON.stringify({
          title: `${retailer}${discoveredPeriod ? ` — ${discoveredPeriod}` : ''} Performance`,
          body: output,
          contentType: 'grocer-performance',
        }),
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
    setSourceToggles({});
    setInsights(null);
    setContextSnippet('');
    setResearchSummary('');
    setOutput('');
    setError('');
    setSaved(false);
    setScheduled(false);
    setWebflowDone(false);
    try { localStorage.removeItem('gd_grocer_checkpoint'); } catch { /* ignore */ }
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
          <div>
            <h2 className="text-lg font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              Grocer Performance
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              The agent finds the latest published earnings from the retailer's IR pages and writes the article automatically.
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

          {/* Discovered period badge */}
          {discoveredPeriod && stage !== 'idle' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#f0eeff', border: '1px solid var(--accent)' }}>
              <CheckCircle size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span className="text-xs" style={{ color: 'var(--accent)' }}>
                Latest period found: <strong>{discoveredPeriod}</strong>
              </span>
            </div>
          )}

          {/* Analyst notes */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Analyst notes <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
            </label>
            <textarea
              rows={3}
              className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
              style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="Add any known figures or context you'd like the agent to prioritise…"
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
              Supporting links <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
            </label>
            <textarea
              rows={2}
              className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
              style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder={`https://investors.kroger.com/...\nhttps://grocerydive.com/...`}
              value={supportingLinks}
              onChange={e => setSupportingLinks(e.target.value)}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              disabled={stage !== 'idle'}
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Upload documents <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
            </label>
            <div
              {...getRootProps()}
              className="rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all"
              style={{
                borderColor: isDragActive ? 'var(--accent)' : 'var(--border)',
                background: isDragActive ? '#f0eeff' : 'var(--background)',
                opacity: stage !== 'idle' ? 0.5 : 1,
                cursor: stage !== 'idle' ? 'not-allowed' : 'pointer',
              }}
            >
              <input {...getInputProps()} />
              {uploadProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Processing {uploadingName}…</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Upload size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {isDragActive ? 'Drop file here' : 'Drop or click — PDF, DOCX, XLSX, CSV'}
                  </span>
                </div>
              )}
            </div>
            {uploadError && (
              <p className="mt-1 text-xs" style={{ color: '#c0392b' }}>{uploadError}</p>
            )}
            {uploadedDocs.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {uploadedDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#e8fdf0', border: '1px solid #22c55e30' }}>
                    <FileText size={12} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span className="text-xs flex-1 truncate" style={{ color: '#16a34a' }}>{doc.name}</span>
                    <span className="text-xs" style={{ color: '#86efac' }}>{formatFileSize(doc.size)}</span>
                    <button onClick={() => setUploadedDocs(prev => prev.filter(d => d.id !== doc.id))} style={{ color: '#16a34a' }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              {retailer.trim() ? `Research ${retailer}` : 'Enter a retailer to begin'}
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
                Write Article{includedSources.length < sources.length ? ` (${includedSources.length} sources)` : ''}
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
        {stage === 'idle' && <IdlePlaceholder retailer={retailer} />}
        {stage === 'researching' && (
          <LoadingPanel
            message={`Searching ${retailer}'s investor relations pages and earnings press…`}
            sub="Identifying the latest reporting period and extracting data across all sections"
          />
        )}
        {stage === 'checkpoint' && insights && (
          <SourcesCheckpointPanel
            retailer={retailer}
            summary={researchSummary}
            insights={insights}
            sources={sources}
            sourceToggles={sourceToggles}
            onToggleSource={(index) => setSourceToggles(prev => ({ ...prev, [index]: !prev[index] }))}
            onIncludeAll={() => {
              const all: Record<number, boolean> = {};
              sources.forEach(s => { all[s.index] = true; });
              setSourceToggles(all);
            }}
            onExcludeAll={() => {
              const none: Record<number, boolean> = {};
              sources.forEach(s => { none[s.index] = false; });
              setSourceToggles(none);
            }}
            benchmarksOpen={benchmarksOpen}
            onToggleBenchmarks={() => setBenchmarksOpen(b => !b)}
            uploadedDocs={uploadedDocs}
          />
        )}
        {stage === 'writing' && (
          <LoadingPanel
            message={`Writing ${retailer} ${discoveredPeriod} performance article…`}
            sub="Following GD article format with British English and benchmark citations"
          />
        )}
        {stage === 'done' && (
          <OutputPanel content={output} isLoading={false} contentType="grocer-performance" onRegenerate={handleWrite} />
        )}
      </div>
    </div>
  );
}

// ─── Right panel states ────────────────────────────────────────────────────────

function IdlePlaceholder({ retailer }: { retailer: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12 py-16 gap-8">
      <div className="text-center max-w-md space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2" style={{ background: '#f0eeff' }}>
          <Sparkles size={26} style={{ color: 'var(--accent)' }} />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {retailer ? `Ready to research ${retailer}` : 'Enter a retailer name to begin'}
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          The agent searches the retailer's investor relations pages and industry press to find their most recent earnings — no period selection needed.
        </p>
      </div>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-3" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Article structure</p>
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

function SourcesCheckpointPanel({
  retailer, summary, insights, sources, sourceToggles, onToggleSource,
  onIncludeAll, onExcludeAll, benchmarksOpen, onToggleBenchmarks, uploadedDocs,
}: {
  retailer: string;
  summary: string;
  insights: ExtractedInsights;
  sources: GrowerSource[];
  sourceToggles: Record<number, boolean>;
  onToggleSource: (index: number) => void;
  onIncludeAll: () => void;
  onExcludeAll: () => void;
  benchmarksOpen: boolean;
  onToggleBenchmarks: () => void;
  uploadedDocs: UploadedDoc[];
}) {
  const includedCount = sources.filter(s => sourceToggles[s.index] !== false).length;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* Header */}
      <div>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Sources ready — {retailer}
        </h3>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{summary}</p>
      </div>

      {/* Period + headline */}
      {insights.headline && (
        <div className="rounded-xl px-4 py-3 space-y-1" style={{ background: '#f0eeff', border: '1px solid var(--accent)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Latest period: {insights.period}</p>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{insights.headline}</p>
        </div>
      )}

      {/* Source list with toggles */}
      {sources.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Sources — {includedCount} of {sources.length} included
            </p>
            <div className="flex gap-2">
              <button onClick={onIncludeAll} className="text-xs px-2 py-1 rounded-lg transition-all" style={{ background: '#f0eeff', color: 'var(--accent)' }}>
                All
              </button>
              <button onClick={onExcludeAll} className="text-xs px-2 py-1 rounded-lg transition-all" style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                None
              </button>
            </div>
          </div>

          {sources.map(source => {
            const included = sourceToggles[source.index] !== false;
            const typeColor = SOURCE_TYPE_COLORS[source.sourceType] || '#64748b';
            return (
              <div
                key={source.index}
                className="rounded-xl p-4 transition-all cursor-pointer"
                style={{
                  background: 'var(--background)',
                  border: `1px solid ${included ? `${typeColor}40` : 'var(--border)'}`,
                  opacity: included ? 1 : 0.45,
                }}
                onClick={() => onToggleSource(source.index)}
              >
                <div className="flex items-start gap-3">
                  {/* Toggle */}
                  <div className="flex-shrink-0 mt-0.5">
                    {included ? (
                      <CheckCircle size={16} style={{ color: '#10b981' }} />
                    ) : (
                      <Circle size={16} style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {source.title}
                      </p>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex-shrink-0"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <ExternalLink size={11} />
                      </a>
                    </div>
                    {source.description && (
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {source.description.slice(0, 200)}{source.description.length > 200 ? '…' : ''}
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Uploaded docs included */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Uploaded documents — always included
          </p>
          {uploadedDocs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#e8fdf0', border: '1px solid #22c55e30' }}>
              <CheckCircle size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: '#16a34a' }}>{doc.name}</p>
                <p className="text-xs" style={{ color: '#86efac' }}>{formatFileSize(doc.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Data gaps */}
      {insights.notFound?.length > 0 && !insights.notFound[0].includes('Extraction failed') && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#fffbeb', border: '1px solid #fbbf24' }}>
          <AlertCircle size={14} style={{ color: '#d97706', marginTop: 1, flexShrink: 0 }} />
          <div>
            <p className="text-xs font-medium" style={{ color: '#92400e' }}>Data gaps</p>
            <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>
              No published data found for: {insights.notFound.join(', ')}. These sections will draw on GD benchmarks.
            </p>
          </div>
        </div>
      )}

      {/* Extracted section summary */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Extracted data
        </p>
        {SECTION_META.map(({ key, label, color }) => {
          const bullets = insights.sections[key] || [];
          if (bullets.length === 0) return null;
          return (
            <div key={key} className="rounded-xl p-3" style={{ background: 'var(--background)', border: `1px solid ${color}25` }}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
              </div>
              <ul className="space-y-0.5">
                {bullets.slice(0, 3).map((b, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                    {b}
                  </li>
                ))}
                {bullets.length > 3 && (
                  <li className="text-xs" style={{ color: 'var(--text-secondary)', paddingLeft: '10px' }}>
                    +{bullets.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {/* GD benchmarks */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <button onClick={onToggleBenchmarks} className="w-full flex items-center justify-between px-4 py-3" style={{ background: 'var(--background)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            GD benchmarks to cite
          </span>
          {benchmarksOpen ? <ChevronUp size={13} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text-secondary)' }} />}
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

'use client';

import { useState, useRef } from 'react';
import {
  Sparkles, CheckCircle, Circle, ChevronDown, ChevronUp,
  ExternalLink, AlertCircle, Trash2, Send, RefreshCw, BookOpen, Edit3, Check, X,
  Upload, FileText, Loader2,
} from 'lucide-react';
import { LibraryItem } from '@/types';
import OutputPanel from './OutputPanel';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MSSource {
  index: number;
  title: string;
  url: string;
  description: string;
  sourceDomain: string;
  sourceType: string;
  source: 'web' | 'gd';
}

type Stage =
  | 'idle'
  | 'researching'
  | 'checkpoint-sources'
  | 'outlining'
  | 'checkpoint-outline'
  | 'writing'
  | 'done';

// ─── Constants ──────────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { id: 'research',          label: 'Find analyst & industry sources', stages: ['researching'] },
  { id: 'sources',           label: 'Review & approve sources',        stages: ['checkpoint-sources'] },
  { id: 'outline',           label: 'Build narrative outline',         stages: ['outlining'] },
  { id: 'outline-review',    label: 'Review & approve outline',        stages: ['checkpoint-outline'] },
  { id: 'write',             label: 'Write full document',             stages: ['writing'] },
  { id: 'done',              label: 'Review & export',                 stages: ['done'] },
];

const SOURCE_TYPE_COLORS: Record<string, string> = {
  'Analyst report':       '#6366f1',
  'Proprietary research': '#3b82f6',
  'Trade publication':    '#f59e0b',
  'Newswire':             '#10b981',
  'Press release':        '#8b5cf6',
  'Government data':      '#64748b',
  'Industry source':      '#94a3b8',
  'GD Content':           '#00aa50',
  'User-provided':        '#ec4899',
};

// ─── StepIndicator ─────────────────────────────────────────────────────────────

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
              {isDone
                ? <CheckCircle size={14} style={{ color: '#10b981' }} />
                : isCurrent
                  ? <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                  : <Circle size={14} style={{ color: 'var(--text-secondary)' }} />}
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

// ─── LoadingPanel ───────────────────────────────────────────────────────────────

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

// ─── IdlePlaceholder ────────────────────────────────────────────────────────────

function IdlePlaceholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12 py-16 gap-8">
      <div className="text-center max-w-md space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2" style={{ background: '#f0eeff' }}>
          <Sparkles size={26} style={{ color: 'var(--accent)' }} />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Enter a theme to begin
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          The pipeline searches analyst reports and industry sources, builds a narrative outline for your review, then writes the full 8–10 page document.
        </p>
      </div>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-3" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Document structure</p>
        {[
          { label: 'Title + Hook',           note: 'Tension-framing opener' },
          { label: '5–6 Thematic Sections',  note: 'Lead + 3 sub-points each' },
          { label: 'Stat Callouts',          note: 'Attributed analyst data' },
          { label: 'Closing Section',        note: '3 strategic vectors' },
          { label: 'Final Imperative',       note: '"The leaders who…"' },
        ].map((s, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-primary)' }}>
              <span className="mr-1.5" style={{ color: 'var(--text-secondary)' }}>{i + 1}.</span>
              {s.label}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>{s.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── UploadedDocsList ───────────────────────────────────────────────────────────

function UploadedDocsList({ docs }: { docs: { name: string; text: string }[] }) {
  if (docs.length === 0) return null;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #6366f125' }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#6366f108' }}>
        <FileText size={13} style={{ color: '#6366f1' }} />
        <span className="text-xs font-semibold" style={{ color: '#6366f1' }}>Uploaded Documents</span>
        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#6366f120', color: '#6366f1' }}>
          {docs.length}
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: '#6366f115' }}>
        {docs.map((doc, i) => (
          <div key={i} className="px-4 py-3 flex items-start gap-3" style={{ background: 'var(--background)' }}>
            <CheckCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{doc.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {(doc.text.length / 1000).toFixed(0)}k chars extracted · Always included
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SourcesPanel ───────────────────────────────────────────────────────────────

function SourcesPanel({
  sources, sourceToggles, onToggle, onIncludeAll, onExcludeAll, summary, uploadedDocs,
}: {
  sources: MSSource[];
  sourceToggles: Record<number, boolean>;
  onToggle: (index: number) => void;
  onIncludeAll: () => void;
  onExcludeAll: () => void;
  summary: string;
  uploadedDocs: { name: string; text: string }[];
}) {
  const [openGroup, setOpenGroup] = useState<string | null>('Analyst report');
  const includedCount = sources.filter(s => sourceToggles[s.index] !== false).length;

  const grouped = sources.reduce<Record<string, MSSource[]>>((acc, s) => {
    const key = s.sourceType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const typeOrder = ['Analyst report', 'Proprietary research', 'Trade publication', 'Newswire', 'GD Content', 'Press release', 'Industry source', 'User-provided'];
  const sortedGroups = typeOrder.filter(t => grouped[t]).concat(Object.keys(grouped).filter(t => !typeOrder.includes(t)));

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Sources ready</h3>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{summary}</p>
      </div>

      <UploadedDocsList docs={uploadedDocs} />

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {includedCount} of {sources.length} included
        </p>
        <div className="flex gap-2">
          <button onClick={onIncludeAll} className="text-xs px-2 py-1 rounded-lg" style={{ background: '#f0eeff', color: 'var(--accent)' }}>All</button>
          <button onClick={onExcludeAll} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>None</button>
        </div>
      </div>

      {sortedGroups.map(type => {
        const group = grouped[type];
        const color = SOURCE_TYPE_COLORS[type] || '#94a3b8';
        const isOpen = openGroup === type;
        const groupIncluded = group.filter(s => sourceToggles[s.index] !== false).length;

        return (
          <div key={type} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${color}25` }}>
            <button
              onClick={() => setOpenGroup(isOpen ? null : type)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={{ background: `${color}08` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color }}>{type}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
                  {groupIncluded}/{group.length}
                </span>
              </div>
              {isOpen
                ? <ChevronUp size={13} style={{ color: 'var(--text-secondary)' }} />
                : <ChevronDown size={13} style={{ color: 'var(--text-secondary)' }} />}
            </button>

            {isOpen && (
              <div className="divide-y" style={{ borderColor: `${color}15` }}>
                {group.map(source => {
                  const included = sourceToggles[source.index] !== false;
                  return (
                    <div
                      key={source.index}
                      className="px-4 py-3 cursor-pointer transition-all"
                      style={{ background: 'var(--background)', opacity: included ? 1 : 0.45 }}
                      onClick={() => onToggle(source.index)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {included
                            ? <CheckCircle size={14} style={{ color: '#10b981' }} />
                            : <Circle size={14} style={{ color: 'var(--text-secondary)' }} />}
                        </div>
                        <div className="flex-1 min-w-0">
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
                            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                              {source.description.slice(0, 180)}{source.description.length > 180 ? '…' : ''}
                            </p>
                          )}
                          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                            {source.sourceDomain}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── OutlinePanel ───────────────────────────────────────────────────────────────

function OutlinePanel({
  outline, editing, onEdit, onSaveEdit, onCancelEdit, onEditChange,
}: {
  outline: string;
  editing: boolean;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (v: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Narrative Outline</p>
          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Review the section structure and argument arc. Edit if needed, then write the full document.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={onSaveEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <Check size={12} />Save
              </button>
              <button
                onClick={onCancelEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                <X size={12} />Cancel
              </button>
            </>
          ) : (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
              style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <Edit3 size={12} />Edit
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {editing ? (
          <textarea
            value={outline}
            onChange={e => onEditChange(e.target.value)}
            className="w-full h-full p-6 text-sm resize-none outline-none"
            style={{ background: 'var(--background)', color: 'var(--text-primary)', fontFamily: 'monospace', lineHeight: '1.6' }}
          />
        ) : (
          <pre className="p-6 text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)', fontFamily: 'inherit' }}>
            {outline}
          </pre>
        )}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

interface MarketSnapshotPipelineProps {
  onSaveToLibrary: (item: Omit<LibraryItem, 'id' | 'createdAt'>) => void;
}

export default function MarketSnapshotPipeline({ onSaveToLibrary }: MarketSnapshotPipelineProps) {
  // Inputs
  const [theme, setTheme] = useState('');
  const [subThemes, setSubThemes] = useState('');
  const [supportingLinks, setSupportingLinks] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; text: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pipeline state
  const [stage, setStage] = useState<Stage>('idle');
  const [sources, setSources] = useState<MSSource[]>([]);
  const [sourceToggles, setSourceToggles] = useState<Record<number, boolean>>({});
  const [researchSummary, setResearchSummary] = useState('');
  const [outline, setOutline] = useState('');
  const [editingOutline, setEditingOutline] = useState(false);
  const [outlineEdit, setOutlineEdit] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  // Done state
  const [saved, setSaved] = useState(false);
  const [webflowLoading, setWebflowLoading] = useState(false);
  const [webflowDone, setWebflowDone] = useState(false);
  const [webflowError, setWebflowError] = useState('');

  const includedSources = sources.filter(s => sourceToggles[s.index] !== false);

  // ── Document upload ──────────────────────────────────────────────────────────

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError('');
    const newDocs: { name: string; text: string }[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/pipeline/ms-upload-doc', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (data.text) newDocs.push({ name: data.name, text: data.text });
      } catch (err) {
        setUploadError(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed'}`);
      }
    }
    if (newDocs.length > 0) {
      setUploadedDocs(prev => {
        const names = new Set(prev.map(d => d.name));
        return [...prev, ...newDocs.filter(d => !names.has(d.name))];
      });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Research ─────────────────────────────────────────────────────────────────

  const handleResearch = async () => {
    if (!theme.trim() || !subThemes.trim()) return;
    setStage('researching');
    setError('');
    setSources([]);
    setSourceToggles({});
    setOutline('');
    setOutput('');

    try {
      const res = await fetch('/api/pipeline/ms-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, subThemes, supportingLinks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const fetched: MSSource[] = data.sources || [];
      setSources(fetched);
      const toggles: Record<number, boolean> = {};
      fetched.forEach(s => { toggles[s.index] = true; });
      setSourceToggles(toggles);
      setResearchSummary(data.summary || '');
      setStage('checkpoint-sources');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed');
      setStage('idle');
    }
  };

  // ── Outline ──────────────────────────────────────────────────────────────────

  const handleOutline = async () => {
    setStage('outlining');
    setError('');

    try {
      const res = await fetch('/api/pipeline/ms-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, subThemes, sources: includedSources, uploadedDocs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const fetchedOutline = data.outline || '';
      setOutline(fetchedOutline);
      setOutlineEdit(fetchedOutline);
      setEditingOutline(false);
      setStage('checkpoint-outline');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Outline generation failed');
      setStage('checkpoint-sources');
    }
  };

  // ── Write ────────────────────────────────────────────────────────────────────

  const handleWrite = async () => {
    setStage('writing');
    setError('');
    const finalOutline = editingOutline ? outlineEdit : outline;

    try {
      const res = await fetch('/api/pipeline/ms-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, subThemes, outline: finalOutline, sources: includedSources, uploadedDocs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setOutput(data.output || '');
      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Writing failed');
      setStage('checkpoint-outline');
    }
  };

  // ── Done actions ─────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!output) return;
    onSaveToLibrary({ contentType: 'market-snapshot', title: theme, output, metadata: { theme }, status: 'saved' });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleWebflow = async () => {
    if (!output) return;
    setWebflowLoading(true);
    setWebflowError('');
    try {
      const res = await fetch('/api/publish/webflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: theme, body: output, blogType: 'market-snapshot', author: 'Grocery Doppio' }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || data.message);
      setWebflowDone(true);
    } catch (err) {
      setWebflowError(err instanceof Error ? err.message : 'Webflow publish failed');
    } finally {
      setWebflowLoading(false);
    }
  };

  const handleReset = () => {
    setStage('idle');
    setSources([]);
    setSourceToggles({});
    setResearchSummary('');
    setOutline('');
    setOutlineEdit('');
    setOutput('');
    setError('');
    setSaved(false);
    setWebflowDone(false);
    setWebflowError('');
    setEditingOutline(false);
    setUploadedDocs([]);
    setUploadError('');
  };

  // ─── Render ────────────────────────────────────────────────────────────────────

  const canStart = theme.trim() && subThemes.trim();

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel ── */}
      <div
        className="w-[380px] flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="p-6 flex-1 space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Market Snapshot</h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              An 8–10 page intelligence brief with structured narrative, analyst data, and strategic recommendations.
            </p>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Main theme <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <input
              type="text"
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
              style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="e.g. AI-Powered Inventory Visibility"
              value={theme}
              onChange={e => setTheme(e.target.value)}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              disabled={stage !== 'idle'}
            />
          </div>

          {/* Sub-themes */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Sub-themes & supporting ideas <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <textarea
              rows={7}
              className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
              style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder={`One idea per line, e.g.:\n- The visibility gap: inventory data is often wrong\n- Why traditional fixes don't scale\n- From periodic to perpetual: real-time sensing\n- Unified inventory across channels\n- AI for prediction and anomaly detection\n- The value equation: availability, efficiency, margin`}
              value={subThemes}
              onChange={e => setSubThemes(e.target.value)}
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
              placeholder="https://mckinsey.com/..."
              value={supportingLinks}
              onChange={e => setSupportingLinks(e.target.value)}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              disabled={stage !== 'idle'}
            />
          </div>

          {/* Document upload */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Reference documents <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              multiple
              className="hidden"
              onChange={e => handleFileUpload(e.target.files)}
              disabled={stage !== 'idle'}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || stage !== 'idle'}
              className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-xs transition-all"
              style={{
                background: 'var(--background)',
                border: '1.5px dashed var(--border)',
                color: stage !== 'idle' ? 'var(--text-secondary)' : 'var(--text-primary)',
                cursor: stage !== 'idle' ? 'not-allowed' : 'pointer',
                opacity: stage !== 'idle' ? 0.5 : 1,
              }}
            >
              {uploading
                ? <><Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent)' }} /><span style={{ color: 'var(--accent)' }}>Extracting text…</span></>
                : <><Upload size={13} style={{ color: 'var(--text-secondary)' }} />Upload PDF, DOCX, or TXT</>}
            </button>
            {uploadError && (
              <p className="mt-1 text-[11px]" style={{ color: '#c0392b' }}>{uploadError}</p>
            )}
            {uploadedDocs.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {uploadedDocs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: '#f0eeff' }}>
                    <FileText size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span className="flex-1 text-[11px] truncate" style={{ color: 'var(--accent)' }}>{doc.name}</span>
                    {stage === 'idle' && (
                      <button
                        onClick={() => setUploadedDocs(prev => prev.filter((_, j) => j !== i))}
                        className="flex-shrink-0"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <X size={11} />
                      </button>
                    )}
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
              disabled={!canStart}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: canStart ? 'var(--accent)' : 'var(--text-secondary)', cursor: canStart ? 'pointer' : 'not-allowed' }}
            >
              <Sparkles size={15} />
              Start Research
            </button>
          )}

          {stage === 'checkpoint-sources' && (
            <>
              <button
                onClick={handleOutline}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'var(--accent)' }}
              >
                <Sparkles size={15} />
                Build Outline{includedSources.length < sources.length ? ` (${includedSources.length} sources)` : ''}
              </button>
              <button
                onClick={handleResearch}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                <RefreshCw size={13} />Re-research
              </button>
            </>
          )}

          {stage === 'checkpoint-outline' && (
            <>
              <button
                onClick={handleWrite}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'var(--accent)' }}
              >
                <Sparkles size={15} />Write Full Document
              </button>
              <button
                onClick={handleOutline}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                <RefreshCw size={13} />Re-outline
              </button>
            </>
          )}

          {(stage === 'researching' || stage === 'outlining' || stage === 'writing') && (
            <button disabled className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--text-secondary)', cursor: 'not-allowed' }}>
              <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} />
              {stage === 'researching' ? 'Researching…' : stage === 'outlining' ? 'Building outline…' : 'Writing document…'}
            </button>
          )}

          {stage === 'done' && (
            <>
              <button
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
                style={{ background: saved ? '#e8fdf0' : 'var(--background)', border: `1px solid ${saved ? '#22c55e' : 'var(--border)'}`, color: saved ? '#16a34a' : 'var(--text-secondary)' }}
              >
                <BookOpen size={13} />{saved ? 'Saved to Library ✓' : 'Save to Library'}
              </button>
              <button
                onClick={handleWebflow}
                disabled={webflowLoading || webflowDone}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
                style={{ background: webflowDone ? 'rgba(99,102,241,0.1)' : 'var(--background)', border: `1px solid ${webflowDone ? '#6366f1' : 'var(--border)'}`, color: webflowDone ? '#6366f1' : 'var(--text-secondary)', opacity: webflowLoading ? 0.7 : 1 }}
              >
                {webflowLoading
                  ? <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: '#6366f1' }} />
                  : <Send size={13} />}
                {webflowDone ? 'In Webflow ✓' : webflowLoading ? 'Pushing…' : 'Move to Webflow'}
              </button>
              {webflowError && (
                <p className="text-[11px] px-1" style={{ color: '#ef4444' }}>{webflowError}</p>
              )}
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: '#c0392b' }}
              >
                <Trash2 size={13} />Delete &amp; Start Over
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>
        {stage === 'idle' && <IdlePlaceholder />}
        {stage === 'researching' && (
          <LoadingPanel
            message="Searching analyst reports and industry sources…"
            sub="Targeting McKinsey, Gartner, Forrester, Nielsen, Circana and grocery trade publications"
          />
        )}
        {stage === 'checkpoint-sources' && (
          <SourcesPanel
            sources={sources}
            sourceToggles={sourceToggles}
            onToggle={idx => setSourceToggles(prev => ({ ...prev, [idx]: !prev[idx] }))}
            onIncludeAll={() => { const t: Record<number, boolean> = {}; sources.forEach(s => { t[s.index] = true; }); setSourceToggles(t); }}
            onExcludeAll={() => { const t: Record<number, boolean> = {}; sources.forEach(s => { t[s.index] = false; }); setSourceToggles(t); }}
            summary={researchSummary}
            uploadedDocs={uploadedDocs}
          />
        )}
        {stage === 'outlining' && (
          <LoadingPanel
            message="Building narrative outline…"
            sub="Mapping section titles, arguments, and anchor statistics"
          />
        )}
        {stage === 'checkpoint-outline' && (
          <OutlinePanel
            outline={editingOutline ? outlineEdit : outline}
            editing={editingOutline}
            onEdit={() => { setOutlineEdit(outline); setEditingOutline(true); }}
            onSaveEdit={() => { setOutline(outlineEdit); setEditingOutline(false); }}
            onCancelEdit={() => setEditingOutline(false)}
            onEditChange={setOutlineEdit}
          />
        )}
        {stage === 'writing' && (
          <LoadingPanel
            message={`Writing Market Snapshot: ${theme}…`}
            sub="Following the structured format — sections, sub-points, stat callouts, strategic close"
          />
        )}
        {stage === 'done' && (
          <OutputPanel content={output} isLoading={false} contentType="market-snapshot" onRegenerate={handleWrite} />
        )}
      </div>
    </div>
  );
}

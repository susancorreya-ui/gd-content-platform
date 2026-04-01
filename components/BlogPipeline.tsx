'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, BookOpen, CheckCircle, Circle, Edit3, RefreshCw,
  ExternalLink, AlertCircle, ChevronDown, ChevronUp, Send,
  Trash2, CalendarClock,
} from 'lucide-react';
import { BlogType, LibraryItem } from '@/types';
import OutputPanel from './OutputPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewedSource {
  index: number;
  title: string;
  url: string;
  description: string;
  source: 'web' | 'gd';
  relevance: 'High' | 'Medium' | 'Low';
  sourceType: string;
  recommendation: 'INCLUDE' | 'SKIP';
  reason: string;
}

interface HeadlineOption {
  headline: string;
  type: string;
  score: number;
  reason: string;
  seoTitle: string;
}

interface QualityCheck {
  name: string;
  passed: boolean;
  score: number;
  note: string;
}

interface QualityReport {
  score: number;
  passed: boolean;
  checks: QualityCheck[];
  issues: string[];
  recommendation: string;
}

type Stage =
  | 'idle'
  | 'sourcing'
  | 'researching'
  | 'checkpoint-sources'
  | 'outlining'
  | 'checkpoint-outline'
  | 'writing'
  | 'adding-references'
  | 'fact-checking'
  | 'verifying-refs'
  | 'running-seo'
  | 'linking'
  | 'editing'
  | 'generating-headlines'
  | 'quality-check'
  | 'checkpoint-publish'
  | 'publishing'
  | 'distributing'
  | 'done';

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_ORDER: Stage[] = [
  'idle', 'sourcing', 'researching', 'checkpoint-sources',
  'outlining', 'checkpoint-outline',
  'writing', 'adding-references', 'fact-checking', 'verifying-refs',
  'running-seo', 'linking', 'editing', 'generating-headlines', 'quality-check',
  'checkpoint-publish', 'publishing', 'distributing', 'done',
];

const AGENT_CONFIG: { label: string; activeAt: Stage; completedBy: Stage }[] = [
  { label: 'Source Agent',       activeAt: 'sourcing',              completedBy: 'researching' },
  { label: 'Web Research',       activeAt: 'researching',           completedBy: 'checkpoint-sources' },
  { label: 'GD Site Research',   activeAt: 'researching',           completedBy: 'checkpoint-sources' },
  { label: 'Link Review',        activeAt: 'researching',           completedBy: 'checkpoint-sources' },
  { label: 'Outline Builder',    activeAt: 'outlining',             completedBy: 'checkpoint-outline' },
  { label: 'Content Writer',     activeAt: 'writing',               completedBy: 'adding-references' },
  { label: 'GD References',      activeAt: 'adding-references',     completedBy: 'fact-checking' },
  { label: 'Fact Checker',       activeAt: 'fact-checking',         completedBy: 'verifying-refs' },
  { label: 'Reference Verifier', activeAt: 'verifying-refs',        completedBy: 'running-seo' },
  { label: 'SEO Optimizer',      activeAt: 'running-seo',           completedBy: 'linking' },
  { label: 'Internal Linker',    activeAt: 'linking',               completedBy: 'editing' },
  { label: 'Copy Editor',        activeAt: 'editing',               completedBy: 'generating-headlines' },
  { label: 'Headline Generator', activeAt: 'generating-headlines',  completedBy: 'quality-check' },
  { label: 'Quality Gate',       activeAt: 'quality-check',         completedBy: 'checkpoint-publish' },
  { label: 'Publisher',          activeAt: 'publishing',            completedBy: 'distributing' },
  { label: 'Social Distributor', activeAt: 'distributing',          completedBy: 'done' },
];

const STAGE_LABELS: Partial<Record<Stage, string>> = {
  sourcing: 'Validating source…',
  researching: 'Running research agents…',
  outlining: 'Building outline…',
  writing: 'Writing article…',
  'adding-references': 'Weaving in GD references…',
  'fact-checking': 'Fact-checking claims…',
  'verifying-refs': 'Verifying references…',
  'running-seo': 'Optimising for SEO…',
  linking: 'Adding internal links…',
  editing: 'Running 7-pass edit…',
  'generating-headlines': 'Generating headlines…',
  'quality-check': 'Running quality gate…',
  publishing: 'Submitting to CMS…',
  distributing: 'Generating social posts…',
};

const BLOG_TYPES: { id: BlogType; label: string; desc: string }[] = [
  { id: 'standard',          label: 'Standard Article',    desc: '1,000–3,000 words' },
  { id: 'listicle',          label: 'Listicle',            desc: '800–1,500 words' },
  { id: 'pillar-post',       label: 'Pillar Post',         desc: '2,500–5,000 words' },
  { id: 'thought-leadership', label: 'Thought Leadership', desc: '800–1,800 words' },
];

const CONTENT_PILLARS = [
  'Artificial Intelligence', 'Automation', 'Digital Commerce',
  'Personalization', 'Retail Media', 'Supply Chain',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function AgentStep({ number, label, status }: {
  number: number;
  label: string;
  status: 'waiting' | 'running' | 'done';
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
        style={{
          background: status === 'done' ? 'var(--accent)' : status === 'running' ? 'rgba(0,170,80,0.12)' : 'var(--background)',
          border: `1px solid ${status === 'done' ? 'var(--accent)' : status === 'running' ? 'var(--accent)' : 'var(--border)'}`,
          color: status === 'done' ? 'white' : status === 'running' ? 'var(--accent)' : 'var(--text-secondary)',
        }}
      >
        {status === 'done' ? '✓' : number}
      </div>
      <span
        className="text-xs"
        style={{
          color: status === 'done' ? 'var(--text-primary)' : status === 'running' ? 'var(--accent)' : 'var(--text-secondary)',
          fontWeight: status === 'running' ? 600 : 400,
        }}
      >
        {label}
        {status === 'running' && <span className="ml-1 opacity-50">…</span>}
      </span>
    </div>
  );
}

function SourcesAccordion({ sources, sourceOverrides }: {
  sources: ReviewedSource[];
  sourceOverrides: Record<number, 'INCLUDE' | 'SKIP'>;
}) {
  const [open, setOpen] = useState(false);
  const included = sources.filter(s => (sourceOverrides[s.index] ?? s.recommendation) === 'INCLUDE');

  return (
    <div className="mb-4 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium"
        style={{ background: 'var(--background)', color: 'var(--text-primary)' }}
      >
        <span>Sources used ({included.length})</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div className="divide-y" style={{ borderTop: '1px solid var(--border)' }}>
          {sources.map(s => {
            const rec = sourceOverrides[s.index] ?? s.recommendation;
            const isIncluded = rec === 'INCLUDE';
            return (
              <div key={s.index} className="px-3 py-2" style={{ opacity: isIncluded ? 1 : 0.45 }}>
                <div className="flex items-start gap-1.5">
                  <div className="mt-0.5 flex-shrink-0" style={{ color: isIncluded ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {isIncluded ? <CheckCircle size={11} /> : <Circle size={11} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium leading-snug mb-0.5" style={{ color: 'var(--text-primary)' }}>
                      {s.title}
                    </p>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] flex items-center gap-1 truncate"
                      style={{ color: 'var(--accent)' }}
                    >
                      <ExternalLink size={9} />
                      {s.url.replace(/^https?:\/\//, '').slice(0, 45)}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2.5 h-2.5 rounded-full animate-bounce"
              style={{ background: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        {label && (
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        )}
      </div>
    </div>
  );
}

function ReportAccordion({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(false);
  if (!content) return null;
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium"
        style={{ background: 'var(--background)', color: 'var(--text-primary)' }}
      >
        {title}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <pre className="px-4 py-3 text-xs whitespace-pre-wrap font-mono overflow-x-auto"
          style={{ background: 'var(--surface)', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)' }}>
          {content}
        </pre>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BlogPipelineProps {
  researchDocs: { id: string; name: string; insights: string }[];
  onSaveToLibrary: (item: Omit<LibraryItem, 'id' | 'createdAt'>) => void;
  initialTopic?: string;
  initialPillar?: string;
  autoStart?: boolean;
}

export default function BlogPipeline({ researchDocs, onSaveToLibrary, initialTopic = '', initialPillar = '', autoStart = false }: BlogPipelineProps) {

  // ── Inputs ────────────────────────────────────────────────────────────────
  const [topic, setTopic] = useState(initialTopic);
  const [pillar, setPillar] = useState(initialPillar);

  // ── Slack notification ────────────────────────────────────────────────────
  const notifySlack = async (stage: 'checkpoint-outline' | 'checkpoint-publish') => {
    try {
      await fetch('/api/notify/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, topic, pillar }),
      });
    } catch { /* non-blocking — never fail the pipeline */ }
  };

  // ── Auto-start when triggered from feed ───────────────────────────────────
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStart && !autoStarted.current && initialTopic && initialPillar) {
      autoStarted.current = true;
      runSourceAndResearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [blogType, setBlogType] = useState<BlogType>('standard');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [namedAuthor, setNamedAuthor] = useState('');
  const [supportingLinks, setSupportingLinks] = useState('');

  // ── Pipeline state ────────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState('');

  // ── Research ──────────────────────────────────────────────────────────────
  const [sources, setSources] = useState<ReviewedSource[]>([]);
  const [researchSummary, setResearchSummary] = useState('');
  const [sourceOverrides, setSourceOverrides] = useState<Record<number, 'INCLUDE' | 'SKIP'>>({});

  // ── Outline ───────────────────────────────────────────────────────────────
  const [outline, setOutline] = useState('');
  const [editedOutline, setEditedOutline] = useState('');

  // ── Enhancement outputs ───────────────────────────────────────────────────
  const [draft, setDraft] = useState('');
  const [factCheckReport, setFactCheckReport] = useState('');
  const [verificationReport, setVerificationReport] = useState('');
  const [seoReport, setSeoReport] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [headlines, setHeadlines] = useState<HeadlineOption[]>([]);
  const [selectedHeadline, setSelectedHeadline] = useState('');
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);

  // ── Misc ──────────────────────────────────────────────────────────────────
  const [saved, setSaved] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [webflowLoading, setWebflowLoading] = useState(false);
  const [webflowDone, setWebflowDone] = useState(false);

  const selectedDoc = researchDocs.find(d => d.id === selectedDocId);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function effectiveSources() {
    return sources.map(s => ({
      ...s,
      recommendation: sourceOverrides[s.index] ?? s.recommendation,
    }));
  }

  function gdSources() {
    return effectiveSources()
      .filter(s => s.source === 'gd' && (sourceOverrides[s.index] ?? s.recommendation) === 'INCLUDE')
      .map(s => ({ title: s.title, url: s.url, description: s.description }));
  }

  function setErr(msg: string, fallbackStage: Stage = 'idle') {
    setError(msg);
    setStage(fallbackStage);
  }

  async function callAgent(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `${url} failed`);
    return data;
  }

  function agentStatus(agent: typeof AGENT_CONFIG[0]): 'waiting' | 'running' | 'done' {
    const stageIdx = STAGE_ORDER.indexOf(stage);
    const activeIdx = STAGE_ORDER.indexOf(agent.activeAt);
    const completedIdx = STAGE_ORDER.indexOf(agent.completedBy);
    if (stageIdx >= completedIdx) return 'done';
    if (stageIdx === activeIdx) return 'running';
    return 'waiting';
  }

  // ── Stage 1: Source + Research ────────────────────────────────────────────

  async function runSourceAndResearch() {
    if (!topic.trim() || !pillar) return;
    setError('');
    setSources([]);
    setOutline('');
    setEditedOutline('');
    setDraft('');
    setQualityReport(null);
    setHeadlines([]);
    setSelectedHeadline('');

    try {
      // Source Agent
      setStage('sourcing');
      await callAgent('/api/pipeline/source', {
        topic, pillar, blogType, namedAuthor,
        researchContext: selectedDoc?.insights,
      });

      // Research Agents (1–3)
      setStage('researching');
      const data = await callAgent('/api/pipeline/research', { topic, pillar, supportingLinks });
      setSources(data.reviewedSources || []);
      setSourceOverrides({});
      setResearchSummary(data.summary || '');
      setStage('checkpoint-sources');
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Research failed');
    }
  }

  // ── Stage 2: Outline ──────────────────────────────────────────────────────

  async function runOutline() {
    setStage('outlining');
    setError('');
    try {
      const data = await callAgent('/api/pipeline/outline', {
        topic, pillar, blogType,
        sources: effectiveSources(),
        researchContext: selectedDoc?.insights,
      });
      setOutline(data.outline);
      setEditedOutline(data.outline);
      notifySlack('checkpoint-outline');
      setStage('checkpoint-outline');
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Outline generation failed', 'checkpoint-sources');
    }
  }

  // ── Stage 3: Enhancement Pipeline (auto-runs all agents) ──────────────────

  async function runEnhancementPipeline() {
    const outlineToUse = editedOutline || outline;
    const gd = gdSources();
    setError('');

    try {
      // Agent 6: Writer
      setStage('writing');
      const writerData = await callAgent('/api/pipeline/writer', {
        outline: outlineToUse, blogType,
        researchContext: selectedDoc?.insights,
        namedAuthor,
      });
      let currentDraft: string = writerData.draft;

      // Agent 7: GD References
      setStage('adding-references');
      const gdRefData = await callAgent('/api/pipeline/gd-references', {
        draft: currentDraft, gdSources: gd,
      });
      currentDraft = gdRefData.draft;

      // Agent 8: Fact Check
      setStage('fact-checking');
      const fcData = await callAgent('/api/pipeline/fact-check', { draft: currentDraft });
      currentDraft = fcData.draft;
      setFactCheckReport(fcData.factCheckReport || '');

      // Agent 9: Verify References — also strips broken/blocked links from draft
      setStage('verifying-refs');
      const vrData = await callAgent('/api/pipeline/verify-references', {
        draft: currentDraft, gdSources: gd,
      });
      setVerificationReport(vrData.verificationReport || '');
      if (vrData.draft) currentDraft = vrData.draft;

      // Agent 10: SEO
      setStage('running-seo');
      const seoData = await callAgent('/api/pipeline/seo', {
        draft: currentDraft, topic, pillar,
      });
      currentDraft = seoData.draft;
      setSeoReport(seoData.seoReport || '');

      // Agent 11: Internal Links
      setStage('linking');
      const ilData = await callAgent('/api/pipeline/internal-links', {
        draft: currentDraft, gdSources: gd,
      });
      currentDraft = ilData.draft;

      // Agent 12: Editor
      setStage('editing');
      const editorData = await callAgent('/api/pipeline/editor', { draft: currentDraft });
      currentDraft = editorData.draft;
      setEditNotes(editorData.editNotes || '');

      // Agent 13: Headline Generator
      setStage('generating-headlines');
      const hlData = await callAgent('/api/pipeline/headlines', {
        draft: currentDraft, topic, pillar,
      });
      const hl: HeadlineOption[] = hlData.headlines || [];
      setHeadlines(hl);
      if (hl.length > 0) setSelectedHeadline(hl[0].headline);

      // Agent 14: Quality Gate
      setStage('quality-check');
      const qgData = await callAgent('/api/pipeline/quality-gate', {
        draft: currentDraft, blogType,
      });
      setQualityReport(qgData.report || null);

      setDraft(currentDraft);
      notifySlack('checkpoint-publish');
      setStage('checkpoint-publish');

    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Enhancement pipeline failed', 'checkpoint-outline');
    }
  }

  // ── Stage 4: Publish + Social ─────────────────────────────────────────────

  async function runPublish() {
    setError('');
    try {
      setStage('publishing');
      await callAgent('/api/pipeline/publish', {
        draft, headline: selectedHeadline,
        pillar, blogType, author: namedAuthor,
      });

      setStage('distributing');
      const socialData = await callAgent('/api/generate-social', {
        contentType: 'blog',
        text: draft.slice(0, 4000),
        sourceName: selectedHeadline || topic,
      });

      const existing = JSON.parse(localStorage.getItem('gd_scheduler_posts') || '[]');
      const newPosts = (socialData.posts || []).map((p: { linkedin_copy: string; twitter_copy: string; stat?: string }) => ({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        title: selectedHeadline || topic,
        content: p.linkedin_copy,
        twitterContent: p.twitter_copy,
        scheduledDate: '',
        scheduledTime: '09:00',
        status: 'draft',
        charCount: p.linkedin_copy.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'pipeline',
      }));
      localStorage.setItem('gd_scheduler_posts', JSON.stringify([...existing, ...newPosts]));
      setStage('done');

    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Publishing failed', 'checkpoint-publish');
    }
  }

  function handleSave() {
    if (!draft) return;
    onSaveToLibrary({
      contentType: 'blog',
      title: (selectedHeadline || topic).slice(0, 80) || 'Pipeline Article',
      output: draft,
      metadata: { blogType },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleSchedule() {
    if (!draft) return;
    onSaveToLibrary({
      contentType: 'blog',
      title: (selectedHeadline || topic).slice(0, 80) || 'Pipeline Article',
      output: draft,
      metadata: { blogType },
      status: 'scheduled',
    });
    // Also save to scheduler
    const existing = JSON.parse(localStorage.getItem('gd_scheduler_posts') || '[]');
    existing.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      title: selectedHeadline || topic,
      content: draft.slice(0, 500),
      scheduledDate: '',
      scheduledTime: '09:00',
      status: 'scheduled',
      charCount: draft.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'pipeline',
    });
    localStorage.setItem('gd_scheduler_posts', JSON.stringify(existing));
    setScheduled(true);
  }

  async function handleWebflow() {
    if (!draft || webflowLoading) return;
    setWebflowLoading(true);
    try {
      await fetch('/api/publish/webflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedHeadline || topic,
          body: draft,
          pillar,
          blogType,
          author: namedAuthor,
        }),
      });
      setWebflowDone(true);
    } catch {
      // fail silently — show a toast in a real app
    } finally {
      setWebflowLoading(false);
    }
  }

  function resetPipeline() {
    setStage('idle');
    setSources([]);
    setOutline('');
    setEditedOutline('');
    setDraft('');
    setHeadlines([]);
    setSelectedHeadline('');
    setQualityReport(null);
    setFactCheckReport('');
    setVerificationReport('');
    setSeoReport('');
    setEditNotes('');
    setError('');
    setScheduled(false);
    setWebflowDone(false);
    setWebflowLoading(false);
  }

  // ── Derived: is a loading stage active? ──────────────────────────────────

  const isLoading = Boolean(STAGE_LABELS[stage]);
  const loadingLabel = STAGE_LABELS[stage];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT PANEL ── */}
      <div
        className="w-[340px] flex-shrink-0 flex flex-col border-r"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Blog Pipeline</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            16 agents — source → research → outline → write → enhance → publish
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">

          {/* Inputs — only shown at idle */}
          {stage === 'idle' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Topic <span style={{ color: '#c0392b' }}>*</span>
                </label>
                <textarea
                  rows={2}
                  className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. How private label is reshaping grocery margins in 2025"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Content pillar <span style={{ color: '#c0392b' }}>*</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CONTENT_PILLARS.map(p => (
                    <button key={p} onClick={() => setPillar(pillar === p ? '' : p)}
                      className="px-2.5 py-1.5 rounded-lg text-left text-xs transition-all"
                      style={{
                        background: pillar === p ? 'rgba(0,170,80,0.1)' : 'var(--background)',
                        border: `1px solid ${pillar === p ? 'var(--accent)' : 'var(--border)'}`,
                        color: pillar === p ? 'var(--accent)' : 'var(--text-primary)',
                        fontWeight: pillar === p ? 600 : 400,
                      }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Article format
                </label>
                <div className="space-y-1">
                  {BLOG_TYPES.map(bt => (
                    <button key={bt.id} onClick={() => setBlogType(bt.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-xs transition-all"
                      style={{
                        background: blogType === bt.id ? 'rgba(0,170,80,0.1)' : 'var(--background)',
                        border: `1px solid ${blogType === bt.id ? 'var(--accent)' : 'var(--border)'}`,
                        color: blogType === bt.id ? 'var(--accent)' : 'var(--text-primary)',
                      }}>
                      <span className="font-medium">{bt.label}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>— {bt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {blogType === 'thought-leadership' && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Named author <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="e.g. Gaurav Pant, Chief Insights Officer"
                    value={namedAuthor}
                    onChange={e => setNamedAuthor(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              )}

              {researchDocs.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Ground in research (optional)
                  </label>
                  <select
                    className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: selectedDocId ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                    value={selectedDocId}
                    onChange={e => setSelectedDocId(e.target.value)}
                  >
                    <option value="">No research document</option>
                    {researchDocs.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Supporting links <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder={"Paste URLs to articles, studies, or data sources you want the pipeline to reference:\nhttps://...\nhttps://..."}
                  value={supportingLinks}
                  onChange={e => setSupportingLinks(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>
          )}

          {/* Agent map — always visible, below inputs */}
          <div className="py-3 px-3 rounded-xl space-y-1.5 mb-4 mt-4"
            style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
            {AGENT_CONFIG.map((agent, i) => (
              <div key={agent.label}>
                {(i === 1 || i === 4 || i === 5 || i === 14) && (
                  <div className="my-1.5 border-t" style={{ borderColor: 'var(--border)' }} />
                )}
                <AgentStep
                  number={i + 1}
                  label={agent.label}
                  status={agentStatus(agent)}
                />
              </div>
            ))}
          </div>

          {/* Sources — persistent once fetched, visible throughout pipeline */}
          {sources.length > 0 && stage !== 'idle' && stage !== 'sourcing' && stage !== 'researching' && (
            <SourcesAccordion sources={sources} sourceOverrides={sourceOverrides} />
          )}

          {/* Quality score — shown at publish checkpoint */}
          {stage === 'checkpoint-publish' && qualityReport && (
            <div className="mb-4 p-3 rounded-xl"
              style={{ background: qualityReport.passed ? 'rgba(0,170,80,0.08)' : 'rgba(220,50,50,0.08)', border: `1px solid ${qualityReport.passed ? 'rgba(0,170,80,0.3)' : 'rgba(220,50,50,0.3)'}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Quality Score</span>
                <span className="text-lg font-bold" style={{ color: qualityReport.passed ? 'var(--accent)' : '#dc3232' }}>
                  {qualityReport.score}/100
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full mb-2" style={{ background: 'var(--border)' }}>
                <div className="h-1.5 rounded-full transition-all"
                  style={{ width: `${qualityReport.score}%`, background: qualityReport.passed ? 'var(--accent)' : '#dc3232' }} />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{qualityReport.recommendation}</p>
              {qualityReport.issues.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {qualityReport.issues.map((issue, i) => (
                    <p key={i} className="text-xs" style={{ color: '#dc3232' }}>⚠ {issue}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg mt-2"
              style={{ background: '#fff0f0', color: '#c0392b', border: '1px solid #fecaca' }}>
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* CTA area */}
        <div className="p-4 border-t space-y-2 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>

          {stage === 'idle' && (
            <button onClick={runSourceAndResearch}
              disabled={!topic.trim() || !pillar}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: !topic.trim() || !pillar ? 'var(--text-secondary)' : 'var(--accent)', cursor: !topic.trim() || !pillar ? 'not-allowed' : 'pointer' }}>
              <Sparkles size={14} />Start Pipeline
            </button>
          )}

          {stage === 'checkpoint-sources' && (
            <button onClick={runOutline}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--accent)' }}>
              <Edit3 size={13} />Build Outline →
            </button>
          )}

          {stage === 'checkpoint-outline' && (
            <button onClick={runEnhancementPipeline}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--accent)' }}>
              <Sparkles size={13} />Write & Enhance →
            </button>
          )}

          {stage === 'checkpoint-publish' && (
            <div className="space-y-2">
              <button onClick={runPublish}
                disabled={!selectedHeadline}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white"
                style={{ background: selectedHeadline ? 'var(--accent)' : 'var(--text-secondary)', cursor: selectedHeadline ? 'pointer' : 'not-allowed' }}>
                <Send size={13} />Approve & Publish →
              </button>
              <button onClick={() => { setStage('checkpoint-outline'); setDraft(''); setQualityReport(null); }}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <RefreshCw size={11} />Request Revisions
              </button>
            </div>
          )}

          {stage === 'done' && (
            <div className="space-y-2">
              <div className="text-xs text-center py-2 rounded-lg font-medium"
                style={{ background: 'rgba(0,170,80,0.1)', color: 'var(--accent)' }}>
                ✓ Published — social posts saved to Scheduler
              </div>
              {/* Save */}
              <button onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium"
                style={{ background: saved ? '#e8fdf0' : 'var(--background)', border: `1px solid ${saved ? '#22c55e' : 'var(--border)'}`, color: saved ? '#16a34a' : 'var(--text-secondary)' }}>
                <BookOpen size={13} />{saved ? 'Saved to Library ✓' : 'Save to Library'}
              </button>
              {/* Schedule */}
              <button onClick={handleSchedule}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
                style={{ background: scheduled ? 'rgba(59,130,246,0.1)' : 'var(--background)', border: `1px solid ${scheduled ? '#3b82f6' : 'var(--border)'}`, color: scheduled ? '#3b82f6' : 'var(--text-secondary)' }}>
                <CalendarClock size={13} />{scheduled ? 'Scheduled ✓' : 'Schedule'}
              </button>
              {/* Move to Webflow */}
              <button onClick={handleWebflow}
                disabled={webflowLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
                style={{ background: webflowDone ? 'rgba(99,102,241,0.1)' : 'var(--background)', border: `1px solid ${webflowDone ? '#6366f1' : 'var(--border)'}`, color: webflowDone ? '#6366f1' : 'var(--text-secondary)', opacity: webflowLoading ? 0.6 : 1 }}>
                {webflowLoading
                  ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: '#6366f1' }} />Pushing to Webflow…</>
                  : webflowDone
                    ? <><ExternalLink size={13} />In Webflow ✓</>
                    : <><ExternalLink size={13} />Move to Webflow</>
                }
              </button>
              {/* Delete / restart */}
              <button onClick={resetPipeline}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: '#ef4444' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--background)'; }}>
                <Trash2 size={13} />Delete & Start Over
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-3 text-xs"
              style={{ color: 'var(--text-secondary)' }}>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'rgba(0,170,80,0.3)', borderTopColor: 'var(--accent)' }} />
              {loadingLabel}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>

        {/* IDLE */}
        {stage === 'idle' && (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center max-w-sm">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(0,170,80,0.1)' }}>
                <Sparkles size={22} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>16-agent blog pipeline</div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Enter a topic and pillar to start. The pipeline runs source validation, research, outlining, writing, GD referencing, fact-checking, SEO, internal linking, editing, headline generation, and quality gate — with human review at outline and before publishing.
              </p>
            </div>
          </div>
        )}

        {/* LOADING STATES */}
        {(stage === 'sourcing' || stage === 'researching') && (
          <Spinner label="Running source & research agents…" />
        )}
        {stage === 'outlining' && (
          <Spinner label="Building article outline…" />
        )}
        {(stage === 'writing' || stage === 'adding-references' || stage === 'fact-checking' ||
          stage === 'verifying-refs' || stage === 'running-seo' || stage === 'linking' ||
          stage === 'editing' || stage === 'generating-headlines' || stage === 'quality-check') && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-5 max-w-xs">
              <div className="flex items-center justify-center gap-2.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full animate-bounce"
                    style={{ background: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <div>
                <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  {loadingLabel}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Running agents sequentially — no interruptions needed
                </div>
              </div>
              {/* Mini progress bar showing position in enhancement pipeline */}
              <div className="w-48 mx-auto">
                <div className="h-1 rounded-full" style={{ background: 'var(--border)' }}>
                  <div className="h-1 rounded-full transition-all"
                    style={{
                      background: 'var(--accent)',
                      width: `${Math.round(
                        (['writing','adding-references','fact-checking','verifying-refs','running-seo','linking','editing','generating-headlines','quality-check']
                          .indexOf(stage) + 1) / 9 * 100
                      )}%`,
                    }} />
                </div>
                <div className="text-[10px] mt-1 text-center" style={{ color: 'var(--text-secondary)' }}>
                  Step {['writing','adding-references','fact-checking','verifying-refs','running-seo','linking','editing','generating-headlines','quality-check'].indexOf(stage) + 1} of 9
                </div>
              </div>
            </div>
          </div>
        )}
        {(stage === 'publishing' || stage === 'distributing') && (
          <Spinner label={loadingLabel} />
        )}

        {/* CHECKPOINT: SOURCES */}
        {stage === 'checkpoint-sources' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto">
              <div className="mb-5">
                <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent)' }}>Research complete</div>
                <h3 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Review Sources</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{researchSummary}</p>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>Toggle sources on or off before building the outline.</p>
              </div>
              <div className="space-y-2">
                {sources.map(s => {
                  const rec = sourceOverrides[s.index] ?? s.recommendation;
                  const included = rec === 'INCLUDE';
                  return (
                    <div key={s.index}
                      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all"
                      style={{
                        background: included ? 'rgba(0,170,80,0.05)' : 'var(--background)',
                        border: `1px solid ${included ? 'rgba(0,170,80,0.2)' : 'var(--border)'}`,
                      }}
                      onClick={() => setSourceOverrides(prev => ({ ...prev, [s.index]: included ? 'SKIP' : 'INCLUDE' }))}>
                      <div className="mt-0.5 flex-shrink-0" style={{ color: included ? 'var(--accent)' : 'var(--text-secondary)' }}>
                        {included ? <CheckCircle size={14} /> : <Circle size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{s.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              background: s.source === 'gd' ? 'rgba(0,170,80,0.15)' : 'rgba(100,100,100,0.1)',
                              color: s.source === 'gd' ? 'var(--accent)' : 'var(--text-secondary)',
                            }}>
                            {s.source === 'gd' ? 'Grocery Doppio' : s.sourceType}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              background: s.relevance === 'High' ? 'rgba(0,170,80,0.1)' : s.relevance === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(200,200,200,0.1)',
                              color: s.relevance === 'High' ? 'var(--accent)' : s.relevance === 'Medium' ? '#d97706' : 'var(--text-secondary)',
                            }}>
                            {s.relevance}
                          </span>
                        </div>
                        <p className="text-xs mb-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{s.description}</p>
                        <a href={s.url} target="_blank" rel="noreferrer"
                          className="text-[10px] flex items-center gap-1 w-fit"
                          style={{ color: 'var(--accent)' }}
                          onClick={e => e.stopPropagation()}>
                          <ExternalLink size={9} />{s.url.replace(/^https?:\/\//, '').slice(0, 60)}
                        </a>
                        {s.reason && <p className="text-[10px] mt-1 italic" style={{ color: 'var(--text-secondary)' }}>{s.reason}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CHECKPOINT 1: OUTLINE (human review) */}
        {stage === 'checkpoint-outline' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent)' }}>
                    Checkpoint 1 — Human review required
                  </div>
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Review & Approve Outline</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Edit the outline before writing begins. The writer follows this exactly. Click "Write & Enhance" when ready.
                  </p>
                </div>
                <button onClick={() => setEditedOutline(outline)}
                  className="text-xs flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-lg"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={11} />Reset
                </button>
              </div>
              <textarea
                className="w-full text-sm rounded-xl p-5 outline-none resize-none font-mono"
                style={{
                  background: 'var(--background)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', minHeight: '520px', lineHeight: 1.7,
                }}
                value={editedOutline}
                onChange={e => setEditedOutline(e.target.value)}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>
        )}

        {/* CHECKPOINT 2: PUBLISH (human review + headline selection) */}
        {stage === 'checkpoint-publish' && draft && (
          <div className="flex-1 overflow-y-auto">
            {/* Headline selection */}
            {headlines.length > 0 && (
              <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="max-w-3xl mx-auto">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent)' }}>
                    Checkpoint 2 — Select a headline before publishing
                  </div>
                  <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Choose Headline</h3>
                  <div className="space-y-2">
                    {headlines.map((hl, i) => (
                      <div key={i}
                        className="p-3 rounded-lg cursor-pointer transition-all"
                        style={{
                          background: selectedHeadline === hl.headline ? 'rgba(0,170,80,0.08)' : 'var(--background)',
                          border: `1px solid ${selectedHeadline === hl.headline ? 'var(--accent)' : 'var(--border)'}`,
                        }}
                        onClick={() => setSelectedHeadline(hl.headline)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>{hl.headline}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{hl.reason}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
                              {hl.type}
                            </span>
                            <span className="text-xs font-bold" style={{ color: hl.score >= 8 ? 'var(--accent)' : 'var(--text-secondary)' }}>
                              {hl.score}/10
                            </span>
                            {selectedHeadline === hl.headline && (
                              <CheckCircle size={14} style={{ color: 'var(--accent)' }} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Article preview */}
            <div className="flex-1">
              <OutputPanel content={draft} isLoading={false} contentType="blog" />
            </div>

            {/* Agent reports accordion */}
            <div className="p-6 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
              <div className="max-w-3xl mx-auto space-y-2">
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Agent Reports</p>
                <ReportAccordion title="Fact-Check Report" content={factCheckReport} />
                <ReportAccordion title="Reference Verification Report" content={verificationReport} />
                <ReportAccordion title="SEO Report" content={seoReport} />
                <ReportAccordion title="Editor Notes" content={editNotes} />
                {qualityReport && (
                  <ReportAccordion
                    title={`Quality Gate — ${qualityReport.score}/100 ${qualityReport.passed ? '✓ PASS' : '✗ FAIL'}`}
                    content={qualityReport.checks.map(c => `${c.passed ? '✓' : '✗'} ${c.name} (${c.score}/10): ${c.note}`).join('\n')}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* DONE */}
        {stage === 'done' && draft && (
          <OutputPanel content={draft} isLoading={false} contentType="blog" />
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  Sparkles, BookOpen, AlertCircle, Copy, Check, ChevronRight,
  Mail, Clock, Users, MessageSquare, Video, Calendar, Link, Loader2,
} from 'lucide-react';
import { LibraryItem, ResearchDoc } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────────

type SequenceMode = 'event' | 'lead';

interface ParsedEmail {
  label: string;
  content: string;
}

interface NurtureEmailsPipelineProps {
  onSaveToLibrary: (item: Omit<LibraryItem, 'id' | 'createdAt'>) => void;
  researchDocs?: ResearchDoc[];
}

function buildResearchContext(docs: ResearchDoc[]): string {
  const usable = docs.filter(d => (d.extractedText || d.insights).trim());
  if (!usable.length) return '';
  return 'UPLOADED RESEARCH — use as additional context and reference:\n\n' +
    usable.map(d => `[${d.name}]\n${(d.extractedText || d.insights).slice(0, 3000)}`).join('\n\n---\n\n');
}

// ─── Email metadata ──────────────────────────────────────────────────────────────

const EVENT_EMAIL_META = [
  { label: 'One Day Away',          icon: Clock,         color: '#6366f1', note: 'Sent day before · all registrants' },
  { label: '30 Minutes To Go',      icon: Clock,         color: '#f59e0b', note: 'Sent 35 min before · all registrants' },
  { label: 'We Missed You',         icon: MessageSquare, color: '#ef4444', note: 'Sent day after · non-attendees' },
  { label: 'Thank You for Joining', icon: Check,         color: '#10b981', note: 'Sent day after · attendees' },
];

const LEAD_EMAIL_META = [
  { label: 'Day 0 — Welcome',    icon: Mail,    color: '#6366f1', note: 'Immediate · deliver value, set expectations' },
  { label: 'Day 3 — Insight',    icon: Sparkles,color: '#3b82f6', note: 'Curated finding relevant to their role' },
  { label: 'Day 7 — Case Study', icon: Check,   color: '#8b5cf6', note: 'Real-world application or example' },
  { label: 'Day 12 — Offer',     icon: Calendar,color: '#f59e0b', note: 'Primary CTA — event, demo, conversation' },
  { label: 'Day 17 — Follow-up', icon: MessageSquare, color: '#10b981', note: 'Light check-in, no pressure' },
];

const ENTRY_POINTS = [
  'Downloaded a report or whitepaper',
  'Downloaded a Market Snapshot',
  'Registered for a webinar',
  'Attended a webinar',
  'Attended an in-person event',
  'Signed up for the newsletter',
  'Requested a demo',
  'Inbound sales contact',
];


const AUDIENCE_TYPES = [
  'Grocery retailer — C-suite (CEO, CDO, CTO, CIO)',
  'Grocery retailer — VP / Director level',
  'Grocery technology vendor / solution provider',
  'CPG brand manager',
  'Retail media / advertising team',
  'Analyst / investor',
];

// ─── EmailViewer ────────────────────────────────────────────────────────────────

function EmailViewer({ emails, meta }: {
  emails: ParsedEmail[];
  meta: typeof EVENT_EMAIL_META;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const active = emails[activeIndex];

  const handleCopy = async () => {
    if (!active?.content) return;
    await navigator.clipboard.writeText(active.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Split content into meta fields and body
  const lines = active?.content?.split('\n') ?? [];
  const metaLines: string[] = [];
  const bodyLines: string[] = [];
  let pastMeta = false;

  for (const line of lines) {
    const isMeta = !pastMeta && (
      line.startsWith('Timing:') || line.startsWith('Email name:') ||
      line.startsWith('From:') || line.startsWith('Subject:') || line.startsWith('Preview:')
    );
    if (isMeta) {
      metaLines.push(line);
    } else if (!pastMeta && line.trim() === '' && metaLines.length > 0) {
      pastMeta = true;
    } else {
      pastMeta = true;
      bodyLines.push(line);
    }
  }

  const body = bodyLines.join('\n').trim();
  const activeMeta = meta[activeIndex];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex-shrink-0 px-4 pt-4 pb-0 flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {meta.map((m, i) => {
          const isActive = i === activeIndex;
          const hasContent = !!emails[i]?.content;
          return (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); setCopied(false); }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-t-lg text-[11px] font-medium flex-shrink-0 transition-all"
              style={{
                background: isActive ? 'var(--background)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
                opacity: hasContent ? 1 : 0.35,
              }}
            >
              <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                style={{ background: isActive ? 'var(--accent)' : 'var(--border)', color: isActive ? 'white' : 'var(--text-secondary)' }}>
                {i + 1}
              </span>
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--background)' }}>
        {active?.content ? (
          <div className="max-w-2xl mx-auto px-8 py-6 space-y-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: `${activeMeta.color}15`, color: activeMeta.color }}>
              <ChevronRight size={10} />
              {activeMeta.note}
            </div>

            {metaLines.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {metaLines.map((line, i) => {
                  const colonIdx = line.indexOf(':');
                  const key = line.slice(0, colonIdx);
                  const val = line.slice(colonIdx + 1).trim();
                  return (
                    <div key={i} className="flex gap-3 px-4 py-2.5 text-xs"
                      style={{ borderBottom: i < metaLines.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--surface)' }}>
                      <span className="font-semibold w-20 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{key}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{val}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>Body</div>
              {body.split('\n\n').filter(Boolean).map((para, i) => (
                <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                  {para}
                </p>
              ))}
            </div>

            <button onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: copied ? '#e8fdf0' : 'var(--surface)',
                border: `1px solid ${copied ? '#22c55e' : 'var(--border)'}`,
                color: copied ? '#16a34a' : 'var(--text-secondary)',
              }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy email'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Generate the sequence to see this email
          </div>
        )}
      </div>
    </div>
  );
}

// ─── IdlePlaceholder ────────────────────────────────────────────────────────────

function IdlePlaceholder({ mode }: { mode: SequenceMode }) {
  const items = mode === 'event' ? EVENT_EMAIL_META : LEAD_EMAIL_META;
  const title = mode === 'event' ? 'Event Nurture Sequence' : 'Lead Nurture Sequence';
  const description = mode === 'event'
    ? 'Fill in your event details to generate all 4 emails — ready for your ESP.'
    : 'Specify the entry point and audience to generate a 5-email nurture arc.';
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12 py-16 gap-8">
      <div className="text-center max-w-md space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2" style={{ background: '#f0eeff' }}>
          <Mail size={26} style={{ color: 'var(--accent)' }} />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>
      <div className="w-full max-w-md space-y-2">
        {items.map((e, i) => {
          const Icon = e.icon;
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${e.color}15` }}>
                <Icon size={13} style={{ color: e.color }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{i + 1}. {e.label}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{e.note}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function NurtureEmailsPipeline({ onSaveToLibrary, researchDocs = [] }: NurtureEmailsPipelineProps) {
  const [mode, setMode] = useState<SequenceMode>('lead');

  // ── Event fields ─────────────────────────────────────────────────────────────
  const [eventType, setEventType]       = useState<'webinar' | 'in-person'>('webinar');
  const [eventPageUrl, setEventPageUrl] = useState('');
  const [eventPageContent, setEventPageContent] = useState('');
  const [fetchingUrl, setFetchingUrl]   = useState(false);
  const [fetchError, setFetchError]     = useState('');
  const [eventName, setEventName]       = useState('');
  const [eventShortName, setEventShortName] = useState('');
  const [eventDate, setEventDate]       = useState('');
  const [eventTime, setEventTime]       = useState('12:00 PM');
  const [timezone, setTimezone]         = useState('ET');
  const [sessionTopics, setSessionTopics] = useState('');
  const [speakers, setSpeakers]         = useState('');
  const [joinLink, setJoinLink]         = useState('');

  // ── Lead fields ──────────────────────────────────────────────────────────────
  const [entryPoint, setEntryPoint]   = useState('');
  const [audience, setAudience]       = useState('');
  const [topic, setTopic]             = useState('');
  const [goals, setGoals]             = useState('');
  const [assetUrl, setAssetUrl]       = useState('');

  // ── Shared ───────────────────────────────────────────────────────────────────
  const [senderName, setSenderName]   = useState('');
  const [senderTitle, setSenderTitle] = useState('');
  const [senderEmail, setSenderEmail] = useState('');

  const [emails, setEmails]       = useState<ParsedEmail[]>([]);
  const [rawOutput, setRawOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');
  const [saved, setSaved]         = useState(false);

  const switchMode = (m: SequenceMode) => {
    setMode(m);
    setEmails([]);
    setRawOutput('');
    setError('');
    setSaved(false);
  };

  // ── Fetch event page URL ─────────────────────────────────────────────────────

  const handleFetchUrl = async () => {
    if (!eventPageUrl.trim()) return;
    setFetchingUrl(true);
    setFetchError('');
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: eventPageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch URL');
      setEventPageContent(data.content || '');
      // Auto-fill event name from first non-empty line if blank
      if (!eventName.trim() && data.content) {
        const firstLine = data.content.split('\n').find((l: string) => l.trim().length > 5);
        if (firstLine) setEventName(firstLine.trim().slice(0, 120));
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setFetchingUrl(false);
    }
  };

  // ── Generate ─────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    setEmails([]);
    setSaved(false);

    try {
      const researchContext = buildResearchContext(researchDocs);
      if (mode === 'event') {
        const res = await fetch('/api/pipeline/nurture-emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName, eventShortName, eventDate, eventTime, timezone,
            sessionTopics, speakers, senderName, senderTitle, senderEmail, joinLink,
            eventType, eventPageContent, researchContext,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setEmails(data.emails || []);
        setRawOutput(data.raw || '');
      } else {
        const res = await fetch('/api/pipeline/lead-nurture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entryPoint, audience, topic, goals, senderName, senderTitle, senderEmail, assetUrl, researchContext }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setEmails(data.emails || []);
        setRawOutput(data.raw || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!rawOutput) return;
    const title = mode === 'event'
      ? `${eventShortName || eventName} — Event Nurture`
      : `${topic || entryPoint} — Lead Nurture`;
    onSaveToLibrary({ contentType: 'email-sequence', title, output: rawOutput, metadata: { mode }, status: 'saved' });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const canGenerate = !isLoading && senderName.trim() && (
    mode === 'event'
      ? (eventName.trim() && eventDate.trim())
      : (entryPoint.trim() && audience.trim() && topic.trim())
  );

  const currentMeta = mode === 'event' ? EVENT_EMAIL_META : LEAD_EMAIL_META;
  const loadingLabel = mode === 'event' ? 'Writing 4 emails…' : 'Writing 5-email sequence…';
  const loadingSub = mode === 'event'
    ? '1-day reminder · 30-min alert · Missed you · Thank you'
    : 'Welcome · Insight · Case study · Offer · Follow-up';

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel ── */}
      <div className="w-[380px] flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="p-6 flex-1 space-y-5">

          <div>
            <h2 className="text-lg font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Email Sequence</h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Choose a sequence type, fill in the details, and generate all emails at once.
            </p>
          </div>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'lead'  as SequenceMode, label: 'Lead Nurture',  icon: Users,    sub: '5 emails · entry point + audience' },
              { id: 'event' as SequenceMode, label: 'Event Nurture', icon: Calendar, sub: '4 emails · in-person or webinar' },
            ]).map(({ id, label, icon: Icon, sub }) => (
              <button key={id} onClick={() => switchMode(id)}
                className="flex flex-col items-start gap-1 py-3 px-3 rounded-xl text-left transition-all"
                style={{
                  background: mode === id ? '#f0eeff' : 'var(--background)',
                  border: `1.5px solid ${mode === id ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                <div className="flex items-center gap-1.5">
                  <Icon size={13} style={{ color: mode === id ? 'var(--accent)' : 'var(--text-secondary)' }} />
                  <span className="text-xs font-semibold" style={{ color: mode === id ? 'var(--accent)' : 'var(--text-primary)' }}>{label}</span>
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{sub}</span>
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* ── Event mode fields ── */}
          {mode === 'event' && (
            <>
              {/* URL fetch */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Event page URL <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional — auto-fills details)</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 rounded-lg"
                    style={{ background: 'var(--background)', border: `1px solid ${eventPageContent ? '#22c55e' : 'var(--border)'}` }}>
                    <Link size={13} style={{ color: eventPageContent ? '#22c55e' : 'var(--text-secondary)', flexShrink: 0 }} />
                    <input type="url" className="flex-1 text-sm py-2.5 outline-none bg-transparent"
                      style={{ color: 'var(--text-primary)' }}
                      placeholder="https://..."
                      value={eventPageUrl} onChange={e => { setEventPageUrl(e.target.value); setEventPageContent(''); setFetchError(''); }}
                      disabled={isLoading || fetchingUrl} />
                  </div>
                  <button onClick={handleFetchUrl} disabled={!eventPageUrl.trim() || fetchingUrl || isLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium flex-shrink-0 transition-all"
                    style={{
                      background: eventPageContent ? '#e8fdf0' : '#f0eeff',
                      color: eventPageContent ? '#16a34a' : 'var(--accent)',
                      opacity: (!eventPageUrl.trim() || isLoading) ? 0.5 : 1,
                      cursor: (!eventPageUrl.trim() || isLoading) ? 'not-allowed' : 'pointer',
                    }}>
                    {fetchingUrl ? <Loader2 size={12} className="animate-spin" /> : eventPageContent ? <Check size={12} /> : <Sparkles size={12} />}
                    {fetchingUrl ? 'Fetching…' : eventPageContent ? 'Fetched' : 'Fetch'}
                  </button>
                </div>
                {fetchError && <p className="text-[11px] mt-1" style={{ color: '#c0392b' }}>{fetchError}</p>}
                {eventPageContent && <p className="text-[11px] mt-1" style={{ color: '#16a34a' }}>Page content fetched — will be used to enrich the emails.</p>}
              </div>

              {/* Event type */}
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'webinar' as const,    label: 'Webinar',         icon: Video },
                  { id: 'in-person' as const,  label: 'In-Person Event', icon: Users },
                ]).map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setEventType(id)}
                    className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: eventType === id ? '#f0eeff' : 'var(--background)',
                      border: `1px solid ${eventType === id ? 'var(--accent)' : 'var(--border)'}`,
                      color: eventType === id ? 'var(--accent)' : 'var(--text-secondary)',
                    }}>
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>

              {[
                { label: 'Full event name *', value: eventName, set: setEventName, placeholder: 'e.g. AI in Grocery 2025 – Doppio Discovery Series' },
                { label: 'Short name (for subject lines)', value: eventShortName, set: setEventShortName, placeholder: 'e.g. AI in Grocery 2025' },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{label}</label>
                  <input type="text" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder={placeholder} value={value} onChange={e => set(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    disabled={isLoading} />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Date *</label>
                  <input type="text" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="e.g. Tuesday, 26 Aug 2025" value={eventDate} onChange={e => setEventDate(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')} disabled={isLoading} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Time</label>
                  <div className="flex gap-1.5">
                    <input type="text" className="flex-1 text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                      style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      placeholder="12:00 PM" value={eventTime} onChange={e => setEventTime(e.target.value)}
                      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')} disabled={isLoading} />
                    <select className="text-xs rounded-lg px-2 py-2.5 outline-none"
                      style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      value={timezone} onChange={e => setTimezone(e.target.value)} disabled={isLoading}>
                      {['ET', 'CT', 'MT', 'PT', 'GMT', 'BST', 'CET'].map(tz => <option key={tz}>{tz}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Session topics / agenda</label>
                <textarea rows={4} className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder={"One per line:\nReimagining the Grocery Supply Chain with AI\nFrom Pilots to Enterprise Scale"}
                  value={sessionTopics} onChange={e => setSessionTopics(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} disabled={isLoading} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Speakers (name + org)</label>
                <textarea rows={3} className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder={"Jane Doe, FMI\nJohn Smith, Blue Yonder"}
                  value={speakers} onChange={e => setSpeakers(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} disabled={isLoading} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Join link <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                </label>
                <input type="url" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="https://..." value={joinLink} onChange={e => setJoinLink(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} disabled={isLoading} />
              </div>
            </>
          )}

          {/* ── Lead mode fields ── */}
          {mode === 'lead' && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Entry point <span style={{ color: '#c0392b' }}>*</span>
                </label>
                <div className="space-y-1.5">
                  {ENTRY_POINTS.map(ep => (
                    <button key={ep} onClick={() => setEntryPoint(ep)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                      style={{
                        background: entryPoint === ep ? '#f0eeff' : 'var(--background)',
                        border: `1px solid ${entryPoint === ep ? 'var(--accent)' : 'var(--border)'}`,
                        color: entryPoint === ep ? 'var(--accent)' : 'var(--text-secondary)',
                      }}>
                      {ep}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Audience <span style={{ color: '#c0392b' }}>*</span>
                </label>
                <div className="space-y-1.5">
                  {AUDIENCE_TYPES.map(a => (
                    <button key={a} onClick={() => setAudience(a)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                      style={{
                        background: audience === a ? '#f0eeff' : 'var(--background)',
                        border: `1px solid ${audience === a ? 'var(--accent)' : 'var(--border)'}`,
                        color: audience === a ? 'var(--accent)' : 'var(--text-secondary)',
                      }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Topic / content asset <span style={{ color: '#c0392b' }}>*</span>
                </label>
                <input type="text" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. State of Digital Grocery 2025 report"
                  value={topic} onChange={e => setTopic(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} disabled={isLoading} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Goals for this sequence <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                </label>
                <textarea rows={2} className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. Book a discovery call, invite to upcoming webinar, grow newsletter subscribers"
                  value={goals} onChange={e => setGoals(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} disabled={isLoading} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Asset URL <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                </label>
                <input type="url" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="https://grocerydoppio.com/..."
                  value={assetUrl} onChange={e => setAssetUrl(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} disabled={isLoading} />
              </div>
            </>
          )}

          {/* ── Sender (shared) ── */}
          <div style={{ height: 1, background: 'var(--border)' }} />
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Sender</p>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Name <span style={{ color: '#c0392b' }}>*</span></label>
              <input type="text" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder="e.g. Sumit" value={senderName} onChange={e => setSenderName(e.target.value)}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')} disabled={isLoading} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Title</label>
                <input type="text" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. VP, Research" value={senderTitle} onChange={e => setSenderTitle(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} disabled={isLoading} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Email</label>
                <input type="email" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="name@..." value={senderEmail} onChange={e => setSenderEmail(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} disabled={isLoading} />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg" style={{ background: '#fff0f0', color: '#c0392b' }}>
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="p-5 border-t flex-shrink-0 space-y-2" style={{ borderColor: 'var(--border)' }}>
          <button onClick={handleGenerate} disabled={!canGenerate}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: !canGenerate ? 'var(--text-secondary)' : 'var(--accent)', cursor: !canGenerate ? 'not-allowed' : 'pointer' }}>
            {isLoading
              ? <><div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} />{loadingLabel}</>
              : <><Sparkles size={15} />Generate Sequence</>}
          </button>
          {rawOutput && (
            <button onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
              style={{
                background: saved ? '#e8fdf0' : 'var(--background)',
                border: `1px solid ${saved ? '#22c55e' : 'var(--border)'}`,
                color: saved ? '#16a34a' : 'var(--text-secondary)',
              }}>
              <BookOpen size={13} />{saved ? 'Saved to Library ✓' : 'Save to Library'}
            </button>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <div className="w-12 h-12 rounded-full border-4 animate-spin" style={{ borderColor: '#e0d9ff', borderTopColor: 'var(--accent)' }} />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{loadingLabel}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{loadingSub}</p>
            </div>
          </div>
        ) : emails.length > 0 ? (
          <EmailViewer emails={emails} meta={currentMeta} />
        ) : (
          <IdlePlaceholder mode={mode} />
        )}
      </div>
    </div>
  );
}

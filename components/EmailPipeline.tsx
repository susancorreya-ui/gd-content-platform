'use client';

import { useState, useRef } from 'react';
import {
  Calendar, Users, Sparkles, BookOpen, AlertCircle, Link,
  Loader2, CheckCircle, X, Copy, Check,
} from 'lucide-react';
import { LibraryItem, ResearchDoc } from '@/types';
import OutputPanel from './OutputPanel';

// ─── Types ──────────────────────────────────────────────────────────────────────

type EmailSubtype = 'event-invite' | 'sales-outreach';

interface EmailPipelineProps {
  onSaveToLibrary: (item: Omit<LibraryItem, 'id' | 'createdAt'>) => void;
  researchDocs?: ResearchDoc[];
}

function buildResearchContext(docs: ResearchDoc[]): string {
  const usable = docs.filter(d => (d.extractedText || d.insights).trim());
  if (!usable.length) return '';
  return 'UPLOADED RESEARCH — use as additional context and reference:\n\n' +
    usable.map(d => `[${d.name}]\n${(d.extractedText || d.insights).slice(0, 3000)}`).join('\n\n---\n\n');
}

const EVENT_FORMATS = ['Virtual / Webinar', 'In-Person', 'Hybrid'];

// ─── IdlePlaceholder ────────────────────────────────────────────────────────────

function IdlePlaceholder({ subtype }: { subtype: EmailSubtype }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12 py-16 gap-6">
      <div className="text-center max-w-sm space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2" style={{ background: '#f0eeff' }}>
          {subtype === 'event-invite' ? <Calendar size={26} style={{ color: 'var(--accent)' }} /> : <Users size={26} style={{ color: 'var(--accent)' }} />}
        </div>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {subtype === 'event-invite' ? 'Event Invitation Email' : 'Sales Outreach Email'}
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {subtype === 'event-invite'
            ? 'Paste the event URL — the system fetches the page, pulls the details, and writes the invite.'
            : 'Fill in the prospect context and the system writes a personalised, direct outreach email.'}
        </p>
      </div>
      <div className="w-full max-w-sm rounded-2xl p-5 space-y-2.5" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Output</p>
        {(subtype === 'event-invite'
          ? ['Subject line', 'Preview text', 'Hook + agenda bullets', 'Event logistics', 'Register CTA']
          : ['Subject line', 'Preview text', 'Personalised opener', 'Value proposition', 'Low-friction CTA']
        ).map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-primary)' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function EmailPipeline({ onSaveToLibrary, researchDocs = [] }: EmailPipelineProps) {
  const [subtype, setSubtype] = useState<EmailSubtype>('event-invite');

  // Event invite fields
  const [eventUrl, setEventUrl]       = useState('');
  const [eventContent, setEventContent] = useState('');
  const [eventName, setEventName]     = useState('');
  const [eventDate, setEventDate]     = useState('');
  const [eventFormat, setEventFormat] = useState(EVENT_FORMATS[0]);
  const [audience, setAudience]       = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [urlLoaded, setUrlLoaded]     = useState(false);
  const [urlError, setUrlError]       = useState('');

  // Sales outreach fields
  const [prospectCompany, setProspectCompany]   = useState('');
  const [prospectRole, setProspectRole]         = useState('');
  const [prospectContext, setProspectContext]   = useState('');
  const [offer, setOffer]                       = useState('');
  const [ctaText, setCtaText]                   = useState('');

  // Shared
  const [senderName, setSenderName]   = useState('');
  const [senderTitle, setSenderTitle] = useState('');

  const [output, setOutput]   = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);
  const [copied, setCopied]   = useState(false);

  // ── URL fetch ─────────────────────────────────────────────────────────────────

  const fetchEventPage = async () => {
    if (!eventUrl.trim()) return;
    setFetchingUrl(true);
    setUrlError('');
    setUrlLoaded(false);
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: eventUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setEventContent(data.text || '');
      setUrlLoaded(true);
      // Auto-fill name if empty
      if (!eventName) {
        const firstLine = (data.text || '').split(/[\n.]/)[0].trim().slice(0, 80);
        if (firstLine.length > 5) setEventName(firstLine);
      }
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Could not fetch URL');
    } finally {
      setFetchingUrl(false);
    }
  };

  // ── Generate ─────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    setOutput('');
    setSaved(false);
    try {
      const res = await fetch('/api/pipeline/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtype,
          eventContent, eventUrl, eventName, eventDate, eventFormat, audience,
          prospectCompany, prospectRole, prospectContext, offer, ctaText,
          senderName, senderTitle,
          researchContext: buildResearchContext(researchDocs),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOutput(data.output || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!output) return;
    const title = subtype === 'event-invite'
      ? `Event Invite — ${eventName || eventUrl || 'Untitled'}`
      : `Sales Outreach — ${prospectCompany || 'Prospect'}`;
    onSaveToLibrary({ contentType: 'email', title, output, metadata: { subtype }, status: 'saved' });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const switchSubtype = (t: EmailSubtype) => {
    setSubtype(t);
    setOutput('');
    setError('');
    setSaved(false);
  };

  const canGenerate = !isLoading && senderName.trim() && (
    subtype === 'event-invite'
      ? (urlLoaded || eventName.trim())
      : (prospectCompany.trim())
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel ── */}
      <div className="w-[380px] flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="p-6 flex-1 space-y-5">

          <div>
            <h2 className="text-lg font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Email</h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              One targeted email — event invitation or sales outreach.
            </p>
          </div>

          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'event-invite'  as EmailSubtype, label: 'Event Invite',    icon: Calendar, sub: 'Drive registrations' },
              { id: 'sales-outreach' as EmailSubtype, label: 'Sales Outreach', icon: Users,    sub: 'Open a conversation' },
            ]).map(({ id, label, icon: Icon, sub }) => (
              <button key={id} onClick={() => switchSubtype(id)}
                className="flex flex-col items-start gap-1 py-3 px-3 rounded-xl text-left transition-all"
                style={{
                  background: subtype === id ? '#f0eeff' : 'var(--background)',
                  border: `1.5px solid ${subtype === id ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                <div className="flex items-center gap-1.5">
                  <Icon size={13} style={{ color: subtype === id ? 'var(--accent)' : 'var(--text-secondary)' }} />
                  <span className="text-xs font-semibold" style={{ color: subtype === id ? 'var(--accent)' : 'var(--text-primary)' }}>{label}</span>
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{sub}</span>
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* ── Event Invite fields ── */}
          {subtype === 'event-invite' && (
            <>
              {/* URL fetch */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Event page URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    className="flex-1 text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="https://..."
                    value={eventUrl}
                    onChange={e => { setEventUrl(e.target.value); setUrlLoaded(false); setUrlError(''); setEventContent(''); }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    onKeyDown={e => e.key === 'Enter' && fetchEventPage()}
                    disabled={isLoading}
                  />
                  <button
                    onClick={fetchEventPage}
                    disabled={!eventUrl.trim() || fetchingUrl || isLoading}
                    className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 flex-shrink-0 transition-all"
                    style={{
                      background: urlLoaded ? '#e8fdf0' : '#f0eeff',
                      color: urlLoaded ? '#16a34a' : 'var(--accent)',
                      opacity: !eventUrl.trim() ? 0.5 : 1,
                    }}>
                    {fetchingUrl ? <Loader2 size={12} className="animate-spin" />
                      : urlLoaded ? <CheckCircle size={12} />
                      : <Link size={12} />}
                    {urlLoaded ? 'Fetched' : 'Fetch'}
                  </button>
                </div>
                {urlError && <p className="mt-1 text-[11px]" style={{ color: '#c0392b' }}>{urlError}</p>}
                {urlLoaded && (
                  <p className="mt-1 text-[11px]" style={{ color: '#16a34a' }}>
                    Page content loaded — {(eventContent.length / 1000).toFixed(0)}k characters extracted
                  </p>
                )}
              </div>

              {/* Event name */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Event name <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(auto-filled from URL, or enter manually)</span>
                </label>
                <input
                  type="text"
                  className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. AI in Grocery 2025"
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  disabled={isLoading}
                />
              </div>

              {/* Date + Format */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Date</label>
                  <input
                    type="text"
                    className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="e.g. Sept 28–Oct 1"
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Format</label>
                  <div className="space-y-1">
                    {EVENT_FORMATS.map(f => (
                      <button key={f} onClick={() => setEventFormat(f)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all"
                        style={{
                          background: eventFormat === f ? '#f0eeff' : 'var(--background)',
                          border: `1px solid ${eventFormat === f ? 'var(--accent)' : 'var(--border)'}`,
                          color: eventFormat === f ? 'var(--accent)' : 'var(--text-secondary)',
                        }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Audience */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Target audience <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. CDOs and digital VPs at top 100 grocers"
                  value={audience}
                  onChange={e => setAudience(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {/* ── Sales Outreach fields ── */}
          {subtype === 'sales-outreach' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Company <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="e.g. Kroger"
                    value={prospectCompany}
                    onChange={e => setProspectCompany(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Role / title</label>
                  <input
                    type="text"
                    className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="e.g. Chief Digital Officer"
                    value={prospectRole}
                    onChange={e => setProspectRole(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Context / personalisation hook
                </label>
                <textarea
                  rows={3}
                  className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. Kroger just announced a $500M investment in digital infrastructure; they've been expanding online grocery aggressively"
                  value={prospectContext}
                  onChange={e => setProspectContext(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  What we're offering
                </label>
                <textarea
                  rows={2}
                  className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. Grocery Doppio intelligence platform — benchmarking, research, and digital performance data for grocery leaders"
                  value={offer}
                  onChange={e => setOffer(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  CTA <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. 15-minute call, quick demo, coffee at NRF"
                  value={ctaText}
                  onChange={e => setCtaText(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {/* ── Sender (shared) ── */}
          <div style={{ height: 1, background: 'var(--border)' }} />
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Sender</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Name <span style={{ color: '#c0392b' }}>*</span></label>
                <input type="text" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. Sumit" value={senderName} onChange={e => setSenderName(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} disabled={isLoading} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Title</label>
                <input type="text" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. VP, Research" value={senderTitle} onChange={e => setSenderTitle(e.target.value)}
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
              ? <><div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} />Writing email…</>
              : <><Sparkles size={15} />Generate Email</>}
          </button>
          {output && (
            <div className="flex gap-2">
              <button onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: copied ? '#e8fdf0' : 'var(--background)',
                  border: `1px solid ${copied ? '#22c55e' : 'var(--border)'}`,
                  color: copied ? '#16a34a' : 'var(--text-secondary)',
                }}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: saved ? '#e8fdf0' : 'var(--background)',
                  border: `1px solid ${saved ? '#22c55e' : 'var(--border)'}`,
                  color: saved ? '#16a34a' : 'var(--text-secondary)',
                }}>
                <BookOpen size={12} />
                {saved ? 'Saved ✓' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>
        {!output && !isLoading
          ? <IdlePlaceholder subtype={subtype} />
          : <OutputPanel content={output} isLoading={isLoading} contentType="email" onRegenerate={output ? handleGenerate : undefined} />}
      </div>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import {
  Video, Calendar, FileText, Upload, X, Loader2, BookOpen, AlertCircle, Link, CheckCircle,
} from 'lucide-react';
import { LibraryItem } from '@/types';
import OutputPanel from './OutputPanel';

// ─── Types ──────────────────────────────────────────────────────────────────────

type ScriptType = 'event-recap' | 'derivative';

type DerivativeSourceType =
  | 'grocer-performance'
  | 'market-snapshot'
  | 'blog'
  | 'report';

interface VideoScriptPipelineProps {
  onSaveToLibrary: (item: Omit<LibraryItem, 'id' | 'createdAt'>) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const DERIVATIVE_SOURCE_TYPES: { id: DerivativeSourceType; label: string; desc: string }[] = [
  { id: 'grocer-performance', label: 'Grocer Performance',  desc: 'Earnings / quarterly results' },
  { id: 'market-snapshot',   label: 'Market Snapshot',     desc: 'Intelligence brief' },
  { id: 'blog',              label: 'Blog / Article',      desc: 'Long-form editorial' },
  { id: 'report',            label: 'Research Report',     desc: 'Full-length report or whitepaper' },
];

const VIDEO_FORMATS: string[] = [
  'LinkedIn video (60–90 sec)',
  'YouTube (90–120 sec)',
  'YouTube Short / Instagram Reel (30–60 sec)',
];

// ─── IdlePlaceholder ────────────────────────────────────────────────────────────

function IdlePlaceholder({ scriptType }: { scriptType: ScriptType }) {
  if (scriptType === 'event-recap') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-12 py-16 gap-8">
        <div className="text-center max-w-md space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2" style={{ background: '#f0eeff' }}>
            <Calendar size={26} style={{ color: 'var(--accent)' }} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Event Recap Script</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Generates a shot-by-shot script with footage notes and captions — ready for your video editor.
          </p>
        </div>
        <div className="w-full max-w-md rounded-2xl p-5 space-y-3" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Output structure</p>
          {[
            { label: 'Shot 1',   note: 'Venue / arrival footage' },
            { label: 'Shot 2–3', note: 'Networking and atmosphere' },
            { label: 'Shot 4',   note: 'Fireside chat / keynote' },
            { label: 'Shot 5+',  note: 'Highlights and close' },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--text-primary)' }}>{s.label}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{s.note}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12 py-16 gap-8">
      <div className="text-center max-w-md space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2" style={{ background: '#f0eeff' }}>
          <FileText size={26} style={{ color: 'var(--accent)' }} />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Derivative Asset Script</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Converts a report, market snapshot, or article into a narrated video script with numbered key points and platform metadata.
        </p>
      </div>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-3" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Output structure</p>
        {[
          { label: 'Intro',           note: 'Context + bridge to points' },
          { label: 'Number 1–4+',     note: 'Titled, data-anchored points' },
          { label: 'Closing',         note: 'Takeaway + CTA' },
          { label: 'Video Metadata',  note: 'GD page, thumbnail, YouTube' },
        ].map((s, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-primary)' }}>{s.label}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{s.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function VideoScriptPipeline({ onSaveToLibrary }: VideoScriptPipelineProps) {
  const [scriptType, setScriptType] = useState<ScriptType>('derivative');

  // Event recap fields
  const [eventName, setEventName]     = useState('');
  const [eventDate, setEventDate]     = useState('');
  const [venue, setVenue]             = useState('');
  const [eventSummary, setEventSummary] = useState('');
  const [keyMoments, setKeyMoments]   = useState('');
  const [speakers, setSpeakers]       = useState('');

  // Derivative fields
  const [sourceType, setSourceType]     = useState<DerivativeSourceType>('grocer-performance');
  const [title, setTitle]               = useState('');
  const [sourceContent, setSourceContent] = useState('');
  const [ctaUrl, setCtaUrl]             = useState('');

  // Shared
  const [format, setFormat]   = useState(VIDEO_FORMATS[0]);
  const [output, setOutput]   = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL fetching
  const [eventUrl, setEventUrl]         = useState('');
  const [fetchingEvent, setFetchingEvent] = useState(false);
  const [eventUrlLoaded, setEventUrlLoaded] = useState(false);
  const [eventUrlError, setEventUrlError] = useState('');
  const [sourceUrl, setSourceUrl]         = useState('');
  const [fetchingSource, setFetchingSource] = useState(false);
  const [sourceUrlLoaded, setSourceUrlLoaded] = useState(false);
  const [sourceUrlError, setSourceUrlError] = useState('');

  // ── File upload (derivative: paste or upload doc) ────────────────────────────

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError('');
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/pipeline/ms-upload-doc', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSourceContent(data.text || '');
      if (!title) setTitle(data.name.replace(/\.(pdf|docx|txt)$/i, ''));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── URL fetch helpers ────────────────────────────────────────────────────────

  const fetchEventUrl = async () => {
    if (!eventUrl.trim()) return;
    setFetchingEvent(true);
    setEventUrlError('');
    setEventUrlLoaded(false);
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: eventUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Populate event summary if empty, otherwise append
      setEventSummary(prev => prev ? `${prev}\n\n${data.text}` : data.text);
      setEventUrlLoaded(true);
    } catch (err) {
      setEventUrlError(err instanceof Error ? err.message : 'Could not fetch URL');
    } finally {
      setFetchingEvent(false);
    }
  };

  const fetchSourceUrl = async () => {
    if (!sourceUrl.trim()) return;
    setFetchingSource(true);
    setSourceUrlError('');
    setSourceUrlLoaded(false);
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sourceUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSourceContent(prev => prev ? `${prev}\n\n${data.text}` : data.text);
      setSourceUrlLoaded(true);
    } catch (err) {
      setSourceUrlError(err instanceof Error ? err.message : 'Could not fetch URL');
    } finally {
      setFetchingSource(false);
    }
  };

  // ── Generate ─────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    setOutput('');
    setSaved(false);

    try {
      if (scriptType === 'event-recap') {
        const res = await fetch('/api/pipeline/vs-event-recap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventName, eventDate, venue, summary: eventSummary, keyMoments, speakers, format }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setOutput(data.output || '');
      } else {
        const res = await fetch('/api/pipeline/vs-derivative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceType, sourceContent, title, format, ctaUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setOutput(data.output || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!output) return;
    const saveTitle = scriptType === 'event-recap' ? (eventName || 'Event Recap') : (title || 'Video Script');
    onSaveToLibrary({ contentType: 'video-script', title: saveTitle, output, metadata: { scriptType }, status: 'saved' });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const switchType = (t: ScriptType) => {
    setScriptType(t);
    setOutput('');
    setError('');
    setSaved(false);
    setEventUrlLoaded(false);
    setEventUrlError('');
    setSourceUrlLoaded(false);
    setSourceUrlError('');
  };

  const canGenerate = scriptType === 'event-recap'
    ? !!(eventName.trim() && eventSummary.trim())
    : !!(sourceContent.trim());

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel ── */}
      <div
        className="w-[380px] flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="p-6 flex-1 space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Video Script</h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Shot-by-shot event recaps or narrated scripts from reports and market snapshots.
            </p>
          </div>

          {/* Script type toggle */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'event-recap' as ScriptType, label: 'Event Recap',      icon: Calendar },
              { id: 'derivative' as ScriptType,  label: 'Derivative Asset', icon: FileText },
            ] as { id: ScriptType; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => switchType(id)}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-center text-xs font-medium transition-all"
                style={{
                  background: scriptType === id ? '#f0eeff' : 'var(--background)',
                  border: `1.5px solid ${scriptType === id ? 'var(--accent)' : 'var(--border)'}`,
                  color: scriptType === id ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Video format */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Video format</label>
            <div className="space-y-1.5">
              {VIDEO_FORMATS.map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                  style={{
                    background: format === f ? '#f0eeff' : 'var(--background)',
                    border: `1px solid ${format === f ? 'var(--accent)' : 'var(--border)'}`,
                    color: format === f ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* ─ Event Recap fields ─ */}
          {scriptType === 'event-recap' && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Event name <span style={{ color: '#c0392b' }}>*</span>
                </label>
                <input
                  type="text"
                  className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. Speakeasy @ NRF 2026"
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Date</label>
                  <input
                    type="text"
                    className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="e.g. Jan 12, 2026"
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Venue</label>
                  <input
                    type="text"
                    className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="e.g. Zuma New York"
                    value={venue}
                    onChange={e => setVenue(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Event summary <span style={{ color: '#c0392b' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. The 11th Annual Speakeasy brought together senior retail leaders for networking and a fireside chat ahead of NRF's BIG Show."
                  value={eventSummary}
                  onChange={e => setEventSummary(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Key moments (one per line)</label>
                <textarea
                  rows={5}
                  className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder={`- Arrivals and cocktail hour at Zuma\n- Networking among 60+ retail leaders\n- Fireside chat with Kevin Ertell\n- Preview of "Strategy Trap" book insights\n- Partner thank-you moment`}
                  value={keyMoments}
                  onChange={e => setKeyMoments(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Speakers / fireside chats <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                </label>
                <textarea
                  rows={2}
                  className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. Kevin Ertell — author, Strategy Trap; hosted by Dave Smith"
                  value={speakers}
                  onChange={e => setSpeakers(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Event page URL <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    className="flex-1 text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="https://..."
                    value={eventUrl}
                    onChange={e => { setEventUrl(e.target.value); setEventUrlLoaded(false); setEventUrlError(''); }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    onKeyDown={e => e.key === 'Enter' && fetchEventUrl()}
                  />
                  <button
                    onClick={fetchEventUrl}
                    disabled={!eventUrl.trim() || fetchingEvent}
                    className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 flex-shrink-0 transition-all"
                    style={{
                      background: eventUrlLoaded ? '#e8fdf0' : '#f0eeff',
                      color: eventUrlLoaded ? '#16a34a' : 'var(--accent)',
                      opacity: !eventUrl.trim() ? 0.5 : 1,
                    }}
                  >
                    {fetchingEvent
                      ? <Loader2 size={12} className="animate-spin" />
                      : eventUrlLoaded
                        ? <CheckCircle size={12} />
                        : <Link size={12} />}
                    {eventUrlLoaded ? 'Loaded' : 'Fetch'}
                  </button>
                </div>
                {eventUrlError && <p className="mt-1 text-[11px]" style={{ color: '#c0392b' }}>{eventUrlError}</p>}
                {eventUrlLoaded && <p className="mt-1 text-[11px]" style={{ color: '#16a34a' }}>Page content added to event summary</p>}
              </div>
            </>
          )}

          {/* ─ Derivative fields ─ */}
          {scriptType === 'derivative' && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Source type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {DERIVATIVE_SOURCE_TYPES.map(st => (
                    <button
                      key={st.id}
                      onClick={() => setSourceType(st.id)}
                      className="text-left px-3 py-2 rounded-lg text-xs transition-all"
                      style={{
                        background: sourceType === st.id ? '#f0eeff' : 'var(--background)',
                        border: `1px solid ${sourceType === st.id ? 'var(--accent)' : 'var(--border)'}`,
                        color: sourceType === st.id ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      <span className="font-medium block">{st.label}</span>
                      <span style={{ opacity: 0.7 }}>{st.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Title <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. Walmart Q4 2025 Results"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Source content <span style={{ color: '#c0392b' }}>*</span>
                </label>

                {/* URL fetch */}
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    className="flex-1 text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="Paste a URL to fetch content…"
                    value={sourceUrl}
                    onChange={e => { setSourceUrl(e.target.value); setSourceUrlLoaded(false); setSourceUrlError(''); }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    onKeyDown={e => e.key === 'Enter' && fetchSourceUrl()}
                  />
                  <button
                    onClick={fetchSourceUrl}
                    disabled={!sourceUrl.trim() || fetchingSource}
                    className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 flex-shrink-0 transition-all"
                    style={{
                      background: sourceUrlLoaded ? '#e8fdf0' : '#f0eeff',
                      color: sourceUrlLoaded ? '#16a34a' : 'var(--accent)',
                      opacity: !sourceUrl.trim() ? 0.5 : 1,
                    }}
                  >
                    {fetchingSource
                      ? <Loader2 size={12} className="animate-spin" />
                      : sourceUrlLoaded
                        ? <CheckCircle size={12} />
                        : <Link size={12} />}
                    {sourceUrlLoaded ? 'Loaded' : 'Fetch'}
                  </button>
                </div>
                {sourceUrlError && <p className="mb-1 text-[11px]" style={{ color: '#c0392b' }}>{sourceUrlError}</p>}
                {sourceUrlLoaded && <p className="mb-1 text-[11px]" style={{ color: '#16a34a' }}>Page content loaded into source</p>}

                {/* Upload button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={e => handleFileUpload(e.target.files)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs mb-2 transition-all"
                  style={{
                    background: 'var(--background)',
                    border: '1.5px dashed var(--border)',
                    color: uploading ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: uploading ? 'default' : 'pointer',
                  }}
                >
                  {uploading
                    ? <><Loader2 size={12} className="animate-spin" />Extracting text…</>
                    : <><Upload size={12} />Upload PDF, DOCX, or TXT</>}
                </button>
                {uploadError && (
                  <p className="mb-2 text-[11px]" style={{ color: '#c0392b' }}>{uploadError}</p>
                )}

                <textarea
                  rows={8}
                  className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="Paste the source content here — earnings report, market snapshot, blog post, or research findings. Or upload a file above."
                  value={sourceContent}
                  onChange={e => setSourceContent(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
                {sourceContent && (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      {(sourceContent.length / 1000).toFixed(0)}k characters
                    </span>
                    <button
                      onClick={() => setSourceContent('')}
                      className="text-[11px] flex items-center gap-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <X size={10} />Clear
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  CTA URL <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="grocerydoppio.com"
                  value={ctaUrl}
                  onChange={e => setCtaUrl(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </>
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
          <button
            onClick={handleGenerate}
            disabled={isLoading || !canGenerate}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: (isLoading || !canGenerate) ? 'var(--text-secondary)' : 'var(--accent)',
              cursor: (isLoading || !canGenerate) ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading
              ? <><div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} />Generating…</>
              : <><Video size={15} />Generate Script</>}
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

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>
        {!output && !isLoading
          ? <IdlePlaceholder scriptType={scriptType} />
          : <OutputPanel
              content={output}
              isLoading={isLoading}
              contentType="video-script"
              onRegenerate={output ? handleGenerate : undefined}
            />}
      </div>
    </div>
  );
}

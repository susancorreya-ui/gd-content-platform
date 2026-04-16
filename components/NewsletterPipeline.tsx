'use client';

import { useState } from 'react';
import {
  Link, CheckCircle, Loader2, X, Plus, Sparkles, BookOpen,
  AlertCircle, ChevronDown, ChevronUp, Calendar,
} from 'lucide-react';
import { LibraryItem } from '@/types';
import OutputPanel from './OutputPanel';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Story {
  id: string;
  url: string;
  fetchedContent: string;
  fetchedTitle: string;
  fetching: boolean;
  error: string;
  loaded: boolean;
}

interface EventTeaser {
  name: string;
  date: string;
  description: string;
  url: string;
}

interface NewsletterPipelineProps {
  onSaveToLibrary: (item: Omit<LibraryItem, 'id' | 'createdAt'>) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function makeStory(): Story {
  return { id: crypto.randomUUID(), url: '', fetchedContent: '', fetchedTitle: '', fetching: false, error: '', loaded: false };
}

function guessTitle(content: string, url: string): string {
  // Try to extract something title-like from the first 300 chars
  const first = content.slice(0, 300).trim();
  const firstLine = first.split(/[\n.]/)[0].trim();
  if (firstLine.length > 10 && firstLine.length < 100) return firstLine;
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

// ─── StoryRow ───────────────────────────────────────────────────────────────────

function StoryRow({
  story, index, onChange, onFetch, onRemove, disabled,
}: {
  story: Story;
  index: number;
  onChange: (url: string) => void;
  onFetch: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${story.loaded ? '#10b98130' : 'var(--border)'}` }}>
      {/* URL row */}
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: story.loaded ? '#f0fdf4' : 'var(--background)' }}>
        <span className="text-[11px] font-semibold w-4 text-center flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          {index + 1}
        </span>
        <input
          type="url"
          className="flex-1 text-xs outline-none bg-transparent"
          style={{ color: 'var(--text-primary)' }}
          placeholder="https://..."
          value={story.url}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && story.url.trim() && !story.fetching && onFetch()}
          disabled={disabled || story.fetching}
        />
        {story.loaded && !disabled && (
          <button onClick={() => onChange('')} className="flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
            <X size={11} />
          </button>
        )}
        <button
          onClick={onFetch}
          disabled={!story.url.trim() || story.fetching || disabled}
          className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all"
          style={{
            background: story.loaded ? '#dcfce7' : '#f0eeff',
            color: story.loaded ? '#16a34a' : 'var(--accent)',
            opacity: (!story.url.trim() || disabled) ? 0.4 : 1,
          }}
        >
          {story.fetching
            ? <Loader2 size={11} className="animate-spin" />
            : story.loaded
              ? <CheckCircle size={11} />
              : <Link size={11} />}
          {story.loaded ? 'Loaded' : 'Fetch'}
        </button>
        {!disabled && (
          <button onClick={onRemove} className="flex-shrink-0 ml-1" style={{ color: 'var(--text-secondary)' }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Status row */}
      {(story.loaded || story.error) && (
        <div className="px-4 py-1.5 text-[11px]" style={{
          background: story.error ? '#fff0f0' : '#f0fdf4',
          color: story.error ? '#c0392b' : '#15803d',
          borderTop: `1px solid ${story.error ? '#fecaca' : '#bbf7d0'}`,
        }}>
          {story.error ? story.error : story.fetchedTitle}
        </div>
      )}
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
          Doppio Direct Newsletter
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Add up to 5 story links, fetch their content, then generate the full newsletter — subject line, intro, and story blocks.
        </p>
      </div>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-3" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Output structure</p>
        {[
          { label: 'Subject line',    note: 'Doppio Direct: [Theme]' },
          { label: 'Intro paragraph', note: 'Unifying themes across stories' },
          { label: 'Story 1–5',       note: 'Headline · 2–4 sentences · CTA' },
          { label: 'Event teaser',    note: 'Optional — positioned last' },
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

export default function NewsletterPipeline({ onSaveToLibrary }: NewsletterPipelineProps) {
  const [stories, setStories] = useState<Story[]>([makeStory(), makeStory()]);
  const [editionDate, setEditionDate] = useState('');
  const [showEvent, setShowEvent] = useState(false);
  const [event, setEvent] = useState<EventTeaser>({ name: '', date: '', description: '', url: '' });

  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);

  // ── Story management ─────────────────────────────────────────────────────────

  const updateStory = (id: string, patch: Partial<Story>) =>
    setStories(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const fetchStory = async (id: string) => {
    const story = stories.find(s => s.id === id);
    if (!story || !story.url.trim() || story.fetching) return;
    updateStory(id, { fetching: true, error: '', loaded: false, fetchedContent: '', fetchedTitle: '' });
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: story.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      const title = guessTitle(data.text, story.url);
      updateStory(id, { fetching: false, loaded: true, fetchedContent: data.text, fetchedTitle: title });
    } catch (err) {
      updateStory(id, { fetching: false, error: err instanceof Error ? err.message : 'Failed to fetch', loaded: false });
    }
  };

  const fetchAll = async () => {
    const unfetched = stories.filter(s => s.url.trim() && !s.loaded && !s.fetching);
    if (unfetched.length === 0) return;
    setFetchingAll(true);
    await Promise.all(unfetched.map(s => fetchStory(s.id)));
    setFetchingAll(false);
  };

  const addStory = () => {
    if (stories.length >= 5) return;
    setStories(prev => [...prev, makeStory()]);
  };

  const removeStory = (id: string) => {
    if (stories.length <= 1) return;
    setStories(prev => prev.filter(s => s.id !== id));
  };

  const changeUrl = (id: string, url: string) =>
    updateStory(id, { url, loaded: false, fetchedContent: '', fetchedTitle: '', error: '' });

  // ── Generate ─────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    const loadedStories = stories.filter(s => s.loaded && s.fetchedContent);
    if (loadedStories.length === 0) return;
    setIsLoading(true);
    setError('');
    setOutput('');
    setSaved(false);
    try {
      const res = await fetch('/api/pipeline/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stories: loadedStories.map(s => ({ url: s.url, content: s.fetchedContent })),
          event: showEvent && event.name ? event : undefined,
          editionDate,
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
    onSaveToLibrary({
      contentType: 'newsletter',
      title: editionDate ? `Newsletter — ${editionDate}` : 'Doppio Direct Newsletter',
      output,
      metadata: { editionDate },
      status: 'saved',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const loadedCount = stories.filter(s => s.loaded).length;
  const pendingCount = stories.filter(s => s.url.trim() && !s.loaded && !s.fetching).length;
  const canGenerate = loadedCount > 0 && !isLoading;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel ── */}
      <div
        className="w-[400px] flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="p-6 flex-1 space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              Doppio Direct
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Add up to 5 story URLs — the platform fetches each one and writes the newsletter.
            </p>
          </div>

          {/* Edition date */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Edition date <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
            </label>
            <input
              type="text"
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
              style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="e.g. Tuesday, 29 April 2026"
              value={editionDate}
              onChange={e => setEditionDate(e.target.value)}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              disabled={isLoading}
            />
          </div>

          {/* Story URLs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                Stories
                <span className="ml-1.5 font-normal" style={{ color: 'var(--text-secondary)' }}>
                  ({loadedCount} fetched · {stories.length}/5 slots)
                </span>
              </label>
              {pendingCount > 0 && (
                <button
                  onClick={fetchAll}
                  disabled={fetchingAll || isLoading}
                  className="text-[11px] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-all"
                  style={{ background: '#f0eeff', color: 'var(--accent)', opacity: fetchingAll ? 0.6 : 1 }}
                >
                  {fetchingAll ? <Loader2 size={10} className="animate-spin" /> : <Link size={10} />}
                  Fetch all ({pendingCount})
                </button>
              )}
            </div>

            <div className="space-y-2">
              {stories.map((story, i) => (
                <StoryRow
                  key={story.id}
                  story={story}
                  index={i}
                  onChange={url => changeUrl(story.id, url)}
                  onFetch={() => fetchStory(story.id)}
                  onRemove={() => removeStory(story.id)}
                  disabled={isLoading}
                />
              ))}
            </div>

            {stories.length < 5 && (
              <button
                onClick={addStory}
                disabled={isLoading}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs transition-all"
                style={{ border: '1.5px dashed var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}
              >
                <Plus size={12} />Add story
              </button>
            )}
          </div>

          {/* Event teaser */}
          <div>
            <button
              onClick={() => setShowEvent(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: showEvent ? '#f0eeff' : 'var(--background)',
                border: `1px solid ${showEvent ? 'var(--accent)' : 'var(--border)'}`,
                color: showEvent ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              <span className="flex items-center gap-2">
                <Calendar size={13} />Tease an upcoming event
              </span>
              {showEvent ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showEvent && (
              <div className="mt-2 space-y-2.5 px-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Event name *</label>
                    <input
                      type="text"
                      className="w-full text-xs rounded-lg px-2.5 py-2 outline-none transition-colors"
                      style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      placeholder="e.g. Groceryshop 2025"
                      value={event.name}
                      onChange={e => setEvent(ev => ({ ...ev, name: e.target.value }))}
                      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Date</label>
                    <input
                      type="text"
                      className="w-full text-xs rounded-lg px-2.5 py-2 outline-none transition-colors"
                      style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      placeholder="e.g. Sept 28–Oct 1"
                      value={event.date}
                      onChange={e => setEvent(ev => ({ ...ev, date: e.target.value }))}
                      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Brief description</label>
                  <textarea
                    rows={2}
                    className="w-full text-xs rounded-lg px-2.5 py-2 resize-none outline-none transition-colors"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="e.g. 5,000+ grocery and CPG leaders, AI keynotes, networking at Mandalay Bay"
                    value={event.description}
                    onChange={e => setEvent(ev => ({ ...ev, description: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Event URL</label>
                  <input
                    type="url"
                    className="w-full text-xs rounded-lg px-2.5 py-2 outline-none transition-colors"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="https://..."
                    value={event.url}
                    onChange={e => setEvent(ev => ({ ...ev, url: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg" style={{ background: '#fff0f0', color: '#c0392b' }}>
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="p-5 border-t flex-shrink-0 space-y-2" style={{ borderColor: 'var(--border)' }}>
          {loadedCount === 0 && pendingCount > 0 && (
            <p className="text-[11px] text-center pb-1" style={{ color: 'var(--text-secondary)' }}>
              Fetch at least one story to generate
            </p>
          )}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: (!canGenerate) ? 'var(--text-secondary)' : 'var(--accent)',
              cursor: (!canGenerate) ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading
              ? <><div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} />Writing newsletter…</>
              : <><Sparkles size={15} />Generate Newsletter</>}
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
          ? <IdlePlaceholder />
          : <OutputPanel content={output} isLoading={isLoading} contentType="newsletter" onRegenerate={output ? handleGenerate : undefined} />}
      </div>
    </div>
  );
}

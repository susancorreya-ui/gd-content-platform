'use client';

import { useState, useMemo } from 'react';
import {
  Calendar, PenSquare, List, ChevronLeft, ChevronRight,
  Linkedin, Twitter, Sparkles, Trash2, CalendarCheck,
  Loader2, X, Copy, Check,
} from 'lucide-react';
import { useScheduler } from '@/lib/useScheduler';
import { ScheduledPost, SocialContentType, SocialPlatform } from '@/types';
import { ResearchDoc } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTENT_TYPES: { id: SocialContentType; label: string }[] = [
  { id: 'report',             label: 'Research Report' },
  { id: 'snapshot',           label: 'Market Snapshot' },
  { id: 'grocer-performance', label: 'Grocer Performance' },
  { id: 'blog',               label: 'Blog Article' },
  { id: 'webinar',            label: 'Webinar / Event' },
  { id: 'holiday',            label: 'Holiday / Seasonal' },
];

const STATUS_COLORS: Record<string, string> = {
  draft:     '#6b6880',
  scheduled: '#7c6ff7',
  published: '#22c55e',
};

const PLATFORM_COLOR: Record<SocialPlatform, string> = {
  linkedin: '#0a66c2',
  twitter:  '#000000',
};

type View = 'calendar' | 'composer' | 'posts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toISODate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  researchDocs: ResearchDoc[];
}

export default function SocialScheduler({ researchDocs }: Props) {
  const { posts, addPost, updatePost, removePost, getPostsForDate } = useScheduler();

  const [view, setView] = useState<View>('calendar');

  // Calendar state
  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Composer state
  const [contentType,     setContentType]     = useState<SocialContentType>('report');
  const [sourceText,      setSourceText]       = useState('');
  const [sourceName,      setSourceName]       = useState('');
  const [partner,         setPartner]          = useState('');
  const [thirdParty,      setThirdParty]       = useState('');
  const [eventDetails,    setEventDetails]     = useState('');
  const [selectedDocId,   setSelectedDocId]    = useState('');
  const [isGenerating,    setIsGenerating]     = useState(false);
  const [genError,        setGenError]         = useState('');
  const [generatedPosts,  setGeneratedPosts]   = useState<{
    label: string; stat: string | null; statDescription: string | null;
    linkedin_copy: string; twitter_copy: string; source_name: string;
  }[]>([]);
  const [scheduleDate,    setScheduleDate]     = useState('');
  const [scheduleTime,    setScheduleTime]     = useState('09:00');
  const [copiedId,        setCopiedId]         = useState<string | null>(null);

  // Posts filter state
  const [filterStatus,   setFilterStatus]     = useState<'all' | 'draft' | 'scheduled' | 'published'>('all');
  const [filterPlatform, setFilterPlatform]   = useState<'all' | 'linkedin' | 'twitter'>('all');

  // ── Calendar helpers ──────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const daysInMonth  = getDaysInMonth(calYear, calMonth);
    const firstDaySlot = getFirstDayOfMonth(calYear, calMonth);
    const daysInPrev   = getDaysInMonth(calYear, calMonth - 1);
    const cells: { date: string; day: number; current: boolean }[] = [];

    for (let i = firstDaySlot - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const m = calMonth === 0 ? 11 : calMonth - 1;
      const y = calMonth === 0 ? calYear - 1 : calYear;
      cells.push({ date: toISODate(y, m, d), day: d, current: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: toISODate(calYear, calMonth, d), day: d, current: true });
    }
    while (cells.length % 7 !== 0) {
      const d = cells.length - daysInMonth - firstDaySlot + 1;
      const m = calMonth === 11 ? 0 : calMonth + 1;
      const y = calMonth === 11 ? calYear + 1 : calYear;
      cells.push({ date: toISODate(y, m, d), day: d, current: false });
    }
    return cells;
  }, [calYear, calMonth]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    const selectedDoc = researchDocs.find(d => d.id === selectedDocId);
    const text = selectedDoc ? selectedDoc.insights : sourceText;
    const name = sourceName.trim() || selectedDoc?.name || 'Grocery Doppio Content';

    if (!text.trim()) { setGenError('Provide source text or select a research document.'); return; }

    setIsGenerating(true);
    setGenError('');
    setGeneratedPosts([]);

    try {
      const res = await fetch('/api/generate-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          text,
          sourceName: name,
          partner:          partner.trim()     || undefined,
          thirdPartySource: thirdParty.trim()  || undefined,
          eventDetails:     eventDetails.trim()|| undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedPosts(data.posts);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Schedule a post ───────────────────────────────────────────────────────

  const handleSchedule = (gp: typeof generatedPosts[0], platform: SocialPlatform) => {
    const content = platform === 'linkedin' ? gp.linkedin_copy : gp.twitter_copy;
    addPost({
      platform,
      content,
      stat:             gp.stat        ?? undefined,
      statDescription:  gp.statDescription ?? undefined,
      sourceName:       gp.source_name,
      sourceType:       contentType,
      scheduledDate:    scheduleDate || undefined,
      scheduledTime:    scheduleTime || undefined,
      status:           scheduleDate ? 'scheduled' : 'draft',
    });
  };

  // ── Copy to clipboard ─────────────────────────────────────────────────────

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Filtered posts ────────────────────────────────────────────────────────

  const filteredPosts = posts.filter(p =>
    (filterStatus   === 'all' || p.status   === filterStatus) &&
    (filterPlatform === 'all' || p.platform === filterPlatform)
  );

  const todayStr = toISODate(today.getFullYear(), today.getMonth(), today.getDate());

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel ── */}
      <div
        className="w-[260px] flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
            Social Scheduler
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            LinkedIn &amp; X / Twitter
          </p>
        </div>

        {/* View tabs */}
        <div className="p-3 space-y-1">
          {([
            { id: 'calendar', label: 'Calendar',  icon: <Calendar  size={14} /> },
            { id: 'composer', label: 'Composer',  icon: <PenSquare size={14} /> },
            { id: 'posts',    label: 'All Posts', icon: <List      size={14} /> },
          ] as { id: View; label: string; icon: React.ReactNode }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all text-sm"
              style={{
                background: view === tab.id ? 'var(--sidebar-active)' : 'transparent',
                color:      view === tab.id ? 'white' : 'var(--text-secondary)',
                fontWeight: view === tab.id ? 600 : 400,
              }}
            >
              <span style={{ color: view === tab.id ? 'var(--accent-light)' : 'inherit' }}>{tab.icon}</span>
              {tab.label}
              {tab.id === 'posts' && posts.length > 0 && (
                <span
                  className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  {posts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Composer inputs (only shown when composer view active) */}
        {view === 'composer' && (
          <div className="px-3 pb-4 space-y-4 flex-1">
            <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                Content type
              </label>
              <div className="space-y-1">
                {CONTENT_TYPES.map(ct => (
                  <button
                    key={ct.id}
                    onClick={() => setContentType(ct.id)}
                    className="w-full text-left text-xs px-2.5 py-2 rounded-lg transition-all"
                    style={{
                      background: contentType === ct.id ? '#f0eeff' : 'var(--background)',
                      border: `1px solid ${contentType === ct.id ? 'var(--accent)' : 'var(--border)'}`,
                      color:  contentType === ct.id ? 'var(--accent)' : 'var(--text-primary)',
                      fontWeight: contentType === ct.id ? 600 : 400,
                    }}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Source name */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                {contentType === 'holiday' ? 'Occasion' : contentType === 'webinar' ? 'Event name' : 'Source / report name'}
              </label>
              <input
                type="text"
                className="w-full text-xs rounded-lg px-3 py-2 outline-none"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder={contentType === 'holiday' ? 'e.g. Thanksgiving 2025' : contentType === 'webinar' ? 'e.g. Future of Grocery Retail' : 'e.g. State of Digital Grocery 2025'}
                value={sourceName}
                onChange={e => setSourceName(e.target.value)}
              />
            </div>

            {/* Research doc selector */}
            {contentType !== 'holiday' && researchDocs.length > 0 && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Use research doc
                </label>
                <select
                  className="w-full text-xs rounded-lg px-3 py-2 outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: selectedDocId ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                  value={selectedDocId}
                  onChange={e => setSelectedDocId(e.target.value)}
                >
                  <option value="">Paste text below instead</option>
                  {researchDocs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            {/* Source text */}
            {!selectedDocId && contentType !== 'holiday' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Source text
                </label>
                <textarea
                  rows={5}
                  className="w-full text-xs rounded-lg px-3 py-2 resize-none outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="Paste report text, article content, or key findings..."
                  value={sourceText}
                  onChange={e => setSourceText(e.target.value)}
                />
              </div>
            )}

            {/* Holiday context */}
            {contentType === 'holiday' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Extra context (optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full text-xs rounded-lg px-3 py-2 resize-none outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. Reference our annual conference or a big year for the team"
                  value={sourceText}
                  onChange={e => setSourceText(e.target.value)}
                />
              </div>
            )}

            {/* Partner (report/snapshot/playbook) */}
            {(contentType === 'report' || contentType === 'snapshot') && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Partner (optional)
                </label>
                <input
                  type="text"
                  className="w-full text-xs rounded-lg px-3 py-2 outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. Instacart, Symbotic"
                  value={partner}
                  onChange={e => setPartner(e.target.value)}
                />
              </div>
            )}

            {/* Third-party source (snapshot only) */}
            {contentType === 'snapshot' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Data source (optional)
                </label>
                <input
                  type="text"
                  className="w-full text-xs rounded-lg px-3 py-2 outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. NielsenIQ, FMI"
                  value={thirdParty}
                  onChange={e => setThirdParty(e.target.value)}
                />
              </div>
            )}

            {/* Event details (webinar only) */}
            {contentType === 'webinar' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Event details (optional)
                </label>
                <textarea
                  rows={2}
                  className="w-full text-xs rounded-lg px-3 py-2 resize-none outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="e.g. March 18, 2026 at 1pm ET — Speaker: Gaurav Pant, Incisiv"
                  value={eventDetails}
                  onChange={e => setEventDetails(e.target.value)}
                />
              </div>
            )}

            {/* Schedule date/time */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Schedule date (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 text-xs rounded-lg px-2 py-2 outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                />
                <input
                  type="time"
                  className="w-20 text-xs rounded-lg px-2 py-2 outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                />
              </div>
            </div>

            {genError && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ background: '#fff0f0', color: '#c0392b' }}>
                {genError}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white transition-all"
              style={{ background: isGenerating ? 'var(--text-secondary)' : 'var(--accent)', cursor: isGenerating ? 'not-allowed' : 'pointer' }}
            >
              {isGenerating
                ? <><Loader2 size={13} className="spinner" />Generating…</>
                : <><Sparkles size={13} />Generate Posts</>
              }
            </button>
          </div>
        )}

        {/* Posts filters (only shown in posts view) */}
        {view === 'posts' && (
          <div className="px-3 pb-4 space-y-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Status</label>
              {(['all','draft','scheduled','published'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg mb-1 transition-all capitalize"
                  style={{
                    background: filterStatus === s ? '#f0eeff' : 'transparent',
                    color: filterStatus === s ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: filterStatus === s ? 600 : 400,
                  }}
                >
                  {s === 'all' ? 'All posts' : s}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Platform</label>
              {(['all','linkedin','twitter'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPlatform(p)}
                  className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg mb-1 transition-all capitalize"
                  style={{
                    background: filterPlatform === p ? '#f0eeff' : 'transparent',
                    color: filterPlatform === p ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: filterPlatform === p ? 600 : 400,
                  }}
                >
                  {p === 'all' ? 'All platforms' : p === 'twitter' ? 'X / Twitter' : 'LinkedIn'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--background)' }}>

        {/* ── CALENDAR VIEW ── */}
        {view === 'calendar' && (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Month nav */}
            <div className="flex items-center gap-4 mb-5">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white transition-colors" style={{ border: '1px solid var(--border)' }}>
                <ChevronLeft size={14} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {MONTHS[calMonth]} {calYear}
              </h3>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white transition-colors" style={{ border: '1px solid var(--border)' }}>
                <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <button
                onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); }}
                className="ml-auto text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'white' }}
              >
                Today
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[11px] font-semibold py-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px" style={{ background: 'var(--border)' }}>
              {calendarDays.map(cell => {
                const dayPosts = getPostsForDate(cell.date);
                const isToday  = cell.date === todayStr;
                const isSelected = cell.date === selectedDate;
                return (
                  <div
                    key={cell.date}
                    onClick={() => setSelectedDate(isSelected ? null : cell.date)}
                    className="min-h-[90px] p-2 cursor-pointer transition-colors"
                    style={{
                      background: isSelected ? '#f0eeff' : isToday ? '#fafafa' : 'white',
                      opacity: cell.current ? 1 : 0.4,
                    }}
                  >
                    <span
                      className="text-[11px] font-semibold block mb-1 w-5 h-5 flex items-center justify-center rounded-full"
                      style={{
                        background: isToday ? 'var(--accent)' : 'transparent',
                        color: isToday ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {cell.day}
                    </span>
                    {dayPosts.slice(0, 3).map(p => (
                      <div
                        key={p.id}
                        className="text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate"
                        style={{
                          background: p.platform === 'linkedin' ? '#e8f0fe' : '#f0f0f0',
                          color: p.platform === 'linkedin' ? '#0a66c2' : '#333',
                          border: `1px solid ${p.platform === 'linkedin' ? '#c2d5fa' : '#ddd'}`,
                        }}
                      >
                        {p.platform === 'linkedin' ? 'Li' : 'X'} · {p.content.slice(0, 20)}…
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>+{dayPosts.length - 3} more</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected date detail */}
            {selectedDate && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Posts for {selectedDate}
                </h4>
                {getPostsForDate(selectedDate).length === 0 ? (
                  <div className="text-sm py-4 text-center rounded-xl" style={{ color: 'var(--text-secondary)', border: '1px dashed var(--border)', background: 'white' }}>
                    No posts scheduled. Go to Composer to create some.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getPostsForDate(selectedDate).map(p => (
                      <PostCard key={p.id} post={p} onUpdate={updatePost} onRemove={removePost} onCopy={handleCopy} copiedId={copiedId} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── COMPOSER VIEW ── */}
        {view === 'composer' && (
          <div className="flex-1 overflow-y-auto p-6">
            {generatedPosts.length === 0 && !isGenerating && (
              <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-secondary)' }}>
                <Sparkles size={40} style={{ opacity: 0.2 }} />
                <p className="text-sm">Fill in the form and click Generate Posts</p>
              </div>
            )}

            {isGenerating && (
              <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-secondary)' }}>
                <Loader2 size={32} className="spinner" style={{ color: 'var(--accent)' }} />
                <p className="text-sm">Generating posts…</p>
              </div>
            )}

            {generatedPosts.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Generated Posts — {generatedPosts[0]?.source_name}
                  </h3>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {scheduleDate ? `Scheduling for ${scheduleDate} at ${scheduleTime}` : 'No date set — will save as Draft'}
                  </span>
                </div>

                {generatedPosts.map((gp, i) => (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'white' }}>
                    {/* Stat card header */}
                    {gp.stat && (
                      <div className="px-5 py-3 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)', background: '#fafafa' }}>
                        <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{gp.stat}</div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{gp.statDescription}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--border)' }}>
                      {/* LinkedIn */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#0a66c2' }}>
                            <Linkedin size={13} /> LinkedIn
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleCopy(gp.linkedin_copy, `li-${i}`)}
                              className="p-1 rounded hover:bg-gray-100 transition-colors"
                              title="Copy"
                            >
                              {copiedId === `li-${i}` ? <Check size={12} color="#22c55e" /> : <Copy size={12} style={{ color: 'var(--text-secondary)' }} />}
                            </button>
                            <button
                              onClick={() => handleSchedule(gp, 'linkedin')}
                              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg font-medium transition-all"
                              style={{ background: '#f0eeff', color: 'var(--accent)' }}
                              title="Add to schedule"
                            >
                              <CalendarCheck size={11} /> Save
                            </button>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                          {gp.linkedin_copy}
                        </p>
                      </div>

                      {/* Twitter/X */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#333' }}>
                            <Twitter size={13} /> X / Twitter
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleCopy(gp.twitter_copy, `tw-${i}`)}
                              className="p-1 rounded hover:bg-gray-100 transition-colors"
                              title="Copy"
                            >
                              {copiedId === `tw-${i}` ? <Check size={12} color="#22c55e" /> : <Copy size={12} style={{ color: 'var(--text-secondary)' }} />}
                            </button>
                            <button
                              onClick={() => handleSchedule(gp, 'twitter')}
                              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg font-medium transition-all"
                              style={{ background: '#f0eeff', color: 'var(--accent)' }}
                              title="Add to schedule"
                            >
                              <CalendarCheck size={11} /> Save
                            </button>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                          {gp.twitter_copy}
                        </p>
                        <div className="mt-2 text-[11px]" style={{ color: gp.twitter_copy.length > 240 ? '#c0392b' : 'var(--text-secondary)' }}>
                          {gp.twitter_copy.length}/280 chars
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── POSTS VIEW ── */}
        {view === 'posts' && (
          <div className="flex-1 overflow-y-auto p-6">
            {filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-secondary)' }}>
                <List size={40} style={{ opacity: 0.2 }} />
                <p className="text-sm">No posts yet. Use the Composer to generate some.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
                </p>
                {filteredPosts.map(p => (
                  <PostCard key={p.id} post={p} onUpdate={updatePost} onRemove={removePost} onCopy={handleCopy} copiedId={copiedId} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PostCard sub-component ───────────────────────────────────────────────────

function PostCard({
  post, onUpdate, onRemove, onCopy, copiedId,
}: {
  post: ScheduledPost;
  onUpdate: (id: string, changes: Partial<ScheduledPost>) => void;
  onRemove: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);

  const statusColor = STATUS_COLORS[post.status] ?? '#6b6880';
  const platformColor = PLATFORM_COLOR[post.platform];

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'white' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)', background: '#fafafa' }}>
        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: platformColor }}>
          {post.platform === 'linkedin' ? <Linkedin size={12} /> : <Twitter size={12} />}
          {post.platform === 'linkedin' ? 'LinkedIn' : 'X / Twitter'}
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ml-1" style={{ background: `${statusColor}20`, color: statusColor }}>
          {post.status}
        </span>
        {post.scheduledDate && (
          <span className="text-[10px] ml-1" style={{ color: 'var(--text-secondary)' }}>
            {post.scheduledDate}{post.scheduledTime ? ` · ${post.scheduledTime}` : ''}
          </span>
        )}
        <span className="text-[10px] ml-auto truncate max-w-[140px]" style={{ color: 'var(--text-secondary)' }}>
          {post.sourceName}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button onClick={() => onCopy(post.content, `pc-${post.id}`)} className="p-1 rounded hover:bg-gray-100 transition-colors" title="Copy">
            {copiedId === `pc-${post.id}` ? <Check size={11} color="#22c55e" /> : <Copy size={11} style={{ color: 'var(--text-secondary)' }} />}
          </button>
          <button onClick={() => setEditing(e => !e)} className="p-1 rounded hover:bg-gray-100 transition-colors" title="Edit">
            <PenSquare size={11} style={{ color: 'var(--text-secondary)' }} />
          </button>
          {/* Status cycle */}
          <select
            value={post.status}
            onChange={e => onUpdate(post.id, { status: e.target.value as ScheduledPost['status'] })}
            className="text-[10px] rounded px-1 py-0.5 outline-none"
            style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
          <button onClick={() => onRemove(post.id)} className="p-1 rounded hover:bg-red-50 transition-colors" title="Delete">
            <Trash2 size={11} color="#e74c3c" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {editing ? (
          <div className="space-y-2">
            <textarea
              rows={4}
              className="w-full text-xs rounded-lg px-3 py-2 resize-none outline-none"
              style={{ background: 'var(--background)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
              value={draft}
              onChange={e => setDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { onUpdate(post.id, { content: draft }); setEditing(false); }}
                className="text-[11px] px-3 py-1.5 rounded-lg font-semibold text-white"
                style={{ background: 'var(--accent)' }}
              >
                Save
              </button>
              <button
                onClick={() => { setDraft(post.content); setEditing(false); }}
                className="text-[11px] px-3 py-1.5 rounded-lg"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
            {post.content}
          </p>
        )}
      </div>
    </div>
  );
}

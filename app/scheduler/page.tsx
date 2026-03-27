'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Brand ───────────────────────────────────────────────────────────────────
const GD_GREEN  = '#00AA50';
const GD_DARK   = '#1A1A1C';
const GD_SIDEBAR = '#111113';
const GD_CARD   = 'rgba(255,255,255,0.04)';
const GD_BORDER = 'rgba(255,255,255,0.08)';
const GD_MUTED  = 'rgba(255,255,255,0.4)';
const GD_TEXT   = '#ffffff';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Post {
  id: string;
  title: string;
  idea: string;
  content: string;
  twitterContent: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'draft' | 'scheduled' | 'published';
  charCount: number;
  createdAt: string;
  updatedAt: string;
  source: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'gd_scheduler_posts';

const DB = {
  load: (): Post[] => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  },
  save: (posts: Post[]) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); } catch {}
  },
  add: (post: Post) => { const p = DB.load(); p.push(post); DB.save(p); },
  update: (id: string, changes: Partial<Post>) => {
    DB.save(DB.load().map(x => x.id === id ? { ...x, ...changes, updatedAt: new Date().toISOString() } : x));
  },
  delete: (id: string) => { DB.save(DB.load().filter(x => x.id !== id)); },
};

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function escHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_OF_WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const TYPE_CONFIG: Record<string, {
  nameLabel: string; stepNameLabel: string; partnerLabel: string | null;
  generateLabel: string; showPdf: boolean; showUrl: boolean;
  showEvent: boolean; showHoliday: boolean; showSubtitle: boolean; showSource: boolean;
}> = {
  report:   { nameLabel:'Report Name',   stepNameLabel:'01 — Report Details',   partnerLabel:'01b — Partner (optional)', generateLabel:'03 — Generate 4 Posts', showPdf:true,  showUrl:false, showEvent:false, showHoliday:false, showSubtitle:true,  showSource:false },
  blog:     { nameLabel:'Article Title', stepNameLabel:'01 — Article Details',  partnerLabel:null,                       generateLabel:'03 — Generate 2 Posts', showPdf:false, showUrl:true,  showEvent:false, showHoliday:false, showSubtitle:false, showSource:false },
  webinar:  { nameLabel:'Event Name',    stepNameLabel:'01 — Event Details',    partnerLabel:null,                       generateLabel:'03 — Generate 3 Posts', showPdf:false, showUrl:true,  showEvent:true,  showHoliday:false, showSubtitle:false, showSource:false },
  grocer:   { nameLabel:'Retailer Name', stepNameLabel:'01 — Grocer Details',   partnerLabel:null,                       generateLabel:'03 — Generate 3 Posts', showPdf:true,  showUrl:false, showEvent:false, showHoliday:false, showSubtitle:false, showSource:false },
  holiday:  { nameLabel:'Occasion',      stepNameLabel:'01 — Occasion',         partnerLabel:null,                       generateLabel:'03 — Generate Post',    showPdf:false, showUrl:false, showEvent:false, showHoliday:true,  showSubtitle:false, showSource:false },
};

const NAME_PLACEHOLDERS: Record<string,string> = {
  report:   'e.g. State of Digital Grocery 2026',
  blog:     'e.g. Why Retail Media Is Reshaping Grocery Margins',
  webinar:  'e.g. Future of Grocery Retail Webinar',
  grocer:   'e.g. Kroger Q4 2025 Performance Report',
  holiday:  'e.g. Thanksgiving, New Year, Earth Day',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SchedulerPage() {
  const [view, setView]                     = useState<'calendar'|'composer'|'import'|'generate'>('calendar');
  const [posts, setPosts]                   = useState<Post[]>([]);
  const [calYear, setCalYear]               = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth]             = useState(() => new Date().getMonth());

  // Composer
  const [editId, setEditId]                 = useState<string|null>(null);
  const [fTitle, setFTitle]                 = useState('');
  const [fIdea, setFIdea]                   = useState('');
  const [fContent, setFContent]             = useState('');
  const [fTwitter, setFTwitter]             = useState('');
  const [fDate, setFDate]                   = useState('');
  const [fTime, setFTime]                   = useState('09:00');
  const [fStatus, setFStatus]               = useState<'draft'|'scheduled'|'published'>('draft');
  const [dateError, setDateError]           = useState(false);

  // Generate Posts
  const [contentType, setContentType]       = useState('report');
  const [rName, setRName]                   = useState('');
  const [rSubtitle, setRSubtitle]           = useState('');
  const [rPartner, setRPartner]             = useState('');
  const [rSource, setRSource]               = useState('');
  const [rEvent, setREvent]                 = useState('');
  const [rHoliday, setRHoliday]             = useState('');
  const [rUrl, setRUrl]                     = useState('');
  const [urlStatus, setUrlStatus]           = useState('');
  const [pdfText, setPdfText]               = useState('');
  const [urlText, setUrlText]               = useState('');
  const [pdfFileName, setPdfFileName]       = useState('');
  const [pdfPages, setPdfPages]             = useState(0);
  const [isGenerating, setIsGenerating]     = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<{label:string;stat:string|null;statDescription:string|null;linkedin_copy:string;twitter_copy:string;source_name:string}[]>([]);
  const [genScheduleDates, setGenScheduleDates] = useState<string[]>([]);
  const [genScheduleTimes, setGenScheduleTimes] = useState<string[]>([]);

  // Import
  const [importedRows, setImportedRows]     = useState<{title:string;idea:string;content:string}[]>([]);
  const [importDates, setImportDates]       = useState<string[]>([]);
  const [importSelected, setImportSelected] = useState<boolean[]>([]);
  const [bulkDate, setBulkDate]             = useState('');

  const pdfInputRef  = useRef<HTMLInputElement>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);

  const today = new Date();
  const todayStr = toDateStr(today);

  // Load posts
  useEffect(() => { setPosts(DB.load()); }, []);

  const refreshPosts = useCallback(() => { setPosts(DB.load()); }, []);

  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;

  // ── Calendar ────────────────────────────────────────────────────────────────
  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11); }
    else setCalMonth(m => m-1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0); }
    else setCalMonth(m => m+1);
  }

  function buildCalendarCells() {
    const firstDay     = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth  = new Date(calYear, calMonth+1, 0).getDate();
    const prevMonthDays = new Date(calYear, calMonth, 0).getDate();
    const cells: { dateStr: string; day: number; current: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      let dayNum: number, isCurrentMonth = true;
      if (i < firstDay) {
        dayNum = prevMonthDays - firstDay + 1 + i;
        isCurrentMonth = false;
      } else if (i >= firstDay + daysInMonth) {
        dayNum = i - firstDay - daysInMonth + 1;
        isCurrentMonth = false;
      } else {
        dayNum = i - firstDay + 1;
      }
      const cellMonth = isCurrentMonth ? calMonth : (i < firstDay ? calMonth-1 : calMonth+1);
      const cellYear  = !isCurrentMonth && i < firstDay
        ? (calMonth === 0 ? calYear-1 : calYear)
        : !isCurrentMonth && i >= firstDay + daysInMonth
        ? (calMonth === 11 ? calYear+1 : calYear)
        : calYear;
      const m = ((cellMonth % 12) + 12) % 12;
      const dateStr = `${cellYear}-${String(m+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
      cells.push({ dateStr, day: dayNum, current: isCurrentMonth });
    }
    return cells;
  }

  // ── Composer ────────────────────────────────────────────────────────────────
  function openComposer(id: string|null, prefillDate?: string) {
    setEditId(id);
    if (id) {
      const p = DB.load().find(x => x.id === id);
      if (!p) return;
      setFTitle(p.title||''); setFIdea(p.idea||''); setFContent(p.content||'');
      setFTwitter(p.twitterContent||''); setFDate(p.scheduledDate||'');
      setFTime(p.scheduledTime||'09:00'); setFStatus(p.status);
    } else {
      setFTitle(''); setFIdea(''); setFContent(''); setFTwitter('');
      setFDate(prefillDate||''); setFTime('09:00'); setFStatus('draft');
    }
    setDateError(false);
    setView('composer');
  }

  function savePost(forceStatus?: 'scheduled'|'draft') {
    const status = forceStatus || fStatus;
    if (status === 'scheduled' && !fDate) { setDateError(true); return; }
    setDateError(false);
    const post: Partial<Post> = {
      title: fTitle, idea: fIdea, content: fContent, twitterContent: fTwitter,
      scheduledDate: fDate, scheduledTime: fTime||'09:00', status,
      charCount: fContent.length, updatedAt: new Date().toISOString(), source: 'manual',
    };
    if (editId) { DB.update(editId, post); }
    else { DB.add({ ...post, id: makeId(), createdAt: new Date().toISOString() } as Post); }
    setEditId(null);
    refreshPosts();
    setView('calendar');
  }

  function deletePost() {
    if (!editId || !confirm('Delete this post?')) return;
    DB.delete(editId);
    setEditId(null);
    refreshPosts();
    setView('calendar');
  }

  // ── PDF Upload ───────────────────────────────────────────────────────────────
  async function handlePdf(file: File) {
    if (!file) return;
    setPdfText(''); setPdfFileName(''); setPdfPages(0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/parse', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPdfText(data.text || '');
      setPdfFileName(file.name);
      setPdfPages(data.pages || 0);
      if (data.reportName && !rName) setRName(data.reportName);
      if (data.reportSubtitle && !rSubtitle) setRSubtitle(data.reportSubtitle);
    } catch (err) {
      alert('Failed to parse PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  // ── URL Fetch ─────────────────────────────────────────────────────────────
  async function fetchUrl() {
    if (!rUrl.trim()) return;
    setUrlStatus('Fetching…');
    setUrlText('');
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUrlText(data.text || data.content || '');
      if (data.title && !rName) setRName(data.title);
      setUrlStatus('✓ Content loaded');
    } catch (err) {
      setUrlStatus('✗ ' + (err instanceof Error ? err.message : 'Failed'));
    }
  }

  // ── Generate Posts ────────────────────────────────────────────────────────
  const canGenerate = () => {
    const cfg = TYPE_CONFIG[contentType];
    const hasContent = cfg.showPdf ? pdfText.length > 0 : cfg.showUrl ? urlText.length > 0 : true;
    return rName.trim().length > 0 && hasContent;
  };

  async function generatePosts() {
    if (!canGenerate()) return;
    setIsGenerating(true);
    setGeneratedPosts([]);
    const cfg = TYPE_CONFIG[contentType];
    const text = cfg.showPdf ? pdfText : cfg.showUrl ? urlText : rHoliday || 'seasonal post';
    try {
      const res = await fetch('/api/generate-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: contentType === 'grocer' ? 'grocer-performance' : contentType,
          text,
          sourceName: rName,
          partner:          rPartner.trim() || undefined,
          thirdPartySource: rSource.trim()  || undefined,
          eventDetails:     rEvent.trim()   || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedPosts(data.posts || []);
      setGenScheduleDates((data.posts || []).map(() => ''));
      setGenScheduleTimes((data.posts || []).map(() => '09:00'));
    } catch (err) {
      alert('Generation failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  }

  function scheduleGeneratedPost(idx: number, platform: 'linkedin'|'twitter') {
    const gp = generatedPosts[idx];
    if (!gp) return;
    const content = platform === 'linkedin' ? gp.linkedin_copy : gp.twitter_copy;
    const date = genScheduleDates[idx] || '';
    const time = genScheduleTimes[idx] || '09:00';
    DB.add({
      id: makeId(), title: gp.source_name, idea: gp.stat || '',
      content, twitterContent: platform === 'linkedin' ? gp.twitter_copy : gp.linkedin_copy,
      scheduledDate: date, scheduledTime: time,
      status: date ? 'scheduled' : 'draft',
      charCount: content.length, createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), source: 'generated',
    });
    refreshPosts();
  }

  function scheduleAll() {
    generatedPosts.forEach((gp, idx) => {
      const date = genScheduleDates[idx] || '';
      const time = genScheduleTimes[idx] || '09:00';
      DB.add({
        id: makeId(), title: gp.source_name, idea: gp.stat || '',
        content: gp.linkedin_copy, twitterContent: gp.twitter_copy,
        scheduledDate: date, scheduledTime: time,
        status: date ? 'scheduled' : 'draft',
        charCount: gp.linkedin_copy.length, createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), source: 'generated',
      });
    });
    refreshPosts();
    alert(generatedPosts.length + ' posts saved.');
  }

  // ── Import ───────────────────────────────────────────────────────────────────
  async function handleXlsx(file: File) {
    try {
      // Dynamically load SheetJS
      const XLSX = (window as unknown as { XLSX?: { read: (ab: ArrayBuffer, opts: {type:string}) => {SheetNames:string[];Sheets:Record<string,unknown>}; utils: { sheet_to_json: (ws: unknown, opts: {header:number;defval:string}) => unknown[][] } } }).XLSX;
      if (!XLSX) { alert('SheetJS not loaded. Please refresh.'); return; }
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
      const parsed = rows.slice(1)
        .filter(r => r[2] && String(r[2]).trim().length > 10)
        .map(r => ({ title: String(r[0]||'').trim(), idea: String(r[1]||'').trim(), content: String(r[2]||'').trim() }));
      setImportedRows(parsed);
      setImportDates(parsed.map(() => ''));
      setImportSelected(parsed.map(() => true));
    } catch {
      alert('Could not parse file. Use .xlsx, .xls, or .csv with columns: Asset, Idea, LinkedIn Post, Twitter Post');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STYLES
  // ─────────────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');

    .gd-sched * { box-sizing: border-box; margin: 0; padding: 0; }
    .gd-sched {
      display: flex; min-height: 100vh;
      background: ${GD_DARK};
      color: ${GD_TEXT};
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      line-height: 1.6;
    }

    /* SIDEBAR */
    .gd-sidebar {
      position: fixed; top: 0; left: 0;
      width: 240px; height: 100vh;
      background: ${GD_SIDEBAR};
      border-right: 1px solid ${GD_BORDER};
      padding: 36px 28px;
      display: flex; flex-direction: column;
      z-index: 50;
    }
    .gd-logo {
      font-family: 'Poppins', sans-serif;
      font-size: 1rem; font-weight: 800;
      letter-spacing: -0.02em;
      color: ${GD_TEXT};
      display: flex; align-items: center; gap: 2px;
      margin-bottom: 6px;
      text-decoration: none;
    }
    .gd-logo-slash { color: ${GD_GREEN}; font-size: 1.3rem; font-weight: 800; }
    .gd-logo-sub {
      font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase;
      color: ${GD_MUTED}; margin-bottom: 40px;
    }
    .gd-nav-divider {
      font-size: 0.6rem; letter-spacing: 0.12em; text-transform: uppercase;
      color: ${GD_MUTED}; opacity: 0.5; margin-bottom: 16px;
    }
    .gd-nav-item {
      display: flex; align-items: center; gap: 14px;
      padding: 13px 0; border-bottom: 1px solid ${GD_BORDER};
      cursor: pointer; transition: padding-left 0.25s; user-select: none;
    }
    .gd-nav-item:hover, .gd-nav-item.active { padding-left: 6px; }
    .gd-nav-num {
      font-size: 0.65rem; color: ${GD_GREEN}; opacity: 0.45;
      min-width: 20px; transition: opacity 0.2s;
      font-family: 'Inter', monospace;
    }
    .gd-nav-item.active .gd-nav-num, .gd-nav-item:hover .gd-nav-num { opacity: 1; }
    .gd-nav-label {
      font-family: 'Poppins', sans-serif;
      font-size: 0.85rem; font-weight: 700; letter-spacing: -0.01em;
      color: ${GD_TEXT}; opacity: 0.55; transition: opacity 0.2s;
    }
    .gd-nav-item.active .gd-nav-label, .gd-nav-item:hover .gd-nav-label { opacity: 1; }
    .gd-sidebar-stats { margin-top: auto; padding-top: 24px; border-top: 1px solid ${GD_BORDER}; }
    .gd-stat-label { font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: ${GD_MUTED}; margin-bottom: 4px; }
    .gd-stat-val { font-family: 'Poppins', sans-serif; font-size: 1.6rem; font-weight: 800; color: ${GD_GREEN}; letter-spacing: -0.03em; line-height: 1; }
    .gd-signout-btn {
      margin-top: 16px; width: 100%; background: transparent;
      border: 1px solid ${GD_BORDER}; color: ${GD_MUTED};
      font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase;
      padding: 9px 0; cursor: pointer; transition: border-color 0.2s, color 0.2s;
    }
    .gd-signout-btn:hover { border-color: ${GD_GREEN}40; color: ${GD_GREEN}; }

    /* MAIN */
    .gd-main { margin-left: 240px; flex: 1; padding: 48px 52px; min-height: 100vh; }

    /* PAGE HEADER */
    .gd-page-header {
      display: flex; align-items: flex-end; justify-content: space-between;
      margin-bottom: 40px; padding-bottom: 24px;
      border-bottom: 1px solid ${GD_BORDER};
    }
    .gd-eyebrow {
      font-size: 0.65rem; letter-spacing: 0.14em; text-transform: uppercase;
      color: ${GD_GREEN}; margin-bottom: 6px;
      display: flex; align-items: center; gap: 10px;
    }
    .gd-eyebrow::before { content:''; display:block; width:24px; height:1px; background:${GD_GREEN}; }
    .gd-page-title {
      font-family: 'Poppins', sans-serif;
      font-size: clamp(1.8rem, 3vw, 2.6rem);
      font-weight: 800; letter-spacing: -0.04em; line-height: 1;
    }

    /* BUTTONS */
    .gd-btn {
      font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
      color: #000; background: ${GD_GREEN}; border: none;
      padding: 11px 22px; cursor: pointer; transition: background 0.2s, transform 0.15s;
      clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
      white-space: nowrap;
    }
    .gd-btn:hover { background: #00cc60; transform: translateY(-1px); }
    .gd-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .gd-btn-ghost {
      font-size: 0.7rem; font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase;
      color: ${GD_MUTED}; background: transparent;
      border: 1px solid ${GD_BORDER};
      padding: 10px 20px; cursor: pointer; transition: color 0.2s, border-color 0.2s, transform 0.15s;
      white-space: nowrap;
    }
    .gd-btn-ghost:hover { color: ${GD_TEXT}; border-color: rgba(255,255,255,0.2); transform: translateY(-1px); }
    .gd-btn-danger {
      font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase;
      color: rgba(255,100,100,0.7); background: transparent;
      border: 1px solid rgba(255,100,100,0.2);
      padding: 10px 20px; cursor: pointer; transition: color 0.2s, border-color 0.2s;
      white-space: nowrap;
    }
    .gd-btn-danger:hover { color: rgba(255,100,100,1); border-color: rgba(255,100,100,0.5); }

    /* CALENDAR */
    .gd-cal-controls { display: flex; align-items: center; gap: 20px; margin-bottom: 28px; }
    .gd-cal-month { font-family:'Poppins',sans-serif; font-size:1.4rem; font-weight:800; letter-spacing:-0.04em; min-width:200px; }
    .gd-cal-nav { font-size:0.7rem; color:${GD_MUTED}; background:transparent; border:1px solid ${GD_BORDER}; padding:7px 14px; cursor:pointer; transition:color 0.2s,border-color 0.2s; }
    .gd-cal-nav:hover { color:${GD_TEXT}; border-color:rgba(255,255,255,0.2); }
    .gd-cal-dow-row { display:grid; grid-template-columns:repeat(7,1fr); margin-bottom:1px; }
    .gd-cal-dow { font-size:0.6rem; letter-spacing:0.1em; text-transform:uppercase; color:${GD_MUTED}; padding:8px 10px; }
    .gd-cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:1px; background:${GD_BORDER}; border:1px solid ${GD_BORDER}; }
    .gd-cal-day {
      background: ${GD_DARK}; min-height:100px; padding:8px;
      cursor:pointer; transition:background 0.15s; position:relative; overflow:hidden;
    }
    .gd-cal-day:hover { background: rgba(255,255,255,0.03); }
    .gd-cal-day.today { background: rgba(0,170,80,0.08); }
    .gd-cal-day.other-month .gd-cal-day-num { opacity:0.25; }
    .gd-cal-day-num { font-size:0.7rem; color:${GD_MUTED}; margin-bottom:6px; display:block; }
    .gd-cal-day.today .gd-cal-day-num { color:${GD_GREEN}; font-weight:500; }
    .gd-cal-chip {
      display:block; font-size:0.6rem; letter-spacing:0.02em;
      padding:3px 6px; margin-bottom:3px;
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      cursor:pointer; border-radius:2px; transition:opacity 0.15s;
    }
    .gd-cal-chip:hover { opacity:0.8; }
    .gd-cal-chip.draft     { background:rgba(160,160,160,0.2); color:rgba(255,255,255,0.6); }
    .gd-cal-chip.scheduled { background:rgba(0,170,80,0.2); color:${GD_GREEN}; }
    .gd-cal-chip.published { background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.4); }
    .gd-cal-overflow { font-size:0.58rem; color:${GD_MUTED}; padding:1px 4px; }

    /* COMPOSER */
    .gd-composer-grid { display:grid; grid-template-columns:1fr 1fr; gap:40px; }
    .gd-form-group { margin-bottom:20px; }
    .gd-form-label { display:block; font-size:0.68rem; letter-spacing:0.1em; text-transform:uppercase; color:${GD_MUTED}; margin-bottom:8px; }
    .gd-form-input {
      width:100%; background:rgba(255,255,255,0.05); border:1px solid ${GD_BORDER};
      color:${GD_TEXT}; font-size:0.9rem; padding:10px 14px;
      outline:none; transition:border-color 0.2s; resize:vertical;
    }
    .gd-form-input:focus { border-color: ${GD_GREEN}60; }
    .gd-form-input::placeholder { color:rgba(255,255,255,0.2); }
    .gd-form-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
    textarea.gd-form-input { min-height:160px; }
    .gd-char-counter { display:flex; align-items:center; gap:10px; margin-top:6px; }
    .gd-char-num { font-size:0.65rem; color:${GD_GREEN}; font-family:monospace; min-width:30px; }
    .gd-char-bar { flex:1; height:2px; background:rgba(255,255,255,0.08); }
    .gd-char-fill { height:100%; background:${GD_GREEN}; transition:width 0.2s; }
    .gd-char-max { font-size:0.65rem; color:${GD_MUTED}; font-family:monospace; }
    .gd-date-error { font-size:0.65rem; color:#ff6464; margin-top:4px; display:none; }
    .gd-date-error.visible { display:block; }
    .gd-composer-actions { display:flex; gap:12px; flex-wrap:wrap; margin-top:8px; }

    /* PREVIEW */
    .gd-preview-label { font-size:0.65rem; letter-spacing:0.1em; text-transform:uppercase; color:${GD_MUTED}; margin-bottom:16px; }
    .gd-preview-card { background:${GD_CARD}; border:1px solid ${GD_BORDER}; padding:24px; }
    .gd-preview-header { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
    .gd-preview-avatar {
      width:42px; height:42px; border-radius:50%;
      background:${GD_GREEN}; color:#000;
      display:flex; align-items:center; justify-content:center;
      font-weight:800; font-size:0.75rem;
    }
    .gd-preview-name { font-weight:600; font-size:0.9rem; }
    .gd-preview-sub { font-size:0.75rem; color:${GD_MUTED}; }
    .gd-preview-body { font-size:0.85rem; line-height:1.7; white-space:pre-wrap; word-break:break-word; }
    .gd-preview-placeholder { color:${GD_MUTED}; font-style:italic; }
    .gd-preview-hashtag { color:${GD_GREEN}; }
    .gd-preview-footer { display:flex; gap:20px; margin-top:20px; padding-top:16px; border-top:1px solid ${GD_BORDER}; }
    .gd-preview-action { font-size:0.75rem; color:${GD_MUTED}; cursor:pointer; }
    .gd-preview-action:hover { color:${GD_TEXT}; }

    /* IMPORT */
    .gd-drop-zone {
      border:2px dashed ${GD_BORDER}; padding:60px; text-align:center;
      cursor:pointer; transition:border-color 0.2s, background 0.2s;
      margin-bottom:32px; position:relative;
    }
    .gd-drop-zone:hover, .gd-drop-zone.drag-over { border-color:${GD_GREEN}; background:rgba(0,170,80,0.04); }
    .gd-drop-zone input { position:absolute; inset:0; opacity:0; cursor:pointer; }
    .gd-drop-icon { font-size:2rem; color:${GD_GREEN}; margin-bottom:12px; }
    .gd-drop-title { font-family:'Poppins',sans-serif; font-size:1rem; font-weight:600; margin-bottom:6px; }
    .gd-drop-sub { font-size:0.75rem; color:${GD_MUTED}; }
    .gd-import-table-wrap { overflow-x:auto; }
    .gd-import-table { width:100%; border-collapse:collapse; font-size:0.8rem; }
    .gd-import-table th { text-align:left; padding:10px 12px; font-size:0.65rem; letter-spacing:0.08em; text-transform:uppercase; color:${GD_MUTED}; border-bottom:1px solid ${GD_BORDER}; }
    .gd-import-table td { padding:10px 12px; border-bottom:1px solid ${GD_BORDER}; vertical-align:top; }
    .gd-import-table tr:hover td { background:rgba(255,255,255,0.02); }
    .gd-import-preview { font-size:0.78rem; color:${GD_MUTED}; max-width:320px; }
    .gd-import-date-input { background:rgba(255,255,255,0.05); border:1px solid ${GD_BORDER}; color:${GD_TEXT}; padding:5px 8px; font-size:0.75rem; outline:none; }
    .gd-status-badge { font-size:0.6rem; letter-spacing:0.06em; text-transform:uppercase; padding:3px 8px; }
    .gd-status-badge.draft { background:rgba(160,160,160,0.15); color:rgba(255,255,255,0.5); }
    .gd-status-badge.scheduled { background:rgba(0,170,80,0.15); color:${GD_GREEN}; }
    .gd-import-meta { display:flex; align-items:center; gap:20px; margin-bottom:20px; }
    .gd-import-count { font-family:'Poppins',sans-serif; font-size:1.2rem; font-weight:700; color:${GD_GREEN}; }
    .gd-bulk-row { display:flex; align-items:center; gap:14px; margin-bottom:20px; flex-wrap:wrap; }
    .gd-bulk-label { font-size:0.65rem; letter-spacing:0.08em; text-transform:uppercase; color:${GD_MUTED}; }
    .gd-import-actions { display:flex; gap:12px; margin-top:24px; }

    /* GENERATE POSTS */
    .gd-step { background:${GD_CARD}; border:1px solid ${GD_BORDER}; padding:28px 32px; margin-bottom:20px; }
    .gd-step-eyebrow { font-size:0.65rem; letter-spacing:0.12em; text-transform:uppercase; color:${GD_GREEN}; margin-bottom:16px; }
    .gd-type-btns { display:flex; gap:8px; flex-wrap:wrap; }
    .gd-type-btn {
      font-size:0.72rem; letter-spacing:0.04em; padding:8px 16px;
      background:transparent; border:1px solid ${GD_BORDER}; color:${GD_MUTED};
      cursor:pointer; transition:all 0.2s;
    }
    .gd-type-btn:hover { border-color:${GD_GREEN}60; color:${GD_TEXT}; }
    .gd-type-btn.active { border-color:${GD_GREEN}; color:${GD_GREEN}; background:rgba(0,170,80,0.08); }
    .gd-pdf-drop {
      border:2px dashed ${GD_BORDER}; padding:32px; text-align:center;
      cursor:pointer; transition:border-color 0.2s; position:relative;
    }
    .gd-pdf-drop:hover { border-color:${GD_GREEN}60; }
    .gd-pdf-drop input { position:absolute; inset:0; opacity:0; cursor:pointer; }
    .gd-pdf-status { display:flex; align-items:center; gap:12px; margin-top:12px; padding:10px 14px; background:rgba(0,170,80,0.08); border:1px solid rgba(0,170,80,0.2); }
    .gd-pdf-name { font-size:0.8rem; font-weight:500; color:${GD_GREEN}; }
    .gd-pdf-pages { font-size:0.72rem; color:${GD_MUTED}; }
    .gd-loading { display:flex; align-items:center; gap:12px; }
    .gd-loading-dot { width:6px; height:6px; background:${GD_GREEN}; border-radius:50%; animation: gd-pulse 1.2s ease-in-out infinite; }
    .gd-loading-dot:nth-child(2) { animation-delay:0.2s; }
    .gd-loading-dot:nth-child(3) { animation-delay:0.4s; }
    .gd-loading-text { font-size:0.75rem; color:${GD_MUTED}; letter-spacing:0.04em; }
    @keyframes gd-pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }

    /* GENERATED POSTS */
    .gd-gen-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:28px; flex-wrap:wrap; gap:12px; }
    .gd-gen-grid { display:grid; gap:24px; }
    .gd-gen-card { background:${GD_CARD}; border:1px solid ${GD_BORDER}; }
    .gd-gen-card-header { display:flex; align-items:flex-start; gap:20px; padding:24px 28px 0; }
    .gd-gen-stat { font-family:'Poppins',sans-serif; font-size:2.4rem; font-weight:800; color:${GD_GREEN}; letter-spacing:-0.04em; line-height:1; }
    .gd-gen-stat-desc { font-size:0.85rem; color:${GD_MUTED}; margin-top:6px; max-width:320px; }
    .gd-gen-posts { display:grid; grid-template-columns:1fr 1fr; gap:0; border-top:1px solid ${GD_BORDER}; margin-top:20px; }
    .gd-gen-platform { padding:24px 28px; border-right:1px solid ${GD_BORDER}; }
    .gd-gen-platform:last-child { border-right:none; }
    .gd-gen-platform-label { font-size:0.65rem; letter-spacing:0.1em; text-transform:uppercase; color:${GD_MUTED}; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; }
    .gd-gen-copy { font-size:0.85rem; line-height:1.7; white-space:pre-wrap; color:rgba(255,255,255,0.85); margin-bottom:16px; }
    .gd-gen-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .gd-gen-date { background:rgba(255,255,255,0.05); border:1px solid ${GD_BORDER}; color:${GD_TEXT}; padding:6px 10px; font-size:0.72rem; outline:none; }
    .gd-gen-time { background:rgba(255,255,255,0.05); border:1px solid ${GD_BORDER}; color:${GD_TEXT}; padding:6px 10px; font-size:0.72rem; outline:none; width:90px; }
    .gd-char-count-small { font-size:0.62rem; color:${GD_MUTED}; font-family:monospace; }
    .gd-char-count-small.over { color:#ff6464; }

    /* REPORTS LIST (within calendar view) */
    .gd-posts-list { margin-top:40px; }
    .gd-posts-list-title { font-size:0.65rem; letter-spacing:0.12em; text-transform:uppercase; color:${GD_MUTED}; margin-bottom:16px; }
    .gd-post-row {
      display:flex; align-items:flex-start; gap:16px;
      padding:16px 0; border-bottom:1px solid ${GD_BORDER};
    }
    .gd-post-row-date { font-size:0.7rem; color:${GD_GREEN}; font-family:monospace; min-width:80px; }
    .gd-post-row-content { flex:1; font-size:0.82rem; color:rgba(255,255,255,0.8); line-height:1.5; }
    .gd-post-row-title { font-size:0.72rem; color:${GD_MUTED}; margin-bottom:4px; }
    .gd-post-row-actions { display:flex; align-items:center; gap:8px; flex-shrink:0; }
    .gd-post-row-status { font-size:0.6rem; letter-spacing:0.06em; text-transform:uppercase; padding:3px 8px; }
    .gd-post-row-edit { font-size:0.65rem; color:${GD_MUTED}; background:transparent; border:1px solid ${GD_BORDER}; padding:4px 10px; cursor:pointer; transition:color 0.2s; }
    .gd-post-row-edit:hover { color:${GD_TEXT}; }

    /* URL STATUS */
    .gd-url-status { font-size:0.65rem; color:${GD_MUTED}; margin-top:8px; }
  `;

  const cfg = TYPE_CONFIG[contentType];
  const calCells = buildCalendarCells();

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      {/* Load SheetJS */}
      <script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js" />

      <div className="gd-sched">
        {/* ── SIDEBAR ── */}
        <aside className="gd-sidebar">
          <a href="/scheduler" className="gd-logo">
            <span>grocery doppio</span><span className="gd-logo-slash">/</span>
          </a>
          <p className="gd-logo-sub">social scheduler</p>
          <div className="gd-nav-divider">// nav</div>
          {[
            { id: 'calendar', label: 'Calendar',       num: '01' },
            { id: 'composer', label: 'Composer',       num: '02' },
            { id: 'import',   label: 'Import',         num: '03' },
            { id: 'generate', label: 'Generate Posts', num: '04' },
          ].map(n => (
            <div
              key={n.id}
              className={`gd-nav-item${view === n.id ? ' active' : ''}`}
              onClick={() => { if (n.id === 'composer') openComposer(null); else setView(n.id as typeof view); }}
            >
              <span className="gd-nav-num">{n.num}</span>
              <span className="gd-nav-label">{n.label}</span>
            </div>
          ))}
          <div className="gd-sidebar-stats">
            <div className="gd-stat-label">scheduled posts</div>
            <div className="gd-stat-val">{scheduledCount}</div>
          </div>
          <a href="/" className="gd-signout-btn" style={{ display:'block', textAlign:'center', textDecoration:'none' }}>
            ← Back to Platform
          </a>
        </aside>

        {/* ── MAIN ── */}
        <main className="gd-main">

          {/* ══════════ CALENDAR ══════════ */}
          {view === 'calendar' && (
            <section>
              <div className="gd-page-header">
                <div>
                  <div className="gd-eyebrow">LinkedIn &amp; X / Twitter</div>
                  <h1 className="gd-page-title">Content Calendar</h1>
                </div>
                <button className="gd-btn" onClick={() => openComposer(null)}>+ New Post</button>
              </div>

              <div className="gd-cal-controls">
                <button className="gd-cal-nav" onClick={prevMonth}>← Prev</button>
                <div className="gd-cal-month">{MONTHS[calMonth]} {calYear}</div>
                <button className="gd-cal-nav" onClick={nextMonth}>Next →</button>
              </div>

              <div className="gd-cal-dow-row">
                {DAYS_OF_WEEK.map(d => <div key={d} className="gd-cal-dow">{d}</div>)}
              </div>
              <div className="gd-cal-grid">
                {calCells.map((cell, i) => {
                  const dayPosts = posts.filter(p => p.scheduledDate === cell.dateStr);
                  const isToday  = cell.dateStr === todayStr;
                  return (
                    <div
                      key={i}
                      className={`gd-cal-day${!cell.current ? ' other-month' : ''}${isToday ? ' today' : ''}`}
                      onClick={() => openComposer(null, cell.dateStr)}
                    >
                      <span className="gd-cal-day-num">{cell.day}</span>
                      {dayPosts.slice(0,2).map(p => (
                        <div
                          key={p.id}
                          className={`gd-cal-chip ${p.status}`}
                          onClick={(e) => { e.stopPropagation(); openComposer(p.id); }}
                        >
                          {p.title || p.content.slice(0,28) || 'Untitled'}
                        </div>
                      ))}
                      {dayPosts.length > 2 && (
                        <div className="gd-cal-overflow">+{dayPosts.length - 2} more</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Upcoming scheduled posts */}
              {posts.filter(p => p.status === 'scheduled').length > 0 && (
                <div className="gd-posts-list">
                  <div className="gd-posts-list-title">Upcoming Scheduled Posts</div>
                  {posts
                    .filter(p => p.status === 'scheduled')
                    .sort((a,b) => a.scheduledDate.localeCompare(b.scheduledDate))
                    .slice(0, 8)
                    .map(p => (
                      <div key={p.id} className="gd-post-row">
                        <div className="gd-post-row-date">{p.scheduledDate}<br/>{p.scheduledTime}</div>
                        <div className="gd-post-row-content">
                          <div className="gd-post-row-title">{p.title || 'Untitled'}</div>
                          {p.content.slice(0, 100)}{p.content.length > 100 ? '…' : ''}
                        </div>
                        <div className="gd-post-row-actions">
                          <span className={`gd-post-row-status gd-status-badge ${p.status}`}>{p.status}</span>
                          <button className="gd-post-row-edit" onClick={() => openComposer(p.id)}>Edit</button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>
          )}

          {/* ══════════ COMPOSER ══════════ */}
          {view === 'composer' && (
            <section>
              <div className="gd-page-header">
                <div>
                  <div className="gd-eyebrow">LinkedIn &amp; X / Twitter</div>
                  <h1 className="gd-page-title">{editId ? 'Edit Post' : 'New Post'}</h1>
                </div>
                <button className="gd-btn-ghost" onClick={() => { setEditId(null); setView('calendar'); }}>← Back to Calendar</button>
              </div>

              <div className="gd-composer-grid">
                {/* Form */}
                <div>
                  <div className="gd-form-group">
                    <label className="gd-form-label">Asset / Content Piece</label>
                    <input className="gd-form-input" type="text" placeholder="e.g. State of Digital Grocery 2026" value={fTitle} onChange={e=>setFTitle(e.target.value)} />
                  </div>
                  <div className="gd-form-group">
                    <label className="gd-form-label">Key Insight or Stat</label>
                    <input className="gd-form-input" type="text" placeholder="e.g. 74% of grocery shoppers say..." value={fIdea} onChange={e=>setFIdea(e.target.value)} />
                  </div>
                  <div className="gd-form-group">
                    <label className="gd-form-label">LinkedIn Post</label>
                    <textarea className="gd-form-input" placeholder="Write your LinkedIn post here..." value={fContent} onChange={e=>setFContent(e.target.value)} />
                    <div className="gd-char-counter">
                      <span className="gd-char-num" style={{ color: fContent.length > 2700 ? '#ff6464' : GD_GREEN }}>{fContent.length}</span>
                      <div className="gd-char-bar"><div className="gd-char-fill" style={{ width: Math.min((fContent.length/3000)*100, 100) + '%', background: fContent.length > 2700 ? '#ff6464' : GD_GREEN }} /></div>
                      <span className="gd-char-max">3000</span>
                    </div>
                  </div>
                  <div className="gd-form-group">
                    <label className="gd-form-label">X / Twitter Post</label>
                    <textarea className="gd-form-input" rows={3} placeholder="Max 280 characters." value={fTwitter} onChange={e=>setFTwitter(e.target.value)} style={{minHeight:'80px'}} />
                    <div className="gd-char-counter">
                      <span className="gd-char-num" style={{ color: fTwitter.length > 260 ? '#ff6464' : GD_GREEN }}>{fTwitter.length}</span>
                      <div className="gd-char-bar"><div className="gd-char-fill" style={{ width: Math.min((fTwitter.length/280)*100, 100) + '%', background: fTwitter.length > 260 ? '#ff6464' : GD_GREEN }} /></div>
                      <span className="gd-char-max">280</span>
                    </div>
                  </div>
                  <div className="gd-form-row">
                    <div className="gd-form-group">
                      <label className="gd-form-label">Scheduled Date</label>
                      <input className="gd-form-input" type="date" value={fDate} onChange={e=>{setFDate(e.target.value);setDateError(false);}} />
                      {dateError && <div className="gd-date-error visible">Date required to schedule</div>}
                    </div>
                    <div className="gd-form-group">
                      <label className="gd-form-label">Time</label>
                      <input className="gd-form-input" type="time" value={fTime} onChange={e=>setFTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="gd-form-group">
                    <label className="gd-form-label">Status</label>
                    <select className="gd-form-input" value={fStatus} onChange={e=>setFStatus(e.target.value as Post['status'])} style={{minHeight:'unset'}}>
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  <div className="gd-composer-actions">
                    <button className="gd-btn-ghost" onClick={() => savePost('draft')}>Save Draft</button>
                    <button className="gd-btn" onClick={() => savePost('scheduled')}>Schedule Post</button>
                    {editId && <button className="gd-btn-danger" onClick={deletePost}>Delete</button>}
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <div className="gd-preview-label">LinkedIn Preview</div>
                  <div className="gd-preview-card">
                    <div className="gd-preview-header">
                      <div className="gd-preview-avatar">GD</div>
                      <div>
                        <div className="gd-preview-name">Grocery Doppio</div>
                        <div className="gd-preview-sub">1st · Following · Just now</div>
                      </div>
                    </div>
                    <div className="gd-preview-body">
                      {fContent.trim() ? (
                        <span dangerouslySetInnerHTML={{ __html:
                          fContent
                            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                            .replace(/\n/g,'<br>')
                            .replace(/\B(#[a-zA-Z0-9_]+)/g, `<span class="gd-preview-hashtag">$1</span>`)
                        }} />
                      ) : (
                        <span className="gd-preview-placeholder">Your post will appear here…</span>
                      )}
                    </div>
                    <div className="gd-preview-footer">
                      {['Like','Comment','Repost','Send'].map(a => (
                        <span key={a} className="gd-preview-action">{a}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ══════════ IMPORT ══════════ */}
          {view === 'import' && (
            <section>
              <div className="gd-page-header">
                <div>
                  <div className="gd-eyebrow">Spreadsheet Import</div>
                  <h1 className="gd-page-title">Import Posts</h1>
                </div>
              </div>

              <div
                className="gd-drop-zone"
                onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag-over');}}
                onDragLeave={e=>e.currentTarget.classList.remove('drag-over')}
                onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f)handleXlsx(f);}}
                onClick={()=>xlsxInputRef.current?.click()}
              >
                <input ref={xlsxInputRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleXlsx(f);}} />
                <div className="gd-drop-icon">⬇</div>
                <div className="gd-drop-title">Drop your spreadsheet here</div>
                <div className="gd-drop-sub">Supports .xlsx · Columns: Asset, Idea, LinkedIn Post, Twitter Post</div>
              </div>

              {importedRows.length > 0 && (
                <>
                  <div className="gd-import-meta">
                    <div className="gd-import-count">{importedRows.length} posts found</div>
                  </div>
                  <div className="gd-bulk-row">
                    <span className="gd-bulk-label">Set date for selected</span>
                    <input type="date" className="gd-import-date-input" value={bulkDate} onChange={e=>setBulkDate(e.target.value)} />
                    <button className="gd-btn-ghost" onClick={()=>{if(!bulkDate)return;setImportDates(d=>d.map((_,i)=>importSelected[i]?bulkDate:_));}}>Apply to Selected</button>
                  </div>
                  <div className="gd-import-table-wrap">
                    <table className="gd-import-table">
                      <thead>
                        <tr>
                          <th><input type="checkbox" checked={importSelected.every(Boolean)} onChange={e=>setImportSelected(importSelected.map(()=>e.target.checked))} /></th>
                          <th>Asset</th>
                          <th>LinkedIn Content Preview</th>
                          <th>Scheduled Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importedRows.map((row, i) => (
                          <tr key={i}>
                            <td><input type="checkbox" checked={importSelected[i]||false} onChange={e=>{const s=[...importSelected];s[i]=e.target.checked;setImportSelected(s);}} /></td>
                            <td style={{fontSize:'0.8rem',fontWeight:500}}>{escHtml(row.title||'Untitled')}</td>
                            <td><div className="gd-import-preview">{row.content.slice(0,90)}{row.content.length>90?'…':''}</div></td>
                            <td><input type="date" className="gd-import-date-input" value={importDates[i]||''} onChange={e=>{const d=[...importDates];d[i]=e.target.value;setImportDates(d);}} /></td>
                            <td><span className={`gd-status-badge ${importDates[i]?'scheduled':'draft'}`}>{importDates[i]?'scheduled':'draft'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="gd-import-actions">
                    <button className="gd-btn" onClick={importSelected2}>Import Selected →</button>
                    <button className="gd-btn-ghost" onClick={()=>{setImportedRows([]);setImportDates([]);setImportSelected([]);}}>Clear</button>
                  </div>
                </>
              )}
            </section>
          )}

          {/* ══════════ GENERATE POSTS ══════════ */}
          {view === 'generate' && (
            <section>
              <div className="gd-page-header">
                <div>
                  <div className="gd-eyebrow">AI — Powered</div>
                  <h1 className="gd-page-title">Generate Posts</h1>
                </div>
              </div>

              {/* Step 00: Content Type */}
              <div className="gd-step">
                <div className="gd-step-eyebrow">00 — Content Type</div>
                <div className="gd-type-btns">
                  {[
                    {id:'report',label:'Research Report'},
                    {id:'blog',label:'Blog Article'},
                    {id:'webinar',label:'Webinar / Event'},
                    {id:'grocer',label:'Grocer Performance'},
                    {id:'holiday',label:'Holiday / Seasonal'},
                  ].map(t => (
                    <button key={t.id} className={`gd-type-btn${contentType===t.id?' active':''}`} onClick={()=>{setContentType(t.id);setPdfText('');setUrlText('');setPdfFileName('');setGeneratedPosts([]);}}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 01: Name */}
              <div className="gd-step">
                <div className="gd-step-eyebrow">{cfg.stepNameLabel}</div>
                <div className="gd-form-row">
                  <div className="gd-form-group" style={{marginBottom:0}}>
                    <label className="gd-form-label">{cfg.nameLabel}</label>
                    <input className="gd-form-input" type="text" placeholder={NAME_PLACEHOLDERS[contentType]||''} value={rName} onChange={e=>setRName(e.target.value)} />
                  </div>
                  {cfg.showSubtitle && (
                    <div className="gd-form-group" style={{marginBottom:0}}>
                      <label className="gd-form-label">Subtitle</label>
                      <input className="gd-form-input" type="text" placeholder="e.g. The New Omnichannel Reality" value={rSubtitle} onChange={e=>setRSubtitle(e.target.value)} />
                    </div>
                  )}
                </div>
              </div>

              {/* Step 01b: Partner */}
              {cfg.partnerLabel && (
                <div className="gd-step">
                  <div className="gd-step-eyebrow">{cfg.partnerLabel}</div>
                  <div className="gd-form-row">
                    <div className="gd-form-group" style={{marginBottom:0}}>
                      <label className="gd-form-label">Partner Company</label>
                      <input className="gd-form-input" type="text" placeholder="e.g. Instacart, Symbotic — leave blank if none" value={rPartner} onChange={e=>setRPartner(e.target.value)} />
                    </div>
                    {cfg.showSource && (
                      <div className="gd-form-group" style={{marginBottom:0}}>
                        <label className="gd-form-label">Third-Party Data Source</label>
                        <input className="gd-form-input" type="text" placeholder="e.g. NielsenIQ, FMI — leave blank if none" value={rSource} onChange={e=>setRSource(e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 02: PDF Upload */}
              {cfg.showPdf && (
                <div className="gd-step">
                  <div className="gd-step-eyebrow">02 — Upload PDF</div>
                  <div
                    className="gd-pdf-drop"
                    onClick={()=>pdfInputRef.current?.click()}
                    onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=GD_GREEN;}}
                    onDragLeave={e=>{e.currentTarget.style.borderColor=GD_BORDER;}}
                    onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=GD_BORDER;const f=e.dataTransfer.files[0];if(f)handlePdf(f);}}
                  >
                    <input ref={pdfInputRef} type="file" accept=".pdf" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handlePdf(f);}} />
                    <div className="gd-drop-icon" style={{fontSize:'1.4rem',marginBottom:'8px'}}>⬇</div>
                    <div className="gd-drop-title" style={{fontSize:'0.85rem'}}>Drop your PDF here or click to browse</div>
                    <div className="gd-drop-sub">Accepts .pdf · Content will be read by AI</div>
                  </div>
                  {pdfFileName && (
                    <div className="gd-pdf-status">
                      <div className="gd-pdf-name">✓ {pdfFileName}</div>
                      <div className="gd-pdf-pages">{pdfPages} pages</div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 02: URL Fetch */}
              {cfg.showUrl && (
                <div className="gd-step">
                  <div className="gd-step-eyebrow">02 — Article URL</div>
                  <div style={{display:'flex',gap:'12px',alignItems:'flex-end'}}>
                    <div className="gd-form-group" style={{flex:1,marginBottom:0}}>
                      <label className="gd-form-label">URL</label>
                      <input className="gd-form-input" type="url" placeholder="https://www.grocerydoppio.com/articles/..." value={rUrl} onChange={e=>setRUrl(e.target.value)} />
                    </div>
                    <button className="gd-btn-ghost" onClick={fetchUrl}>Fetch Content</button>
                  </div>
                  {urlStatus && <div className="gd-url-status">{urlStatus}</div>}
                </div>
              )}

              {/* Step 02b: Event Details */}
              {cfg.showEvent && (
                <div className="gd-step">
                  <div className="gd-step-eyebrow">02b — Event Details (optional)</div>
                  <div className="gd-form-group" style={{marginBottom:0}}>
                    <label className="gd-form-label">Date, Time, Speakers</label>
                    <textarea className="gd-form-input" rows={2} placeholder="e.g. April 15 at 1pm ET — Speaker: Gaurav Pant, Incisiv" value={rEvent} onChange={e=>setREvent(e.target.value)} style={{minHeight:'70px'}} />
                  </div>
                </div>
              )}

              {/* Step 02: Holiday Context */}
              {cfg.showHoliday && (
                <div className="gd-step">
                  <div className="gd-step-eyebrow">02 — Occasion Context</div>
                  <div className="gd-form-group" style={{marginBottom:0}}>
                    <label className="gd-form-label">Additional Context (optional)</label>
                    <textarea className="gd-form-input" rows={2} placeholder="e.g. End of year message, mention key milestones" value={rHoliday} onChange={e=>setRHoliday(e.target.value)} style={{minHeight:'70px'}} />
                  </div>
                </div>
              )}

              {/* Step 03: Generate */}
              <div className="gd-step">
                <div className="gd-step-eyebrow">{cfg.generateLabel}</div>
                <div style={{display:'flex',alignItems:'center',gap:'20px',flexWrap:'wrap'}}>
                  <button className="gd-btn" onClick={generatePosts} disabled={!canGenerate()||isGenerating}>
                    Generate Posts
                  </button>
                  {isGenerating && (
                    <div className="gd-loading">
                      <div className="gd-loading-dot" />
                      <div className="gd-loading-dot" />
                      <div className="gd-loading-dot" />
                      <div className="gd-loading-text">Reading content &amp; writing posts…</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Generated Results */}
              {generatedPosts.length > 0 && (
                <div style={{marginTop:'40px'}}>
                  <div className="gd-gen-header">
                    <div>
                      <div className="gd-eyebrow" style={{marginBottom:'4px'}}>Generated Posts — Review, Edit &amp; Schedule</div>
                    </div>
                    <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                      <button className="gd-btn" onClick={scheduleAll}>Schedule All →</button>
                    </div>
                  </div>
                  <div className="gd-gen-grid">
                    {generatedPosts.map((gp, idx) => (
                      <div key={idx} className="gd-gen-card">
                        {gp.stat && (
                          <div className="gd-gen-card-header">
                            <div>
                              <div className="gd-gen-stat">{gp.stat}</div>
                              <div className="gd-gen-stat-desc">{gp.statDescription}</div>
                            </div>
                            <div style={{marginLeft:'auto',fontSize:'0.7rem',color:GD_MUTED,fontFamily:'monospace'}}>{gp.label}</div>
                          </div>
                        )}
                        <div className="gd-gen-posts">
                          {/* LinkedIn */}
                          <div className="gd-gen-platform">
                            <div className="gd-gen-platform-label">
                              <span>LinkedIn</span>
                              <span style={{color:GD_MUTED,fontSize:'0.6rem'}}>{gp.linkedin_copy.length} chars</span>
                            </div>
                            <div className="gd-gen-copy">{gp.linkedin_copy}</div>
                            <div className="gd-gen-actions">
                              <input type="date" className="gd-gen-date" value={genScheduleDates[idx]||''} onChange={e=>{const d=[...genScheduleDates];d[idx]=e.target.value;setGenScheduleDates(d);}} />
                              <input type="time" className="gd-gen-time" value={genScheduleTimes[idx]||'09:00'} onChange={e=>{const t=[...genScheduleTimes];t[idx]=e.target.value;setGenScheduleTimes(t);}} />
                              <button className="gd-btn" style={{padding:'7px 14px',fontSize:'0.65rem'}} onClick={()=>scheduleGeneratedPost(idx,'linkedin')}>+ Schedule</button>
                            </div>
                          </div>
                          {/* Twitter */}
                          <div className="gd-gen-platform">
                            <div className="gd-gen-platform-label">
                              <span>X / Twitter</span>
                              <span className={`gd-char-count-small${gp.twitter_copy.length>280?' over':''}`}>{gp.twitter_copy.length}/280</span>
                            </div>
                            <div className="gd-gen-copy">{gp.twitter_copy}</div>
                            <div className="gd-gen-actions">
                              <button className="gd-btn" style={{padding:'7px 14px',fontSize:'0.65rem'}} onClick={()=>scheduleGeneratedPost(idx,'twitter')}>+ Schedule</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

        </main>
      </div>
    </>
  );

  // helper defined inside component to access state
  function importSelected2() {
    const toImport = importedRows.filter((_, i) => importSelected[i]);
    if (!toImport.length) { alert('No posts selected.'); return; }
    toImport.forEach((row, i) => {
      const actualIdx = importedRows.indexOf(row);
      const date = importDates[actualIdx] || '';
      DB.add({
        id: makeId(), title: row.title, idea: row.idea, content: row.content,
        twitterContent: '', scheduledDate: date, scheduledTime: '09:00',
        status: date ? 'scheduled' : 'draft', charCount: row.content.length,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), source: 'import',
      });
    });
    refreshPosts();
    setImportedRows([]); setImportDates([]); setImportSelected([]);
    setView('calendar');
    alert(toImport.length + ' post(s) imported.');
  }
}

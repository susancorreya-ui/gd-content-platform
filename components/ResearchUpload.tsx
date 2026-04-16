'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, Loader2, Trash2, BookOpen,
  BarChart2, Calendar, Copy, Check,
} from 'lucide-react';
import { ResearchDoc } from '@/types';
import { parseDocument } from '@/lib/parsers';

interface ResearchUploadProps {
  docs: ResearchDoc[];
  onDocAdded: (doc: ResearchDoc) => void;
  onDocRemoved: (id: string) => void;
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/csv': ['.csv'],
  'text/plain': ['.txt'],
};

const EXT_COLOR: Record<string, string> = {
  pdf: '#e74c3c', docx: '#2980b9', doc: '#2980b9',
  xlsx: '#27ae60', xls: '#27ae60', pptx: '#e67e22',
  csv: '#16a085', txt: '#8e44ad',
};

// Colour palette cycling per ## section
const PALETTE = [
  { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', headerBg: '#dbeafe', mutedText: '#3b82f6' },
  { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', headerBg: '#ede9fe', mutedText: '#8b5cf6' },
  { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', headerBg: '#d1fae5', mutedText: '#10b981' },
  { color: '#d97706', bg: '#fffbeb', border: '#fde68a', headerBg: '#fef3c7', mutedText: '#f59e0b' },
  { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', headerBg: '#cffafe', mutedText: '#06b6d4' },
  { color: '#be185d', bg: '#fdf2f8', border: '#fbcfe8', headerBg: '#fce7f3', mutedText: '#ec4899' },
  { color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe', headerBg: '#e0e7ff', mutedText: '#6366f1' },
  { color: '#b45309', bg: '#fefce8', border: '#fde047', headerBg: '#fef9c3', mutedText: '#ca8a04' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function extOf(name: string) { return name.split('.').pop()?.toLowerCase() ?? 'txt'; }

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: Date | string) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Strip emoji and return { emoji, title }
function splitEmoji(text: string): { emoji: string; title: string } {
  const m = text.match(/^([\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}✅📊🔑🏪⚙💳👥📌💡🎯🛒🏬]+\uFE0F?\s*)/u);
  if (m) return { emoji: m[1].trim(), title: text.slice(m[0].length).trim() };
  return { emoji: '', title: text };
}

// Inline markdown → HTML string (bold, italic, code)
function inlineHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,0.06);padding:1px 4px;border-radius:3px;font-size:0.85em">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;text-underline-offset:2px">$1</a>');
}

// ─── Block parser ─────────────────────────────────────────────────────────────────

type Block =
  | { kind: 'h3'; text: string }
  | { kind: 'h4'; text: string }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'table'; rows: string[][] }   // row[0] = header
  | { kind: 'bullets'; items: string[] }
  | { kind: 'text'; text: string };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim() || line.trim() === '---') { i++; continue; }

    if (line.startsWith('### ')) {
      blocks.push({ kind: 'h3', text: line.slice(4).trim() });
      i++; continue;
    }

    if (line.startsWith('#### ')) {
      blocks.push({ kind: 'h4', text: line.slice(5).trim() });
      i++; continue;
    }

    if (line.startsWith('> ')) {
      const qlines: string[] = [];
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i].trim() === '')) {
        if (lines[i].startsWith('> ')) qlines.push(lines[i].slice(2).trim());
        i++;
      }
      if (qlines.length) blocks.push({ kind: 'quote', lines: qlines });
      continue;
    }

    if (line.startsWith('| ')) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        const raw = lines[i];
        const cells = raw.split('|').slice(1, -1).map(c => c.trim());
        // Skip separator rows like |---|---|
        if (!cells.every(c => /^[-: ]+$/.test(c))) tableRows.push(cells);
        i++;
      }
      if (tableRows.length) blocks.push({ kind: 'table', rows: tableRows });
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2).trim());
        i++;
      }
      blocks.push({ kind: 'bullets', items });
      continue;
    }

    if (line.trim()) {
      blocks.push({ kind: 'text', text: line.trim() });
    }
    i++;
  }
  return blocks;
}

// ─── Section parser ───────────────────────────────────────────────────────────────

interface Section { emoji: string; title: string; content: string }

function parseSections(markdown: string): Section[] {
  const sections: Section[] = [];
  // Split on lines that start with exactly ## (not ### or ####)
  const parts = markdown.split(/\n(?=## )/);
  for (const part of parts) {
    const lines = part.split('\n');
    const first = lines[0];
    if (first.startsWith('## ')) {
      const { emoji, title } = splitEmoji(first.slice(3).trim());
      const content = lines.slice(1).join('\n').trim();
      sections.push({ emoji, title, content });
    }
  }
  return sections;
}

// ─── Block renderers ──────────────────────────────────────────────────────────────

function BlockQuote({ lines, palette }: { lines: string[]; palette: typeof PALETTE[0] }) {
  return (
    <div
      className="rounded-xl px-4 py-3 my-1"
      style={{
        borderLeft: `3px solid ${palette.color}`,
        background: palette.headerBg,
      }}
    >
      {lines.map((l, i) => (
        <p
          key={i}
          className="text-xs italic leading-relaxed"
          style={{ color: palette.color, margin: 0 }}
          dangerouslySetInnerHTML={{ __html: inlineHtml(l) }}
        />
      ))}
    </div>
  );
}

function DataTable({ rows, palette }: { rows: string[][]; palette: typeof PALETTE[0] }) {
  const [header, ...body] = rows;
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${palette.border}` }}>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ background: palette.headerBg }}>
            {header.map((cell, i) => (
              <th
                key={i}
                className="text-left px-3 py-2 font-semibold"
                style={{ color: palette.color, borderBottom: `1px solid ${palette.border}` }}
                dangerouslySetInnerHTML={{ __html: inlineHtml(cell) }}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr
              key={ri}
              style={{ background: ri % 2 === 0 ? 'white' : palette.bg }}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 leading-snug"
                  style={{
                    color: 'var(--text-primary)',
                    borderBottom: ri < body.length - 1 ? `1px solid ${palette.border}` : 'none',
                  }}
                  dangerouslySetInnerHTML={{ __html: inlineHtml(cell) }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulletList({ items, palette }: { items: string[]; palette: typeof PALETTE[0] }) {
  return (
    <ul className="space-y-1.5 my-0.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]"
            style={{ background: palette.color }}
          />
          <span
            className="text-xs leading-snug flex-1"
            style={{ color: 'var(--text-primary)' }}
            dangerouslySetInnerHTML={{ __html: inlineHtml(item) }}
          />
        </li>
      ))}
    </ul>
  );
}

function SectionContent({ blocks, palette }: { blocks: Block[]; palette: typeof PALETTE[0] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.kind === 'h3') {
          return (
            <div key={i} className="pt-1">
              <div
                className="text-[11px] font-bold uppercase tracking-widest pb-1 mb-2"
                style={{
                  color: palette.color,
                  borderBottom: `1px solid ${palette.border}`,
                }}
                dangerouslySetInnerHTML={{ __html: inlineHtml(block.text) }}
              />
            </div>
          );
        }
        if (block.kind === 'h4') {
          return (
            <p
              key={i}
              className="text-xs font-semibold mt-2"
              style={{ color: 'var(--text-primary)' }}
              dangerouslySetInnerHTML={{ __html: inlineHtml(block.text) }}
            />
          );
        }
        if (block.kind === 'quote') return <BlockQuote key={i} lines={block.lines} palette={palette} />;
        if (block.kind === 'table') return <DataTable key={i} rows={block.rows} palette={palette} />;
        if (block.kind === 'bullets') return <BulletList key={i} items={block.items} palette={palette} />;
        if (block.kind === 'text') {
          return (
            <p
              key={i}
              className="text-xs leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
              dangerouslySetInnerHTML={{ __html: inlineHtml(block.text) }}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

function SectionCard({ section, index }: { section: Section; index: number }) {
  const palette = PALETTE[index % PALETTE.length];
  const blocks = parseBlocks(section.content);
  if (!blocks.length) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: `1.5px solid ${palette.border}`,
        background: 'white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5"
        style={{
          background: palette.bg,
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        {section.emoji && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-base leading-none"
            style={{ background: palette.headerBg, border: `1px solid ${palette.border}` }}
          >
            {section.emoji}
          </div>
        )}
        <h3
          className="text-sm font-bold flex-1"
          style={{ color: palette.color }}
        >
          {section.title}
        </h3>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: palette.headerBg, color: palette.mutedText, border: `1px solid ${palette.border}` }}
        >
          {blocks.filter(b => b.kind === 'bullets').reduce((n, b) => n + (b.kind === 'bullets' ? b.items.length : 0), 0) ||
            blocks.filter(b => b.kind === 'table').reduce((n, b) => n + (b.kind === 'table' ? b.rows.length - 1 : 0), 0) ||
            blocks.length} items
        </span>
      </div>

      {/* Card body */}
      <div className="px-5 py-4">
        <SectionContent blocks={blocks} palette={palette} />
      </div>
    </div>
  );
}

// ─── Insights viewer ──────────────────────────────────────────────────────────────

function InsightsViewer({ doc, isProcessing }: { doc: ResearchDoc; isProcessing: boolean }) {
  const [copied, setCopied] = useState(false);
  const sections = parseSections(doc.insights);
  const hasSections = sections.length > 0;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(doc.insights);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div
        className="px-5 py-3 border-b flex items-center gap-2 flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <BarChart2 size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Key Data Points &amp; Learnings
        </span>
        <span
          className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full truncate max-w-[200px]"
          style={{ background: 'var(--background)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          title={doc.name}
        >
          {doc.name}
        </span>
        {hasSections && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: '#f0eeff', color: 'var(--accent)', border: '1px solid #ddd6fe' }}
          >
            {sections.length} sections
          </span>
        )}
        <button
          onClick={handleCopy}
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{
            color: copied ? '#059669' : 'var(--text-secondary)',
            background: 'var(--background)',
            border: '1px solid var(--border)',
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy all'}
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5">
        {isProcessing ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden animate-pulse"
                style={{ border: '1.5px solid var(--border)', height: 120 + i * 30, background: 'var(--background)' }}
              />
            ))}
          </div>
        ) : hasSections ? (
          <div className="space-y-4">
            {sections.map((section, i) => (
              <SectionCard key={i} section={section} index={i} />
            ))}
          </div>
        ) : (
          // Fallback for unstructured content
          <div
            className="text-xs leading-relaxed whitespace-pre-wrap"
            style={{ color: 'var(--text-primary)' }}
          >
            {doc.insights}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Idle placeholder ─────────────────────────────────────────────────────────────

function IdlePlaceholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12 py-16 gap-8">
      <div className="text-center max-w-md space-y-3">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2"
          style={{ background: '#f0eeff' }}
        >
          <BookOpen size={26} style={{ color: 'var(--accent)' }} />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Research Insights
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Upload a report or dataset — AI extracts structured insights with statistics, trends, and content angles.
        </p>
      </div>
      <div
        className="w-full max-w-sm rounded-2xl p-5 space-y-2.5"
        style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
          Output sections
        </p>
        {[
          { emoji: '📊', label: 'Methodology & sample', color: '#2563eb' },
          { emoji: '🔑', label: 'Core thesis', color: '#7c3aed' },
          { emoji: '📌', label: 'Key takeaways', color: '#059669' },
          { emoji: '💡', label: 'High-value quotable stats', color: '#d97706' },
          { emoji: '🎯', label: 'Strategic content angles', color: '#0891b2' },
        ].map(({ emoji, label, color }) => (
          <div key={label} className="flex items-center gap-2.5 text-xs">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-sm"
              style={{ background: '#f5f5ff', border: '1px solid #e0e7ff' }}
            >
              {emoji}
            </div>
            <span style={{ color: 'var(--text-primary)' }}>{label}</span>
            <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: '#f0eeff', color }}>card</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Loading state ────────────────────────────────────────────────────────────────

function LoadingState({ fileName }: { fileName: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <div className="space-y-3 w-full max-w-md px-8">
        {PALETTE.slice(0, 4).map((p, i) => (
          <div
            key={i}
            className="rounded-xl animate-pulse"
            style={{ height: 64 + i * 16, background: p.bg, border: `1.5px solid ${p.border}` }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2.5" style={{ color: 'var(--text-secondary)' }}>
        <Loader2 size={15} className="spinner" style={{ color: 'var(--accent)' }} />
        <span className="text-xs">Extracting insights from <strong style={{ color: 'var(--text-primary)' }}>{fileName}</strong>…</span>
      </div>
    </div>
  );
}

// ─── Doc thumbnail card ───────────────────────────────────────────────────────────

function DocCard({
  doc, isSelected, onSelect, onRemove,
}: {
  doc: ResearchDoc; isSelected: boolean; onSelect: () => void; onRemove: () => void;
}) {
  const ext = extOf(doc.name);
  const ac = EXT_COLOR[ext] ?? '#6c5dd3';
  const nameNoExt = doc.name.replace(/\.[^.]+$/, '');

  return (
    <div
      onClick={onSelect}
      className="relative rounded-xl overflow-hidden cursor-pointer transition-all group"
      style={{
        border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
        background: isSelected ? '#f0eeff' : 'var(--background)',
        boxShadow: isSelected ? '0 0 0 2px rgba(108,93,211,0.12)' : undefined,
      }}
    >
      <div className="h-1 w-full" style={{ background: ac }} />
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${ac}15` }}>
            <FileText size={15} style={{ color: ac }} />
          </div>
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${ac}15`, color: ac }}>
            {ext}
          </span>
        </div>
        <div className="text-[11px] font-semibold leading-tight line-clamp-2" style={{ color: 'var(--text-primary)' }} title={doc.name}>
          {nameNoExt}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <Calendar size={9} />
            <span className="text-[9px]">{formatDate(doc.uploadedAt)}</span>
          </div>
          <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>{formatFileSize(doc.size)}</span>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-2 right-2 w-5 h-5 rounded-full hidden group-hover:flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #fee2e2' }}
        title="Remove"
      >
        <Trash2 size={9} color="#e74c3c" />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────────

export default function ResearchUpload({ docs, onDocAdded, onDocRemoved }: ResearchUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState('');
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedDoc = docs.find(d => d.id === selectedId) ?? docs[docs.length - 1] ?? null;

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setProcessingFile(file.name);
    setError('');
    try {
      const rawText = await parseDocument(file);
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, fileName: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const doc: ResearchDoc = {
        id: `doc-${Date.now()}`,
        name: file.name,
        size: file.size,
        extractedText: rawText,
        insights: data.insights,
        uploadedAt: new Date(),
      };
      onDocAdded(doc);
      setSelectedId(doc.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process document');
    } finally {
      setIsProcessing(false);
      setProcessingFile('');
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) processFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: ACCEPTED_TYPES, maxFiles: 1, disabled: isProcessing,
  });

  const handleRemove = (id: string) => {
    onDocRemoved(id);
    if (selectedId === id) setSelectedId(null);
  };

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
              Research Library
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Upload reports and datasets — AI extracts insights used as context across all content.
            </p>
          </div>

          {/* Drop zone */}
          <div
            {...getRootProps()}
            className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all"
            style={{
              borderColor: isDragActive ? 'var(--accent)' : 'var(--border)',
              background: isDragActive ? '#f0eeff' : 'var(--background)',
            }}
          >
            <input {...getInputProps()} />
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={20} className="spinner" style={{ color: 'var(--accent)' }} />
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Processing…</div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#f0eeff' }}>
                  <Upload size={15} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {isDragActive ? 'Drop your file here' : 'Drop a file or click to browse'}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    PDF, DOCX, PPTX, XLSX, CSV, TXT
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs px-3 py-2.5 rounded-lg" style={{ background: '#fff0f0', color: '#c0392b' }}>
              {error}
            </div>
          )}

          {/* Thumbnail grid */}
          {docs.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Saved ({docs.length})
              </div>
              <div className="grid grid-cols-2 gap-2">
                {docs.map(doc => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    isSelected={selectedDoc?.id === doc.id}
                    onSelect={() => setSelectedId(doc.id)}
                    onRemove={() => handleRemove(doc.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>
        {isProcessing ? (
          <LoadingState fileName={processingFile} />
        ) : selectedDoc ? (
          <InsightsViewer doc={selectedDoc} isProcessing={false} />
        ) : (
          <IdlePlaceholder />
        )}
      </div>
    </div>
  );
}

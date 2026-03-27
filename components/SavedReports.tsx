'use client';

import { ResearchDoc } from '@/types';
import { FileText, Trash2, ExternalLink, Upload } from 'lucide-react';
import OutputPanel from './OutputPanel';
import { useState } from 'react';

interface SavedReportsProps {
  docs: ResearchDoc[];
  onDocRemoved: (id: string) => void;
  onNavigate: (id: string) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function SavedReports({ docs, onDocRemoved, onNavigate }: SavedReportsProps) {
  const [selectedDoc, setSelectedDoc] = useState<ResearchDoc | null>(docs[0] || null);

  if (docs.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-4"
        style={{ background: 'var(--background)', color: 'var(--text-secondary)' }}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#f0eeff' }}>
          <FileText size={24} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="text-center">
          <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No research documents yet</div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Upload a PDF, survey, or report to get started</div>
        </div>
        <button
          onClick={() => onNavigate('upload')}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg text-white"
          style={{ background: 'var(--accent)' }}
        >
          <Upload size={14} />
          Upload Document
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Doc list */}
      <div
        className="w-[300px] flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Saved Research ({docs.length})
          </h2>
          <button
            onClick={() => onNavigate('upload')}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: '#f0eeff', color: 'var(--accent)' }}
          >
            + Upload
          </button>
        </div>
        <div className="flex-1 p-3 space-y-2">
          {docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="w-full text-left p-3 rounded-lg transition-all"
              style={{
                background: selectedDoc?.id === doc.id ? '#f0eeff' : 'var(--background)',
                border: `1px solid ${selectedDoc?.id === doc.id ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              <div className="flex items-start gap-2.5">
                <FileText size={14} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {doc.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      {formatFileSize(doc.size)}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      {timeAgo(doc.uploadedAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDocRemoved(doc.id);
                    if (selectedDoc?.id === doc.id) setSelectedDoc(null);
                  }}
                  className="p-1 rounded hover:bg-red-50 flex-shrink-0"
                >
                  <Trash2 size={12} color="#e74c3c" />
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Insights preview */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>
        {selectedDoc ? (
          <>
            <div
              className="px-5 py-3 border-b flex items-center justify-between flex-shrink-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <FileText size={14} style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {selectedDoc.name}
                </span>
              </div>
              <button
                onClick={() => onNavigate('blog')}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <ExternalLink size={11} />
                Use in content
              </button>
            </div>
            <OutputPanel
              content={selectedDoc.insights}
              isLoading={false}
              contentType="research"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
            <div className="text-sm">Select a document to view extracted insights</div>
          </div>
        )}
      </div>
    </div>
  );
}

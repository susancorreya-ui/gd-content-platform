'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { ResearchDoc } from '@/types';
import { parseDocument } from '@/lib/parsers';
import OutputPanel from './OutputPanel';

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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResearchUpload({ docs, onDocAdded, onDocRemoved }: ResearchUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState('');
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedInsights, setSelectedInsights] = useState<string>('');

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
      setSelectedInsights(data.insights);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process document');
    } finally {
      setIsProcessing(false);
      setProcessingFile('');
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) processFile(acceptedFiles[0]);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div
        className="w-[380px] flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Upload Research
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Upload a survey, report, or dataset. AI will extract key insights you can use across all content types.
          </p>

          {/* Drop zone */}
          <div
            {...getRootProps()}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
            style={{
              borderColor: isDragActive ? 'var(--accent)' : 'var(--border)',
              background: isDragActive ? '#f0eeff' : 'var(--background)',
            }}
          >
            <input {...getInputProps()} />
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={28} className="spinner" style={{ color: 'var(--accent)' }} />
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Processing {processingFile}...
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Extracting and analysing insights
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: '#f0eeff' }}
                >
                  <Upload size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {isDragActive ? 'Drop your file here' : 'Drop a file or click to browse'}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    PDF, DOCX, PPTX, XLSX, CSV
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div
              className="mt-3 text-xs px-3 py-2.5 rounded-lg"
              style={{ background: '#fff0f0', color: '#c0392b' }}
            >
              {error}
            </div>
          )}

          {/* Uploaded docs list */}
          {docs.length > 0 && (
            <div className="mt-6">
              <div
                className="text-xs font-semibold mb-3 uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Saved Documents ({docs.length})
              </div>
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-lg overflow-hidden"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    <div
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setExpandedId(expandedId === doc.id ? null : doc.id);
                        setSelectedInsights(doc.insights);
                      }}
                    >
                      <CheckCircle size={15} color="#4ade80" className="flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-xs font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {doc.name}
                        </div>
                        <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                          {formatFileSize(doc.size)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDocRemoved(doc.id);
                            if (expandedId === doc.id) setExpandedId(null);
                          }}
                          className="p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={12} color="#e74c3c" />
                        </button>
                        {expandedId === doc.id ? (
                          <ChevronUp size={14} style={{ color: 'var(--text-secondary)' }} />
                        ) : (
                          <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Insights panel */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>
        {selectedInsights ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div
              className="px-5 py-3 border-b flex items-center gap-2 flex-shrink-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <FileText size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Extracted Insights
              </span>
            </div>
            <OutputPanel
              content={selectedInsights}
              isLoading={isProcessing}
              contentType="research"
            />
          </div>
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            <div className="text-4xl opacity-20">
              <FileText size={48} />
            </div>
            <div className="text-sm">Upload a document to see extracted insights</div>
          </div>
        )}
      </div>
    </div>
  );
}

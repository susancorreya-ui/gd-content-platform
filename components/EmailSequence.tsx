'use client';

import { useState } from 'react';
import { LibraryItem } from '@/types';
import OutputPanel from './OutputPanel';
import { Sparkles, BookOpen } from 'lucide-react';

const ENTRY_POINTS = [
  { id: 'event', label: 'In-Person Event', desc: 'Attended a Grocery Doppio event' },
  { id: 'webinar', label: 'Webinar', desc: 'Registered for / attended a webinar' },
  { id: 'content-download', label: 'Content Download', desc: 'Downloaded a report or guide' },
  { id: 'get-in-touch', label: 'Get In Touch', desc: 'Filled in the contact form' },
  { id: 'newsletter-signup', label: 'Newsletter Sign-Up', desc: 'Subscribed to the newsletter' },
];

const GOALS = [
  { id: 'book-demo', label: 'Book a Demo / Call' },
  { id: 'next-content', label: 'Consume Next Content' },
  { id: 'event-registration', label: 'Register for Event' },
  { id: 'platform-trial', label: 'Start Platform Trial' },
  { id: 'sales-qualified', label: 'Become Sales Qualified' },
];

const AUDIENCES = [
  { id: 'grocer', label: 'Grocer / Retailer', desc: 'Buyer, category manager, ops leader' },
  { id: 'tech-vendor', label: 'Tech Vendor', desc: 'SaaS, solution provider, supplier' },
  { id: 'media', label: 'Media / Analyst', desc: 'Journalist, research firm, analyst' },
  { id: 'ecosystem', label: 'Ecosystem Partner', desc: 'Investor, consultant, advisor' },
];

interface EmailSequenceProps {
  onSaveToLibrary: (item: Omit<LibraryItem, 'id' | 'createdAt'>) => void;
}

export default function EmailSequence({ onSaveToLibrary }: EmailSequenceProps) {
  const [entryPoint, setEntryPoint] = useState('content-download');
  const [goal, setGoal] = useState('book-demo');
  const [audience, setAudience] = useState('grocer');
  const [emailCount, setEmailCount] = useState(5);
  const [additionalContext, setAdditionalContext] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const buildPrompt = () => {
    const ep = ENTRY_POINTS.find((e) => e.id === entryPoint);
    const g = GOALS.find((g) => g.id === goal);
    const a = AUDIENCES.find((a) => a.id === audience);

    const parts = [
      `Entry point: ${ep?.label} — ${ep?.desc}`,
      `Goal of the sequence: ${g?.label}`,
      `Target audience: ${a?.label} — ${a?.desc}`,
      `Number of emails in sequence: ${emailCount}`,
    ];
    if (additionalContext.trim()) parts.push(`Additional context: ${additionalContext}`);
    return parts.join('\n');
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: 'email-sequence', prompt: buildPrompt() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOutput(data.output);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!output) return;
    const ep = ENTRY_POINTS.find((e) => e.id === entryPoint);
    const a = AUDIENCES.find((a) => a.id === audience);
    onSaveToLibrary({
      contentType: 'email-sequence',
      title: `${ep?.label} → ${a?.label} (${emailCount} emails)`,
      output,
      metadata: { entryPoint, goal, audience, emailCount: String(emailCount) },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div
        className="w-[380px] flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="p-6 flex-1 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              Email Sequence
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Build a {emailCount}-email nurture sequence tailored to entry point and audience
            </p>
          </div>

          {/* Entry point */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Entry point
            </label>
            <div className="space-y-1.5">
              {ENTRY_POINTS.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => setEntryPoint(ep.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all"
                  style={{
                    background: entryPoint === ep.id ? '#f0eeff' : 'var(--background)',
                    border: `1px solid ${entryPoint === ep.id ? 'var(--accent)' : 'var(--border)'}`,
                    color: entryPoint === ep.id ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                >
                  <span className="font-medium">{ep.label}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>— {ep.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Target audience
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {AUDIENCES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAudience(a.id)}
                  className="flex flex-col px-3 py-2.5 rounded-lg text-left text-xs transition-all"
                  style={{
                    background: audience === a.id ? '#f0eeff' : 'var(--background)',
                    border: `1px solid ${audience === a.id ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  <span className="font-medium" style={{ color: audience === a.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {a.label}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{a.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Sequence goal
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className="px-3 py-2 rounded-lg text-left text-xs font-medium transition-all"
                  style={{
                    background: goal === g.id ? '#f0eeff' : 'var(--background)',
                    border: `1px solid ${goal === g.id ? 'var(--accent)' : 'var(--border)'}`,
                    color: goal === g.id ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email count */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Number of emails: <span style={{ color: 'var(--accent)' }}>{emailCount}</span>
            </label>
            <div className="flex gap-2">
              {[4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => setEmailCount(n)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: emailCount === n ? 'var(--accent)' : 'var(--background)',
                    border: `1px solid ${emailCount === n ? 'var(--accent)' : 'var(--border)'}`,
                    color: emailCount === n ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {n} emails
                </button>
              ))}
            </div>
          </div>

          {/* Additional context */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Additional context (optional)
            </label>
            <textarea
              rows={3}
              className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
              style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="e.g. They downloaded the State of Grocery 2025 report / Event was about AI in grocery ops"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {error && (
            <div className="text-xs px-3 py-2.5 rounded-lg" style={{ background: '#fff0f0', color: '#c0392b' }}>
              {error}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="p-5 border-t flex-shrink-0 space-y-2" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: isLoading ? 'var(--text-secondary)' : 'var(--accent)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <><div className="w-4 h-4 rounded-full border-2 border-t-transparent spinner" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} />Generating sequence...</>
            ) : (
              <><Sparkles size={15} />Generate {emailCount}-Email Sequence</>
            )}
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

      {/* Right: output */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>
        <OutputPanel
          content={output}
          isLoading={isLoading}
          contentType="email-sequence"
          onRegenerate={output ? handleGenerate : undefined}
        />
      </div>
    </div>
  );
}

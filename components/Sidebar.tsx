'use client';

import { useRef, useState, useCallback } from 'react';
import {
  BookOpen, Mail, Newspaper as NewsletterIcon, Video, Upload, TrendingUp,
  ShoppingCart, MailCheck, LogOut, Rss, Building2,
  Library, BarChart2, ChevronRight, Newspaper,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Nav structure ────────────────────────────────────────────────────────────

interface SubItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface Section {
  id: string;          // unique key; also used as activeView if no sub-items
  label: string;       // text shown in sidebar
  sub: SubItem[];      // if empty, clicking navigates directly to id
}

const SECTIONS: Section[] = [
  {
    id: 'research',
    label: 'Research',
    sub: [
      { id: 'feed',          label: 'Intelligence',  icon: <Rss size={14} /> },
      { id: 'companies',     label: 'Companies',     icon: <Building2 size={14} /> },
      { id: 'daily-summary', label: 'Daily Summary', icon: <Newspaper size={14} /> },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    sub: [
      { id: 'blog',               label: 'Blog Post',          icon: <BookOpen size={14} /> },
      { id: 'grocer-performance', label: 'Grocer Performance', icon: <TrendingUp size={14} /> },
      { id: 'market-snapshot',    label: 'Market Snapshot',    icon: <BarChart2 size={14} /> },
      { id: 'video-script',       label: 'Video Script',       icon: <Video size={14} /> },
      { id: 'library',            label: 'Library',            icon: <Library size={14} /> },
      { id: 'upload',             label: 'Upload Document',    icon: <Upload size={14} /> },
    ],
  },
  {
    id: 'email',
    label: 'Email',
    sub: [
      { id: 'email',          label: 'Email',          icon: <Mail size={14} /> },
      { id: 'newsletter',     label: 'Newsletter',     icon: <NewsletterIcon size={14} /> },
      { id: 'email-sequence', label: 'Email Sequence', icon: <MailCheck size={14} /> },
    ],
  },
  {
    id: 'social-scheduler',
    label: 'Social Media Scheduler',
    sub: [],
  },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  activeView: string;
  onNavigate: (id: string) => void;
}

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const router = useRouter();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const openFlyout = useCallback((sectionId: string, el: HTMLElement) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const rect = el.getBoundingClientRect();
    setFlyoutTop(rect.top);
    setOpenSection(sectionId);
  }, []);

  const scheduleFlyoutClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpenSection(null), 120);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const navigate = useCallback((id: string) => {
    setOpenSection(null);
    if (id === 'social-scheduler') {
      router.push('/scheduler');
    } else {
      onNavigate(id);
    }
  }, [onNavigate, router]);

  // Determine which section is "active" based on activeView
  const activeSectionId = SECTIONS.find(s => s.sub.some(i => i.id === activeView))?.id ?? activeView;
  const currentFlyout = SECTIONS.find(s => s.id === openSection) ?? null;

  return (
    <>
      <aside
        className="flex flex-col h-screen w-[180px] flex-shrink-0 relative z-40"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Logo */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5 flex-shrink-0 w-full text-left transition-opacity hover:opacity-80"
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <ShoppingCart size={14} color="white" />
          </div>
          <div>
            <div className="text-white text-sm font-semibold leading-tight">Grocery</div>
            <div className="text-xs leading-tight" style={{ color: 'var(--accent-light)' }}>Doppio</div>
          </div>
        </button>

        {/* Nav — no scroll, evenly spaced */}
        <nav className="flex-1 flex flex-col justify-start gap-0.5 py-4 px-3">
          {SECTIONS.map((section) => {
            const isActive = activeSectionId === section.id;
            const isOpen = openSection === section.id;

            return (
              <button
                key={section.id}
                onMouseEnter={(e) => openFlyout(section.id, e.currentTarget)}
                onMouseLeave={scheduleFlyoutClose}
                onClick={() => {
                  if (section.sub.length === 0) navigate(section.id);
                  else openFlyout(section.id, document.querySelector(`[data-section="${section.id}"]`) as HTMLElement ?? document.body);
                }}
                data-section={section.id}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-150"
                style={{
                  background: isActive || isOpen ? 'var(--sidebar-active)' : 'transparent',
                  color: isActive || isOpen ? 'white' : 'rgba(255,255,255,0.6)',
                }}
                onFocus={() => {}}
              >
                <span className="text-[13px] font-semibold tracking-wide">{section.label}</span>
                {section.sub.length > 0 && (
                  <ChevronRight
                    size={13}
                    style={{
                      color: isActive || isOpen ? 'var(--accent-light)' : 'rgba(255,255,255,0.3)',
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 150ms',
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-white/5 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--sidebar-hover)';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)';
            }}
          >
            <LogOut size={14} />
            <span className="text-[12px]">Sign out</span>
          </button>
          <div className="text-[10px] px-3 mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Content Engine v1.0
          </div>
        </div>
      </aside>

      {/* Flyout submenu */}
      {openSection && currentFlyout && currentFlyout.sub.length > 0 && (
        <div
          className="fixed z-50"
          style={{ left: 180, top: flyoutTop }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleFlyoutClose}
        >
          <div
            className="rounded-xl py-2 min-w-[190px]"
            style={{
              background: 'var(--sidebar-bg)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            }}
          >
            {/* Section heading */}
            <div className="px-4 pb-1.5 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                {currentFlyout.label}
              </p>
            </div>

            {/* Sub-items */}
            {currentFlyout.sub.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-left transition-all duration-100 relative"
                  style={{
                    color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                    background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.9)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)';
                    }
                  }}
                >
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}
                  <span style={{ color: isActive ? 'var(--accent-light)' : 'rgba(255,255,255,0.4)' }}>
                    {item.icon}
                  </span>
                  <span className="text-[13px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

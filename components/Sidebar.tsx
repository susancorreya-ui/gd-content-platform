'use client';

import {
  BarChart2, BookOpen, FileText, Mail, Newspaper, Linkedin,
  Twitter, Video, Upload, Search, Lightbulb, TrendingUp,
  ShoppingCart, Library, MailCheck, LogOut, CalendarCheck, Rss, Building2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  label: string;
  color: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'DISCOVER',
    color: '#00AA50',
    items: [
      { id: 'insights', label: 'Home', icon: <Lightbulb size={15} /> },
      { id: 'search', label: 'Search', icon: <Search size={15} /> },
    ],
  },
  {
    label: 'CREATE',
    color: '#00AA50',
    items: [
      { id: 'blog', label: 'Blog Post', icon: <BookOpen size={15} /> },
      { id: 'market-snapshot', label: 'Market Snapshot', icon: <BarChart2 size={15} /> },
      { id: 'grocer-performance', label: 'Grocer Performance', icon: <TrendingUp size={15} /> },
      { id: 'newsletter', label: 'Newsletter', icon: <Newspaper size={15} /> },
      { id: 'social-linkedin', label: 'LinkedIn Post', icon: <Linkedin size={15} /> },
      { id: 'social-twitter', label: 'X / Twitter', icon: <Twitter size={15} /> },
      { id: 'email', label: 'Email', icon: <Mail size={15} /> },
      { id: 'email-sequence', label: 'Email Sequence', icon: <MailCheck size={15} /> },
      { id: 'video-script', label: 'Video Script', icon: <Video size={15} /> },
    ],
  },
  {
    label: 'LIBRARY',
    color: '#00AA50',
    items: [
      { id: 'library', label: 'Saved Content', icon: <Library size={15} /> },
    ],
  },
  {
    label: 'SCHEDULE',
    color: '#00AA50',
    items: [
      { id: 'social-scheduler', label: 'Social Scheduler', icon: <CalendarCheck size={15} /> },
    ],
  },
  {
    label: 'RESEARCH',
    color: '#00AA50',
    items: [
      { id: 'feed',          label: 'Intelligence Feed', icon: <Rss size={15} /> },
      { id: 'companies',     label: 'Companies',         icon: <Building2 size={15} /> },
      { id: 'daily-summary', label: 'Daily Summary',     icon: <Newspaper size={15} /> },
      { id: 'upload',        label: 'Upload Document',   icon: <Upload size={15} /> },
      { id: 'reports',       label: 'Saved Reports',     icon: <FileText size={15} /> },
    ],
  },
];

interface SidebarProps {
  activeView: string;
  onNavigate: (id: string) => void;
  researchCount: number;
  libraryCount: number;
}

export default function Sidebar({ activeView, onNavigate, researchCount, libraryCount }: SidebarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };
  return (
    <aside
      className="flex flex-col h-screen w-[200px] flex-shrink-0"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--accent)' }}
        >
          <ShoppingCart size={14} color="white" />
        </div>
        <div>
          <div className="text-white text-sm font-semibold leading-tight">Grocery</div>
          <div className="text-xs leading-tight" style={{ color: 'var(--accent-light)' }}>Doppio</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            <div
              className="text-[10px] font-semibold tracking-widest px-2 mb-2"
              style={{ color: section.color }}
            >
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive = activeView === item.id;
              const badge =
                item.id === 'reports' && researchCount > 0 ? researchCount :
                item.id === 'library' && libraryCount > 0 ? libraryCount :
                null;

              return (
                <button
                  key={item.id}
                  onClick={() => item.id === 'social-scheduler' ? router.push('/scheduler') : onNavigate(item.id)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 relative"
                  style={{
                    background: isActive ? 'var(--sidebar-active)' : 'transparent',
                    color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--sidebar-hover)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.85)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)';
                    }
                  }}
                >
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}
                  <span style={{ color: isActive ? 'var(--accent-light)' : 'inherit' }}>
                    {item.icon}
                  </span>
                  <span className="text-[13px] font-medium flex-1">{item.label}</span>
                  {badge !== null && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: 'var(--accent)', color: 'white' }}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/5 space-y-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all"
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
        <div className="text-[10px] px-2.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Content Engine v1.0
        </div>
      </div>
    </aside>
  );
}

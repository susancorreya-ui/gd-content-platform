'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ContentCreator from '@/components/ContentCreator';
import ResearchUpload from '@/components/ResearchUpload';
import ResearchFeed from '@/components/ResearchFeed';
import CompaniesTracker from '@/components/CompaniesTracker';
import InsightsHome from '@/components/InsightsHome';
import EmailSequence from '@/components/EmailSequence';
import SocialScheduler from '@/components/SocialScheduler';
import WebsiteSchedule from '@/components/WebsiteSchedule';
import ContentLibrary from '@/components/ContentLibrary';
import DailySummary from '@/components/DailySummary';
import { ContentType, LibraryItem } from '@/types';
import { useLibrary } from '@/lib/useLibrary';
import { useResearchDocs } from '@/lib/useResearchDocs';

const CREATOR_TYPES: ContentType[] = [
  'blog', 'grocer-performance', 'market-snapshot', 'newsletter', 'email', 'video-script',
];

const VALID_VIEWS = [
  'insights', 'home', 'feed', 'companies', 'daily-summary', 'upload', 'library',
  'email-sequence', 'social-scheduler', 'website-schedule',
  'blog', 'grocer-performance', 'market-snapshot', 'newsletter', 'email', 'video-script',
];

export default function Home() {
  const [activeView, setActiveView] = useState('insights');

  // On first load, read ?view= from the URL and navigate there directly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view && VALID_VIEWS.includes(view)) {
      setActiveView(view);
    }
  }, []);
  const [pipelineKey, setPipelineKey] = useState(0);
  const [feedPreset, setFeedPreset] = useState<{ topic: string; pillar: string } | null>(null);
  const { docs: researchDocs, addDoc, removeDoc } = useResearchDocs();
  const { items: libraryItems, addItem, removeItem, updateStatus } = useLibrary();

  const handleSaveToLibrary = (item: Omit<LibraryItem, 'id' | 'createdAt'>) => {
    addItem(item);
  };

  const handleSendToPipeline = (topic: string, pillar: string) => {
    setFeedPreset({ topic, pillar });
    setPipelineKey(k => k + 1);
    setActiveView('blog');
  };

  const renderMain = () => {
    if (activeView === 'home' || activeView === 'insights') {
      return <InsightsHome onNavigate={setActiveView} />;
    }
    if (activeView === 'feed') {
      return <ResearchFeed onSendToPipeline={handleSendToPipeline} onSaveToLibrary={handleSaveToLibrary} />;
    }
    if (activeView === 'companies') {
      return <CompaniesTracker />;
    }
    if (activeView === 'daily-summary') {
      return <DailySummary />;
    }
    if (activeView === 'upload') {
      return (
        <ResearchUpload
          docs={researchDocs}
          onDocAdded={addDoc}
          onDocRemoved={removeDoc}
        />
      );
    }
    if (activeView === 'email-sequence') {
      return <EmailSequence onSaveToLibrary={handleSaveToLibrary} />;
    }
    if (activeView === 'social-scheduler') {
      return <SocialScheduler researchDocs={researchDocs} />;
    }
    if (activeView === 'website-schedule') {
      return <WebsiteSchedule />;
    }
    if (activeView === 'library') {
      return <ContentLibrary items={libraryItems} onRemove={removeItem} onUpdateStatus={updateStatus} />;
    }
    if (CREATOR_TYPES.includes(activeView as ContentType)) {
      return (
        <ContentCreator
          key={`${activeView}-${pipelineKey}`}
          contentType={activeView as ContentType}
          researchDocs={researchDocs}
          onSaveToLibrary={handleSaveToLibrary}
          initialTopic={activeView === 'blog' && feedPreset ? feedPreset.topic : undefined}
          initialPillar={activeView === 'blog' && feedPreset ? feedPreset.pillar : undefined}
        />
      );
    }
    return <InsightsHome onNavigate={setActiveView} />;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderMain()}
      </main>
    </div>
  );
}

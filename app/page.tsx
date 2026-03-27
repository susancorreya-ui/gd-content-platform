'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ContentCreator from '@/components/ContentCreator';
import ResearchUpload from '@/components/ResearchUpload';
import ResearchFeed from '@/components/ResearchFeed';
import CompaniesTracker from '@/components/CompaniesTracker';
import DailySummary from '@/components/DailySummary';
import InsightsHome from '@/components/InsightsHome';
import SavedReports from '@/components/SavedReports';
import ContentLibrary from '@/components/ContentLibrary';
import EmailSequence from '@/components/EmailSequence';
import SocialScheduler from '@/components/SocialScheduler';
import { ContentType, LibraryItem } from '@/types';
import { useLibrary } from '@/lib/useLibrary';
import { useResearchDocs } from '@/lib/useResearchDocs';

const CREATOR_TYPES: ContentType[] = [
  'blog', 'market-snapshot', 'grocer-performance', 'newsletter',
  'social-linkedin', 'social-twitter', 'email', 'video-script',
];

export default function Home() {
  const [activeView, setActiveView] = useState('insights');
  const [pipelineKey, setPipelineKey] = useState(0);
  const [feedPreset, setFeedPreset] = useState<{ topic: string; pillar: string } | null>(null);
  const { docs: researchDocs, addDoc, removeDoc } = useResearchDocs();
  const { items: libraryItems, addItem, removeItem } = useLibrary();

  const handleSaveToLibrary = (item: Omit<LibraryItem, 'id' | 'createdAt'>) => {
    addItem(item);
  };

  const handleSendToPipeline = (topic: string, pillar: string) => {
    setFeedPreset({ topic, pillar });
    setPipelineKey(k => k + 1);
    setActiveView('blog');
  };

  const renderMain = () => {
    if (activeView === 'insights' || activeView === 'search') {
      return <InsightsHome onNavigate={setActiveView} />;
    }
    if (activeView === 'feed') {
      return <ResearchFeed onSendToPipeline={handleSendToPipeline} />;
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
    if (activeView === 'reports') {
      return (
        <SavedReports
          docs={researchDocs}
          onDocRemoved={removeDoc}
          onNavigate={setActiveView}
        />
      );
    }
    if (activeView === 'library') {
      return (
        <ContentLibrary
          items={libraryItems}
          onRemove={removeItem}
        />
      );
    }
    if (activeView === 'email-sequence') {
      return <EmailSequence onSaveToLibrary={handleSaveToLibrary} />;
    }
    if (activeView === 'social-scheduler') {
      return <SocialScheduler researchDocs={researchDocs} />;
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
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        researchCount={researchDocs.length}
        libraryCount={libraryItems.length}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderMain()}
      </main>
    </div>
  );
}

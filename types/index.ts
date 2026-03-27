export type ContentType =
  | 'blog'
  | 'market-snapshot'
  | 'grocer-performance'
  | 'newsletter'
  | 'social-linkedin'
  | 'social-twitter'
  | 'email'
  | 'video-script'
  | 'email-sequence';

export type BlogType =
  | 'standard'
  | 'listicle'
  | 'pillar-post'
  | 'thought-leadership';

export type EmailSubtype =
  | 'report-followup'
  | 'event-invite'
  | 'newsletter-subscribe'
  | 'sales-outreach';

export interface ContentTypeConfig {
  id: ContentType;
  label: string;
  icon: string;
  description: string;
  placeholder: string;
  badge?: string;
}

export interface ResearchDoc {
  id: string;
  name: string;
  size: number;
  extractedText: string;
  insights: string;
  uploadedAt: Date;
}

export interface LibraryItem {
  id: string;
  contentType: ContentType;
  title: string;
  output: string;
  metadata: Record<string, string>;
  createdAt: string;
}

export type SocialPlatform = 'linkedin' | 'twitter';
export type SocialPostStatus = 'draft' | 'scheduled' | 'published';
export type SocialContentType = 'report' | 'snapshot' | 'blog' | 'webinar' | 'grocer-performance' | 'holiday';

export interface ScheduledPost {
  id: string;
  platform: SocialPlatform;
  content: string;
  stat?: string;
  statDescription?: string;
  sourceName: string;
  sourceType: SocialContentType;
  scheduledDate?: string; // ISO date string YYYY-MM-DD
  scheduledTime?: string; // HH:MM
  status: SocialPostStatus;
  createdAt: string;
}

import { NextRequest, NextResponse } from 'next/server';

// Placeholder Source Agent
// Future versions will accept: uploaded documents, URLs, CMS drafts, RSS/news feeds, Notion pages
export async function POST(req: NextRequest) {
  const { topic, pillar, blogType, namedAuthor, researchContext } = await req.json();

  if (!topic?.trim() || !pillar?.trim()) {
    return NextResponse.json({ error: 'Topic and pillar are required' }, { status: 400 });
  }

  return NextResponse.json({
    sourceType: 'manual-input',
    topic: topic.trim(),
    pillar: pillar.trim(),
    blogType: blogType || 'standard',
    namedAuthor: namedAuthor?.trim() || '',
    content: researchContext || '',
    metadata: {
      receivedAt: new Date().toISOString(),
      note: 'Source agent placeholder — document, URL, and CMS source types coming soon',
    },
  });
}

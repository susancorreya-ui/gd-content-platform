import { NextRequest, NextResponse } from 'next/server';

// Placeholder Publishing Agent
// Future versions will integrate with: WordPress, Contentful, HubSpot, or Grocery Doppio's CMS
export async function POST(req: NextRequest) {
  const { draft, headline, seoTitle, metaDescription, urlSlug, pillar, blogType, author } = await req.json();

  if (!draft?.trim()) {
    return NextResponse.json({ error: 'No article content to publish' }, { status: 400 });
  }

  // Placeholder CMS payload — structure ready for real CMS integration
  const cmsPayload = {
    status: 'pending-review',
    title: headline || 'Untitled Article',
    seoTitle: seoTitle || headline || '',
    metaDescription: metaDescription || '',
    urlSlug: urlSlug || '',
    pillar: pillar || '',
    blogType: blogType || 'standard',
    author: author || 'Staff',
    content: draft,
    submittedAt: new Date().toISOString(),
    publishedAt: null,
    cmsId: null,
    note: 'CMS integration placeholder — connect to your CMS API to activate publishing',
  };

  // Simulate a short processing delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return NextResponse.json({
    success: true,
    status: 'submitted',
    cmsPayload,
    message: 'Article submitted to CMS queue (placeholder). Connect your CMS API to enable live publishing.',
  });
}

import { NextRequest, NextResponse } from 'next/server';

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_COLLECTION_ID = process.env.WEBFLOW_COLLECTION_ID;

export async function POST(req: NextRequest) {
  const { title, body, pillar, blogType, author } = await req.json();

  if (!WEBFLOW_API_TOKEN || !WEBFLOW_COLLECTION_ID) {
    // Return a helpful message instead of erroring — token not yet configured
    return NextResponse.json({
      success: false,
      message: 'Webflow not configured. Set WEBFLOW_API_TOKEN and WEBFLOW_COLLECTION_ID in .env.local to enable publishing.',
    });
  }

  try {
    const res = await fetch(`https://api.webflow.com/v2/collections/${WEBFLOW_COLLECTION_ID}/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
        'Content-Type': 'application/json',
        'accept-version': '1.0.0',
      },
      body: JSON.stringify({
        isArchived: false,
        isDraft: true,
        fieldData: {
          name: title,
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          'post-body': body,
          'content-pillar': pillar || '',
          'post-type': blogType || 'blog',
          author: author || 'Grocery Doppio',
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Webflow API error');

    return NextResponse.json({ success: true, itemId: data.id, slug: data.fieldData?.slug });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Webflow publish failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { generateSocialPosts } from '@/lib/agents';

export async function POST(req: NextRequest) {
  try {
    const { contentType, text, sourceName, partner, thirdPartySource, eventDetails } = await req.json();

    if (!contentType || !text || !sourceName) {
      return NextResponse.json(
        { error: 'contentType, text, and sourceName are required' },
        { status: 400 }
      );
    }

    const posts = await generateSocialPosts(
      contentType,
      text,
      sourceName,
      partner,
      thirdPartySource,
      eventDetails
    );

    return NextResponse.json({ posts });
  } catch (err: unknown) {
    console.error('[generate-social]', err);
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

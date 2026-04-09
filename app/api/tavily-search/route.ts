import { NextRequest, NextResponse } from 'next/server';
import { webSearch } from '@/lib/webSearch';

export async function POST(req: NextRequest) {
  const { query, count = 6, siteFilter } = await req.json();

  try {
    const raw = await webSearch({
      query,
      maxResults: count,
      includeDomains: siteFilter ? [siteFilter] : undefined,
    });

    const results = raw.map(r => ({
      title: r.title,
      url: r.url,
      description: r.content,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Search failed' }, { status: 500 });
  }
}

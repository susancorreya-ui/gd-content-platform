import { NextRequest, NextResponse } from 'next/server';

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
}

export async function POST(req: NextRequest) {
  const { query, count = 6, siteFilter } = await req.json();
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'TAVILY_API_KEY not configured in .env.local' }, { status: 500 });

  try {
    const body: Record<string, unknown> = {
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: count,
    };
    if (siteFilter) body.include_domains = [siteFilter];

    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Tavily error ${res.status}: ${text}` }, { status: res.status });
    }

    const data: TavilyResponse = await res.json();
    const results = (data.results || []).map(r => ({
      title: r.title,
      url: r.url,
      description: r.content || '',
    }));

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Search failed' }, { status: 500 });
  }
}

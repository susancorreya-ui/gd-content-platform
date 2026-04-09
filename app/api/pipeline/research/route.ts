import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { webSearch } from '@/lib/webSearch';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RawResult {
  title: string;
  url: string;
  description: string;
}

interface ReviewedSource {
  index: number;
  title: string;
  url: string;
  description: string;
  source: 'web' | 'gd';
  relevance: 'High' | 'Medium' | 'Low';
  sourceType: string;
  recommendation: 'INCLUDE' | 'SKIP';
  reason: string;
}

const CREDIBLE_DOMAINS = [
  'reuters.com', 'apnews.com', 'bloomberg.com', 'wsj.com',
  'ft.com', 'cnbc.com', 'forbes.com', 'economist.com',
  'supermarketnews.com', 'progressivegrocer.com', 'grocerydive.com',
  'chainstoreage.com', 'fmi.org',
  'businesswire.com', 'prnewswire.com', 'globenewswire.com',
  'mckinsey.com', 'deloitte.com', 'pwc.com', 'bcg.com',
  'hbr.org', 'gartner.com', 'forrester.com',
  'nielseniq.com', 'nielsen.com', 'circana.com', 'kantar.com',
  'usda.gov', 'census.gov', 'bls.gov',
];

async function tavilySearch(query: string, count = 6, siteFilter?: string): Promise<RawResult[]> {
  const raw = await webSearch({
    query,
    maxResults: count,
    includeDomains: siteFilter ? [siteFilter] : CREDIBLE_DOMAINS,
  });
  return raw.map(r => ({ title: r.title, url: r.url, description: r.content }));
}

function guessSourceType(url: string): string {
  if (/mckinsey|deloitte|pwc|bcg|gartner|forrester|hbr/.test(url)) return 'Analyst report';
  if (/businesswire|prnewswire|globenewswire/.test(url)) return 'Press release';
  if (/reuters|apnews|bloomberg|wsj|ft|cnbc|forbes/.test(url)) return 'Newswire';
  if (/nielseniq|nielsen|circana|kantar/.test(url)) return 'Proprietary research';
  if (/usda|census|bls/.test(url)) return 'Government data';
  if (/grocerydive|supermarketnews|progressivegrocer|chainstoreage|fmi/.test(url)) return 'Trade publication';
  return 'Industry source';
}

async function generateSearchQueries(topic: string, pillar: string): Promise<string[]> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `You are a research strategist for Grocery Doppio, a grocery industry intelligence platform.

Given this article topic and content pillar, generate 3 targeted search queries to find the most relevant, high-quality sources.

Topic: "${topic}"
Content Pillar: ${pillar}

Rules:
- Each query must target a different angle: (1) the specific trend or development, (2) data/statistics/market sizing, (3) specific company examples or case studies
- Queries must be specific to grocery/retail — not generic
- Keep each query under 12 words
- Do not repeat the same keywords across queries

Return ONLY a JSON array of 3 strings. No markdown, no explanation.
Example: ["query one", "query two", "query three"]`,
    }],
  });

  try {
    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const queries: string[] = JSON.parse(cleaned);
    return queries.slice(0, 3);
  } catch {
    return [`${topic} grocery retail ${pillar}`];
  }
}

export async function POST(req: NextRequest) {
  const { topic, pillar } = await req.json();

  try {
    // Generate targeted search queries based on the topic
    const searchQueries = await generateSearchQueries(topic, pillar);

    // Agent 1 — Web Research: run all queries in parallel, deduplicate by URL
    const webSearches = await Promise.allSettled(
      searchQueries.map(q => tavilySearch(q, 5))
    );
    const seenUrls = new Set<string>();
    const webResults: RawResult[] = [];
    for (const result of webSearches) {
      if (result.status === 'fulfilled') {
        for (const r of result.value) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            webResults.push(r);
          }
        }
      }
    }

    // Agent 2 — GD Site Research: relevant Grocery Doppio content
    const gdQuery = `${topic} ${pillar}`;
    const gdResults = await tavilySearch(gdQuery, 5, 'grocerydoppio.com');

    // Combine and auto-include all sources — user toggles in the UI
    const reviewedSources: ReviewedSource[] = [
      ...webResults.map((r, i) => ({
        ...r,
        index: i + 1,
        source: 'web' as const,
        relevance: 'High' as const,
        sourceType: guessSourceType(r.url),
        recommendation: 'INCLUDE' as const,
        reason: 'Sourced from credible domain via targeted search',
      })),
      ...gdResults.map((r, i) => ({
        ...r,
        index: webResults.length + i + 1,
        source: 'gd' as const,
        relevance: 'Medium' as const,
        sourceType: 'Proprietary research',
        recommendation: 'INCLUDE' as const,
        reason: 'Grocery Doppio internal content for reference linking',
      })),
    ];

    return NextResponse.json({
      webResults,
      gdResults,
      reviewedSources,
      summary: `Searched: ${searchQueries.join(' · ')}. Found ${webResults.length} web sources and ${gdResults.length} Grocery Doppio articles. Toggle any source off before building the outline.`,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Research pipeline failed' }, { status: 500 });
  }
}

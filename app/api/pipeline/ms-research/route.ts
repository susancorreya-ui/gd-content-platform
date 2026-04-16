import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { webSearch } from '@/lib/webSearch';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RawResult {
  title: string;
  url: string;
  content?: string;
  published_date?: string;
}

export interface MSSource {
  index: number;
  title: string;
  url: string;
  description: string;
  sourceDomain: string;
  sourceType: string;
  source: 'web' | 'gd';
}

// Prioritise analyst, research, and trade domains
const ANALYST_DOMAINS = [
  'mckinsey.com', 'deloitte.com', 'pwc.com', 'bcg.com', 'accenture.com', 'bain.com',
  'gartner.com', 'forrester.com', 'hbr.org', 'idc.com', 'frost.com',
  'nielseniq.com', 'circana.com', 'kantar.com', 'ipsos.com', 'iri.com',
  'fmi.org', 'grocerydive.com', 'supermarketnews.com', 'progressivegrocer.com',
  'chainstoreage.com', 'retaildive.com',
  'reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com', 'economist.com',
  'businesswire.com', 'prnewswire.com', 'globenewswire.com',
];

function guessSourceType(url: string): string {
  if (/mckinsey|deloitte|pwc|bcg|accenture|bain|gartner|forrester|hbr|idc|frost/.test(url)) return 'Analyst report';
  if (/nielseniq|nielsen|circana|kantar|ipsos|iri/.test(url)) return 'Proprietary research';
  if (/fmi\.org|grocerydive|supermarketnews|progressivegrocer|chainstoreage|retaildive/.test(url)) return 'Trade publication';
  if (/businesswire|prnewswire|globenewswire/.test(url)) return 'Press release';
  if (/reuters|bloomberg|wsj|ft\.com|economist/.test(url)) return 'Newswire';
  if (/usda|census|bls/.test(url)) return 'Government data';
  return 'Industry source';
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

async function search(query: string, domains: string[]): Promise<RawResult[]> {
  try {
    const results = await webSearch({ query, maxResults: 6, includeDomains: domains });
    return results.map(r => ({ title: r.title, url: r.url, content: r.content, published_date: r.published_date }));
  } catch { return []; }
}

async function generateQueries(theme: string, subThemes: string): Promise<string[]> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are a research strategist for Grocery Doppio, a grocery industry intelligence platform.

Generate 4 targeted search queries to find the best analyst reports, statistics, and industry sources for a Market Snapshot about:

Main theme: "${theme}"
Sub-themes: ${subThemes}

Rules:
- Query 1: core theme + grocery/retail industry statistics or market data
- Query 2: analyst report or research study on the theme (McKinsey, Gartner, Forrester, Nielsen, etc.)
- Query 3: retailer or company examples/case studies related to the theme
- Query 4: future outlook, investment trends, or strategic implications of the theme

Each query must be specific to grocery/retail. Keep each under 12 words.

Return ONLY a JSON array of 4 strings. No markdown, no explanation.`,
    }],
  });

  try {
    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return (JSON.parse(cleaned) as string[]).slice(0, 4);
  } catch {
    return [`${theme} grocery retail statistics`, `${theme} analyst report grocery`, `${theme} retailer case study`];
  }
}

export async function POST(req: NextRequest) {
  const { theme, subThemes, supportingLinks } = await req.json();

  if (!theme) return NextResponse.json({ error: 'Theme is required' }, { status: 400 });

  try {
    const queries = await generateQueries(theme, subThemes || '');

    // Run all searches in parallel — analyst domains prioritised
    const searches = await Promise.allSettled(
      queries.map(q => search(q, ANALYST_DOMAINS))
    );

    const seenUrls = new Set<string>();
    const allResults: RawResult[] = [];
    for (const s of searches) {
      if (s.status === 'fulfilled') {
        for (const r of s.value) {
          if (r.url && r.title && !seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            allResults.push(r);
          }
        }
      }
    }

    // GD content search
    let gdResults: RawResult[] = [];
    try {
      const gd = await webSearch({ query: `${theme} grocery`, maxResults: 4, includeDomains: ['grocerydoppio.com'] });
      gdResults = gd.map(r => ({ title: r.title, url: r.url, content: r.content }));
    } catch { /* non-blocking */ }

    // User-provided links
    const userLinks: MSSource[] = [];
    if (supportingLinks?.trim()) {
      (supportingLinks as string).split('\n').map((l: string) => l.trim()).filter(Boolean)
        .forEach((url: string, i: number) => {
          if (url.startsWith('http')) {
            userLinks.push({
              index: allResults.length + gdResults.length + i + 1,
              title: `Provided source ${i + 1}`,
              url,
              description: 'User-provided source — included in research context.',
              sourceDomain: extractDomain(url),
              sourceType: 'User-provided',
              source: 'web',
            });
          }
        });
    }

    const webSources: MSSource[] = allResults.slice(0, 18).map((r, i) => ({
      index: i + 1,
      title: r.title,
      url: r.url,
      description: (r.content || '').slice(0, 240),
      sourceDomain: extractDomain(r.url),
      sourceType: guessSourceType(r.url),
      source: 'web' as const,
    }));

    const gdSources: MSSource[] = gdResults.map((r, i) => ({
      index: webSources.length + i + 1,
      title: r.title,
      url: r.url,
      description: (r.content || '').slice(0, 240),
      sourceDomain: extractDomain(r.url),
      sourceType: 'GD Content',
      source: 'gd' as const,
    }));

    const allSources = [...webSources, ...gdSources, ...userLinks];

    return NextResponse.json({
      sources: allSources,
      summary: `Searched: ${queries.join(' · ')}. Found ${webSources.length} external sources and ${gdSources.length} Grocery Doppio articles.`,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Research failed' }, { status: 500 });
  }
}

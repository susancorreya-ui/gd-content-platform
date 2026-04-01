import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RawResult {
  title: string;
  url: string;
  content?: string;
  published_date?: string;
}

export interface GrowerSource {
  index: number;
  title: string;
  url: string;
  description: string;
  sourceDomain: string;
  sourceType: string;
  publishedAt: string;
  isUserProvided?: boolean;
}

export interface ExtractedInsights {
  headline: string;
  sections: {
    financials: string[];
    digitalCommerce: string[];
    fulfilment: string[];
    loyalty: string[];
    retailMedia: string[];
    aiTechnology: string[];
    outlook: string[];
  };
  notFound: string[];
}

const FINANCIAL_DOMAINS = [
  'prnewswire.com', 'businesswire.com', 'globenewswire.com', 'accesswire.com',
  'bloomberg.com', 'wsj.com', 'reuters.com', 'cnbc.com', 'ft.com',
  'grocerydive.com', 'supermarketnews.com', 'progressivegrocer.com',
  'chainstoreage.com', 'forbes.com',
  'ir.kroger.com', 'investors.albertsonscompanies.com', 'investor.costco.com',
  'investors.groceryoutlet.com', 'investors.target.com', 'stock.walmart.com',
  'aholddelhaize.com', 'weismarkets.com',
];

async function tavilySearch(query: string): Promise<RawResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error('TAVILY_API_KEY not configured in .env.local');

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      max_results: 5,
      days: 365,
      include_domains: FINANCIAL_DOMAINS,
    }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

function guessSourceType(url: string): string {
  if (/businesswire|prnewswire|globenewswire|accesswire/.test(url)) return 'Press release';
  if (/\/(ir|investor|investors)\/|earnings|quarterly|annual/i.test(url)) return 'Investor relations';
  if (/bloomberg|wsj|ft\.com|reuters/.test(url)) return 'Financial news';
  if (/grocerydive|supermarketnews|progressivegrocer|chainstoreage/.test(url)) return 'Trade publication';
  if (/cnbc|forbes/.test(url)) return 'Business news';
  return 'Industry source';
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

async function extractInsights(
  retailer: string,
  periodLabel: string,
  rawContent: string,
  knownData: string,
): Promise<ExtractedInsights> {
  const prompt = `You are a grocery industry analyst. Read the following research content about ${retailer}'s ${periodLabel} performance and extract every specific data point you can find.

Research content:
${rawContent}

${knownData?.trim() ? `Analyst notes:\n${knownData}\n` : ''}

Extract all available facts into this exact JSON structure. Each array should contain short, specific bullet points with numbers where available. If a section has no data, leave its array empty. Do not fabricate any numbers — only use what is in the content above.

{
  "headline": "one-line summary of the quarter's headline result (e.g. 'Kroger Q4 2024: comp sales +2.8%, digital sales +18%')",
  "sections": {
    "financials": ["revenue figure", "comparable sales growth", "gross margin", "operating income", "guidance if any"],
    "digitalCommerce": ["ecommerce sales growth %", "online order volume", "app stats", "click-and-collect / BOPIS data", "delivery metrics"],
    "fulfilment": ["fulfilment centre count", "dark store updates", "same-day delivery expansion", "third-party partnerships (Instacart, DoorDash etc)", "delivery speed improvements"],
    "loyalty": ["loyalty member count", "programme changes", "personalised offer data", "redemption rates", "reward programme metrics"],
    "retailMedia": ["retail media network revenue", "YoY growth", "CPG advertiser count", "programmatic / off-site expansion", "named partnerships"],
    "aiTechnology": ["AI initiatives named", "automation pilots", "pricing algorithm updates", "demand forecasting", "in-store tech deployments"],
    "outlook": ["next quarter or FY guidance", "strategic investment priorities", "named initiatives", "management commentary on technology"]
  },
  "notFound": ["list any of the 7 sections above where no data was found"]
}

Return only valid JSON. No markdown, no preamble.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned) as ExtractedInsights;
  } catch {
    return {
      headline: `${retailer} ${periodLabel} performance`,
      sections: {
        financials: [],
        digitalCommerce: [],
        fulfilment: [],
        loyalty: [],
        retailMedia: [],
        aiTechnology: [],
        outlook: [],
      },
      notFound: ['Extraction failed — article will use raw research content'],
    };
  }
}

export async function POST(req: NextRequest) {
  const { retailer, quarter, year, knownData, supportingLinks } = await req.json();

  if (!retailer) {
    return NextResponse.json({ error: 'Retailer name is required' }, { status: 400 });
  }

  const periodLabel = `${quarter} ${year}`;

  try {
    // 5 targeted searches — each covers a different section of the article
    const searches = await Promise.allSettled([
      tavilySearch(`"${retailer}" ${periodLabel} earnings results revenue comparable sales`),
      tavilySearch(`"${retailer}" ${periodLabel} digital ecommerce online grocery delivery`),
      tavilySearch(`"${retailer}" ${periodLabel} loyalty programme rewards personalisation`),
      tavilySearch(`"${retailer}" ${periodLabel} retail media network advertising CPG`),
      tavilySearch(`"${retailer}" ${periodLabel} artificial intelligence automation technology investment`),
    ]);

    // Merge and deduplicate
    const seenUrls = new Set<string>();
    const allResults: RawResult[] = [];

    for (const settled of searches) {
      if (settled.status === 'fulfilled') {
        for (const r of settled.value) {
          if (r.url && r.title && !seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            allResults.push(r);
          }
        }
      }
    }

    // Build source list
    const webSources: GrowerSource[] = allResults.slice(0, 15).map((r, i) => ({
      index: i + 1,
      title: r.title,
      url: r.url,
      description: (r.content || '').slice(0, 280),
      sourceDomain: extractDomain(r.url),
      sourceType: guessSourceType(r.url),
      publishedAt: r.published_date || '',
    }));

    // User-provided links
    const userLinks: GrowerSource[] = [];
    if (supportingLinks?.trim()) {
      (supportingLinks as string).split('\n').map((l: string) => l.trim()).filter(Boolean)
        .forEach((url: string, i: number) => {
          if (url.startsWith('http')) {
            userLinks.push({
              index: webSources.length + i + 1,
              title: `User-provided source ${i + 1}`,
              url,
              description: 'Provided by user — included in the research context.',
              sourceDomain: extractDomain(url),
              sourceType: 'User-provided',
              publishedAt: '',
              isUserProvided: true,
            });
          }
        });
    }

    const allSources = [...webSources, ...userLinks];

    // Build raw content for extraction agent
    const rawContent = allResults
      .map(r => `### ${r.title}\nSource: ${extractDomain(r.url)}\n${r.content || ''}`)
      .join('\n\n---\n\n')
      .slice(0, 18000); // stay within Haiku context

    // Run extraction agent in parallel with source building
    const insights = await extractInsights(retailer, periodLabel, rawContent, knownData || '');

    // Build context snippet for write stage
    const contextSnippet = [
      `Extracted insights for ${retailer} ${periodLabel}:`,
      insights.headline ? `Headline: ${insights.headline}` : '',
      Object.entries(insights.sections)
        .filter(([, bullets]) => bullets.length > 0)
        .map(([section, bullets]) => `${section}:\n${bullets.map((b: string) => `- ${b}`).join('\n')}`)
        .join('\n\n'),
      knownData?.trim() ? `Analyst notes:\n${knownData}` : '',
      allSources.length > 0
        ? `Sources:\n${allSources.map(s => `- ${s.title} (${s.sourceDomain}) ${s.url}`).join('\n')}`
        : '',
    ].filter(Boolean).join('\n\n');

    return NextResponse.json({
      sources: allSources,
      insights,
      contextSnippet,
      summary: `Analysed ${allResults.length} source${allResults.length !== 1 ? 's' : ''} for ${retailer} ${periodLabel}. ${insights.notFound?.length ? `No data found for: ${insights.notFound.join(', ')}.` : 'All sections covered.'}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Grocer research failed' },
      { status: 500 },
    );
  }
}

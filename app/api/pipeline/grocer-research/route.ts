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
  period: string;
  headline: string;
  sections: {
    financials: string[];
    digitalCommerce: string[];
    fulfillment: string[];
    loyalty: string[];
    retailMedia: string[];
    aiTechnology: string[];
    outlook: string[];
  };
  notFound: string[];
}

// ─── Retailer IR / newsroom domain map ────────────────────────────────────────
// When a grocer's own IR or newsroom domain is known, we search it first so we
// get the most authoritative, up-to-date earnings data straight from the source.

const GROCER_IR_DOMAINS: Record<string, string[]> = {
  'ahold delhaize':      ['aholddelhaize.com'],
  'albertsons':          ['investors.albertsonscompanies.com', 'albertsonscompanies.com'],
  'aldi':                ['corporate.aldi.us', 'aldi.us'],
  'amazon fresh':        ['ir.aboutamazon.com', 'aboutamazon.com'],
  "bj's wholesale":      ['ir.bjs.com'],
  'costco':              ['investor.costco.com'],
  'cvs pharmacy':        ['investors.cvs.com'],
  'dollar general':      ['investor.dollargeneral.com'],
  'food lion':           ['foodlion.com'],
  'giant eagle':         ['gianteagle.com'],
  'grocery outlet':      ['investors.groceryoutlet.com'],
  'h-e-b':               ['newsroom.heb.com'],
  'hannaford':           ['hannaford.com'],
  'hy-vee':              ['hy-vee.com'],
  'instacart':           ['ir.instacart.com'],
  'kroger':              ['ir.kroger.com', 'thekrogerco.com'],
  'meijer':              ['meijer.com'],
  'publix':              ['corporate.publix.com'],
  'safeway':             ['albertsonscompanies.com'],
  "sam's club":          ['corporate.walmart.com', 'stock.walmart.com'],
  'stop & shop':         ['stopandshop.com'],
  'target':              ['investors.target.com', 'corporate.target.com'],
  "trader joe's":        ['traderjoes.com'],
  'walmart':             ['stock.walmart.com', 'corporate.walmart.com'],
  'weis markets':        ['weismarkets.com'],
  'whole foods':         ['media.wholefoodsmarket.com'],
  'winn-dixie':          ['segrocers.com'],
};

const CREDIBLE_FINANCIAL_DOMAINS = [
  'prnewswire.com', 'businesswire.com', 'globenewswire.com', 'accesswire.com',
  'bloomberg.com', 'wsj.com', 'reuters.com', 'cnbc.com', 'ft.com',
  'grocerydive.com', 'supermarketnews.com', 'progressivegrocer.com',
  'chainstoreage.com', 'forbes.com', 'apnews.com',
];

function getIRDomains(retailer: string): string[] {
  const key = retailer.toLowerCase().trim();
  for (const [name, domains] of Object.entries(GROCER_IR_DOMAINS)) {
    if (key.includes(name) || name.includes(key)) return domains;
  }
  return [];
}

const SEARCH_TIMEOUT_MS = 10000;

async function tavilySearch(
  query: string,
  includeDomains: string[],
  days = 180,
): Promise<RawResult[]> {
  const searchPromise = webSearch({
    query,
    maxResults: 5,
    days,
    includeDomains,
    includeRawContent: true,
  }).then(results => results.map(r => ({
    title: r.title,
    url: r.url,
    content: r.content,
    published_date: r.published_date || undefined,
  } as RawResult)));

  const timeout = new Promise<RawResult[]>(resolve =>
    setTimeout(() => resolve([]), SEARCH_TIMEOUT_MS)
  );

  return Promise.race([searchPromise, timeout]);
}

function guessSourceType(url: string): string {
  if (/businesswire|prnewswire|globenewswire|accesswire/.test(url)) return 'Press release';
  if (/\/(ir|investor|investors)\/|earnings|quarterly|annual/i.test(url)) return 'Investor relations';
  if (/bloomberg|wsj|ft\.com|reuters/.test(url)) return 'Financial news';
  if (/grocerydive|supermarketnews|progressivegrocer|chainstoreage/.test(url)) return 'Trade publication';
  if (/cnbc|forbes|apnews/.test(url)) return 'Business news';
  return 'Industry source';
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

async function extractInsights(
  retailer: string,
  rawContent: string,
  knownData: string,
): Promise<ExtractedInsights> {
  const prompt = `You are a grocery industry analyst. Read the following research content about ${retailer} and extract every specific data point from their most recent published earnings report or financial results.

Research content:
${rawContent}

${knownData?.trim() ? `Analyst notes:\n${knownData}\n` : ''}

Extract all available facts into this exact JSON structure. Each array should contain short, specific bullet points with actual figures and facts from the content. Do not fabricate any numbers.

IMPORTANT: The "period" field must identify exactly which reporting period this data covers (e.g. "Q4 FY2025", "Q2 2026", "FY2024", "Third Quarter 2025"). Derive this from the content — do not guess.

For each section, extract ANY relevant mention — even partial or indirect references count. For example:
- "digitalCommerce": any mention of online sales, ecommerce, app, digital orders, click-and-collect, BOPIS, or delivery
- "fulfillment": any mention of fulfillment centres, dark stores, same-day, last-mile, delivery speed, or third-party (Instacart, DoorDash)
- "loyalty": any mention of loyalty members, rewards, personalization, offers, or program changes
- "retailMedia": any mention of retail media, advertising revenue, CPG partnerships, or sponsored placements
- "aiTechnology": any mention of AI, automation, machine learning, pricing algorithms, robots, or in-store technology

If a section has genuinely no mention at all in the content, leave its array empty.

{
  "period": "the specific reporting period found in the content (e.g. Q4 FY2025, Q1 2026)",
  "headline": "one-line summary of the headline result with the period (e.g. 'Kroger Q4 FY2025: comp sales +2.8%, digital sales +18%')",
  "sections": {
    "financials": [],
    "digitalCommerce": [],
    "fulfillment": [],
    "loyalty": [],
    "retailMedia": [],
    "aiTechnology": [],
    "outlook": []
  },
  "notFound": ["list ONLY the top-level section names (e.g. digitalCommerce, retailMedia) where the array is completely empty — do not list individual missing data points"]
}

Return only valid JSON. No markdown, no preamble.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned) as ExtractedInsights;
  } catch {
    return {
      period: 'Latest period',
      headline: `${retailer} — latest earnings`,
      sections: {
        financials: [], digitalCommerce: [], fulfillment: [],
        loyalty: [], retailMedia: [], aiTechnology: [], outlook: [],
      },
      notFound: ['Extraction failed — article will use raw research content'],
    };
  }
}

export async function POST(req: NextRequest) {
  const { retailer, knownData, supportingLinks } = await req.json();

  if (!retailer) {
    return NextResponse.json({ error: 'Retailer name is required' }, { status: 400 });
  }

  const irDomains = getIRDomains(retailer);
  const allDomains = [...irDomains, ...CREDIBLE_FINANCIAL_DOMAINS];

  try {
    // 2 parallel searches: IR/earnings first, then one broad press query covering all topics
    const searches = await Promise.allSettled([
      irDomains.length > 0
        ? tavilySearch(`${retailer} latest earnings results quarterly annual`, irDomains, 365)
        : tavilySearch(`"${retailer}" latest earnings results financial performance`, CREDIBLE_FINANCIAL_DOMAINS, 180),
      tavilySearch(`"${retailer}" earnings digital ecommerce loyalty retail media AI technology guidance`, allDomains, 180),
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

    // Sort: IR/newsroom results first
    allResults.sort((a, b) => {
      const aIsIR = irDomains.some(d => a.url.includes(d));
      const bIsIR = irDomains.some(d => b.url.includes(d));
      if (aIsIR && !bIsIR) return -1;
      if (!aIsIR && bIsIR) return 1;
      return 0;
    });

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

    // Build content for extraction agent
    const rawContent = allResults
      .map(r => `### ${r.title}\nSource: ${extractDomain(r.url)} | Date: ${r.published_date || 'unknown'}\n${r.content || ''}`)
      .join('\n\n---\n\n')
      .slice(0, 28000);

    const insights = await extractInsights(retailer, rawContent, knownData || '');

    // Assemble context for write stage
    const contextSnippet = [
      `Retailer: ${retailer}`,
      `Reporting period: ${insights.period}`,
      insights.headline ? `Headline: ${insights.headline}` : '',
      Object.entries(insights.sections)
        .filter(([, bullets]) => bullets.length > 0)
        .map(([section, bullets]) => `${section}:\n${(bullets as string[]).map(b => `- ${b}`).join('\n')}`)
        .join('\n\n'),
      knownData?.trim() ? `Analyst notes:\n${knownData}` : '',
      allSources.length > 0
        ? `Sources:\n${allSources.map(s => `- ${s.title} (${s.sourceDomain}) ${s.url}`).join('\n')}`
        : '',
    ].filter(Boolean).join('\n\n');

    const irNote = irDomains.length > 0
      ? `Searched ${retailer}'s investor relations pages (${irDomains[0]}) and industry press.`
      : `Searched industry press and financial newswires.`;

    return NextResponse.json({
      sources: allSources,
      insights,
      contextSnippet,
      summary: `${irNote} Found ${allResults.length} source${allResults.length !== 1 ? 's' : ''}. Latest period identified: ${insights.period}.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Grocer research failed' },
      { status: 500 },
    );
  }
}

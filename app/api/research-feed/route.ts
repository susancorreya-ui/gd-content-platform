import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60; // seconds (requires Vercel Pro; 10s on Hobby)

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CUTOFF_DATE = new Date('2026-01-01T00:00:00.000Z').getTime();

const PILLARS = [
  'Artificial Intelligence',
  'Automation',
  'Digital Commerce',
  'Personalization',
  'Retail Media',
  'Supply Chain',
];

// Explicit 2026 queries — forces recency at the query level
const PILLAR_QUERIES: Record<string, string> = {
  'Artificial Intelligence': 'artificial intelligence AI grocery retail 2026',
  'Automation':              'automation robotics fulfillment grocery retail 2026',
  'Digital Commerce':        'online grocery ecommerce digital commerce 2026',
  'Personalization':         'personalization loyalty grocery retail shopper 2026',
  'Retail Media':            'retail media network grocery CPG advertising 2026',
  'Supply Chain':            'supply chain logistics grocery inventory 2026',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArticleType = 'news' | 'pr' | 'earnings';

export interface FeedItem {
  id: string;
  title: string;
  url: string;
  description: string;
  source: string;
  sourceDomain: string;
  publishedAt: string;
  pillar: string;
  type: ArticleType;
  isGD: boolean;
}

// ─── Parse date from raw HTML ─────────────────────────────────────────────────

function parseDateFromHtml(html: string): string {
  // 1. JSON-LD datePublished (most reliable — used by Reuters, Forbes, AP, etc.)
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const obj = JSON.parse(m[1]);
      const items = Array.isArray(obj) ? obj : [obj];
      for (const item of items) {
        const d = item.datePublished || item.dateCreated;
        if (d) { const t = new Date(d); if (!isNaN(t.getTime())) return t.toISOString(); }
      }
    } catch { /* malformed JSON */ }
  }
  // 2. <meta> tags — try both attribute orderings
  const metaRe = [
    /meta[^>]+(?:property|name)=["'](?:article:published_time|datePublished|date|pubdate|publishdate|DC\.date\.issued)["'][^>]+content=["']([^"']+)["']/i,
    /meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:article:published_time|datePublished|date|pubdate|publishdate|DC\.date\.issued)["']/i,
  ];
  for (const re of metaRe) {
    const m = html.match(re);
    if (m) { const t = new Date(m[1]); if (!isNaN(t.getTime())) return t.toISOString(); }
  }
  // 3. <time datetime="..."> element
  const tm = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  if (tm) { const t = new Date(tm[1]); if (!isNaN(t.getTime())) return t.toISOString(); }
  return '';
}

// Fetch HTML of an article and extract its publish date (4 s timeout)
async function fetchDateFromPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    return parseDateFromHtml(html);
  } catch { return ''; }
}

// Run page fetches in parallel for all undated items
async function hydrateDates(items: Array<{ url: string; publishedAt: string }>): Promise<void> {
  await Promise.allSettled(
    items
      .filter(i => !i.publishedAt)
      .map(async (i) => {
        const d = await fetchDateFromPage(i.url);
        if (d) i.publishedAt = d;
      })
  );
}

function detectType(url: string, title: string): ArticleType {
  if (/prnewswire|businesswire|globenewswire|accesswire/i.test(url)) return 'pr';
  if (/\/ir\/|investor|earnings|quarterly|annual.report/i.test(url)) return 'earnings';
  if (/earnings|quarterly results|investor day/i.test(title)) return 'earnings';
  return 'news';
}

// ─── Credible domains for Tavily searches ─────────────────────────────────────

const CREDIBLE_DOMAINS = [
  // Newswire & financial press
  'reuters.com', 'apnews.com', 'bloomberg.com', 'wsj.com',
  'ft.com', 'cnbc.com', 'forbes.com', 'economist.com',
  // Industry press
  'supermarketnews.com', 'progressivegrocer.com', 'grocerydive.com',
  'chainstoreage.com', 'fmi.org',
  // PR & official releases
  'businesswire.com', 'prnewswire.com', 'globenewswire.com',
  // Research & consulting
  'mckinsey.com', 'deloitte.com', 'pwc.com', 'bcg.com',
  'hbr.org', 'gartner.com', 'forrester.com',
  // Data & measurement
  'nielseniq.com', 'nielsen.com', 'circana.com', 'kantar.com',
  // Government
  'usda.gov', 'census.gov', 'bls.gov',
];

// ─── Tavily Search ────────────────────────────────────────────────────────────

async function tavilySearch(query: string): Promise<Omit<FeedItem, 'id' | 'pillar' | 'isGD'>[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        max_results: 7,
        days: 7,
        include_domains: CREDIBLE_DOMAINS,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || [])
      .filter((r: { published_date?: string }) => {
        if (!r.published_date) return true; // no date — trust Tavily's days:7 param
        const ts = new Date(r.published_date).getTime();
        return isNaN(ts) || ts >= CUTOFF_DATE; // drop confirmed old articles
      })
      .map((r: { title: string; url: string; content: string; published_date?: string }) => ({
        title: r.title || '',
        url: r.url || '',
        description: (r.content || '').slice(0, 250),
        source: new URL(r.url).hostname.replace('www.', ''),
        sourceDomain: new URL(r.url).hostname.replace('www.', ''),
        publishedAt: r.published_date || '',
        type: detectType(r.url || '', r.title || ''),
      }));
  } catch {
    return [];
  }
}

// ─── Pillar Categorisation ────────────────────────────────────────────────────

const PILLAR_KEYWORDS: Record<string, string[]> = {
  'Artificial Intelligence': ['artificial intelligence', ' ai ', ' ai,', ' ai.', 'machine learning', 'ml ', 'generative', 'chatgpt', 'predictive', 'algorithm', 'neural', 'llm', 'deep learning'],
  'Automation':              ['automation', 'automated', 'robotics', 'robot', 'autonomous', 'dark store', 'micro-fulfillment', 'fulfillment center', 'warehouse tech'],
  'Digital Commerce':        ['ecommerce', 'e-commerce', 'online grocery', 'digital commerce', 'delivery', 'pickup', 'bopis', 'omnichannel', 'digital sales', 'online order', 'app'],
  'Personalization':         ['personalization', 'personalised', 'personalized', 'loyalty', 'rewards', 'recommendation', 'customer experience', 'shopper data', 'first-party'],
  'Retail Media':            ['retail media', 'media network', 'advertising', 'sponsored', 'cpg', 'brand advertising', 'ad spend', 'programmatic'],
  'Supply Chain':            ['supply chain', 'logistics', 'distribution', 'inventory', 'warehouse', 'sourcing', 'procurement', 'shrink', 'shortage', 'out-of-stock'],
};

function keywordCategorize(title: string, description: string): string | null {
  const text = (title + ' ' + description).toLowerCase();
  const scores: Record<string, number> = {};
  for (const [pillar, keywords] of Object.entries(PILLAR_KEYWORDS)) {
    scores[pillar] = keywords.filter(kw => text.includes(kw)).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] >= 1 ? best[0] : null;
}

async function claudeCategorize(items: { title: string; description: string }[]): Promise<string[]> {
  if (items.length === 0) return [];

  const prompt = `Categorize each article into exactly one Grocery Doppio content pillar:
- Artificial Intelligence
- Automation
- Digital Commerce
- Personalization
- Retail Media
- Supply Chain

If none fit, use "Digital Commerce" as the default.

Return ONLY a JSON array of strings, one per article, same order. No markdown.

Articles:
${items.map((item, i) => `${i + 1}. "${item.title}" — ${item.description}`).join('\n')}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return items.map(() => 'Digital Commerce');
  }
}

// ─── Main Route ───────────────────────────────────────────────────────────────

export async function POST() {
  try {
    if (!process.env.TAVILY_API_KEY) {
      return NextResponse.json({ error: 'TAVILY_API_KEY not configured' }, { status: 500 });
    }

    // Fetch all pillar searches in parallel
    const searchResults = await Promise.allSettled(
      PILLARS.map(pillar => tavilySearch(PILLAR_QUERIES[pillar]))
    );

    const allRaw: Omit<FeedItem, 'id' | 'pillar' | 'isGD'>[] = [];
    for (const result of searchResults) {
      if (result.status === 'fulfilled') allRaw.push(...result.value);
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = allRaw.filter(item => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

    // Categorise by pillar — keyword first, Claude for uncategorised
    const categorised: FeedItem[] = [];
    const needsClaude: { item: Omit<FeedItem, 'id' | 'pillar' | 'isGD'>; idx: number }[] = [];

    for (let i = 0; i < unique.length; i++) {
      const item = unique[i];
      const pillar = keywordCategorize(item.title, item.description);
      if (pillar) {
        categorised.push({ ...item, id: `${Date.now()}-${i}`, pillar, type: item.type ?? 'news', isGD: false });
      } else {
        needsClaude.push({ item, idx: i });
      }
    }

    if (needsClaude.length > 0) {
      const claudePillars = await claudeCategorize(
        needsClaude.map(({ item }) => ({ title: item.title, description: item.description }))
      );
      needsClaude.forEach(({ item, idx }, i) => {
        categorised.push({
          ...item,
          id: `${Date.now()}-${idx}`,
          pillar: claudePillars[i] || 'Digital Commerce',
          type: item.type ?? 'news',
          isGD: false,
        });
      });
    }

    // Fetch publish dates from article HTML for items Tavily didn't date
    await hydrateDates(categorised);

    // Sort: dated articles newest first, undated articles at the bottom
    categorised.sort((a, b) => {
      const aT = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bT = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      if (aT === 0 && bT === 0) return 0;
      if (aT === 0) return 1;
      if (bT === 0) return -1;
      return bT - aT;
    });

    return NextResponse.json({ items: categorised, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Feed fetch failed' }, { status: 500 });
  }
}

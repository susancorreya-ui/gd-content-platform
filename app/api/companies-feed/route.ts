import { NextResponse } from 'next/server';

export const maxDuration = 60; // seconds (requires Vercel Pro; 10s on Hobby)

function parseDateFromHtml(html: string): string {
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
  const metaRe = [
    /meta[^>]+(?:property|name)=["'](?:article:published_time|datePublished|date|pubdate|publishdate|DC\.date\.issued)["'][^>]+content=["']([^"']+)["']/i,
    /meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:article:published_time|datePublished|date|pubdate|publishdate|DC\.date\.issued)["']/i,
  ];
  for (const re of metaRe) {
    const m = html.match(re);
    if (m) { const t = new Date(m[1]); if (!isNaN(t.getTime())) return t.toISOString(); }
  }
  const tm = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  if (tm) { const t = new Date(tm[1]); if (!isNaN(t.getTime())) return t.toISOString(); }
  return '';
}

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
    return parseDateFromHtml(await res.text());
  } catch { return ''; }
}

async function hydrateDates(items: Array<{ url: string; publishedAt: string }>): Promise<void> {
  await Promise.allSettled(
    items
      .filter(i => !i.publishedAt)
      .map(async (i) => { const d = await fetchDateFromPage(i.url); if (d) i.publishedAt = d; })
  );
}

const CUTOFF_DATE = new Date('2026-01-01T00:00:00.000Z').getTime();


export interface CompanyDevelopment {
  id: string;
  title: string;
  url: string;
  description: string;
  source: string;
  sourceDomain: string;
  publishedAt: string;
  pillar: string;
  type: 'news' | 'pr' | 'earnings' | 'social';
}

export interface CompanyUpdate {
  company: string;
  isPublic: boolean;
  ticker?: string;
  revenue: string;
  developments: CompanyDevelopment[];
}

// ─── Top 20 Grocers — specific pages to parse ─────────────────────────────────
// ownedDomains: their newsroom, IR, corporate pages (parsed directly)
// For public companies, irDomain is their investor relations page

export const TOP_20_GROCERS: {
  name: string;
  revenue: string;
  isPublic: boolean;
  ticker?: string;
  ownedDomains: string[];
  irDomain?: string;
}[] = [
  {
    name: 'Ahold Delhaize',
    revenue: '$45B',
    isPublic: true,
    ticker: 'AD',
    ownedDomains: ['aholddelhaize.com'],
    irDomain: 'aholddelhaize.com',
  },
  {
    name: 'Albertsons',
    revenue: '$70B',
    isPublic: true,
    ticker: 'ACI',
    ownedDomains: ['albertsonscompanies.com', 'investors.albertsonscompanies.com'],
    irDomain: 'investors.albertsonscompanies.com',
  },
  {
    name: 'Aldi',
    revenue: '$18B',
    isPublic: false,
    ownedDomains: ['corporate.aldi.us', 'aldi.us'],
  },
  {
    name: 'Costco',
    revenue: '$126B',
    isPublic: true,
    ticker: 'COST',
    ownedDomains: ['investor.costco.com', 'costco.com'],
    irDomain: 'investor.costco.com',
  },
  {
    name: 'Food Lion',
    revenue: '$11B',
    isPublic: false,
    ownedDomains: ['foodlion.com'],
  },
  {
    name: 'Giant Eagle',
    revenue: '$14B',
    isPublic: false,
    ownedDomains: ['gianteagle.com'],
  },
  {
    name: 'Grocery Outlet',
    revenue: '$5B',
    isPublic: true,
    ticker: 'GO',
    ownedDomains: ['investors.groceryoutlet.com', 'groceryoutlet.com'],
    irDomain: 'investors.groceryoutlet.com',
  },
  {
    name: 'H-E-B',
    revenue: '$30B',
    isPublic: false,
    ownedDomains: ['newsroom.heb.com', 'heb.com'],
  },
  {
    name: 'Hannaford',
    revenue: '$2B',
    isPublic: false,
    ownedDomains: ['hannaford.com'],
  },
  {
    name: 'Hy-Vee',
    revenue: '$13B',
    isPublic: false,
    ownedDomains: ['hy-vee.com'],
  },
  {
    name: 'Kroger',
    revenue: '$133B',
    isPublic: true,
    ticker: 'KR',
    ownedDomains: ['ir.kroger.com', 'thekrogerco.com'],
    irDomain: 'ir.kroger.com',
  },
  {
    name: 'Meijer',
    revenue: '$19B',
    isPublic: false,
    ownedDomains: ['meijer.com'],
  },
  {
    name: 'Publix',
    revenue: '$34B',
    isPublic: false,
    ownedDomains: ['corporate.publix.com'],
  },
  {
    name: 'Stop & Shop',
    revenue: '$1.1B',
    isPublic: false,
    ownedDomains: ['stopandshop.com'],
  },
  {
    name: 'Target',
    revenue: '$44B',
    isPublic: true,
    ticker: 'TGT',
    ownedDomains: ['corporate.target.com', 'investors.target.com'],
    irDomain: 'investors.target.com',
  },
  {
    name: "Trader Joe's",
    revenue: '$16B',
    isPublic: false,
    ownedDomains: ['traderjoes.com'],
  },
  {
    name: 'Walmart',
    revenue: '$559B',
    isPublic: true,
    ticker: 'WMT',
    ownedDomains: ['corporate.walmart.com'],
    irDomain: 'stock.walmart.com',
  },
  {
    name: 'Weis Markets',
    revenue: '$4B',
    isPublic: true,
    ticker: 'WMK',
    ownedDomains: ['weismarkets.com'],
    irDomain: 'weismarkets.com',
  },
  {
    name: 'Whole Foods',
    revenue: '$17B',
    isPublic: false,
    ownedDomains: ['media.wholefoodsmarket.com', 'wholefoodsmarket.com'],
  },
  {
    name: 'Winn-Dixie',
    revenue: '$12B',
    isPublic: false,
    ownedDomains: ['segrocers.com', 'winndixie.com'],
  },
];

// ─── Pillar keyword categorisation ───────────────────────────────────────────

const PILLAR_KEYWORDS: Record<string, string[]> = {
  'Artificial Intelligence': ['artificial intelligence', ' ai ', ' ai,', ' ai.', 'machine learning', 'generative', 'predictive', 'algorithm', 'neural', 'llm', 'genai'],
  'Automation':              ['automation', 'automated', 'robotics', 'robot', 'autonomous', 'dark store', 'micro-fulfillment', 'fulfillment center', 'warehouse tech'],
  'Digital Commerce':        ['ecommerce', 'e-commerce', 'online grocery', 'digital commerce', 'delivery', 'pickup', 'bopis', 'omnichannel', 'digital sales', 'online order', 'app'],
  'Personalization':         ['personalization', 'personalised', 'personalized', 'loyalty', 'rewards', 'recommendation', 'customer experience', 'shopper data'],
  'Retail Media':            ['retail media', 'media network', 'advertising', 'sponsored', 'cpg', 'brand advertising', 'ad spend', 'programmatic'],
  'Supply Chain':            ['supply chain', 'logistics', 'distribution', 'inventory', 'warehouse', 'sourcing', 'procurement', 'out-of-stock'],
};

function keywordCategorize(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase();
  const scores: Record<string, number> = {};
  for (const [pillar, keywords] of Object.entries(PILLAR_KEYWORDS)) {
    scores[pillar] = keywords.filter(kw => text.includes(kw)).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] >= 1 ? best[0] : 'Digital Commerce';
}

function detectType(url: string, title: string): 'news' | 'pr' | 'earnings' | 'social' {
  if (/linkedin\.com/i.test(url)) return 'social';
  if (/twitter\.com|x\.com/i.test(url)) return 'social';
  if (/prnewswire|businesswire|globenewswire|accesswire/i.test(url)) return 'pr';
  if (/\/ir\/|investor|earnings|quarterly|annual.report/i.test(url)) return 'earnings';
  if (/earnings|quarterly results|investor/i.test(title.toLowerCase())) return 'earnings';
  return 'news';
}

// ─── Two searches per company ─────────────────────────────────────────────────
// 1. Owned media: search within their own newsroom + IR pages
// 2. External tech news: credible press coverage of this company

async function searchCompany(
  company: typeof TOP_20_GROCERS[0],
  apiKey: string
): Promise<CompanyDevelopment[]> {
  const allDomains = [
    ...company.ownedDomains,
    ...(company.irDomain ? [company.irDomain] : []),
  ];

  const searches = await Promise.allSettled([
    fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${company.name} technology digital AI retail media automation personalization 2026`,
        search_depth: 'advanced',
        max_results: 4,
        days: 90,
        include_domains: allDomains,
      }),
    }).then(r => r.json()),

    fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: `"${company.name}" grocery technology digital AI retail media 2026`,
        search_depth: 'advanced',
        max_results: 4,
        days: 90,
        include_domains: [
          'reuters.com', 'bloomberg.com', 'wsj.com', 'cnbc.com',
          'ft.com', 'forbes.com', 'businesswire.com', 'prnewswire.com',
          'apnews.com', 'mckinsey.com', 'deloitte.com',
        ],
      }),
    }).then(r => r.json()),
  ]);

  const results: { title: string; url: string; content?: string; raw_content?: string; published_date?: string }[] = [];
  for (const s of searches) {
    if (s.status === 'fulfilled' && s.value?.results) {
      results.push(...s.value.results);
    }
  }

  // Deduplicate by URL and enforce cutoff on confirmed-dated articles
  const seen = new Set<string>();
  const developments: CompanyDevelopment[] = results
    .filter(r => {
      if (!r.url || !r.title || seen.has(r.url)) return false;
      if (r.published_date) {
        const ts = new Date(r.published_date).getTime();
        if (!isNaN(ts) && ts < CUTOFF_DATE) return false;
      }
      seen.add(r.url);
      return true;
    })
    .map((r, i) => {
      let sourceDomain = '';
      try { sourceDomain = new URL(r.url).hostname.replace('www.', ''); } catch { /* */ }
      return {
        id: `${company.name}-${Date.now()}-${i}`,
        title: r.title,
        url: r.url,
        description: (r.content || '').slice(0, 220),
        source: sourceDomain,
        sourceDomain,
        publishedAt: r.published_date || '',
        pillar: keywordCategorize(r.title, r.content || ''),
        type: detectType(r.url, r.title),
      } as CompanyDevelopment;
    });

  // Fetch publish dates from article HTML for items Tavily didn't date
  await hydrateDates(developments);

  // Sort: dated newest first, undated at bottom
  developments.sort((a, b) => {
    const aT = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bT = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    if (aT === 0 && bT === 0) return 0;
    if (aT === 0) return 1;
    if (bT === 0) return -1;
    return bT - aT;
  });

  return developments;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'TAVILY_API_KEY not configured' }, { status: 500 });
  }

  const results = await Promise.allSettled(
    TOP_20_GROCERS.map(company => searchCompany(company, apiKey))
  );

  const companies: CompanyUpdate[] = TOP_20_GROCERS.map((company, i) => ({
    company: company.name,
    isPublic: company.isPublic,
    ticker: company.ticker,
    revenue: company.revenue,
    developments: results[i].status === 'fulfilled'
      ? (results[i] as PromiseFulfilledResult<CompanyDevelopment[]>).value
      : [],
  }));

  return NextResponse.json({
    companies,
    fetchedAt: new Date().toISOString(),
  });
}

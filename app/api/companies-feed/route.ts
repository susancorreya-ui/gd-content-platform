import { NextResponse } from 'next/server';
import { webSearch } from '@/lib/webSearch';

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
  aliases: string[];   // all name variants that count as a mention of this company
}[] = [
  {
    name: 'Ahold Delhaize',
    revenue: '$45B',
    isPublic: true,
    ticker: 'AD',
    ownedDomains: ['aholddelhaize.com'],
    irDomain: 'aholddelhaize.com',
    aliases: ['ahold delhaize', 'ahold', 'delhaize', 'stop & shop', 'giant food', 'hannaford', 'food lion'],
  },
  {
    name: 'Albertsons',
    revenue: '$70B',
    isPublic: true,
    ticker: 'ACI',
    ownedDomains: ['albertsonscompanies.com', 'investors.albertsonscompanies.com'],
    irDomain: 'investors.albertsonscompanies.com',
    aliases: ['albertsons', 'safeway', 'vons', 'jewel-osco', "shaw's", 'acme markets'],
  },
  {
    name: 'Aldi',
    revenue: '$18B',
    isPublic: false,
    ownedDomains: ['corporate.aldi.us', 'aldi.us'],
    aliases: ['aldi'],
  },
  {
    name: 'Costco',
    revenue: '$126B',
    isPublic: true,
    ticker: 'COST',
    ownedDomains: ['investor.costco.com', 'costco.com'],
    irDomain: 'investor.costco.com',
    aliases: ['costco'],
  },
  {
    name: 'Food Lion',
    revenue: '$11B',
    isPublic: false,
    ownedDomains: ['foodlion.com'],
    aliases: ['food lion'],
  },
  {
    name: 'Giant Eagle',
    revenue: '$14B',
    isPublic: false,
    ownedDomains: ['gianteagle.com'],
    aliases: ['giant eagle', 'getgo'],
  },
  {
    name: 'Grocery Outlet',
    revenue: '$5B',
    isPublic: true,
    ticker: 'GO',
    ownedDomains: ['investors.groceryoutlet.com', 'groceryoutlet.com'],
    irDomain: 'investors.groceryoutlet.com',
    aliases: ['grocery outlet', 'grocery outlet bargain market'],
  },
  {
    name: 'H-E-B',
    revenue: '$30B',
    isPublic: false,
    ownedDomains: ['newsroom.heb.com', 'heb.com'],
    aliases: ['h-e-b', 'heb', 'central market'],
  },
  {
    name: 'Hannaford',
    revenue: '$2B',
    isPublic: false,
    ownedDomains: ['hannaford.com'],
    aliases: ['hannaford'],
  },
  {
    name: 'Hy-Vee',
    revenue: '$13B',
    isPublic: false,
    ownedDomains: ['hy-vee.com'],
    aliases: ['hy-vee', 'hyvee'],
  },
  {
    name: 'Kroger',
    revenue: '$133B',
    isPublic: true,
    ticker: 'KR',
    ownedDomains: ['ir.kroger.com', 'thekrogerco.com'],
    irDomain: 'ir.kroger.com',
    aliases: ['kroger', 'fred meyer', 'king soopers', 'harris teeter', "smith's food", 'ralphs', 'dillons', 'fry\'s food'],
  },
  {
    name: 'Meijer',
    revenue: '$19B',
    isPublic: false,
    ownedDomains: ['meijer.com'],
    aliases: ['meijer'],
  },
  {
    name: 'Publix',
    revenue: '$34B',
    isPublic: false,
    ownedDomains: ['corporate.publix.com'],
    aliases: ['publix'],
  },
  {
    name: 'Stop & Shop',
    revenue: '$1.1B',
    isPublic: false,
    ownedDomains: ['stopandshop.com'],
    aliases: ['stop & shop', 'stop and shop'],
  },
  {
    name: 'Target',
    revenue: '$44B',
    isPublic: true,
    ticker: 'TGT',
    ownedDomains: ['corporate.target.com', 'investors.target.com'],
    irDomain: 'investors.target.com',
    aliases: ['target'],
  },
  {
    name: "Trader Joe's",
    revenue: '$16B',
    isPublic: false,
    ownedDomains: ['traderjoes.com'],
    aliases: ["trader joe's", 'trader joes'],
  },
  {
    name: 'Walmart',
    revenue: '$559B',
    isPublic: true,
    ticker: 'WMT',
    ownedDomains: ['corporate.walmart.com'],
    irDomain: 'stock.walmart.com',
    aliases: ['walmart', "sam's club", 'walmart+'],
  },
  {
    name: 'Weis Markets',
    revenue: '$4B',
    isPublic: true,
    ticker: 'WMK',
    ownedDomains: ['weismarkets.com'],
    irDomain: 'weismarkets.com',
    aliases: ['weis markets', 'weis'],
  },
  {
    name: 'Whole Foods',
    revenue: '$17B',
    isPublic: false,
    ownedDomains: ['media.wholefoodsmarket.com', 'wholefoodsmarket.com'],
    aliases: ['whole foods', 'whole foods market'],
  },
  {
    name: 'Winn-Dixie',
    revenue: '$12B',
    isPublic: false,
    ownedDomains: ['segrocers.com', 'winndixie.com'],
    aliases: ['winn-dixie', 'winn dixie', 'southeastern grocers'],
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

// ─── Relevance filters ────────────────────────────────────────────────────────

const IRRELEVANT_URL_PATTERNS = [
  /\/jobs?\//i, /\/careers?\//i, /\/hiring/i, /\/work-with-us/i, /\/join-us/i,
  /\/about(-us)?$/i, /\/team$/i, /\/leadership$/i, /\/history$/i, /\/mission$/i,
  /\/store(-finder|-locator)?/i, /\/locations?\//i, /\/find-a-store/i,
  /\/recipes?\//i, /\/products?\//i, /\/weekly-ad/i, /\/coupon/i,
  /\/contact(-us)?$/i, /\/faq/i, /\/help\//i, /\/support\//i,
  /\/privacy/i, /\/cookie/i, /\/terms/i, /\/accessibility/i,
  /\/press-kit/i, /\/brand-assets/i, /\/media-kit/i,
  /\/newsletter-signup/i, /\/subscribe/i,
  // Consumer-facing app/product/savings pages — not news
  /\/app$/i, /\/app\//i, /\/mobile-app/i, /\/download/i,
  /\/savings$/i, /\/deals$/i, /\/specials$/i, /\/promotions$/i,
  /\/pharmacy$/i, /\/fuel(-rewards?)?$/i, /\/gas$/i,
  /\/gift-?cards?$/i, /\/floral$/i, /\/deli$/i, /\/bakery$/i,
  /\/services$/i, /\/departments$/i,
];

const IRRELEVANT_TITLE_PATTERNS = [
  /\bjob(s| opening| posting)?\b/i, /\bcareer(s)?\b/i, /\bnow hiring\b/i,
  /\bwe('re| are) hiring\b/i, /\bjoin our team\b/i, /\bopen position/i,
  /\babout us\b/i, /\bour story\b/i, /\bour history\b/i, /\bmeet the team\b/i,
  /\bstore hours\b/i, /\bweekly ad\b/i, /\brecipe(s)?\b/i,
  /\bprivacy (notice|policy)\b/i, /\bcookie (notice|policy)\b/i,
  /\bterms (of|and) (service|use|conditions)\b/i,
];

// At least one GD pillar keyword must appear in title + description
const RELEVANCE_KEYWORDS = [
  // AI & technology
  'artificial intelligence', ' ai ', 'machine learning', 'generative', 'predictive',
  'algorithm', 'neural', 'llm', 'genai', 'technology', 'tech', 'digital',
  'software', 'platform', 'application', 'tool', 'solution', 'system',
  'innovation', 'initiative', 'launch', 'debut', 'roll out', 'pilot', 'deploy',
  // Commerce
  'ecommerce', 'e-commerce', 'online grocery', 'delivery', 'pickup', 'bopis',
  'omnichannel', 'digital sales', 'online order', 'mobile app', 'click and collect',
  // Automation & operations
  'automation', 'robotics', 'robot', 'autonomous', 'dark store', 'fulfillment',
  'warehouse', 'micro-fulfillment', 'self-checkout', 'scan and go',
  // Personalization & loyalty
  'personalization', 'loyalty', 'rewards', 'recommendation', 'shopper data',
  'customer data', 'first-party data', 'membership',
  // Retail media
  'retail media', 'media network', 'advertising', 'cpg', 'ad spend', 'programmatic',
  'sponsored', 'media monetization',
  // Supply chain
  'supply chain', 'logistics', 'distribution', 'inventory', 'sourcing', 'procurement',
  'shrink', 'out-of-stock', 'replenishment',
  // Workforce / associate technology
  'employee app', 'associate app', 'workforce', 'associate technology', 'store associate',
  'frontline', 'team member app', 'staff app', 'employee experience',
  // Financial / strategic
  'earnings', 'revenue', 'quarterly', 'annual report', 'financial', 'investor',
  'sales growth', 'market share', 'strategy', 'partnership', 'acquisition', 'investment',
  'expansion', 'growth', 'performance',
];

function isIrrelevantUrl(url: string): boolean {
  return IRRELEVANT_URL_PATTERNS.some(p => p.test(url));
}

// Returns true only if the article is genuinely about this specific company.
// Rule: own-domain URLs always pass; third-party articles must name the company
// (or a known alias/ticker) in the TITLE. We do not check the content body —
// a vendor article that mentions the company once in passing would otherwise
// appear as that company's news, which is what we're preventing.
function mentionsCompany(
  title: string,
  _content: string,
  company: typeof TOP_20_GROCERS[0],
  url: string,
): boolean {
  // 1. Own-domain — the URL itself proves it is the company's content
  const allOwnedDomains = [...company.ownedDomains, ...(company.irDomain ? [company.irDomain] : [])];
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    if (allOwnedDomains.some(d => hostname.endsWith(d))) return true;
  } catch { /* ignore */ }

  // 2. Title must explicitly name the company or a known alias / ticker
  const titleLower = title.toLowerCase();
  const terms = [
    ...company.aliases.map(a => a.toLowerCase()),
    ...(company.ticker ? [company.ticker.toLowerCase()] : []),
  ];
  return terms.some(t => titleLower.includes(t));
}

function isIrrelevantTitle(title: string): boolean {
  return IRRELEVANT_TITLE_PATTERNS.some(p => p.test(title));
}

function isRelevant(title: string, description: string): boolean {
  const text = (title + ' ' + description).toLowerCase();
  return RELEVANCE_KEYWORDS.some(kw => text.includes(kw));
}

const PRIVACY_WALL_SIGNALS = [
  'privacy notice', 'privacy policy', 'cookie policy', 'cookie notice',
  'we use cookies', 'this site uses cookies', 'cookie consent',
  'accept all cookies', 'manage cookies', 'your privacy choices',
];

function isPrivacyWall(text: string): boolean {
  const lower = text.toLowerCase();
  return PRIVACY_WALL_SIGNALS.filter(s => lower.includes(s)).length >= 2;
}

function detectType(url: string, title: string): 'news' | 'pr' | 'earnings' | 'social' {
  if (/linkedin\.com/i.test(url)) return 'social';
  if (/twitter\.com|x\.com/i.test(url)) return 'social';
  if (/prnewswire|businesswire|globenewswire|accesswire/i.test(url)) return 'pr';
  if (/\/ir\/|investor|earnings|quarterly|annual.report/i.test(url)) return 'earnings';
  if (/earnings|quarterly results|investor/i.test(title.toLowerCase())) return 'earnings';
  return 'news';
}

// ─── Trusted third-party sources ─────────────────────────────────────────────
// Same list as the research feed — used for external company coverage

const TRUSTED_SOURCES = [
  // Newswire & financial press
  'reuters.com', 'apnews.com', 'bloomberg.com', 'wsj.com',
  'ft.com', 'cnbc.com', 'forbes.com', 'economist.com',
  // Grocery & retail industry press
  'supermarketnews.com', 'progressivegrocer.com', 'grocerydive.com',
  'chainstoreage.com', 'fmi.org', 'retaildive.com', 'winsightgrocerybusiness.com',
  // PR & official releases
  'businesswire.com', 'prnewswire.com', 'globenewswire.com', 'accesswire.com',
  // Research & consulting
  'mckinsey.com', 'deloitte.com', 'pwc.com', 'bcg.com',
  'hbr.org', 'gartner.com', 'forrester.com', 'bain.com',
  // Data & measurement
  'nielseniq.com', 'nielsen.com', 'circana.com', 'kantar.com',
  // Government
  'usda.gov', 'census.gov', 'bls.gov',
];

// ─── Two searches per company ─────────────────────────────────────────────────
// 1. Owned media: company's own newsroom + IR pages
// 2. Trusted third-party: credible press + industry sources covering this company

async function searchCompany(
  company: typeof TOP_20_GROCERS[0],
): Promise<CompanyDevelopment[]> {
  const allDomains = [
    ...company.ownedDomains,
    ...(company.irDomain ? [company.irDomain] : []),
  ];

  const searches = await Promise.allSettled([
    // Source 1: company's own newsroom / IR pages
    webSearch({
      query: `${company.name} news 2026`,
      searchDepth: 'advanced',
      maxResults: 8,
      days: 365,
      includeDomains: allDomains,
    }),
    // Source 2: industry & financial press — latest news about this company specifically
    webSearch({
      query: `"${company.name}" news 2026`,
      searchDepth: 'advanced',
      maxResults: 8,
      days: 90,
      topic: 'news',
      includeDomains: TRUSTED_SOURCES,
    }),
    // Source 3: earnings & financial results
    webSearch({
      query: `"${company.name}" earnings results financial 2026`,
      searchDepth: 'advanced',
      maxResults: 4,
      days: 365,
      topic: 'news',
      includeDomains: TRUSTED_SOURCES,
    }),
  ]);

  const results: { title: string; url: string; content?: string; published_date?: string }[] = [];
  for (const s of searches) {
    if (s.status === 'fulfilled') {
      results.push(...s.value.map(r => ({
        title: r.title,
        url: r.url,
        content: r.content,
        published_date: r.published_date,
      })));
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
      if (isIrrelevantUrl(r.url)) return false;
      if (isIrrelevantTitle(r.title)) return false;
      if (isPrivacyWall(r.content || '')) return false;
      if (!mentionsCompany(r.title, r.content || '', company, r.url)) return false;
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
  const results = await Promise.allSettled(
    TOP_20_GROCERS.map(company => searchCompany(company))
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

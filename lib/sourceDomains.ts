// ─── Source Domain Rules ──────────────────────────────────────────────────────
// Defines which domains can be embedded as links in published GD articles.
// Competitor publications are blocked from linking (can still be used as research context).

export const GD_DOMAIN = 'grocerydoppio.com';

// Domains approved for embedding as links in articles
export const APPROVED_DOMAINS = [
  // Grocery Doppio — always first priority
  'grocerydoppio.com',
  'incisiv.com',

  // Tier 2 — neutral news and wire services
  'reuters.com',
  'apnews.com',
  'wsj.com',
  'bloomberg.com',
  'ft.com',
  'cnbc.com',
  'forbes.com',
  'economist.com',
  'businesswire.com',
  'prnewswire.com',

  // Research and consulting
  'mckinsey.com',
  'deloitte.com',
  'pwc.com',
  'bcg.com',
  'bain.com',
  'hbr.org',
  'gartner.com',
  'forrester.com',

  // Data and measurement
  'nielseniq.com',
  'nielsen.com',
  'circana.com',
  'iri.com',
  'kantar.com',
  'numerator.com',
  'placer.ai',

  // Government and official data
  'usda.gov',
  'census.gov',
  'bls.gov',
  'ers.usda.gov',
  'fda.gov',

  // Major retailer investor relations / official corporate
  'ir.kroger.com',
  'corporate.walmart.com',
  'investors.target.com',
  'ir.costco.com',
  'investor.albertsons.com',
  'aholddelhaize.com',
  'instacart.com',
  'doordash.com',
  'amazon.com',
  'wholefoodsmarket.com',
];

// Domains blocked from being linked in published articles.
// These can be used as research/context sources but never embedded as links.
export const BLOCKED_DOMAINS = [
  'grocerydive.com',
  'progressivegrocer.com',
  'supermarketnews.com',
  'fooddive.com',
  'retaildive.com',
  'modernretail.co',
  'chainstoreage.com',
  'storebrandsdecisions.com',
];

export function isDomainApproved(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return APPROVED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
  } catch { return false; }
}

export function isDomainBlocked(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
  } catch { return false; }
}

export function isGDLink(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname === GD_DOMAIN || hostname.endsWith(`.${GD_DOMAIN}`);
  } catch { return false; }
}

// Formatted for use in agent prompts
export const APPROVED_DOMAINS_LIST = APPROVED_DOMAINS.join(', ');
export const BLOCKED_DOMAINS_LIST = BLOCKED_DOMAINS.join(', ');

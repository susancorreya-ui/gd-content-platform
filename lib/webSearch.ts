/**
 * Shared web-search utility.
 * Tries Tavily first; falls back to Exa on non-200 responses (e.g. credits exhausted).
 */

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;        // text/snippet from the article
  published_date: string; // ISO string or ''
}

export interface WebSearchOptions {
  query: string;
  maxResults?: number;
  includeDomains?: string[];
  /** Look-back window in days (default: 7). Converted to startPublishedDate for Exa. */
  days?: number;
  searchDepth?: 'basic' | 'advanced';
  /** Tavily-specific topic hint. Ignored by Exa. */
  topic?: 'news' | 'general';
  /** If true, request raw article content (Tavily include_raw_content). */
  includeRawContent?: boolean;
}

// ─── Tavily ───────────────────────────────────────────────────────────────────

async function tryTavily(
  opts: WebSearchOptions,
  apiKey: string,
): Promise<WebSearchResult[] | null> {
  try {
    const body: Record<string, unknown> = {
      api_key: apiKey,
      query: opts.query,
      search_depth: opts.searchDepth ?? 'basic',
      max_results: opts.maxResults ?? 7,
    };
    if (opts.days !== undefined)          body.days            = opts.days;
    if (opts.includeDomains?.length)      body.include_domains = opts.includeDomains;
    if (opts.topic)                       body.topic           = opts.topic;
    if (opts.includeRawContent)           body.include_raw_content = true;

    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // Non-200 means error (credits, auth, rate-limit) → signal caller to fall back
    if (!res.ok) {
      console.warn(`[webSearch] Tavily returned ${res.status} — falling back to Exa`);
      return null;
    }

    const data = await res.json();
    return ((data.results as { title: string; url: string; content?: string; raw_content?: string; published_date?: string }[]) || []).map(r => ({
      title: r.title || '',
      url: r.url || '',
      content: r.raw_content || r.content || '',
      published_date: r.published_date || '',
    }));
  } catch (err) {
    console.warn('[webSearch] Tavily threw — falling back to Exa:', err);
    return null;
  }
}

// ─── Exa ──────────────────────────────────────────────────────────────────────

async function tryExa(
  opts: WebSearchOptions,
  apiKey: string,
): Promise<WebSearchResult[]> {
  try {
    const body: Record<string, unknown> = {
      query: opts.query,
      numResults: opts.maxResults ?? 7,
      contents: { text: { maxCharacters: 1000 } },
    };

    if (opts.includeDomains?.length) body.includeDomains = opts.includeDomains;

    if (opts.days !== undefined) {
      const cutoff = new Date(Date.now() - opts.days * 24 * 60 * 60 * 1000);
      body.startPublishedDate = cutoff.toISOString();
    }

    const res = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`[webSearch] Exa returned ${res.status}:`, await res.text());
      return [];
    }

    const data = await res.json();
    return ((data.results as { title: string; url: string; text?: string; publishedDate?: string }[]) || []).map(r => ({
      title: r.title || '',
      url: r.url || '',
      content: r.text || '',
      published_date: r.publishedDate || '',
    }));
  } catch (err) {
    console.error('[webSearch] Exa threw:', err);
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search the web.
 * Tries Tavily first; automatically falls back to Exa if Tavily returns a non-200 response.
 * Returns [] if neither key is configured.
 */
export async function webSearch(opts: WebSearchOptions): Promise<WebSearchResult[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  const exaKey    = process.env.EXA_API_KEY;

  if (tavilyKey) {
    const tavilyResult = await tryTavily(opts, tavilyKey);
    if (tavilyResult !== null) return tavilyResult; // success (even if 0 results)
    // null means non-200 — fall through to Exa
  }

  if (exaKey) {
    console.log(`[webSearch] Using Exa for: ${opts.query}`);
    return tryExa(opts, exaKey);
  }

  console.warn('[webSearch] No TAVILY_API_KEY or EXA_API_KEY configured');
  return [];
}

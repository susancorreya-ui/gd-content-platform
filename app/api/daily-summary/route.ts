import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import Anthropic from '@anthropic-ai/sdk';
import { webSearch } from '@/lib/webSearch';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CREDIBLE_DOMAINS = [
  'reuters.com', 'apnews.com', 'bloomberg.com', 'wsj.com',
  'ft.com', 'cnbc.com', 'forbes.com',
  'supermarketnews.com', 'progressivegrocer.com', 'grocerydive.com',
  'chainstoreage.com', 'fmi.org',
  'businesswire.com', 'prnewswire.com', 'globenewswire.com',
  'mckinsey.com', 'deloitte.com', 'nielseniq.com', 'circana.com',
];

export interface DailySummaryEntry {
  date: string;
  dateLabel: string;
  summary: string;
  generatedAt: string;
  sources: { title: string; url: string }[];
}

export async function generateDailySummary(date: string): Promise<DailySummaryEntry> {
  const dateObj = new Date(date);
  const cutoff = new Date(date);
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffMs = cutoff.getTime();

  const monthYear = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const allResults: { title: string; url: string; content: string; published_date?: string }[] = [];

  const searches = await Promise.allSettled([
    webSearch({ query: `grocery retailer AI artificial intelligence automation launch announcement ${monthYear}`, maxResults: 6, days: 7, topic: 'news', includeDomains: CREDIBLE_DOMAINS }),
    webSearch({ query: `grocery retail online omnichannel personalization app launch ${monthYear}`, maxResults: 6, days: 7, topic: 'news', includeDomains: CREDIBLE_DOMAINS }),
    webSearch({ query: `grocery retail media network supply chain technology news ${monthYear}`, maxResults: 6, days: 7, topic: 'news', includeDomains: CREDIBLE_DOMAINS }),
    webSearch({ query: `Walmart Kroger Costco Albertsons Target Publix grocery technology news ${monthYear}`, maxResults: 6, days: 7, topic: 'news', includeDomains: CREDIBLE_DOMAINS }),
  ]);

  for (const r of searches) {
    if (r.status === 'fulfilled') {
      allResults.push(...r.value.map(item => ({
        title: item.title,
        url: item.url,
        content: item.content,
        published_date: item.published_date || undefined,
      })));
    }
  }

  const seen = new Set<string>();
  const deduped = allResults.filter(r => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  const datedRecent = deduped.filter(r => {
    if (!r.published_date) return false;
    const ts = new Date(r.published_date).getTime();
    return !isNaN(ts) && ts >= cutoffMs;
  });

  const uniqueResults = datedRecent.length >= 4
    ? datedRecent.slice(0, 20)
    : [...datedRecent, ...deduped.filter(r => !r.published_date)].slice(0, 20);

  const dateLabel = dateObj.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const signals = uniqueResults
    .map((r, i) => `${i + 1}. "${r.title}"\n   URL: ${r.url}\n   Published: ${r.published_date || 'this week'}\n   Summary: ${(r.content || '').slice(0, 180)}`)
    .join('\n\n');

  const prompt = `You are the editorial director at Grocery Doppio, writing a daily intelligence brief for C-level and senior executives at major grocery retailers and grocery-related technology companies. Your audience — CEOs, CIOs, CTOs, CMOs, and Chief Digital Officers — makes decisions that affect billions in revenue and millions of customers. Every sentence must earn its place by delivering a strategic insight, a competitive signal, or an implication they can act on.

The brief tracks the top 20 US grocery retailers (Walmart, Kroger, Costco, Albertsons, Target, Publix, H-E-B, Ahold Delhaize, Whole Foods, Amazon Fresh, Aldi, Meijer, Wegmans, Trader Joe's, ShopRite, BJ's Wholesale, Sprouts, Dollar General, Winn-Dixie, Southeastern Grocers) across the themes that matter most to their business: artificial intelligence and machine learning adoption, store and supply chain automation, online and omnichannel commerce, customer personalization, retail media networks, and supply chain resilience.

Today is ${dateLabel}. The brief covers ONLY the 7 days ending today (${cutoff.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}–${dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}).

STRICT RULES — read before writing:
1. Use ONLY the signals listed below. Zero exceptions. Do not add any event, stat, or insight from your training data.
2. Before using any signal, check its Published date. If the date is before ${cutoff.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, SKIP IT entirely — do not mention it anywhere in the brief.
3. If a signal has no date, check its title and content. If it reads like an annual outlook, early-year prediction, "what to expect in 2026", trend overview, or industry retrospective — SKIP IT. These are evergreen or early-year pieces, not this week's news.
4. Only write about specific, dated events: company announcements, product launches, earnings, partnerships, or research published within this window.

${signals ? `THIS WEEK'S SIGNALS:\n${signals}\n\n` : 'NO SIGNALS AVAILABLE — write two sentences noting that no qualifying news was identified for this window and that coverage will resume next edition.\n\n'}Write a concise daily brief (350–450 words) using only the signals above. Structure it as:

**The Big Picture** (2–3 sentences on the dominant theme emerging from this week's signals — frame it as a market-level shift, not a list of events)

**Key Developments** (4–6 bullet points — each must map directly to a signal above; state the company, what they did, and the strategic implication for competitors or the broader market)

**In Focus** (one paragraph spotlighting the most significant trend from this week's signals — whether that's the adoption of AI at the shelf edge, the acceleration of retail media, shifts in online grocery economics, or another theme — and what it signals for the competitive landscape)

**Executive Takeaway** (1–2 sentences on what a grocery CEO or technology leader should be watching or considering as a result of this week's developments)

LINKING RULES:
- Every development you mention must be hyperlinked: [anchor text](url)
- Use only URLs from the signals above — never invent URLs
- Anchor text should be descriptive (e.g. "[Walmart's new AI pricing rollout](url)")
- Aim for at least 4 inline links

Rules:
- ONLY use events from the signals — zero exceptions
- No invented statistics or events
- Write like a trusted advisor to the C-suite: direct, confident, no hedging, no jargon
- Do not use internal content-category labels or framework terminology (e.g. do not write "pillar", "digital commerce" as a category label, or similar internal classifications)
- Do not include a date header
- Do NOT output any reasoning, signal analysis, filtering notes, or commentary — start your response immediately with the brief content itself`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const summary = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
  const sources = uniqueResults.map(r => ({ title: r.title, url: r.url }));

  return { date, dateLabel, summary, generatedAt: new Date().toISOString(), sources };
}

// Server-side cache shared by the cron job and GET requests.
// The cron revalidates this tag daily at 11 AM before regenerating.
export const getCachedDailySummary = unstable_cache(
  generateDailySummary,
  ['daily-summary'],
  { tags: ['daily-summary'], revalidate: false },
);

// GET — returns the cached summary (pre-generated by cron at 11 AM).
// If called before the cron runs, it generates once and caches the result.
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  try {
    const entry = await getCachedDailySummary(date);
    return NextResponse.json(entry);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 },
    );
  }
}

// POST — manual regeneration: busts the cache and returns a fresh summary.
export async function POST(req: NextRequest) {
  try {
    const { date }: { date: string } = await req.json();
    const entry = await generateDailySummary(date);
    return NextResponse.json(entry);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Daily summary generation failed' },
      { status: 500 },
    );
  }
}

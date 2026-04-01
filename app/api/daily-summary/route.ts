import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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

export async function POST(req: NextRequest) {
  try {
    const { date }: { date: string } = await req.json();

    const apiKey = process.env.TAVILY_API_KEY;

    const dateObj = new Date(date);
    const cutoff = new Date(date);
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffMs = cutoff.getTime();

    // Use the actual month + year in queries so Tavily doesn't return older months
    const monthYear = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); // e.g. "March 2026"

    const allResults: { title: string; url: string; content: string; published_date?: string }[] = [];

    if (apiKey) {
      // topic:"news" forces Tavily to return actual news articles with proper publish dates
      const tavilySearch = (query: string, max: number) =>
        fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            topic: 'news',
            search_depth: 'basic',
            max_results: max,
            days: 7,
            include_domains: CREDIBLE_DOMAINS,
          }),
        }).then(r => r.json());

      const searches = await Promise.allSettled([
        // Pillar 1 & 2: AI + Automation news at top grocery retailers
        tavilySearch(`grocery retailer AI artificial intelligence automation launch announcement ${monthYear}`, 6),
        // Pillar 3 & 4: Digital Commerce + Personalization
        tavilySearch(`grocery retail digital commerce personalization app launch ${monthYear}`, 6),
        // Pillar 5 & 6: Retail Media + Supply Chain
        tavilySearch(`grocery retail media network supply chain technology news ${monthYear}`, 6),
        // Top retailers: any technology or digital news
        tavilySearch(`Walmart Kroger Costco Albertsons Target Publix grocery technology news ${monthYear}`, 6),
      ]);

      for (const r of searches) {
        if (r.status === 'fulfilled' && r.value?.results) {
          allResults.push(...r.value.results.map((item: { title: string; url: string; content: string; published_date?: string }) => ({
            title: item.title,
            url: item.url,
            content: item.content,
            published_date: item.published_date,
          })));
        }
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const deduped = allResults.filter(r => {
      if (!r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    // With topic:"news", articles should have published_date.
    // Keep only results with a confirmed date within the 7-day window.
    // Drop undated results — they are typically not news articles.
    const datedRecent = deduped.filter(r => {
      if (!r.published_date) return false;
      const ts = new Date(r.published_date).getTime();
      return !isNaN(ts) && ts >= cutoffMs;
    });

    // Fallback: if very few dated results, include undated ones (Tavily days:7 as safety net)
    const uniqueResults = datedRecent.length >= 4
      ? datedRecent.slice(0, 20)
      : [...datedRecent, ...deduped.filter(r => !r.published_date)].slice(0, 20);

    const dateLabel = dateObj.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    const signals = uniqueResults
      .map((r, i) => `${i + 1}. "${r.title}"\n   URL: ${r.url}\n   Published: ${r.published_date || 'this week'}\n   Summary: ${(r.content || '').slice(0, 180)}`)
      .join('\n\n');

    const prompt = `You are the editorial director at Grocery Doppio, writing a daily intelligence brief for senior grocery executives. The brief focuses on the top 20 US grocery retailers (Walmart, Kroger, Costco, Albertsons, Target, Publix, H-E-B, Ahold Delhaize, Whole Foods, Amazon Fresh, Aldi, Meijer, Wegmans, Trader Joe's, ShopRite, BJ's Wholesale, Sprouts, Dollar General, Winn-Dixie, Southeastern Grocers) and their activity across six key pillars: AI, Automation, Digital Commerce, Personalization, Retail Media, and Supply Chain.

Today is ${dateLabel}. The brief covers ONLY the 7 days ending today (${cutoff.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}–${dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}).

STRICT RULES — read before writing:
1. Use ONLY the signals listed below. Zero exceptions. Do not add any event, stat, or insight from your training data.
2. Before using any signal, check its Published date. If the date is before ${cutoff.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, SKIP IT entirely — do not mention it anywhere in the brief.
3. If a signal has no date, check its title and content. If it reads like an annual outlook, early-year prediction, "what to expect in 2026", trend overview, or industry retrospective — SKIP IT. These are evergreen or early-year pieces, not this week's news.
4. Only write about specific, dated events: company announcements, product launches, earnings, partnerships, or research published within this window.

${signals ? `THIS WEEK'S SIGNALS:\n${signals}\n\n` : 'NO SIGNALS AVAILABLE — write two sentences noting that no qualifying news was identified for this window and that coverage will resume next edition.\n\n'}Write a concise daily brief (350–450 words) using only the signals above. Structure it as:

**The Big Picture** (2–3 sentences on the dominant theme from the signals)

**Key Developments** (4–6 bullet points — each must map directly to a signal above; include company, action, and why it matters)

**Pillar Spotlight** (one paragraph on the most active content pillar this week — AI, Automation, Digital Commerce, Personalization, Retail Media, or Supply Chain — based only on the signals)

**So What** (1–2 sentences on the implication for grocery executives)

LINKING RULES:
- Every development you mention must be hyperlinked: [anchor text](url)
- Use only URLs from the signals above — never invent URLs
- Anchor text should be descriptive (e.g. "[Walmart's new AI pricing rollout](url)")
- Aim for at least 4 inline links

Rules:
- ONLY use events from the signals — zero exceptions
- No invented statistics or events
- Bold, direct, no hedging
- Do not include a date header
- Do NOT output any reasoning, signal analysis, filtering notes, or commentary — start your response immediately with the brief content itself`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

    const sources = uniqueResults.map(r => ({ title: r.title, url: r.url }));

    const entry: DailySummaryEntry = {
      date,
      dateLabel,
      summary,
      generatedAt: new Date().toISOString(),
      sources,
    };

    return NextResponse.json(entry);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Daily summary generation failed' },
      { status: 500 }
    );
  }
}

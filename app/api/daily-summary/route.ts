import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface DailySummaryEntry {
  date: string;        // YYYY-MM-DD
  dateLabel: string;   // e.g. "Wednesday, March 26, 2025"
  summary: string;
  generatedAt: string;
}

export async function POST(req: NextRequest) {
  try {
    const { date }: { date: string } = await req.json();

    const apiKey = process.env.TAVILY_API_KEY;

    // Fetch fresh signals for today's summary
    let signals = '';
    if (apiKey) {
      const searches = await Promise.allSettled([
        fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query: 'grocery retail technology AI digital commerce news today 2025 2026',
            search_depth: 'basic',
            max_results: 8,
          }),
        }).then(r => r.json()),
        fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query: 'Walmart Kroger Costco Albertsons Target grocery technology announcement 2025',
            search_depth: 'basic',
            max_results: 6,
          }),
        }).then(r => r.json()),
      ]);

      const allResults: { title: string; url: string; content: string }[] = [];
      for (const r of searches) {
        if (r.status === 'fulfilled' && r.value?.results) {
          allResults.push(...r.value.results);
        }
      }

      signals = allResults
        .slice(0, 12)
        .map((r, i) => `${i + 1}. "${r.title}" — ${(r.content || '').slice(0, 150)}`)
        .join('\n');
    }

    const dateObj = new Date(date);
    const dateLabel = dateObj.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    const prompt = `You are the editorial director at Grocery Doppio, writing a daily intelligence brief for senior grocery executives.

Today is ${dateLabel}.

${signals ? `TODAY'S SIGNALS:\n${signals}\n\n` : ''}Write a concise daily brief (350–450 words) covering the most significant grocery technology and digital retail developments. Structure it as:

**[Date header — already shown, skip it]**

**The Big Picture** (2–3 sentences on the dominant theme or story today)

**Key Developments** (4–6 bullet points, each one specific — company, what they did, why it matters)

**Pillar Spotlight** (one paragraph on the most active content pillar today — AI, Automation, Digital Commerce, Personalization, Retail Media, or Supply Chain)

**So What** (1–2 sentences on the implication for grocery executives this week)

Rules:
- No invented statistics
- Bold, direct, no hedging
- Written for senior grocery executives, not a general audience
- If signals are thin, focus on broader industry trends rather than inventing specific events
- Do not include a date header — it is shown separately`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

    const entry: DailySummaryEntry = {
      date,
      dateLabel,
      summary,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(entry);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Daily summary generation failed' },
      { status: 500 }
    );
  }
}

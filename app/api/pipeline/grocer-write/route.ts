import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GD_BENCHMARKS = `
Key Grocery Doppio benchmark statistics to cite inline (use markdown hyperlinks):
- 69% of grocery purchases are digitally influenced — [Grocery Doppio](https://grocerydoppio.com)
- Digital grocery sales represent $126B, or 13.4% of total grocery — [Grocery Doppio](https://grocerydoppio.com)
- US grocery retail media market is worth $8.5B, growing 31% YoY — [Grocery Doppio](https://grocerydoppio.com)
- 86% of C-suite grocery executives are prioritising AI for efficiency — [Grocery Doppio](https://grocerydoppio.com)
- 83% of grocery shoppers are enrolled in at least one loyalty program — [Grocery Doppio](https://grocerydoppio.com)
- 71% of grocers plan to increase investment in fulfillment capabilities — [Grocery Doppio](https://grocerydoppio.com)
- 92% of shoppers say grocery lacks personalization — [Grocery Doppio](https://grocerydoppio.com)

Weave 2–3 of these citations naturally into the relevant section (not all in one place).
`;

const ARTICLE_FORMAT = `
Article structure (follow this exactly):

## [RETAILER] [PERIOD]: Digital & Technology Performance

**Executive Summary** (2 short paragraphs — 60–80 words total)
Summarise the period's headline results. Include comparable sales, revenue, or relevant KPI if available. Frame the performance in the context of the broader grocery technology landscape. Do NOT start with the retailer's name.

**Key Highlights**
• [KPI 1 with number]
• [KPI 2 with number]
• [KPI 3 with number]
• [KPI 4 with number]
• [KPI 5 with number]
Aim for 4–6 bullet points. Use real figures from the research. If a figure is not available, omit that bullet.

## Digital Commerce
One paragraph (100–130 words). Cover ecommerce sales growth, online order volume, app performance, click-and-collect or BOPIS. Weave in a GD benchmark hyperlink where relevant.

## Fulfillment & Delivery
One paragraph (90–120 words). Cover last-mile delivery, dark stores, micro-fulfillment, same-day capability, third-party partnerships (Instacart, DoorDash, etc.). Cite GD fulfillment benchmark if applicable.

## Loyalty Program
One paragraph (80–110 words). Cover loyalty membership numbers, personalized offers, reward redemption, program changes. Cite GD loyalty benchmark.

## Retail Media
One paragraph (80–110 words). Cover retail media network revenue, CPG partnership announcements, sponsored placements, off-site advertising. Cite GD retail media benchmark.

## AI & Technology
One paragraph (90–120 words). Cover AI investments, automation pilots, pricing algorithms, demand forecasting, chatbots, in-store tech. Cite GD AI benchmark.

## Future Outlook
One paragraph (80–100 words). Summarise strategic priorities for the next 1–2 quarters. End with a forward-looking statement grounded in data or management commentary. Balanced tone — avoid hype.

---
Word count target: 750–1,050 words.
`;

export async function POST(req: NextRequest) {
  const { retailer, period, knownData, contextSnippet, includedSources, excludedSources, uploadedContext } = await req.json();

  if (!retailer) {
    return NextResponse.json({ error: 'Retailer name is required' }, { status: 400 });
  }

  const periodLabel = period || 'Latest Period';

  const sourceGuidance = [
    includedSources?.length
      ? `The analyst has selected these sources to prioritise: ${includedSources.join('; ')}.`
      : '',
    excludedSources?.length
      ? `The analyst has excluded these sources — do not cite them: ${excludedSources.join('; ')}.`
      : '',
  ].filter(Boolean).join('\n');

  const systemPrompt = `You are a senior analyst at Grocery Doppio, the leading grocery technology intelligence platform. Your articles are read by category managers, digital leads, and C-suite executives at top grocery retailers and CPG brands.

Your writing is:
- Data-led: every claim is backed by a number or a named source
- Precise: American English spelling (program, fulfillment, behavior, optimize, labor)
- Balanced: no hyperbole, no filler phrases ("in today's fast-paced world", "it's clear that…")
- Structured: follow the exact article format provided
- Authoritative: cite Grocery Doppio benchmarks inline as hyperlinks where relevant

Never fabricate statistics. If a figure is not available from the research, omit it rather than estimate.`;

  const userPrompt = `Write a Grocery Doppio performance article for ${retailer}, ${periodLabel}.

${GD_BENCHMARKS}

${ARTICLE_FORMAT}

Research context:
${contextSnippet || `No external research was found. Write based on general knowledge of ${retailer}'s digital strategy and the GD benchmarks above. Flag in the article that specific figures were not available.`}

${uploadedContext ? `Uploaded analyst documents (treat as primary source material):\n${uploadedContext}` : ''}

${sourceGuidance ? `Source guidance:\n${sourceGuidance}` : ''}

${knownData?.trim() ? `Additional analyst notes:\n${knownData}` : ''}

Output only the finished article in clean markdown. No preamble, no meta-commentary.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3500,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const output = message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({ output });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Article generation failed' },
      { status: 500 },
    );
  }
}

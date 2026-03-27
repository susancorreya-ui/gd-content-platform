import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { draft, topic, pillar }: {
    draft: string;
    topic: string;
    pillar: string;
  } = await req.json();

  const prompt = `You are the SEO specialist for Grocery Doppio. Your job is to ensure a draft article is fully optimised for search without compromising its editorial quality.

SEO REQUIREMENTS TO ENFORCE:
1. Primary keyword must appear: in the H1 headline, in the first 100 words, in at least one H2, in the meta description, in the URL slug
2. SEO Title Tag: 50–60 characters, primary keyword near the front
3. Meta Description: 150–160 characters, includes primary keyword, analytical not clickbait
4. URL Slug: lowercase, hyphenated, 3–6 words, primary keyword included
5. Secondary keywords: woven naturally into body — never stuffed
6. Header hierarchy: one H1, logical H2/H3 structure, no skipped levels
7. Opening paragraph: primary keyword in first 100 words, no fluff opener

Topic: ${topic}
Content Pillar: ${pillar}

YOUR TASKS:
1. Review the article for all SEO requirements above
2. Make targeted edits — only what's needed for SEO compliance
3. Do not change the article's argument, structure, or voice
4. Return the full SEO-optimised article

After the article, append:

SEO REPORT:
───────────
Primary keyword identified: [keyword]
SEO Title Tag: [50–60 chars]
Meta Description: [150–160 chars]
URL Slug: [slug]
Secondary keywords used: [list]
Changes made: [list each SEO edit and where]
SEO compliance: [PASS / FAIL with reason]

DRAFT ARTICLE:
${draft}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = msg.content[0].type === 'text' ? msg.content[0].text : draft;

    const splitMarker = 'SEO REPORT:';
    const splitIdx = result.lastIndexOf(splitMarker);
    const optimisedDraft = splitIdx > -1 ? result.slice(0, splitIdx).trim() : result;
    const seoReport = splitIdx > -1 ? result.slice(splitIdx).trim() : 'No SEO report generated.';

    return NextResponse.json({ draft: optimisedDraft, seoReport });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'SEO optimisation failed' }, { status: 500 });
  }
}

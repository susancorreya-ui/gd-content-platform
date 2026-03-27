import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface HeadlineOption {
  headline: string;
  type: string;
  score: number;
  reason: string;
  seoTitle: string;
}

export async function POST(req: NextRequest) {
  const { draft, topic, pillar }: {
    draft: string;
    topic: string;
    pillar: string;
  } = await req.json();

  const prompt = `You are the headline specialist for Grocery Doppio. Your job is to generate 5 headline options for an article that a human editor will choose from before publication.

Topic: ${topic}
Content Pillar: ${pillar}

HEADLINE CRITERIA:
- Specific over vague — name the trend, the number, the shift, or the tension
- Arguable — the reader should be able to disagree with it
- No clickbait — no "You won't believe..." or "Everything you need to know..."
- No banned words: streamline, optimize, innovative, leverage, utilize, unlock, game-changer
- Primary keyword should appear naturally in at least 3 of the 5 options
- Grocery Doppio audience: executives, not general consumers

HEADLINE TYPES TO COVER:
- Declarative statement (makes a bold claim)
- Question (provokes thinking — only if genuinely answerable)
- Contrarian take (challenges conventional wisdom)
- Data-led (leads with a specific number or finding)
- How/Why explanation (explains a mechanism)

Return ONLY a valid JSON array with exactly 5 objects. No markdown, no explanation:
[
  {
    "headline": "The full headline text",
    "type": "Declarative | Question | Contrarian | Data-led | How/Why",
    "score": 8,
    "reason": "One sentence on why this headline works or what makes it strong",
    "seoTitle": "SEO title tag version (50–60 chars, primary keyword near front)"
  }
]

ARTICLE (for context — read the thesis and key findings before generating headlines):
${draft.slice(0, 3000)}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let headlines: HeadlineOption[] = [];
    try {
      headlines = JSON.parse(cleaned);
    } catch {
      headlines = [];
    }

    return NextResponse.json({ headlines });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Headline generation failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GD working title patterns (from ContentCreator placeholder + headline skill examples):
// "How [trend] is [implication] for [grocery audience]"
// "Why [conventional assumption] is [wrong/changing]"
// "[Specific tension] — [implication for grocers]"
// "[What's happening] and what it means for [grocery exec decision]"

export async function POST(req: NextRequest) {
  try {
    const { title, description, pillar } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const prompt = `You are the editorial director at Grocery Doppio (grocerydoppio.com) — a B2B research and content brand serving senior grocery executives (CEOs, CMOs, heads of digital, heads of supply chain).

A news signal has come in. Your job is to reframe it as a Grocery Doppio working title — not a news summary, but an analytical, argument-led topic that takes a position and is written for grocery executives.

**News signal:**
Title: ${title}
${description ? `Description: ${description}` : ''}
Content pillar: ${pillar}

**GD working title patterns:**
- "How [trend] is [implication] for grocery [audience]"
- "Why [conventional assumption] is [changing/wrong]"
- "[Specific tension] — and what it means for [grocery exec]"
- "The [trend] grocers can't afford to ignore in [year]"

**Examples of strong GD working titles:**
- "How private label is reshaping grocery margins in 2025"
- "Why retail media networks are pulling further ahead — and what mid-size grocers should do about it"
- "The AI forecasting gap: why most grocers are still flying blind on inventory"
- "How personalisation is separating grocery winners from the pack in 2025"
- "Why the grocery delivery wars are producing one clear winner — and it's not who you think"

**Rules:**
- Take a clear position — not a neutral summary
- Specific to the grocery industry and the named pillar
- Written for a senior exec, not a general audience
- 10–15 words maximum
- No banned words: streamline, optimize, innovative, leverage, utilize, unlock, game-changer, revolutionize
- Do NOT copy the original news title

Return ONLY the working title — no explanation, no quotes, no markdown.`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    });

    const topic = msg.content[0].type === 'text'
      ? msg.content[0].text.trim().replace(/^["']|["']$/g, '')
      : title;

    return NextResponse.json({ topic });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Topic generation failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a video scriptwriter and content strategist at Grocery Doppio, a grocery industry intelligence platform. You convert research reports, market snapshots, earnings analyses, and blog posts into punchy narrated video scripts for LinkedIn, YouTube, and social media.

BRAND VOICE:
- Direct and confident. Conversational but data-led.
- Short sentences. Active voice. Contractions are fine ("it's", "that's", "here's").
- Every key point is anchored in a specific number or named fact from the source.
- American English: program, behavior, fulfillment, personalization, labor.
- BANNED WORDS: streamline, leverage, utilize, innovative, ecosystem, game-changer, synergy, revolutionary, unlock, journey, robust.
- Never invent statistics. Only use numbers present in the source content.`;

export async function POST(req: NextRequest) {
  const { sourceType, sourceContent, title, format, ctaUrl }: {
    sourceType: string;
    sourceContent: string;
    title: string;
    format: string;
    ctaUrl?: string;
  } = await req.json();

  if (!sourceContent) {
    return NextResponse.json({ error: 'Source content is required' }, { status: 400 });
  }

  const cta = ctaUrl || 'grocerydoppio.com';
  const isGrocerPerf = sourceType === 'grocer-performance';

  const prompt = `Convert the following ${sourceType} content into a narrated video script for Grocery Doppio.

SOURCE TYPE: ${sourceType}
TITLE: ${title || 'Not specified'}
VIDEO FORMAT: ${format || 'LinkedIn / YouTube (60–90 seconds)'}

SOURCE CONTENT:
${sourceContent.slice(0, 12000)}

OUTPUT FORMAT — follow this exactly:

[SCRIPT]

[Intro paragraph — 2–3 sentences. Set up the topic and why it matters right now. End with a bridge like "Let's break down the numbers." or "Here's what the data shows." or "Here are the key takeaways."]

Number 1 – [Bold, specific point title — e.g. "Strong Sales Growth Driven by E-Commerce"]
[2–3 sentences. Specific data from the source. What happened and why it matters. Conversational.]

Number 2 – [Bold point title]
[2–3 sentences.]

Number 3 – [Bold point title]
[2–3 sentences.]

${isGrocerPerf ? 'Number 4 – [Bold point title]\n[2–3 sentences.]\n\n[Add a Number 5 if the source has enough distinct points — omit if not.]\n' : ''}
[Closing paragraph — 2–3 sentences. Strategic takeaway or forward-looking note. End with: "For more insights${isGrocerPerf ? ' into [company]\'s performance and' : ' on'} the future of grocery, visit ${cta}."]

---
VIDEO METADATA

Meta Description (GD site): [One sentence, ~155 characters, for the GD website page meta tag. Include key data points.]
Thumbnail Description: [1–2 sentences describing what should appear on the video thumbnail — include a key stat or bold claim.]
Main Content (GD page): [2–3 sentences for the body copy on the GD content page. Sets context and invites the reader to watch.]
YouTube Title: [Concise title, ~60 characters. ${isGrocerPerf ? 'Format: "Quarterly Grocery Performance – [Company] [Period]"' : 'Format: "[Topic] – [Angle or Key Insight]"'}]
YouTube Description: [3–4 sentences. Expand on the key points and end with a CTA to visit ${cta}.]

RULES:
- Every statistic in the script must come from the source content above. Do not invent numbers.
- Each "Number X" heading is a distinct, titled point — not a continuation of the previous one.
- Metadata must match the script content exactly.
- Output only the script and metadata. No preamble, no meta-commentary.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const output = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    return NextResponse.json({ output });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Generation failed' }, { status: 500 });
  }
}

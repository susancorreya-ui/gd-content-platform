import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a senior content strategist at Grocery Doppio, a grocery industry intelligence platform. You write the Doppio Direct newsletter — a bi-weekly email sent to C-level executives, chief digital officers, VPs, and technology leaders at major grocery retailers and retail technology companies.

BRAND VOICE:
- Confident and direct. No fluff, no filler.
- Warm enough to read like a curated briefing from a trusted colleague — not a press release.
- Every story snippet is data-led where the source allows. Lead with what's notable.
- Short sentences. Active voice. Conversational but authoritative.
- American English: program, behavior, fulfillment, personalization, labor, color.
- BANNED WORDS: streamline, leverage, utilize, innovative, ecosystem, game-changer, revolutionize, unlock, journey, synergy, robust, exciting, delighted.

NEWSLETTER FORMAT — follow exactly:

Subject: Doppio Direct: [Compelling subtitle — frames the unifying theme across all stories in 8–12 words]

---

[Intro paragraph — 2–3 sentences. Weaves the key themes together into a coherent "this is what matters this week" frame. Mentions any event teaser if present. Does NOT list story headlines — synthesises the through-line.]

---

**[Story headline — mirrors the source title or a sharper version of it]**
[2–4 sentences. What the content covers. Lead with the most striking number or finding if available. Why it matters to this audience. Specific and concrete — no vague generalities.]

[CTA — one sentence, action verb, formatted as a markdown hyperlink using the story's source URL. E.g. "[Explore the full breakdown.](url)" / "[Watch the Q1 performance video.](url)" / "[Read the research.](url)" — always link the full CTA sentence to the source URL.]

[Repeat for each story — same structure every time]

---

RULES:
- Subject line always starts "Doppio Direct: "
- Intro is one paragraph — no bullet points
- Each story block: bold headline, body copy, CTA sentence — nothing else
- CTAs are short, direct, action-led — never "click here" or "learn more" — always formatted as a markdown hyperlink to the story's source URL
- If an event is included, it gets its own story block positioned logically (usually first or last)
- If a source is a video/performance breakdown, the CTA should reference watching, not reading
- Never invent statistics not present in the source content provided`;

interface StoryInput {
  url: string;
  content: string;
}

interface EventInput {
  name: string;
  date: string;
  description?: string;
  url?: string;
}

export async function POST(req: NextRequest) {
  const { stories, event, editionDate, researchContext }: {
    stories: StoryInput[];
    event?: EventInput;
    editionDate?: string;
    researchContext?: string;
  } = await req.json();

  if (!stories || stories.length === 0) {
    return NextResponse.json({ error: 'At least one story is required' }, { status: 400 });
  }

  const storiesContext = stories.map((s, i) =>
    `STORY ${i + 1}:\nSource URL: ${s.url}\nContent:\n${s.content.slice(0, 4000)}`
  ).join('\n\n---\n\n');

  const eventContext = event
    ? `\nUPCOMING EVENT TO TEASE:\nName: ${event.name}\nDate: ${event.date}${event.description ? `\nDescription: ${event.description}` : ''}${event.url ? `\nURL: ${event.url}` : ''}\n`
    : '';

  const prompt = `Write a complete Doppio Direct newsletter for the following stories.
${editionDate ? `Edition date: ${editionDate}\n` : ''}${eventContext}${researchContext ? `\n${researchContext}\n` : ''}
STORIES TO COVER (${stories.length} total):

${storiesContext}

Write the full newsletter now. Follow the format guide exactly. Output only the finished newsletter — no preamble, no commentary.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const output = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    return NextResponse.json({ output });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Newsletter generation failed' },
      { status: 500 },
    );
  }
}

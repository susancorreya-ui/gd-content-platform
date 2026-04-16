import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a video producer and scriptwriter at Grocery Doppio, a grocery industry intelligence platform. You write shot-by-shot event recap scripts for short social videos — LinkedIn, YouTube Shorts, and Instagram Reels.

BRAND VOICE:
- Warm, energetic, but professional — this is a recap of a real event, not a press release.
- Short, vivid captions. Each shot description is 1–2 sentences max.
- Active voice. Present tense for atmosphere ("leaders gather", "the conversation shifts").
- American English: program, behavior, fulfillment, personalization.
- BANNED WORDS: streamline, leverage, utilize, innovative, game-changer, synergy, ecosystem, revolutionary.`;

export async function POST(req: NextRequest) {
  const { eventName, eventDate, venue, summary, keyMoments, speakers, format, researchContext }: {
    eventName: string;
    eventDate: string;
    venue?: string;
    summary: string;
    keyMoments: string;
    speakers?: string;
    format: string;
    researchContext?: string;
  } = await req.json();

  if (!eventName || !summary) {
    return NextResponse.json({ error: 'Event name and summary are required' }, { status: 400 });
  }

  const prompt = `Write a shot-by-shot event recap video script for the following event.

EVENT: ${eventName}
DATE: ${eventDate || 'Not specified'}
${venue ? `VENUE: ${venue}` : ''}
VIDEO FORMAT: ${format || 'LinkedIn / YouTube Shorts (60–90 seconds)'}

EVENT SUMMARY:
${summary}

KEY MOMENTS TO COVER:
${keyMoments}

${speakers ? `SPEAKERS / FIRESIDE CHATS:\n${speakers}` : ''}
${researchContext ? `\n${researchContext}` : ''}
OUTPUT FORMAT — follow this exactly:

[Event Name] — [Date]

Shot 1 ([brief footage note in parentheses — what type of footage this shot uses, e.g. "venue exterior", "crowd networking", "speaker on stage"])
[Caption — 1–2 punchy sentences describing what this shot shows or what's happening]

Shot 2 ([footage note])
[Caption]

Shot 3 ([footage note])
[Caption]

[Continue for as many shots as needed to cover all key moments — typically 4–7 shots for a 60–90 second video]

RULES:
- Footage notes in parentheses should be practical and specific (e.g. "networking crowd", "fireside chat on stage", "branded signage", "speakers laughing")
- Captions set the atmosphere and highlight what made this moment notable
- Last shot should be a thank-you or closing frame
- Do not add section headers, timestamps, or voice-over notes — just the shot list
- Output only the script. No preamble, no commentary.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const output = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    return NextResponse.json({ output });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Generation failed' }, { status: 500 });
  }
}

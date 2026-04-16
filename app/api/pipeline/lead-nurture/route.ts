import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an email marketing specialist at Grocery Doppio / Incisiv, a grocery industry intelligence platform. You write multi-email nurture sequences for C-level executives, chief digital officers, VPs, and technology leaders at grocery retailers and retail technology companies.

VOICE:
- Personal and warm — from a named person, not a brand.
- Short, direct sentences. No filler.
- Each email has one clear job. Do not overload.
- American English: program, behavior, fulfillment, personalization, labor.
- Always open with "First name," (literal placeholder)
- Always close with the sender's signature placeholder
- BANNED WORDS: streamline, leverage, utilize, innovative, ecosystem, game-changer, synergy, robust, exciting, delighted, revolutionize, unlock.`;

export async function POST(req: NextRequest) {
  const {
    entryPoint,
    audience,
    topic,
    goals,
    senderName,
    senderTitle,
    senderEmail,
    assetUrl,
  }: {
    entryPoint: string;
    audience: string;
    topic: string;
    goals?: string;
    senderName: string;
    senderTitle?: string;
    senderEmail?: string;
    assetUrl?: string;
  } = await req.json();

  if (!entryPoint || !audience || !topic) {
    return NextResponse.json({ error: 'Entry point, audience, and topic are required' }, { status: 400 });
  }

  const prompt = `Write a 5-email nurture sequence for the following context.

ENTRY POINT (what triggered this sequence): ${entryPoint}
AUDIENCE: ${audience}
TOPIC / CONTENT ASSET: ${topic}
${goals ? `GOALS FOR THIS SEQUENCE: ${goals}` : ''}
${assetUrl ? `ASSET URL: ${assetUrl}` : ''}
SENDER: ${senderName}${senderTitle ? `, ${senderTitle}` : ''}${senderEmail ? ` (${senderEmail})` : ''}

Write all 5 emails in this exact format with these exact separators:

===EMAIL_1===
Timing: Day 0 — Immediate
Subject: [subject line]
Preview: [preview text — 1 sentence, under 90 chars]

[Body — "First name," opener. 3–4 short paragraphs. Acknowledge what brought them here. Deliver immediate value — a key insight, access to the asset, or a strong opening point. Set expectations for what's coming. Keep it warm and specific to their world. Close with "${senderName}'s signature".]

===EMAIL_2===
Timing: Day 3
Subject: [subject line]
Preview: [preview text]

[Body — "First name," opener. 2–3 paragraphs. Lead with a specific insight, stat, or finding directly relevant to their role and the topic. Make it feel like a curated briefing, not a sales pitch. End with a soft question or forward-looking observation. Close with "${senderName}'s signature".]

===EMAIL_3===
Timing: Day 7
Subject: [subject line]
Preview: [preview text]

[Body — "First name," opener. 2–3 paragraphs. A concrete example, case study, or real-world application of the topic. Show the "what this looks like in practice" angle for this audience. Keep it specific. Close with "${senderName}'s signature".]

===EMAIL_4===
Timing: Day 12
Subject: [subject line]
Preview: [preview text]

[Body — "First name," opener. 2 paragraphs. An offer or next step — invite to an event, a deeper conversation, a demo, or another piece of content. Make the CTA feel like a natural next step, not a hard sell. Include one clear [CTA button label] in square brackets. Close with "${senderName}'s signature".]

===EMAIL_5===
Timing: Day 17
Subject: [subject line]
Preview: [preview text]

[Body — "First name," opener. 2 short paragraphs. Light check-in. Ask what's top of mind. Reference something timely in the grocery industry. Leave the door open without pressure. Close with "${senderName}'s signature".]

RULES:
- Every email opens with "First name," on its own line
- Emails 1–3 deliver value first, no pitch
- Email 4 has the primary CTA — one [button label] in square brackets
- Email 5 is short and conversational — under 80 words in the body
- Subject lines must be specific, not generic ("Following up" is banned)
- Tailor every email to the audience type — what they care about, how they speak
- Do not add any text outside the five email blocks`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

    const labels = [
      'Day 0 — Welcome',
      'Day 3 — Insight',
      'Day 7 — Case Study',
      'Day 12 — Offer',
      'Day 17 — Follow-up',
    ];
    const emails: { label: string; content: string }[] = [];
    const parts = raw.split(/===EMAIL_\d+===/);
    parts.shift();

    for (let i = 0; i < 5; i++) {
      emails.push({ label: labels[i], content: (parts[i] || '').trim() });
    }

    return NextResponse.json({ emails, raw });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 },
    );
  }
}

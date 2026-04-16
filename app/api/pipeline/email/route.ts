import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a senior email copywriter at Grocery Doppio / Incisiv, a grocery industry intelligence platform. You write emails sent to C-level executives, chief digital officers, VPs, and technology leaders at grocery retailers and retail technology companies.

VOICE:
- Personal and direct. Comes from a named person.
- Short sentences. No fluff, no preamble.
- Respect the reader's time — get to the point in the first line.
- British English: programme, behaviour, fulfilment, personalisation.
- BANNED: streamline, leverage, utilize, innovative, ecosystem, game-changer, synergy, robust, exciting, delighted, revolutionize, unlock, journey.

OUTPUT FORMAT — always produce exactly:
Subject: [subject line]
Preview: [preview text — under 90 characters]

[email body — opens with "First name," on its own line]`;

export async function POST(req: NextRequest) {
  const { subtype, eventContent, eventUrl, eventName, eventDate, eventFormat, audience, senderName, senderTitle,
          prospectCompany, prospectRole, prospectContext, offer, ctaText }: {
    subtype: 'event-invite' | 'sales-outreach';
    // Event invite
    eventContent?: string;
    eventUrl?: string;
    eventName?: string;
    eventDate?: string;
    eventFormat?: string;
    audience?: string;
    senderName?: string;
    senderTitle?: string;
    // Sales outreach
    prospectCompany?: string;
    prospectRole?: string;
    prospectContext?: string;
    offer?: string;
    ctaText?: string;
  } = await req.json();

  let prompt = '';

  if (subtype === 'event-invite') {
    prompt = `Write a single event invitation email for the following event.

${eventName ? `EVENT NAME: ${eventName}` : ''}
${eventDate ? `DATE: ${eventDate}` : ''}
${eventFormat ? `FORMAT: ${eventFormat}` : ''}
${audience ? `TARGET AUDIENCE: ${audience}` : ''}
${senderName ? `SENDER: ${senderName}${senderTitle ? `, ${senderTitle}` : ''}` : ''}
${eventUrl ? `SOURCE URL: ${eventUrl}` : ''}

${eventContent ? `EVENT PAGE CONTENT (use this to extract speakers, topics, agenda, and key details):\n${eventContent.slice(0, 5000)}` : ''}

Write a compelling invitation email. Structure:
1. Subject line: specific, creates FOMO without being clickbait
2. Preview text: one punchy line under 90 chars
3. Body (open with "First name,"):
   - Hook: one sentence on why this event matters right now
   - What they'll learn or experience: 2–3 specific bullet points from the agenda/speakers
   - Event logistics: date, time, format (in-person or virtual)
   - One clear CTA: [Register Now] or [Save Your Spot] in square brackets
   - Sign off with "${senderName || 'the sender'}'s signature"

Keep the body under 180 words. No corporate preamble.`;

  } else {
    prompt = `Write a single sales outreach email.

${prospectCompany ? `PROSPECT COMPANY: ${prospectCompany}` : ''}
${prospectRole ? `PROSPECT ROLE / TITLE: ${prospectRole}` : ''}
${prospectContext ? `CONTEXT / PERSONALISATION: ${prospectContext}` : ''}
${offer ? `WHAT WE'RE OFFERING: ${offer}` : ''}
${ctaText ? `CTA: ${ctaText}` : 'CTA: 15-minute call'}
${senderName ? `SENDER: ${senderName}${senderTitle ? `, ${senderTitle}` : ''}` : ''}

Write a direct, personalised outreach email. Structure:
1. Subject line: specific to their company or role — not generic
2. Preview text: one line that earns the open
3. Body (open with "First name,"):
   - Personalised opener that references their company, role, or a relevant industry signal (1 sentence)
   - What Grocery Doppio / Incisiv does and why it's relevant to them specifically (1–2 sentences)
   - The specific value prop or offer (1 sentence)
   - Low-friction CTA: [${ctaText || 'Book 15 minutes'}] in square brackets
   - Sign off with "${senderName || 'the sender'}'s signature"

Keep the body under 120 words. No preamble. No "I hope this email finds you well."`;
  }

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const output = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    return NextResponse.json({ output });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an event marketing specialist at Grocery Doppio / Incisiv. You write pre-event promotional email sequences for webinars and in-person events targeting C-level executives, chief digital officers, VPs, and technology leaders at grocery retailers and retail technology companies.

VOICE:
- Personal and direct. These come from a named person, not a brand account.
- Short sentences. No fluff, no preamble.
- Respect the reader's time — get to the point in the first sentence.
- American English: program, behavior, fulfillment, personalization.
- Always open with "First name," (literal placeholder — the ESP will personalise it)
- BANNED: streamline, leverage, utilize, innovative, ecosystem, game-changer, synergy, robust, exciting, delighted, revolutionize, unlock, journey.

SEQUENCE STRUCTURE (4 emails, pre-event):
- Email 1 (~2 weeks out): Full introduction — hook, what they'll learn, speaker lineup, 4–5 bullet points, CTA [Register Now]
- Email 2 (~1 week out): Lead with a compelling data point or industry signal, shorter, 3 bullets max, CTA [Save Your Spot]
- Email 3 (~3 days out): Urgency, personalised, light bullets (2–3), quick logistics, CTA [Register Now]
- Email 4 (day of): Very short day-of reminder — "Today at [time]", 3–4 key areas, CTA [Join the Session] or [Register Now]`;

export async function POST(req: NextRequest) {
  const {
    eventName,
    eventShortName,
    eventDate,
    eventTime,
    timezone,
    eventType,
    sessionTopics,
    speakers,
    cohost,
    registrationUrl,
    senderName,
    senderTitle,
    senderEmail,
  }: {
    eventName: string;
    eventShortName?: string;
    eventDate: string;
    eventTime?: string;
    timezone?: string;
    eventType?: 'webinar' | 'in-person';
    sessionTopics?: string;
    speakers?: string;
    cohost?: string;
    registrationUrl?: string;
    senderName: string;
    senderTitle?: string;
    senderEmail?: string;
  } = await req.json();

  if (!eventName || !eventDate) {
    return NextResponse.json({ error: 'Event name and date are required' }, { status: 400 });
  }

  const shortName = eventShortName || eventName;
  const time = `${eventTime || '12:00 PM'} ${timezone || 'ET'}`;
  const format = eventType === 'in-person' ? 'in-person event' : 'webinar';
  const regUrl = registrationUrl || '[Registration link to be added]';

  const prompt = `Write all 4 promotional emails for the following ${format}.

EVENT DETAILS:
- Full name: ${eventName}
- Short name (for subject lines): ${shortName}
- Date: ${eventDate}
- Time: ${time}
- Format: ${format}${cohost ? `\n- Co-hosted with: ${cohost}` : ''}
- Key discussion topics / agenda: ${sessionTopics || 'To be confirmed'}
- Speakers / panelists: ${speakers || 'Industry experts'}
- Registration link: ${regUrl}
- Sender: ${senderName}${senderTitle ? `, ${senderTitle}` : ''}${senderEmail ? ` (${senderEmail})` : ''}

Write each email in this exact format with these exact separators:

===EMAIL_1===
Timing: ~2 weeks before the event
Subject: [subject line — specific, creates interest without being clickbait]
Preview: [preview text — 1 punchy line, under 90 chars]

[Body — "First name," opener. Hook: 1–2 sentences on why this event matters right now (reference an industry signal, stat, or trend). What they'll learn: 4–5 specific bullet points from the agenda/speakers. Brief logistics: date, time, format. One clear CTA: [Register Now] in square brackets. Close with "${senderName}'s signature". Max 220 words.]

===EMAIL_2===
Timing: ~1 week before the event
Subject: [subject line — lead with a specific data point or insight]
Preview: [preview text — under 90 chars]

[Body — "First name," opener. Open with 1 compelling data point or industry signal relevant to the event topic. Bridge to the event in 1 sentence. 3 bullet points: the most compelling discussion areas. Quick logistics: date, time. CTA: [Save Your Spot] in square brackets. Close with "${senderName}'s signature". Max 160 words.]

===EMAIL_3===
Timing: ~3 days before the event
Subject: [subject line — slightly urgent, personalised feel]
Preview: [preview text — under 90 chars]

[Body — "First name," opener. 1 sentence on why this moment in the industry matters. 2–3 light bullet points. One sentence on logistics: date, time, format. CTA: [Register Now] in square brackets. Close with "${senderName}'s signature". Max 130 words.]

===EMAIL_4===
Timing: Day of the event (send morning)
Subject: [subject line — "Today at ${time}:" format]
Preview: [preview text — under 90 chars]

[Body — "First name," opener. 1 sentence: the event is today at ${time}. 3–4 key areas they'll hear about (brief bullets, no fluff). One CTA: [${eventType === 'in-person' ? 'Register Now' : 'Join the Session'}] in square brackets. Very short close with "${senderName}'s signature". Max 100 words.]

RULES:
- Every email opens with "First name," on its own line
- Subject lines must be specific to this event — never generic
- Use the exact ===EMAIL_N=== separators with no other text outside the blocks
- American English throughout
- No preamble, no "I hope this finds you well", no corporate filler`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

    const emails: { label: string; content: string }[] = [];
    const labels = ['2 Weeks Out', '1 Week Out', '3 Days Out', 'Day Of'];
    const parts = raw.split(/===EMAIL_\d+===/);
    parts.shift();

    for (let i = 0; i < 4; i++) {
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

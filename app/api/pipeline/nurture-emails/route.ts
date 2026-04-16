import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an event marketing specialist at Grocery Doppio / Incisiv. You write event nurture email sequences for webinars and virtual events targeting C-level executives, chief digital officers, and technology leaders at grocery retailers and retail technology companies.

VOICE:
- Personal and warm — these come from a named person, not a brand account.
- Short, clear sentences. No filler.
- Professional but not stiff — like a colleague reaching out.
- American English: program, behavior, fulfillment, personalization.
- Always open with "First name," (literal placeholder — the ESP will personalise it)
- Always close with the sender's signature placeholder`;

export async function POST(req: NextRequest) {
  const {
    eventName,
    eventShortName,
    eventDate,
    eventTime,
    timezone,
    sessionTopics,
    speakers,
    senderName,
    senderTitle,
    senderEmail,
    joinLink,
    eventPageContent,
    researchContext,
  }: {
    eventName: string;
    eventShortName: string;
    eventDate: string;
    eventTime: string;
    timezone: string;
    sessionTopics: string;
    speakers: string;
    senderName: string;
    senderTitle?: string;
    senderEmail?: string;
    joinLink?: string;
    eventPageContent?: string;
    researchContext?: string;
  } = await req.json();

  if (!eventName || !eventDate) {
    return NextResponse.json({ error: 'Event name and date are required' }, { status: 400 });
  }

  const shortName = eventShortName || eventName;
  const joinLinkText = joinLink || '[Join link to be added]';

  const prompt = `Write all 4 emails in the event nurture sequence for the following event.

EVENT DETAILS:
- Full name: ${eventName}
- Short name (for subject lines): ${shortName}
- Date: ${eventDate}
- Time: ${eventTime || '12:00 PM ET'} ${timezone || 'ET'}
- Session topics / agenda highlights: ${sessionTopics || 'To be confirmed'}
- Speakers / panelists: ${speakers || 'Industry experts'}
- Sender: ${senderName}${senderTitle ? `, ${senderTitle}` : ''}${senderEmail ? ` (${senderEmail})` : ''}
- Join link: ${joinLinkText}
${eventPageContent ? `\nEVENT PAGE CONTENT (use this to extract speakers, topics, agenda, and key details — prioritise over the fields above where more specific):\n${eventPageContent.slice(0, 6000)}` : ''}
${researchContext ? `\n${researchContext}` : ''}
Write each email in this exact format with these exact separators:

===EMAIL_1===
Email name: ${shortName} – One Day Away
From: ${senderEmail || '[sender email]'}
Subject: [subject line]
Preview: [preview text — 1 short sentence, under 90 chars]

[Body — personalised with "First name," opener. 3–4 short paragraphs. Confirm date/time. List 2–3 session highlights or topics. Include join link. Mention a reminder will be sent. Invite questions in advance. Close with "${senderName}'s signature".]

===EMAIL_2===
Email name: ${shortName} – See You in 30 Minutes
From: ${senderEmail || '[sender email]'}
Subject: [subject line]
Preview: [preview text]

[Body — very short. "First name," opener. 1 sentence: event starts in 30 minutes. One CTA button label in square brackets e.g. [Join the Session]. Mention link also on calendar. Brief offer to help if issues. Close with "${senderName}'s signature".]

===EMAIL_3===
Email name: ${shortName} – We Missed You
From: ${senderEmail || '[sender email]'}
Subject: [subject line]
Preview: [preview text]

[Body — "First Name," opener. 1 sentence: missed you at the event. 1–2 sentences: what the experts covered and why it matters. Mention on-demand availability. One line: "[Webinar on demand — image/button]". Invite to future sessions. Close with "${senderName}'s signature".]

===EMAIL_4===
Email name: ${shortName} – Thank You for Joining
From: ${senderEmail || '[sender email]'}
Subject: [subject line]
Preview: [preview text]

[Body — "First name," opener. Thank them for joining. Mention presentation link available. Offer to answer questions or take feedback. Mention on-demand availability. One line: "[Webinar on demand — image/button]". Close with "${senderName}'s signature".]

RULES:
- Every email opens with "First name," on its own line
- Keep emails 2, 3, and 4 short — under 120 words each
- Email 1 can be up to 200 words
- Subject lines must be specific to this event — never generic
- Do not add any text outside the four email blocks
- Use the exact ===EMAIL_N=== separators`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

    // Parse the 4 emails out of the response
    const emails: { label: string; content: string }[] = [];
    const labels = ['One Day Away', 'See You in 30 Minutes', 'We Missed You', 'Thank You for Joining'];
    const parts = raw.split(/===EMAIL_\d+===/);
    parts.shift(); // remove content before first separator

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

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: 'SLACK_WEBHOOK_URL not configured' }, { status: 500 });
  }

  try {
    const { stage, topic, pillar } = await req.json();

    const messages: Record<string, { emoji: string; heading: string; body: string; cta: string }> = {
      'checkpoint-outline': {
        emoji: '📋',
        heading: 'Outline ready for review',
        body: `The Outline Builder has completed the article outline and is waiting for your approval before writing begins.`,
        cta: 'Review & approve the outline to continue the pipeline →',
      },
      'checkpoint-publish': {
        emoji: '🚀',
        heading: 'Article ready to publish',
        body: `The article has passed through all 12 agents — written, edited, fact-checked, SEO-optimised, and quality-scored. It\'s waiting for your final approval and headline selection.`,
        cta: 'Review, select a headline, and approve for publishing →',
      },
    };

    const msg = messages[stage];
    if (!msg) {
      return NextResponse.json({ error: 'Unknown stage' }, { status: 400 });
    }

    const payload = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${msg.emoji}  GD Content Engine — ${msg.heading}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Article topic*\n${topic || 'Untitled'}` },
            { type: 'mrkdwn', text: `*Content pillar*\n${pillar || '—'}` },
          ],
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: msg.body },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Next step:* ${msg.cta}` },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Open Content Engine', emoji: true },
              url: 'http://localhost:3000',
              style: 'primary',
            },
          ],
        },
        { type: 'divider' },
      ],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Slack error: ${text}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Notification failed' },
      { status: 500 }
    );
  }
}

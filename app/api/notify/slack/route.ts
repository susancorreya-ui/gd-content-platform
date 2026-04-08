import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: 'SLACK_WEBHOOK_URL not configured' }, { status: 500 });
  }

  try {
    const { stage, topic, pillar, retailer, period } = await req.json();

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
      'grocer-checkpoint': {
        emoji: '🔍',
        heading: 'Sources ready for review',
        body: `Research is complete for ${retailer || 'the retailer'}${period ? ` (${period})` : ''}. Sources have been pulled from investor relations pages and industry press. Review and approve to begin writing the performance article.`,
        cta: 'Review sources and approve to write the article →',
      },
      'grocer-done': {
        emoji: '✅',
        heading: 'Grocer Performance article complete',
        body: `The ${retailer || 'retailer'}${period ? ` ${period}` : ''} performance article has been written in GD format with earnings data and benchmark citations. Ready for review and publishing.`,
        cta: 'Review, save to library, or publish to Webflow →',
      },
    };

    const msg = messages[stage];
    if (!msg) {
      return NextResponse.json({ error: 'Unknown stage' }, { status: 400 });
    }

    // Build context fields depending on content type
    const contextFields = retailer
      ? [
          { type: 'mrkdwn', text: `*Retailer*\n${retailer}` },
          { type: 'mrkdwn', text: `*Period*\n${period || 'Latest'}` },
        ]
      : [
          { type: 'mrkdwn', text: `*Article topic*\n${topic || 'Untitled'}` },
          { type: 'mrkdwn', text: `*Content pillar*\n${pillar || '—'}` },
        ];

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
          fields: contextFields,
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
              url: stage === 'grocer-checkpoint'
                ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?view=grocer-performance&resume=checkpoint`
                : stage === 'grocer-done'
                ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?view=grocer-performance`
                : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?view=blog`,
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

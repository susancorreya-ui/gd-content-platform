import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BLOG_FORMAT, BlogType } from '@/lib/agents';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BLOG_SYSTEM_PROMPT = `You are a senior content writer for Grocery Doppio, the leading grocery industry intelligence platform.

BRAND VOICE (non-negotiable):
- Sound like a person, not a corporation. Natural language. No marketing-speak.
- Take positions. Don't hedge. Remove "it could be argued," "some suggest," "one might say."
- Make the reader stop and think. Name the felt pain so precisely they say "yes, that's exactly it."
- No fluff. No filler. If it can be said in one line, say it in one line.
- Active over passive voice. Confident over qualified — remove "almost," "very," "really."
- Specific over vague — every claim must be substantiated.
- BANNED WORDS — never use: streamline, optimize, innovative, leverage, utilize, facilitate, synergy, robust, exciting, proud, delighted, journey, ecosystem, game-changer, revolutionize, unlock.

AUDIENCE: Grocery retail executives, digital/e-commerce leaders, CPG brand managers, retail technology professionals.`;

const EDITOR_SYSTEM_PROMPT = `You are a senior copy editor for Grocery Doppio. Your job is to take a draft article and make it sharper, tighter, and more on-brand — without changing its structure or argument.

Run the 7-pass edit:
1. CLARITY — one main idea per section; reader can follow without re-reading
2. VOICE & TONE — human, bold, direct; remove any corporate or generic language
3. SO WHAT — every claim must answer "why should I care?" — leads to a benefit or implication
4. PROVE IT — flag any assertion without evidence with [VERIFY]
5. SPECIFICITY — replace vague with measurable, named, or described
6. EMOTION — at least one moment per section where a reader pain or insight is named precisely
7. FLOW — transitions work; no dead paragraphs; pacing holds end to end

Also check:
- Remove all BANNED WORDS: streamline, optimize, innovative, leverage, utilize, facilitate, synergy, robust, exciting, proud, delighted, journey, ecosystem, game-changer, revolutionize, unlock
- Fix passive voice instances
- Ensure SEO elements are complete (headline, meta description, URL slug, primary keyword in first 100 words)

Return the full edited article. Do not add commentary — just the improved article.`;

export async function POST(req: NextRequest) {
  const { brief, blogType, researchContext }: {
    brief: string;
    blogType: BlogType;
    researchContext?: string;
  } = await req.json();

  const formatInstructions = BLOG_FORMAT[blogType] || BLOG_FORMAT['standard'];

  const writePrompt = `Write the full article using this brief. Follow the outline, thesis, and angle precisely.

FORMAT INSTRUCTIONS:
${formatInstructions}

${researchContext ? `UPLOADED RESEARCH — use this as primary source material:\n${researchContext}\n\n` : ''}ARTICLE BRIEF:
${brief}

Write the complete article now. Include all required output schema elements: headline, SEO title tag, meta description, URL slug, tags, primary keyword, At a Glance section, full article body, internal links, fact-check report, copy edit notes, and editorial checklist.`;

  try {
    // Agent 5 — Writer
    const writeMsg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: BLOG_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: writePrompt }],
    });
    const draft = writeMsg.content[0].type === 'text' ? writeMsg.content[0].text : '';

    // Agent 6 — Editor
    const editMsg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: EDITOR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Edit this article:\n\n${draft}` }],
    });
    const edited = editMsg.content[0].type === 'text' ? editMsg.content[0].text : draft;

    return NextResponse.json({ draft: edited });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Writing pipeline failed' }, { status: 500 });
  }
}

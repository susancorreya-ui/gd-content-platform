import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BLOG_FORMAT, BlogType } from '@/lib/agents';
import { APPROVED_DOMAINS_LIST, BLOCKED_DOMAINS_LIST } from '@/lib/sourceDomains';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WRITER_SYSTEM_PROMPT = `You are a senior content writer for Grocery Doppio, the leading grocery industry intelligence platform.

BRAND VOICE (non-negotiable):
- Sound like a person, not a corporation. Natural language. No marketing-speak.
- Take positions. Don't hedge. Remove "it could be argued," "some suggest," "one might say."
- Make the reader stop and think. Name the felt pain so precisely they say "yes, that's exactly it."
- No fluff. No filler. If it can be said in one line, say it in one line.
- Active over passive voice. Confident over qualified — remove "almost," "very," "really."
- Specific over vague — every claim must be substantiated.
- BANNED WORDS: streamline, optimize, innovative, leverage, utilize, facilitate, synergy, robust, exciting, proud, delighted, journey, ecosystem, game-changer, revolutionize, unlock.

AUDIENCE: Grocery retail executives, digital/e-commerce leaders, CPG brand managers, retail technology professionals.

CLAIM INTEGRITY RULES (strictly enforced):
- Never invent statistics, percentages, dollar figures, growth rates, survey results, or market share numbers. If a specific number is not in the research context or outline provided, do not include it.
- Never attribute a specific claim to a named retailer unless that claim appears in the research.
- If you do not have a sourced figure, make the argument without the number. A precise argument without statistics is stronger than one built on invented data.
- When citing a statistic from the research, embed the source as a hyperlink directly on the claim.
- No exceptions. Do not approximate, round, or paraphrase statistics you do not have a source for.`;

export async function POST(req: NextRequest) {
  const { outline, blogType, researchContext, namedAuthor }: {
    outline: string;
    blogType: BlogType;
    researchContext?: string;
    namedAuthor?: string;
  } = await req.json();

  const formatInstructions = BLOG_FORMAT[blogType] || BLOG_FORMAT['standard'];
  const authorNote = blogType === 'thought-leadership' && namedAuthor?.trim()
    ? `\n\nNamed Author: ${namedAuthor} — write in this person's voice throughout.`
    : '';

  const prompt = `Write the full article using this outline. Follow the structure, thesis, and angle precisely. Do not deviate from the approved outline.

FORMAT INSTRUCTIONS:
${formatInstructions}
${authorNote}

${researchContext ? `UPLOADED RESEARCH — use as primary source material:\n${researchContext}\n\n` : ''}ARTICLE OUTLINE:
${outline}

LINKING RULES (strictly enforced):
- Embed all links as natural hyperlinks: [descriptive anchor text](url) — never show bare URLs
- The anchor text must describe what the reader will find, not the URL itself
- Source hierarchy: grocerydoppio.com first → then approved news/research sources
- APPROVED link domains: ${APPROVED_DOMAINS_LIST}
- NEVER link to these domains: ${BLOCKED_DOMAINS_LIST}
- Do not invent URLs — only use URLs you have high confidence are real and correct
- 3–6 links per article is ideal — quality over quantity

Write the complete article now. Include:
- HEADLINE (final)
- AT A GLANCE: 3–5 genuine insights (not teasers)
- ARTICLE BODY: full text with H2/H3 headers in markdown, links embedded naturally
- FACT-CHECK PLACEHOLDER: list all statistics and claims that will need verification in format [VERIFY: claim]`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: WRITER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const draft = msg.content[0].type === 'text' ? msg.content[0].text : '';
    return NextResponse.json({ draft });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Writing failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ReviewedSource {
  title: string;
  url: string;
  description: string;
  source: 'web' | 'gd';
  recommendation: 'INCLUDE' | 'SKIP';
  relevance: string;
  sourceType: string;
}

export async function POST(req: NextRequest) {
  const { topic, pillar, blogType, sources, researchContext }: {
    topic: string;
    pillar: string;
    blogType: string;
    sources: ReviewedSource[];
    researchContext?: string;
  } = await req.json();

  const included = sources.filter(s => s.recommendation === 'INCLUDE');
  const gdSources = included.filter(s => s.source === 'gd');
  const webSources = included.filter(s => s.source === 'web');

  const prompt = `You are a senior editorial strategist for Grocery Doppio, the leading grocery industry intelligence platform.

Create a detailed article outline based on the research below. The outline will be reviewed and approved by a human editor before writing begins.

ARTICLE REQUEST:
- Topic: ${topic}
- Content Pillar: ${pillar}
- Format: ${blogType}

GROCERY DOPPIO SOURCES AVAILABLE (for internal linking):
${gdSources.length > 0
    ? gdSources.map(s => `- ${s.title}\n  ${s.url}\n  ${s.description}`).join('\n')
    : '— None found'}

EXTERNAL SOURCES:
${webSources.length > 0
    ? webSources.map(s => `- [${s.sourceType}] ${s.title}\n  ${s.url}\n  ${s.description}`).join('\n')
    : '— None found'}

${researchContext ? `UPLOADED RESEARCH DOCUMENT:\n${researchContext}` : ''}

Produce the outline in this exact format:

ARTICLE OUTLINE
───────────────
HEADLINE OPTIONS:
1. [option — specific, arguable, not generic]
2. [option]
3. [option]

RECOMMENDED HEADLINE: [pick the strongest]

THESIS:
[One sentence. A clear, debatable position. Not "X is important" — take a side.]

ANGLE:
[What makes this piece different from any other article on this topic.]

TARGET READER:
[Named role + situation — e.g. "VP of Digital at a mid-size regional grocer evaluating curbside ROI"]

CONTENT PILLAR: ${pillar}

OUTLINE:
Intro — [what the opening establishes; what tension or question it raises]
Section 1: [H2 headline] — [what this section argues + what evidence it uses]
Section 2: [H2 headline] — [what this section argues + what evidence it uses]
Section 3: [H2 headline] — [what this section argues + what evidence it uses]
Section 4: [H2 headline] — [optional; only if genuinely needed]
Conclusion — [what the reader leaves with; the implication, not a summary]

KEY DATA POINTS:
- [specific stat or finding with source]
- [specific stat or finding with source]
- [specific stat or finding with source]

GD SOURCES TO REFERENCE:
${gdSources.map(s => `- "${s.title}" — ${s.url}`).join('\n') || '— None'}

EXTERNAL CITATIONS:
${webSources.map(s => `- "${s.title}" — ${s.url}`).join('\n') || '— None'}

SEO PLAN:
- Primary keyword: [keyword]
- Secondary keywords: [kw], [kw], [kw]
- Target word count: [based on ${blogType} format]
- URL slug: [slug]

TONE NOTES:
[Any specific direction for this article's voice]`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const outline = msg.content[0].type === 'text' ? msg.content[0].text : '';
    return NextResponse.json({ outline });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Outline generation failed' }, { status: 500 });
  }
}

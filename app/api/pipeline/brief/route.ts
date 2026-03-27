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

Build a detailed article brief based on the research below.

ARTICLE REQUEST:
- Topic: ${topic}
- Content Pillar: ${pillar}
- Format: ${blogType}

GROCERY DOPPIO ARTICLES TO REFERENCE (internal links):
${gdSources.length > 0
  ? gdSources.map(s => `- ${s.title}\n  ${s.url}\n  ${s.description}`).join('\n')
  : '— None found'}

EXTERNAL SOURCES:
${webSources.length > 0
  ? webSources.map(s => `- [${s.sourceType}] ${s.title}\n  ${s.url}\n  ${s.description}`).join('\n')
  : '— None found'}

${researchContext ? `UPLOADED RESEARCH DOCUMENT:\n${researchContext}` : ''}

Produce the brief in this exact format:

ARTICLE BRIEF
─────────────
HEADLINE OPTIONS:
1. [option]
2. [option]
3. [option]

RECOMMENDED HEADLINE: [pick the strongest — specific, arguable, not generic]

THESIS:
[One sentence. A clear, debatable position. Not "X is important" — take a side.]

ANGLE:
[What makes this piece different from any other article on this topic. The specific lens.]

TARGET READER:
[Named role + situation — e.g. "VP of Digital at a mid-size regional grocer evaluating curbside ROI"]

CONTENT PILLAR ANCHOR:
[One sentence on how this serves the ${pillar} pillar specifically]

ARTICLE OUTLINE:
Intro — [what the opening paragraph establishes; what tension or question it raises]
Section 1: [H2 headline] — [what this section argues and what evidence it uses]
Section 2: [H2 headline] — [what this section argues and what evidence it uses]
Section 3: [H2 headline] — [what this section argues and what evidence it uses]
Section 4: [H2 headline] — [optional; only if genuinely needed]
Conclusion — [what the reader leaves with; the implication, not a summary]

KEY DATA POINTS TO USE:
- [specific stat or finding with source]
- [specific stat or finding with source]
- [specific stat or finding with source]

GD INTERNAL LINKS:
${gdSources.map(s => `- "${s.title}" — ${s.url}`).join('\n') || '— None'}

EXTERNAL CITATIONS:
${webSources.map(s => `- "${s.title}" — ${s.url}`).join('\n') || '— None'}

SEO:
- Primary keyword: [keyword]
- Secondary keywords: [kw], [kw], [kw]
- Target word count: [number based on ${blogType} format]
- URL slug: [slug]

TONE NOTES:
[Any specific direction — e.g. "more provocative than analytical", "use first person if thought leadership"]`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const brief = msg.content[0].type === 'text' ? msg.content[0].text : '';
    return NextResponse.json({ brief });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Brief generation failed' }, { status: 500 });
  }
}

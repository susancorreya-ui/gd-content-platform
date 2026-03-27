import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface GDSource {
  title: string;
  url: string;
  description: string;
}

export async function POST(req: NextRequest) {
  const { draft, gdSources }: {
    draft: string;
    gdSources: GDSource[];
  } = await req.json();

  if (!gdSources || gdSources.length === 0) {
    return NextResponse.json({ draft, referencesAdded: [] });
  }

  const prompt = `You are the Grocery Doppio references specialist. Your job is to add Grocery Doppio citations only where the article's claims are directly grounded in GD's own research findings.

AVAILABLE GROCERY DOPPIO SOURCES:
${gdSources.map((s, i) => `${i + 1}. "${s.title}"\n   URL: ${s.url}\n   Summary: ${s.description}`).join('\n\n')}

RULES:
1. ONLY cite a GD source if the specific claim or finding in the article is directly supported by or traceable to that GD research. The connection must be explicit — not merely topical.
2. Do NOT add GD links to enrich general paragraphs, provide background context, or pad section endings. If the article's point did not come from GD research, do not add a GD citation.
3. GD content may be outdated — do not use it as a primary source for current statistics, recent trends, or new retailer developments. Only cite it if the underlying finding is evergreen and clearly matches the article's claim.
4. Cite as: "According to [Report/Article Name] from Grocery Doppio, ..." with hyperlink: [anchor text](url)
5. Do not add more than one GD reference per section.
6. Do not alter the article's argument, structure, or voice. Only add references where they fit naturally.
7. If no GD source genuinely matches any claim in the article, return the draft unchanged. Do not force citations.
8. Return the full article with references woven in (or unchanged if none were added).

After the article, append:
GD REFERENCES ADDED:
- [title] → [url] — added in [section name] — reason: [why this GD source directly supports this claim]
OR if none added:
GD REFERENCES ADDED: None — no claims in this article are directly grounded in the available GD research.

DRAFT ARTICLE:
${draft}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = msg.content[0].type === 'text' ? msg.content[0].text : draft;

    // Split draft from references report
    const splitMarker = 'GD REFERENCES ADDED:';
    const splitIdx = result.lastIndexOf(splitMarker);
    const updatedDraft = splitIdx > -1 ? result.slice(0, splitIdx).trim() : result;
    const referencesReport = splitIdx > -1 ? result.slice(splitIdx).trim() : '';

    return NextResponse.json({ draft: updatedDraft, referencesReport });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'GD references step failed' }, { status: 500 });
  }
}

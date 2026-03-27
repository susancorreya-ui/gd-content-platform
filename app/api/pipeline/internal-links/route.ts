import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BLOCKED_DOMAINS_LIST } from '@/lib/sourceDomains';

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
    return NextResponse.json({ draft, internalLinksReport: 'No GD sources available for internal linking.' });
  }

  const prompt = `You are the internal linking specialist for Grocery Doppio. Your job is to add internal links to GD content only where they are directly relevant to the article's specific claims.

AVAILABLE GROCERY DOPPIO CONTENT FOR LINKING:
${gdSources.map((s, i) => `${i + 1}. "${s.title}"\n   URL: ${s.url}\n   About: ${s.description}`).join('\n\n')}

INTERNAL LINKING RULES:
1. Add 2–4 internal links maximum — quality over quantity
2. ONLY link to a GD page if the surrounding sentence or paragraph is specifically about a topic that GD page covers in depth. The link must add genuine value for the reader — not just be topically related.
3. Do NOT add internal links to general paragraphs, introductions, or conclusions just to include GD content. If the article's argument does not directly connect to a GD source's specific findings, do not link it.
4. GD content may be outdated — avoid linking to GD pages as authoritative sources for current statistics or recent trends. Internal links work best as "further reading" for a specific sub-topic.
5. Use natural, descriptive anchor text — not "click here" or "read more"
6. Do not duplicate links already added by the GD References agent
7. Place links mid-sentence or at the end of a supporting point, never awkwardly forced
8. Format: [descriptive anchor text](https://grocerydoppio.com/...) — links must be embedded naturally, never shown as bare URLs
9. NEVER link to these competitor domains: ${BLOCKED_DOMAINS_LIST}
10. Only use the exact URLs provided in the source list above — do not invent or guess URLs
11. If no GD page is a strong match for any section of the article, add zero links. Do not force internal links.

After the article, append:

INTERNAL LINKS REPORT:
──────────────────────
Links added: [n]
[anchor text] → [url] — placed in [section]
[anchor text] → [url] — placed in [section]
Links not added (and why): [any sources that weren't linked and the reason]

DRAFT ARTICLE:
${draft}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = msg.content[0].type === 'text' ? msg.content[0].text : draft;

    const splitMarker = 'INTERNAL LINKS REPORT:';
    const splitIdx = result.lastIndexOf(splitMarker);
    const linkedDraft = splitIdx > -1 ? result.slice(0, splitIdx).trim() : result;
    const internalLinksReport = splitIdx > -1 ? result.slice(splitIdx).trim() : 'No internal links report generated.';

    return NextResponse.json({ draft: linkedDraft, internalLinksReport });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal linking failed' }, { status: 500 });
  }
}

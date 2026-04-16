import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MSSource } from '../ms-research/route';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a senior analyst at Grocery Doppio, a grocery industry intelligence platform. You write Market Snapshots — structured intelligence briefs read by C-level executives, chief digital officers, and technology leaders at major grocery retailers and retail technology companies.

BRAND VOICE:
- Authoritative and direct. Take positions. Do not hedge.
- Every sentence earns its place — no filler, no preamble.
- Short, declarative sentences. Active voice.
- Data-led: every claim is backed by a number or named source.
- American English: program, fulfillment, behavior, personalization, optimize, labor, color.
- BANNED WORDS — never use: streamline, leverage, utilize, innovative, ecosystem, game-changer, revolutionize, unlock, journey, synergy, robust, exciting, delighted.

AUDIENCE: CEOs, CIOs, CTOs, Chief Digital Officers, and VP-level digital and technology leaders at grocery retailers and grocery technology companies.`;

const FORMAT_GUIDE = `
MARKET SNAPSHOT FORMAT — follow this structure exactly:

# [Title]
*Market Snapshot*

[HOOK — one punchy sentence that frames the core tension or opportunity. Not a summary — a statement that makes the reader sit up.]

---

## [Section 1 Title — tension-framing: "The [X] crisis decoded", "Why [X] doesn't work", etc.]

[Lead paragraph — 2–3 sentences that set up the section's argument. Direct, no hedging.]

**[Sub-point label]:** [2–3 sentences developing this aspect. Specific, with data or named examples where available.]

**[Sub-point label]:** [2–3 sentences.]

**[Sub-point label]:** [2–3 sentences.]

> **[XX%]** [stat description] — *[Source Name]*

---

## [Section 2 Title]

[Lead paragraph]

**[Sub-point label]:** [2–3 sentences.]

**[Sub-point label]:** [2–3 sentences.]

**[Sub-point label]:** [2–3 sentences.]

> **[Stat]** [description] — *[Source]*

[Continue for 4–5 more sections following the arc: problem → why current fixes fail → the new approach → unified/strategic view → predictive/future capability]

---

## [Closing section — resolution/strategic, e.g. "Where [X] Creates Value", "The Path Forward"]

[2–3 sentence lead summarising the strategic case.]

**[Strategic vector 1 — action or outcome]:** [2–3 sentences on what this means and why it matters.]

**[Strategic vector 2]:** [2–3 sentences.]

**[Strategic vector 3]:** [2–3 sentences.]

[Final paragraph — "The [retailers/operators/leaders] who..." — a forward-looking imperative that ends the document on a strategic note. 2–3 sentences.]

---

STAT CALLOUT RULES:
- Every stat must be real and attributable to a named source from the research provided
- Format: > **[number/percentage]** [what it measures] — *[Source Name]*
- Use at minimum one stat callout per section
- Never invent statistics. If a specific figure isn't available, use a directional finding with its source.

LENGTH: 2,000–2,500 words (equivalent to 8–10 pages when designed).
SECTIONS: 5–6 thematic sections plus the closing.
`;

export async function POST(req: NextRequest) {
  const { theme, subThemes, outline, sources, uploadedDocs }: {
    theme: string;
    subThemes: string;
    outline: string;
    sources: MSSource[];
    uploadedDocs?: { name: string; text: string }[];
  } = await req.json();

  if (!theme) return NextResponse.json({ error: 'Theme is required' }, { status: 400 });

  const webSources = sources.filter(s => s.source === 'web');
  const gdSources = sources.filter(s => s.source === 'gd');

  const sourceContext = webSources
    .map(s => `[${s.sourceType}] ${s.title}\nURL: ${s.url}\n${s.description}`)
    .join('\n\n');

  const prompt = `Write a complete Grocery Doppio Market Snapshot on the following theme.

THEME: ${theme}

SUB-THEMES AND SUPPORTING IDEAS:
${subThemes}

APPROVED OUTLINE TO FOLLOW:
${outline}

${uploadedDocs && uploadedDocs.length > 0 ? `UPLOADED REFERENCE DOCUMENTS — use these as primary research and narrative guidance. Draw statistics, frameworks, and language direction from these documents first:\n${uploadedDocs.map(d => `--- ${d.name} ---\n${d.text.slice(0, 10000)}`).join('\n\n')}\n` : ''}AVAILABLE SOURCES — use these for all statistics and citations. Every factual claim must trace back to one of these sources. Do not invent statistics.
${sourceContext}

${gdSources.length > 0 ? `GROCERY DOPPIO CONTENT — link to these where relevant:\n${gdSources.map(s => `- ${s.title}: ${s.url}`).join('\n')}` : ''}

${FORMAT_GUIDE}

Write the complete Market Snapshot now. Follow the format guide exactly. Output only the finished document — no preamble, no commentary, no meta-notes.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 5000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const output = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    return NextResponse.json({ output });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Writing failed' }, { status: 500 });
  }
}

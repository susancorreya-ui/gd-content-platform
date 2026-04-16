import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MSSource } from '../ms-research/route';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { theme, subThemes, sources, uploadedDocs }: {
    theme: string;
    subThemes: string;
    sources: MSSource[];
    uploadedDocs?: { name: string; text: string }[];
  } = await req.json();

  const webSources = sources.filter(s => s.source === 'web');
  const gdSources = sources.filter(s => s.source === 'gd');
  const analystSources = webSources.filter(s =>
    ['Analyst report', 'Proprietary research'].includes(s.sourceType)
  );

  const prompt = `You are a senior editorial strategist at Grocery Doppio, a grocery industry intelligence platform.

You are creating a NARRATIVE OUTLINE for a Market Snapshot — a structured intelligence brief of 8–10 pages for C-level grocery and retail technology executives.

The outline is the first stage: it shows the team and client the narrative structure before full writing begins. It should give a clear sense of the argument arc, the section logic, and the key data that will anchor each section.

BRIEF:
- Main theme: ${theme}
- Sub-themes and supporting ideas:
${subThemes}

${uploadedDocs && uploadedDocs.length > 0 ? `UPLOADED REFERENCE DOCUMENTS — prioritise these for narrative direction, statistics, and framing:\n${uploadedDocs.map(d => `--- ${d.name} ---\n${d.text.slice(0, 8000)}`).join('\n\n')}\n` : ''}AVAILABLE SOURCES (use these to identify real data points):
${webSources.slice(0, 12).map(s => `- [${s.sourceType}] ${s.title}\n  ${s.url}\n  ${s.description}`).join('\n')}

${gdSources.length > 0 ? `GROCERY DOPPIO CONTENT (for reference linking):\n${gdSources.map(s => `- ${s.title}\n  ${s.url}`).join('\n')}` : ''}

Produce the outline in this exact format:

───────────────────────────────────────────
MARKET SNAPSHOT OUTLINE
───────────────────────────────────────────

TITLE: [Compelling title in the format "The [X]: [Specific Angle]" or "[Topic]: [Tension Statement]"]

HOOK: [One sentence that frames the core tension or opportunity — the thing the reader can't ignore]

NARRATIVE ARC: [2–3 sentences describing the overall journey from problem → why current approaches fail → resolution → strategic implication]

───────────────────────────────────────────
SECTION PLAN (5–6 sections)
───────────────────────────────────────────

SECTION 1: [Title — tension-framing, e.g. "The [X] crisis", "Why [X] doesn't work"]
Argument: [What this section establishes — 2 sentences]
Sub-points:
  • [Sub-point label]: [What it covers — 1 sentence]
  • [Sub-point label]: [What it covers — 1 sentence]
  • [Sub-point label]: [What it covers — 1 sentence]
Anchor stat: [Specific statistic or data point from the sources above, with source name]

SECTION 2: [Title]
Argument: [2 sentences]
Sub-points:
  • [Sub-point label]: [1 sentence]
  • [Sub-point label]: [1 sentence]
  • [Sub-point label]: [1 sentence]
Anchor stat: [Stat + source]

[Repeat for 3–4 more sections following the arc: problem → failure of current approaches → solution → strategic resolution]

───────────────────────────────────────────
CLOSING SECTION: [Title — resolution/strategic, e.g. "Where [X] Creates Value", "Building the Foundation"]
Three strategic vectors (what the document recommends):
  1. [Action/Outcome]: [What it means — 1 sentence]
  2. [Action/Outcome]: [What it means — 1 sentence]
  3. [Action/Outcome]: [What it means — 1 sentence]
Closing line: [The "The leaders who..." final imperative — 1 sentence]

───────────────────────────────────────────
KEY DATA POINTS IDENTIFIED
───────────────────────────────────────────
[List 5–8 specific statistics or findings from the sources above that will anchor the document. Format: stat — Source Name]

───────────────────────────────────────────
SOURCES TO CITE
───────────────────────────────────────────
Analyst/Research (prioritise):
${analystSources.slice(0, 6).map(s => `- ${s.title} — ${s.url}`).join('\n') || '— None found'}

Trade/Industry:
${webSources.filter(s => s.sourceType === 'Trade publication').slice(0, 4).map(s => `- ${s.title} — ${s.url}`).join('\n') || '— None found'}

${gdSources.length > 0 ? `GD Internal:\n${gdSources.map(s => `- ${s.title} — ${s.url}`).join('\n')}` : ''}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    });

    const outline = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    return NextResponse.json({ outline });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Outline generation failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { draft }: { draft: string } = await req.json();

  const prompt = `You are a fact-checking editor for Grocery Doppio. Your job is to produce a clean, publication-ready article by resolving every unsourced or unverifiable claim — not by flagging them, but by fixing them.

WHAT TO FIX:

**Tier 1 — Unsourced quantitative claims (highest risk):**
Statistics, percentages, dollar figures, growth rates, survey results, market share numbers that have no working source link embedded in the article.
→ Action: Remove the claim entirely — the sentence, clause, or bullet point that contains it. Do not replace with directional language. Do not approximate. If removing the claim breaks the paragraph's logic, rewrite the paragraph without the claim.
→ There are no exceptions for Tier 1. If it cannot be sourced, it does not appear in the article.

**Tier 2 — Unsourced specific named claims:**
Attributed statements, specific retailer initiatives, product launches, exact dates — where no source link exists.
→ Action: Remove the specific detail. Keep the general point if it is defensible.
→ Example: "Save Mart customers shop three times a week" → remove the frequency claim; keep the point about shopping behavior if it is general

**Tier 3 — Unlinked trade publication claims:**
Claims attributed to industry sources (trade publications, reports) that are not linked.
→ Action: If the claim is widely accepted industry knowledge, keep it but soften attribution ("industry data suggests…"). If it is a specific claim that requires a source, remove or soften.

WHAT TO KEEP:
- Claims that already have a working source link embedded — do not modify these
- Grocery Doppio's own research that is cited — do not modify
- General industry observations widely accepted as true (e.g. "online grocery has grown significantly since 2020")
- Any existing [VERIFY:] flags from a previous pass — resolve them using the same rules above, then remove the flag

RULES:
1. Return the full cleaned article — no [VERIFY:] flags anywhere in the output
2. Do not change the article's argument, structure, voice, or conclusions
3. Do not add new claims or statistics
4. After the article, append a FACT-CHECK REPORT

FACT-CHECK REPORT:
─────────────────
Claims removed (Tier 1 — unsourced statistics, removed entirely):
[list each: original claim that was removed]

Claims softened (Tier 2/3 — unsourced specific assertions):
[list each: original → softened version]

Claims kept with existing source links:
[list each]

Net change: [n claims removed or softened]

DRAFT ARTICLE:
${draft}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = msg.content[0].type === 'text' ? msg.content[0].text : draft;

    const splitMarker = 'FACT-CHECK REPORT:';
    const splitIdx = result.lastIndexOf(splitMarker);
    const cleanedDraft = splitIdx > -1 ? result.slice(0, splitIdx).trim() : result;
    const factCheckReport = splitIdx > -1 ? result.slice(splitIdx).trim() : 'No fact-check report generated.';

    return NextResponse.json({ draft: cleanedDraft, factCheckReport });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Fact-check step failed' }, { status: 500 });
  }
}

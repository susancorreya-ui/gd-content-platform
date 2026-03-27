import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EDITOR_SYSTEM_PROMPT = `You are the senior copy editor for Grocery Doppio. Your job is to take a draft article — which has already been through GD referencing, fact-checking, SEO optimisation, and internal linking — and make it sharper, tighter, and more on-brand, without changing its structure, argument, or any links that have been added.

Run the 7-pass edit in sequence:
1. CLARITY — one main idea per section; reader can follow without re-reading
2. VOICE & TONE — human, bold, direct; remove any corporate or generic language
3. SO WHAT — every claim must answer "why should I care?" — leads to a benefit or implication
4. PROVE IT — flag any remaining assertion without evidence with [VERIFY]
5. SPECIFICITY — replace vague with measurable, named, or described
6. EMOTION — at least one moment per section where a reader pain or insight is named precisely
7. FLOW — transitions work; no dead paragraphs; pacing holds end to end

Also enforce:
- BANNED WORDS: streamline, optimize, innovative, leverage, utilize, facilitate, synergy, robust, exciting, proud, delighted, journey, ecosystem, game-changer, revolutionize, unlock
- Fix passive voice instances
- Remove hedging language: "it could be argued," "some suggest," "one might say," "almost," "very," "really"
- Ensure the opening paragraph hooks immediately — no "In today's fast-moving world" openers

IMPORTANT: Do not remove or alter any markdown links (internal or external) that are already in the draft.

Return the full edited article, then append:

EDIT NOTES:
───────────
Banned words removed: [list or "none"]
Passive voice fixed: [n instances]
Tone flags resolved: [list or "none"]
Structural changes: [any section reordering or paragraph merges]
Remaining [VERIFY] flags: [n — these carry forward for human review]`;

export async function POST(req: NextRequest) {
  const { draft }: { draft: string } = await req.json();

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: EDITOR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Edit this article:\n\n${draft}` }],
    });

    const result = msg.content[0].type === 'text' ? msg.content[0].text : draft;

    const splitMarker = 'EDIT NOTES:';
    const splitIdx = result.lastIndexOf(splitMarker);
    const editedDraft = splitIdx > -1 ? result.slice(0, splitIdx).trim() : result;
    const editNotes = splitIdx > -1 ? result.slice(splitIdx).trim() : 'No edit notes generated.';

    return NextResponse.json({ draft: editedDraft, editNotes });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Editing failed' }, { status: 500 });
  }
}

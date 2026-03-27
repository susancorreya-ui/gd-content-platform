import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { isDomainApproved, isDomainBlocked, isGDLink, BLOCKED_DOMAINS_LIST } from '@/lib/sourceDomains';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface GDSource {
  title: string;
  url: string;
  description: string;
}

// Extract all markdown links [text](url) from article
function extractLinks(text: string): { anchor: string; url: string }[] {
  const results: { anchor: string; url: string }[] = [];
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    results.push({ anchor: match[1], url: match[2] });
  }
  return results;
}

// Check if a URL is live (HEAD request, fallback GET, 5s timeout)
async function checkUrl(url: string): Promise<'live' | 'dead' | 'unknown'> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'User-Agent': 'GroceryDoppio-ContentEngine/1.0' },
        redirect: 'follow',
      });
      clearTimeout(timeout);
      return res.ok || res.status === 405 ? 'live' : 'dead';
    } catch {
      clearTimeout(timeout);
      return 'unknown';
    }
  } catch {
    return 'unknown';
  }
}

export async function POST(req: NextRequest) {
  const { draft, gdSources }: { draft: string; gdSources: GDSource[] } = await req.json();

  // 1. Extract all links from the draft
  const links = extractLinks(draft);

  // 2. Categorise each link by domain and check if live (in parallel)
  const linkChecks = await Promise.all(
    links.map(async ({ anchor, url }) => {
      const blocked = isDomainBlocked(url);
      const approved = isDomainApproved(url);
      const gd = isGDLink(url);
      const status = blocked ? 'blocked' : await checkUrl(url);
      return { anchor, url, blocked, approved, gd, status };
    })
  );

  const blockedLinks = linkChecks.filter(l => l.blocked);
  const deadLinks = linkChecks.filter(l => !l.blocked && l.status === 'dead');
  const unknownLinks = linkChecks.filter(l => !l.blocked && l.status === 'unknown');
  const liveLinks = linkChecks.filter(l => !l.blocked && l.status === 'live');
  const unapprovedLinks = linkChecks.filter(l => !l.blocked && !l.approved && l.status !== 'dead');

  // 3. Claude reviews GD references for accuracy
  const gdPrompt = `You are a reference verification specialist for Grocery Doppio. Audit all Grocery Doppio references in this draft.

APPROVED GD SOURCES:
${gdSources.length > 0
    ? gdSources.map((s, i) => `${i + 1}. "${s.title}"\n   URL: ${s.url}\n   Content: ${s.description}`).join('\n\n')
    : '— No GD sources were used in research'}

BLOCKED COMPETITOR DOMAINS (must never appear as links): ${BLOCKED_DOMAINS_LIST}

YOUR TASKS:
1. Identify every Grocery Doppio reference (grocerydoppio.com URLs, "Incisiv research," "Grocery Doppio" citations)
2. Check each against the approved source list — flag any that don't match
3. Confirm correctly used references
4. Flag any reference to blocked competitor domains

Do NOT modify the article. Return only the GD reference section of the report.

GD REFERENCES AUDIT:
──────────────────────
CONFIRMED ✓:
[anchor text] → [url] — [reason confirmed]

FLAGGED ⚠:
[problematic text] — [issue] — [suggested fix]

MISSING OPPORTUNITIES:
[1–3 places a GD source could be added]

DRAFT:
${draft}`;

  let gdAudit = '';
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: gdPrompt }],
    });
    gdAudit = msg.content[0].type === 'text' ? msg.content[0].text : '';
  } catch {
    gdAudit = 'GD reference audit unavailable.';
  }

  // 4. Build set of URLs to strip (broken, blocked, unknown, unapproved)
  const stripUrls = new Set<string>([
    ...blockedLinks.map(l => l.url),
    ...deadLinks.map(l => l.url),
    ...unknownLinks.map(l => l.url),
    ...unapprovedLinks.map(l => l.url),
  ]);

  // 5. Clean the draft — replace bad links with plain anchor text
  const cleanedDraft = stripUrls.size > 0
    ? draft.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (match, anchor, url) =>
        stripUrls.has(url) ? anchor : match
      )
    : draft;

  const removedCount = stripUrls.size;

  // 6. Build verification report
  const verdict =
    blockedLinks.length > 0 || deadLinks.length > 0 ? 'FAIL' :
    unknownLinks.length > 0 || unapprovedLinks.length > 0 ? 'PASS WITH NOTES' :
    'PASS';

  const verificationReport = `REFERENCE VERIFICATION REPORT
──────────────────────────────
Total links found: ${links.length}
Live & approved: ${liveLinks.filter(l => l.approved).length}
Removed from article: ${removedCount}
  — Blocked competitor domains: ${blockedLinks.length}
  — Dead / unreachable: ${deadLinks.length}
  — Unknown / timed out: ${unknownLinks.length}
  — Unapproved domains: ${unapprovedLinks.length}

${blockedLinks.length > 0 ? `BLOCKED & REMOVED ✗ (competitor domain):
${blockedLinks.map(l => `  "${l.anchor}" — ${l.url}`).join('\n')}

` : ''}${deadLinks.length > 0 ? `DEAD & REMOVED ✗ (URL not reachable):
${deadLinks.map(l => `  "${l.anchor}" — ${l.url}`).join('\n')}

` : ''}${unknownLinks.length > 0 ? `REMOVED — COULD NOT VERIFY ⚠:
${unknownLinks.map(l => `  "${l.anchor}" — ${l.url}`).join('\n')}

` : ''}${unapprovedLinks.length > 0 ? `REMOVED — UNAPPROVED DOMAIN ⚠:
${unapprovedLinks.map(l => `  "${l.anchor}" — ${l.url}`).join('\n')}

` : ''}${liveLinks.filter(l => l.approved).length > 0 ? `KEPT — LIVE & APPROVED ✓:
${liveLinks.filter(l => l.approved).map(l => `  "${l.anchor}" — ${l.url}${l.gd ? ' (GD)' : ''}`).join('\n')}

` : ''}GD REFERENCE AUDIT:
${gdAudit}

Overall verdict: ${verdict}`;

  return NextResponse.json({ verificationReport, draft: cleanedDraft });
}

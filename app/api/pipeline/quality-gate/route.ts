import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface QualityReport {
  score: number;
  passed: boolean;
  checks: { name: string; passed: boolean; score: number; note: string }[];
  issues: string[];
  recommendation: string;
}

// Strip any appended pipeline reports from the draft before scoring
function extractArticleBody(draft: string): string {
  const reportMarkers = [
    'GD REFERENCES ADDED:',
    'GD REFERENCES AUDIT',
    'INTERNAL LINKS REPORT:',
    'FACT-CHECK REPORT:',
    'REFERENCE VERIFICATION REPORT',
    'SEO REPORT:',
    'EDIT NOTES:',
  ];
  let body = draft;
  for (const marker of reportMarkers) {
    const idx = body.indexOf(marker);
    if (idx !== -1) body = body.slice(0, idx);
  }
  return body.trim();
}

export async function POST(req: NextRequest) {
  const { draft, blogType }: { draft: string; blogType: string } = await req.json();

  const articleBody = extractArticleBody(draft);

  const prompt = `You are the quality gate for Grocery Doppio's content pipeline. Assess the article below and return a structured quality score as valid JSON.

SCORING RUBRIC (each check is worth up to 10 points):
1. Brand Voice (10pts) — human, bold, direct; no corporate fluff
2. Evidence Quality (10pts) — claims substantiated with credible sources
3. Structural Clarity (10pts) — clear argument; sections connect; strong conclusion
4. SEO Completeness (10pts) — title tag, meta description, URL slug present
5. GD Reference Quality (10pts) — Grocery Doppio sources referenced where relevant
6. Audience Relevance (10pts) — serves grocery executives, not a general audience
7. Originality of Angle (10pts) — takes a position; not just a summary
8. Readability & Flow (10pts) — transitions work; pacing holds
9. Internal Links (10pts) — 2–4 internal links with natural anchor text
10. Word Count Compliance (10pts) — within range for ${blogType} format

Pass threshold: 70/100.

Return ONLY this JSON object — no markdown fences, no extra text before or after:
{"score":82,"passed":true,"checks":[{"name":"Brand Voice","passed":true,"score":9,"note":"brief note"},{"name":"Evidence Quality","passed":true,"score":8,"note":"brief note"},{"name":"Structural Clarity","passed":true,"score":8,"note":"brief note"},{"name":"SEO Completeness","passed":true,"score":7,"note":"brief note"},{"name":"GD Reference Quality","passed":true,"score":8,"note":"brief note"},{"name":"Audience Relevance","passed":true,"score":9,"note":"brief note"},{"name":"Originality of Angle","passed":true,"score":9,"note":"brief note"},{"name":"Readability & Flow","passed":true,"score":8,"note":"brief note"},{"name":"Internal Links","passed":true,"score":8,"note":"brief note"},{"name":"Word Count Compliance","passed":true,"score":8,"note":"brief note"}],"issues":[],"recommendation":"One sentence verdict."}

ARTICLE:
${articleBody.slice(0, 5000)}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}';

    let report: QualityReport;
    try {
      // Extract JSON object robustly — find outermost { ... }
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON object found');
      report = JSON.parse(raw.slice(start, end + 1));
    } catch {
      report = {
        score: 0,
        passed: false,
        checks: [],
        issues: ['Quality gate parsing failed — manual review required'],
        recommendation: 'Unable to parse quality report. Please review manually.',
      };
    }

    return NextResponse.json({ report });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Quality gate failed' }, { status: 500 });
  }
}

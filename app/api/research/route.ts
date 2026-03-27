import { NextRequest, NextResponse } from 'next/server';
import { extractResearchInsights } from '@/lib/agents';

export async function POST(req: NextRequest) {
  try {
    const { rawText, fileName } = await req.json();

    if (!rawText || !fileName) {
      return NextResponse.json({ error: 'rawText and fileName are required' }, { status: 400 });
    }

    const insights = await extractResearchInsights(rawText, fileName);
    return NextResponse.json({ insights });
  } catch (err: unknown) {
    console.error('[research]', err);
    const message = err instanceof Error ? err.message : 'Extraction failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

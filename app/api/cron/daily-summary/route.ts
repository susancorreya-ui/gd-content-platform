import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getCachedDailySummary } from '@/app/api/daily-summary/route';

// Vercel calls this endpoint automatically at 11:00 AM UTC every day (see vercel.json).
// It also sends Authorization: Bearer <CRON_SECRET> — set CRON_SECRET in your Vercel env vars.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = new Date().toISOString().slice(0, 10);

  // Invalidate any stale cached summary, then generate and cache today's fresh one.
  revalidateTag('daily-summary');
  const entry = await getCachedDailySummary(date);

  return NextResponse.json({ ok: true, date, generatedAt: entry.generatedAt });
}

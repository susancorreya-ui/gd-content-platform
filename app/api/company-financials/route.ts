import { NextRequest, NextResponse } from 'next/server';

export interface CompanyFinancials {
  ticker: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  marketCap: number | null;
  peRatio: number | null;
  week52High: number | null;
  week52Low: number | null;
  revenue: number | null;
  eps: number | null;
  currency: string;
  shortName: string;
  exchange: string;
  lastUpdated: string;
}

function fmt(n: number | undefined | null): number | null {
  return n != null && isFinite(n) ? n : null;
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://finance.yahoo.com',
  'Referer': 'https://finance.yahoo.com/',
};

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker');
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

  try {
    // Step 1: get a crumb + cookie from Yahoo Finance
    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: BROWSER_HEADERS,
      next: { revalidate: 3600 },
    });

    let crumb = '';
    let cookieHeader = '';
    if (crumbRes.ok) {
      crumb = await crumbRes.text();
      const setCookie = crumbRes.headers.get('set-cookie');
      if (setCookie) {
        // extract just the cookie values (key=val pairs before first semicolons)
        cookieHeader = setCookie
          .split(',')
          .map(c => c.split(';')[0].trim())
          .join('; ');
      }
    }

    // Step 2: fetch quote data
    const quoteUrl = `https://query2.finance.yahoo.com/v8/finance/quote?symbols=${encodeURIComponent(ticker)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,marketCap,trailingPE,fiftyTwoWeekHigh,fiftyTwoWeekLow,totalRevenue,epsTrailingTwelveMonths,currency,shortName,fullExchangeName${crumb ? `&crumb=${encodeURIComponent(crumb)}` : ''}`;

    const res = await fetch(quoteUrl, {
      headers: {
        ...BROWSER_HEADERS,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      next: { revalidate: 900 },
    });

    if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`);

    const data = await res.json();
    const q = data?.quoteResponse?.result?.[0];
    if (!q) throw new Error('No quote data returned');

    const financials: CompanyFinancials = {
      ticker:     q.symbol || ticker,
      price:      fmt(q.regularMarketPrice),
      change:     fmt(q.regularMarketChange),
      changePct:  fmt(q.regularMarketChangePercent),
      marketCap:  fmt(q.marketCap),
      peRatio:    fmt(q.trailingPE),
      week52High: fmt(q.fiftyTwoWeekHigh),
      week52Low:  fmt(q.fiftyTwoWeekLow),
      revenue:    fmt(q.totalRevenue),
      eps:        fmt(q.epsTrailingTwelveMonths),
      currency:   q.currency || 'USD',
      shortName:  q.shortName || ticker,
      exchange:   q.fullExchangeName || '',
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(financials);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch financials' },
      { status: 500 }
    );
  }
}

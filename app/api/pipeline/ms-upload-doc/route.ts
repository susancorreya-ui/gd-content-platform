import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import mammoth from 'mammoth';

export const maxDuration = 30;

// pdf-parse v2 uses a non-standard class-based API — require at runtime
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: Record<string, unknown>) => { load: () => Promise<{ _pdfInfo?: { numPages: number }; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str: string }[] }> }> }> } };

async function extractPdf(buffer: Buffer): Promise<string> {
  const tmpPath = join(tmpdir(), `ms-upload-${Date.now()}.pdf`).replace(/\\/g, '/');
  writeFileSync(tmpPath, buffer);
  try {
    const parser = new PDFParse({ verbosity: 0, url: tmpPath });
    const doc = await parser.load();
    const numPages = doc._pdfInfo?.numPages ?? 0;
    const pages: string[] = [];
    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await doc.getPage(i);
        const tc = await page.getTextContent();
        pages.push(tc.items.map((item) => item.str).join(' '));
      } catch { /* skip page */ }
    }
    return pages.join('\n');
  } finally {
    try { unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name;
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    let text = '';

    if (ext === 'txt') {
      text = buffer.toString('utf-8');
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (ext === 'pdf') {
      text = await extractPdf(buffer);
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload PDF, DOCX, or TXT.' },
        { status: 400 },
      );
    }

    // Trim to 50k chars to stay within prompt limits
    return NextResponse.json({ name, text: text.slice(0, 50000) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export const maxDuration = 30;

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
      const data = await pdfParse(buffer);
      text = data.text ?? '';
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

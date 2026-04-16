import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';

    if (ext === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParseModule = await import('pdf-parse') as any;
      const pdfParse = pdfParseModule.default ?? pdfParseModule;
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (ext === 'docx' || ext === 'doc') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheets: string[] = [];
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        sheets.push(`Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(sheet)}`);
      });
      text = sheets.join('\n\n');
    } else if (ext === 'pptx') {
      // Basic pptx text extraction via xml parsing
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(buffer);
      const slideTexts: string[] = [];

      const slideFiles = Object.keys(zip.files).filter(
        (f) => f.startsWith('ppt/slides/slide') && f.endsWith('.xml')
      );

      for (const slideFile of slideFiles.sort()) {
        const content = await zip.files[slideFile].async('string');
        // Extract text between <a:t> tags
        const matches = content.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
        const slideText = matches
          .map((m) => m.replace(/<[^>]+>/g, ''))
          .join(' ');
        if (slideText.trim()) slideTexts.push(slideText);
      }

      text = slideTexts.join('\n\n');
    } else {
      text = buffer.toString('utf-8');
    }

    return NextResponse.json({ text: text.slice(0, 15000) });
  } catch (err: unknown) {
    console.error('[parse]', err);
    const message = err instanceof Error ? err.message : 'Parse failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

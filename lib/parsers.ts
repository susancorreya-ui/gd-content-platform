export async function parseDocument(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'txt' || ext === 'md') {
    return await file.text();
  }

  if (ext === 'csv') {
    const text = await file.text();
    return `CSV DATA from ${file.name}:\n\n${text.slice(0, 10000)}`;
  }

  // For PDF, DOCX, PPTX, XLSX — send to server-side parser
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/parse', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    if (res.status === 413) msg = 'File too large — please use a file under 4 MB';
    else {
      try { const e = await res.json(); msg = e.error || msg; } catch { /* plain-text error body */ }
    }
    throw new Error(msg);
  }

  const raw = await res.text();
  let data: { text?: string };
  try { data = JSON.parse(raw); } catch { throw new Error('Parser returned an unexpected response'); }
  return data.text ?? '';
}

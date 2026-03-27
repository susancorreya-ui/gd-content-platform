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
    const err = await res.json();
    throw new Error(err.error || 'Failed to parse document');
  }

  const data = await res.json();
  return data.text;
}

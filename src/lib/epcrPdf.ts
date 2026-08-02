const sectionNames: Record<string, string> = {
  call: 'Call Information', patient: 'Patient Information', complaint: 'Complaint', assessment: 'Assessment',
  vitals: 'Vitals', treatments: 'Treatments', billing: 'Billing Information', narrative: 'Narrative', signature: 'Signatures',
};

function label(key: string) {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function meaningful(value: unknown): boolean {
  if (value === null || value === undefined || value === '' || value === false) return false;
  if (Array.isArray(value)) return value.some(meaningful);
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(meaningful);
  return true;
}

function assessmentSummary(value: unknown): string {
  if (!value || typeof value !== 'object') return 'Physical assessment was not documented.';
  const findings: string[] = [];
  const walk = (node: unknown, path: string[]) => {
    if (!node || typeof node !== 'object') return;
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      if (['imageData', 'sourceFingerprint', 'selectedAssessmentRegions'].includes(key)) continue;
      const nextPath = [...path, key];
      if (typeof child === 'string' && child.trim() && !/^(normal|none|intact|unremarkable|no)$/i.test(child.trim())) {
        if (/finding|notes|description|laceration|injury|tenderness|deformity|burn|wound|pain|status/i.test(key)) {
          findings.push(`${nextPath.slice(-2).map(label).join(' – ')}: ${child.trim()}`);
        }
      } else if (typeof child === 'object') walk(child, nextPath);
    }
  };
  walk(value, []);
  const unique = [...new Set(findings)].slice(0, 12);
  return unique.length
    ? `${unique.join('; ')}. Remaining physical assessment is unremarkable.`
    : 'Physical assessment is unremarkable.';
}

function flatten(value: unknown, path: string[], lines: string[]) {
  if (!meaningful(value)) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, [...path, `#${index + 1}`], lines));
    return;
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (['imageData', 'sourceFingerprint', 'selectedAssessmentRegions', 'bodyMap', 'bodyRegions'].includes(key)) continue;
      flatten(child, [...path, key], lines);
    }
    return;
  }
  lines.push(`${path.map(label).join(' – ')}: ${String(value)}`);
}

function wrap(text: string, width = 92) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) current = word;
    else if (`${current} ${word}`.length <= width) current += ` ${word}`;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function escapePdf(text: string) {
  return text.replace(/[^\x20-\x7E]/g, (character) => character === '–' ? '-' : character === '’' ? "'" : '')
    .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function reportPdf(chart: Record<string, unknown>, reportNumber: string, patientDisplay: string) {
  const contentLines: { text: string; bold?: boolean; gap?: boolean }[] = [
    { text: 'ApolloEMS Patient Care Report', bold: true },
    { text: `Report: ${reportNumber}` },
    { text: `Patient: ${patientDisplay}` },
  ];
  for (const [sectionKey, value] of Object.entries(chart)) {
    if (!meaningful(value)) continue;
    contentLines.push({ text: sectionNames[sectionKey] ?? label(sectionKey), bold: true, gap: true });
    if (sectionKey === 'assessment') contentLines.push({ text: assessmentSummary(value) });
    const detail: string[] = [];
    flatten(value, [], detail);
    detail.forEach((text) => contentLines.push({ text }));
    if (sectionKey === 'signature') {
      const signature = value as Record<string, unknown>;
      if (signature.imageData) contentLines.push({ text: 'Clinician signature: Captured electronically' });
    }
  }

  const pages: string[][] = [[]];
  let used = 0;
  for (const item of contentLines) {
    if (item.gap) used += 1;
    for (const line of wrap(item.text, item.bold ? 74 : 92)) {
      if (used >= 48) { pages.push([]); used = 0; }
      pages.at(-1)!.push(`${item.bold ? 'B' : 'R'}|${line}`);
      used += item.bold ? 1.4 : 1;
    }
  }

  const objects: string[] = [];
  const add = (body: string) => { objects.push(body); return objects.length; };
  const catalogId = add('');
  const pagesId = add('');
  const regularFontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageIds: number[] = [];
  for (const page of pages) {
    const commands = ['BT', '54 756 Td'];
    let first = true;
    for (const encoded of page) {
      const [style, ...rest] = encoded.split('|');
      const line = rest.join('|');
      const size = style === 'B' ? 13 : 9;
      if (!first) commands.push(`0 -${style === 'B' ? 17 : 13} Td`);
      commands.push(`/${style === 'B' ? 'F2' : 'F1'} ${size} Tf (${escapePdf(line)}) Tj`);
      first = false;
    }
    commands.push('ET');
    const stream = commands.join('\n');
    const contentId = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let output = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => { offsets.push(Buffer.byteLength(output)); output += `${index + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, 'binary');
}

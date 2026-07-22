import { NextRequest, NextResponse } from 'next/server';
import { sendApolloEmail } from '@/lib/email';

const RECIPIENT = 'kira.holley@sscems.org';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

function pdfSafe(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapText(value: string, maxCharacters = 82) {
  const paragraphs = value.replace(/\r/g, '').split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxCharacters && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }

  return lines;
}

function createCheckRequestPdf(params: {
  employeeName: string;
  employeeEmail: string;
  amount: string;
  reason: string;
  submittedAt: Date;
  documentName: string;
}) {
  const contentLines = [
    { text: 'ApolloEMS Check Request', size: 18, bold: true },
    { text: '', size: 11, bold: false },
    { text: `Employee: ${params.employeeName}`, size: 11, bold: false },
    { text: `Company Email: ${params.employeeEmail}`, size: 11, bold: false },
    { text: `Amount Requested: $${params.amount}`, size: 11, bold: true },
    { text: `Submitted: ${params.submittedAt.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`, size: 11, bold: false },
    { text: `Supporting Document: ${params.documentName}`, size: 11, bold: false },
    { text: '', size: 11, bold: false },
    { text: 'Reason for Request:', size: 12, bold: true },
    ...wrapText(params.reason).map((text) => ({ text, size: 11, bold: false })),
  ];

  let y = 742;
  const commands = contentLines.map((line) => {
    const font = line.bold ? '/F2' : '/F1';
    const command = `BT ${font} ${line.size} Tf 54 ${y} Td (${pdfSafe(line.text)}) Tj ET`;
    y -= line.text ? 18 : 10;
    return command;
  }).join('\n');

  const stream = Buffer.from(commands, 'ascii');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${commands}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'ascii');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const employeeName = String(formData.get('employeeName') ?? '').trim();
    const employeeEmail = String(formData.get('employeeEmail') ?? '').trim();
    const amountValue = Number(String(formData.get('amount') ?? ''));
    const reason = String(formData.get('reason') ?? '').trim();
    const document = formData.get('document');

    if (!employeeName || !employeeEmail || !Number.isFinite(amountValue) || amountValue <= 0 || !reason) {
      return NextResponse.json({ error: 'Complete all required check request fields.' }, { status: 400 });
    }

    if (!(document instanceof File) || document.size === 0) {
      return NextResponse.json({ error: 'A supporting document is required.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(document.type)) {
      return NextResponse.json({ error: 'Only PDF, JPG, JPEG, and PNG files are allowed.' }, { status: 400 });
    }

    if (document.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Supporting document must be 10 MB or smaller.' }, { status: 400 });
    }

    const amount = amountValue.toFixed(2);
    const submittedAt = new Date();
    const requestPdf = createCheckRequestPdf({
      employeeName,
      employeeEmail,
      amount,
      reason,
      submittedAt,
      documentName: document.name,
    });
    const safeEmployeeName = employeeName.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Employee';

    await sendApolloEmail({
      to: RECIPIENT,
      subject: `Check Request - ${employeeName} - $${amount}`,
      text:
`A check request has been submitted through ApolloEMS.

Employee: ${employeeName}
Company Email: ${employeeEmail}
Amount Requested: $${amount}
Submitted: ${submittedAt.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}

Reason for Request:
${reason}

The completed request PDF and supporting document are attached.`,
      attachments: [
        { filename: `Check-Request-${safeEmployeeName}.pdf`, content: requestPdf },
        { filename: document.name, content: Buffer.from(await document.arrayBuffer()) },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Check request submission error:', error);
    return NextResponse.json({ error: 'Unable to submit check request. Please try again.' }, { status: 500 });
  }
}

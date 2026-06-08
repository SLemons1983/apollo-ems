import { NextRequest, NextResponse } from 'next/server';
import { sendApolloEmail } from '@/lib/email';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const employeeName = String(formData.get('employeeName') ?? '').trim();
    const phoneNumber = String(formData.get('phoneNumber') ?? '').trim();
    const companyEmail = String(formData.get('companyEmail') ?? '').trim();
    const certificationName = String(formData.get('certificationName') ?? '').trim();
    const file = formData.get('certificationFile');

    if (!employeeName || !phoneNumber || !companyEmail || !certificationName || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only PDF, JPG, JPEG, and PNG files are allowed.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Certification file must be 10 MB or smaller.' }, { status: 400 });
    }

    const content = Buffer.from(await file.arrayBuffer());

    await sendApolloEmail({
      to: 'certs@sscems.org',
      subject: `Certification Upload: ${certificationName} - ${employeeName}`,
      text:
`A certification has been uploaded through ApolloEMS.

Employee Name: ${employeeName}
Phone Number: ${phoneNumber}
Company Email: ${companyEmail}
Certification Name: ${certificationName}
Uploaded File: ${file.name}

Supervisor Instructions:
1. Verify certification validity.
2. Retain a hard copy for the employee file.
3. Update the employee certification records in the Employee Profile section of ApolloEMS.`,
      attachments: [
        {
          filename: file.name,
          content,
        },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Certification upload error:', error);
    return NextResponse.json({ error: 'Failed to submit certification.' }, { status: 500 });
  }
}

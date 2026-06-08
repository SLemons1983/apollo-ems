import { NextRequest, NextResponse } from 'next/server';
import { sendApolloEmail } from '@/lib/email';

const CATEGORY_RECIPIENTS: Record<string, string[]> = {
  'Check Request': ['kira.holley@sscems.org'],
  'Report Workplace Harassment and/or Violence': ['russ@sscems.org'],
  'Vehicle/Equipment/Station Issue': ['armando.gutierrez@sscems.org'],
};

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
    const category = String(formData.get('category') ?? '').trim();
    const supervisorNotified = String(formData.get('supervisorNotified') ?? '').trim();
    const supervisorName = String(formData.get('supervisorName') ?? '').trim();
    const narrative = String(formData.get('narrative') ?? '').trim();
    const file = formData.get('attachment');

    if (!employeeName || !phoneNumber || !companyEmail || !category || !supervisorNotified || !narrative) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const attachments: { filename: string; content: Buffer }[] = [];

    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json({ error: 'Only PDF, JPG, JPEG, and PNG files are allowed.' }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'Attachment must be 10 MB or smaller.' }, { status: 400 });
      }

      attachments.push({
        filename: file.name,
        content: Buffer.from(await file.arrayBuffer()),
      });
    }

    const recipients = Array.from(new Set([
      'supervisor@sscems.org',
      ...(CATEGORY_RECIPIENTS[category] ?? []),
    ]));

    await Promise.all(recipients.map((to) =>
      sendApolloEmail({
        to,
        subject: `Incident Report: ${category} - ${employeeName}`,
        text:
`An incident report has been submitted through ApolloEMS.

Employee Name: ${employeeName}
Phone Number: ${phoneNumber}
Company Email: ${companyEmail}
Category: ${category}
Supervisor Notified: ${supervisorNotified}
Supervisor Listed: ${supervisorName || 'Not listed'}
Assigned Supervisor: ${
  category === 'General Incident Report'
    ? supervisorName || 'On-duty supervisor'
    : 'Assigned by report category'
}

Narrative:
${narrative}

Supervisor Instructions:
1. Review the submitted incident report.
2. Follow up with the employee if more information is needed.
3. Document disposition and retain according to company policy.`,
        attachments,
      })
    ));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Incident report submission error:', error);
    return NextResponse.json({ error: 'Failed to submit incident report.' }, { status: 500 });
  }
}

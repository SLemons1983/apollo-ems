import { NextRequest, NextResponse } from 'next/server';
import { sendApolloEmail } from '@/lib/email';

const CERTIFICATION_REVIEW_EMAIL =
  process.env.CERTIFICATION_REVIEW_EMAIL?.trim() || 'certs@sscems.org';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

function makeSubmissionNumber() {
  const now = new Date();
  const date =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');

  const suffix = Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

  return `CERT-${date}-${suffix}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const employeeName = String(
      formData.get('employeeName') ?? '',
    ).trim();

    const employeeEmail = String(
      formData.get('employeeEmail') ?? '',
    )
      .trim()
      .toLowerCase();

    const certificationType = String(
      formData.get('certificationType') ?? '',
    ).trim();

    const note = String(formData.get('note') ?? '').trim();

    const file = formData.get('certification');

    if (
      !employeeName ||
      !employeeEmail ||
      !certificationType ||
      !(file instanceof File) ||
      file.size <= 0
    ) {
      return NextResponse.json(
        { error: 'Complete all required certification submission fields.' },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Certification must be a PDF, JPG, JPEG, or PNG file.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Certification file must be 10 MB or smaller.' },
        { status: 400 },
      );
    }

    const submissionNumber = makeSubmissionNumber();
    const submittedAt = new Date();

    const attachment = {
      filename: file.name,
      content: Buffer.from(await file.arrayBuffer()),
    };

    await sendApolloEmail({
      to: CERTIFICATION_REVIEW_EMAIL,
      subject: `Certification Submission — ${employeeName} — ${certificationType}`,
      text:
        `ApolloEMS Certification Submission\n\n` +
        `Submission: ${submissionNumber}\n` +
        `Employee: ${employeeName}\n` +
        `Employee Email: ${employeeEmail}\n` +
        `Certification: ${certificationType}\n` +
        `Submitted: ${submittedAt.toLocaleString('en-US')}\n` +
        `File: ${file.name}\n\n` +
        `Employee Note:\n${note || 'No note provided.'}\n\n` +
        `Please review the attached certification and update the employee's official ApolloEMS certification record if appropriate.`,
      attachments: [attachment],
    });

    try {
      await sendApolloEmail({
        to: employeeEmail,
        subject: `ApolloEMS Certification Received — ${submissionNumber}`,
        text:
          `Hello ${employeeName},\n\n` +
          `ApolloEMS received your certification submission.\n\n` +
          `Submission: ${submissionNumber}\n` +
          `Certification: ${certificationType}\n` +
          `File: ${file.name}\n` +
          `Submitted: ${submittedAt.toLocaleString('en-US')}\n\n` +
          `Your certification has been sent for supervisor review. Your official certification record will not change until the document has been reviewed and approved.\n\n` +
          `Please keep this submission number for your records.\n\n` +
          `ApolloEMS`,
      });
    } catch (confirmationError) {
      console.error(
        'Certification confirmation email failed:',
        confirmationError,
      );
    }

    return NextResponse.json({
      ok: true,
      submissionNumber,
    });
  } catch (error) {
    console.error('Certification submission error:', error);

    return NextResponse.json(
      {
        error:
          'ApolloEMS could not submit the certification. Please try again.',
      },
      { status: 500 },
    );
  }
}

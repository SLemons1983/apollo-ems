import { NextRequest, NextResponse } from 'next/server';
import { sendApolloEmail } from '@/lib/email';
import { requireSupervisorApi } from '@/lib/supervisorApi';

export async function POST(request: NextRequest) {
  try {
    const { db: admin } = await requireSupervisorApi(request);

    const form = await request.formData();
    const employeeId = String(form.get('employeeId') ?? '').trim();
    const employeeName = String(form.get('employeeName') ?? '').trim();
    const topic = String(form.get('topic') ?? '').trim();
    const classDate = String(form.get('classDate') ?? '').trim();
    const ceHours = String(form.get('ceHours') ?? '').trim();
    const certificate = form.get('certificate');

    if (!employeeId || !employeeName || !topic || !classDate || !(certificate instanceof File)) {
      return NextResponse.json({ error: 'Missing certificate email information.' }, { status: 400 });
    }
    if (certificate.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Certificate attachment must be a PDF.' }, { status: 400 });
    }
    if (certificate.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Certificate attachment is too large.' }, { status: 400 });
    }

    const { data: employee, error } = await admin.from('employees').select('email').eq('id', employeeId).single();
    if (error) throw error;

    const email = String(employee?.email ?? '').trim();
    if (!email) {
      return NextResponse.json({ error: `${employeeName} does not have an email address on their employee profile.` }, { status: 400 });
    }

    await sendApolloEmail({
      to: email,
      subject: `Continuing Education Certificate - ${topic}`,
      text: `Hello ${employeeName},

Your Sequoia Safety Council Continuing Education certificate is attached.

Course: ${topic}
Date completed: ${classDate}
CE hours: ${ceHours}

Please retain this certificate for your records.

Sequoia Safety Council`,
      attachments: [{
        filename: certificate.name || `CE-${classDate}.pdf`,
        content: Buffer.from(await certificate.arrayBuffer()),
      }],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('CE certificate email error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'SUPERVISOR_API_UNAUTHORIZED') {
      return NextResponse.json({ error: 'You must be signed in to email CE certificates.' }, { status: 401 });
    }
    if (message === 'SUPERVISOR_API_FORBIDDEN') {
      return NextResponse.json({ error: 'Supervisor authorization is required.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to email CE certificate.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sendApolloEmail } from '@/lib/email';
import { checkApiAccess } from '@/lib/supervisorApi';

export async function POST(request: NextRequest) {
  const access = await checkApiAccess(request, 'employee');
  if (access instanceof NextResponse) return access;

  try {
    const body = await request.json();

    const {
      to,
      senderName,
      subject,
      message,
      notificationType,
    } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 },
      );
    }

    // Only email people on the employee list, so this can't be used to send
    // ApolloEMS mail to arbitrary addresses.
    const requested: string[] = String(to)
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
    const { data: knownEmployees, error: employeesError } = await access.db
      .from('employees')
      .select('email');
    if (employeesError) throw employeesError;
    const known = new Set((knownEmployees ?? []).map((row) => String(row.email ?? '').trim().toLowerCase()));
    const recipients = requested.filter((email) => known.has(email.toLowerCase()));

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'Recipient is not an ApolloEMS employee.' },
        { status: 400 },
      );
    }

    const isScheduleNotification = notificationType === 'SCHEDULE';

    await sendApolloEmail({
      to: recipients.join(', '),
      subject: isScheduleNotification ? `ApolloEMS: ${subject}` : `Apollo Message: ${subject}`,
      text: isScheduleNotification
        ? `You received an ApolloEMS schedule notification.

${message}

View your schedule:
https://apolloems.org/dashboard`
        : `You received a new ApolloEMS message.

From: ${senderName}

Subject: ${subject}

Message:
${message}

Open ApolloEMS:
https://apolloems.org/dashboard`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Apollo email notification error:', error);

    return NextResponse.json(
      { error: 'Failed to send email notification.' },
      { status: 500 },
    );
  }
}

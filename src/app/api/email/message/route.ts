import { NextRequest, NextResponse } from 'next/server';
import { sendApolloEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      to,
      senderName,
      subject,
      message,
    } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 },
      );
    }

    await sendApolloEmail({
      to,
      subject: `Apollo Message: ${subject}`,
      text:
`You received a new ApolloEMS message.

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

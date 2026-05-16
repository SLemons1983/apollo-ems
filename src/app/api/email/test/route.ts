import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.APOLLO_EMAIL_FROM || 'ApolloEMS <onboarding@resend.dev>';
  const testEmail = process.env.APOLLO_EMAIL_TEST_TO;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing RESEND_API_KEY environment variable.' },
      { status: 500 },
    );
  }

  if (!testEmail) {
    return NextResponse.json(
      { error: 'Missing APOLLO_EMAIL_TEST_TO environment variable.' },
      { status: 500 },
    );
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [testEmail],
    subject: 'ApolloEMS email test',
    text: 'This is a test email from ApolloEMS. If you received this, email notifications are connected.',
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

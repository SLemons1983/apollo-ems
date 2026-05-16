import { Resend } from 'resend';

const FROM_EMAIL =
  process.env.APOLLO_EMAIL_FROM ||
  'ApolloEMS Notifications <notifications@apolloems.org>';

export async function sendApolloEmail(params: {
  to: string;
  subject: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable.');
  }

  const resend = new Resend(apiKey);

  return resend.emails.send({
    from: FROM_EMAIL,
    to: [params.to],
    subject: params.subject,
    text: params.text,
  });
}

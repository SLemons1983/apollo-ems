import { Resend } from 'resend';

const FROM_EMAIL =
  process.env.APOLLO_EMAIL_FROM ||
  'ApolloEMS Notifications <notifications@apolloems.org>';

export async function sendApolloEmail(params: {
  to: string;
  subject: string;
  text: string;
  attachments?: {
    filename: string;
    content: Buffer;
  }[];
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable.');
  }

  const resend = new Resend(apiKey);

  const recipients = params.to
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: recipients,
    subject: params.subject,
    text: params.text,
    attachments: params.attachments,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
}

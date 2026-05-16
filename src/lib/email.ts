import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.APOLLO_EMAIL_FROM ||
  'ApolloEMS Notifications <notifications@apolloems.org>';

export async function sendApolloEmail(params: {
  to: string;
  subject: string;
  text: string;
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: [params.to],
    subject: params.subject,
    text: params.text,
  });
}

import { Resend } from 'resend';
import { filterNonProductionRecipients } from './nonProductionSafety';
import { isProductionSupabaseProject } from './supabaseConfig';

const FROM_EMAIL =
  process.env.APOLLO_EMAIL_FROM ||
  'ApolloEMS Notifications <notifications@apolloems.org>';

const SUPPRESSED_ROUTINE_RECIPIENTS = new Set(['russ@sscems.com']);

export async function sendApolloEmail(params: {
  to: string;
  subject: string;
  text: string;
  attachments?: {
    filename: string;
    content: Buffer;
  }[];
  allowSuppressedRecipients?: boolean;
}) {
  const recipients = params.to
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
    .filter(
      (email) =>
        params.allowSuppressedRecipients ||
        !SUPPRESSED_ROUTINE_RECIPIENTS.has(email.toLowerCase()),
    );

  // Outside production, email only allowlisted test addresses
  // (APOLLO_NONPRODUCTION_EMAIL_ALLOWLIST), never real employees or customers.
  const deliverableRecipients = isProductionSupabaseProject
    ? recipients
    : filterNonProductionRecipients(recipients, process.env.APOLLO_NONPRODUCTION_EMAIL_ALLOWLIST);

  if (deliverableRecipients.length === 0) {
    if (!isProductionSupabaseProject && recipients.length > 0) {
      console.info(`Non-production email not sent (${recipients.length} recipient(s) not on the allowlist).`);
    }
    return { data: null, error: null, skipped: true };
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable.');
  }

  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: deliverableRecipients,
    subject: params.subject,
    text: params.text,
    attachments: params.attachments,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
}

import type { Metadata } from 'next';
import LegalPageShell from '@/components/LegalPageShell';

export const metadata: Metadata = {
  title: 'SMS Privacy Policy | ApolloEMS',
  description:
    'Privacy policy governing mobile information and consent for ApolloEMS operational SMS notifications.',
};

export default function SmsPrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="SMS notification program"
      title="SMS Privacy Policy"
      description="This policy applies specifically to mobile information and consent associated with ApolloEMS operational SMS notifications."
    >
      <p className="policy-date">Last updated: July 19, 2026</p>

      <section>
        <h2>1. Scope of this policy</h2>
        <p>
          This SMS Privacy Policy applies to the optional ApolloEMS SMS
          Notification Program operated by Steven Lemons as a sole proprietor.
          The program sends non-marketing operational notifications to
          authorized ApolloEMS users who affirmatively consent to receive them.
        </p>
      </section>

      <section>
        <h2>2. Mobile information collected</h2>
        <p>ApolloEMS may collect and maintain:</p>
        <ul>
          <li>The mobile number in the authorized user&apos;s employee profile.</li>
          <li>The user&apos;s selected SMS notification categories.</li>
          <li>The date, time, source, and version of the user&apos;s consent.</li>
          <li>Opt-out records and notification-preference changes.</li>
          <li>Message delivery status and related operational records.</li>
        </ul>
      </section>

      <section>
        <h2>3. How mobile information is used</h2>
        <p>
          Mobile information is used only to administer the ApolloEMS SMS
          Notification Program and send authorized workforce and operational
          notifications selected by the user. These may include company
          announcements, ApolloEMS message notifications, shift-request and
          shift-trade decisions, certification reminders, timecard
          notifications, and authorized supervisor messages.
        </p>
        <p>
          ApolloEMS does not use the SMS Notification Program for advertising,
          lead generation, or unrelated promotional marketing.
        </p>
      </section>

      <section>
        <h2>4. Mobile information is not shared for marketing</h2>
        <p>
          <strong>
            No mobile information will be shared with third parties or
            affiliates for marketing or promotional purposes.
          </strong>
        </p>
        <p>
          <strong>
            All categories described in this policy exclude text-messaging
            originator opt-in data and consent; this information will not be
            shared with any third parties.
          </strong>
        </p>
        <p>
          ApolloEMS does not sell, rent, trade, transfer, or otherwise provide
          mobile phone numbers or SMS consent information to third parties,
          affiliates, lead generators, or other organizations for their
          marketing or promotional use.
        </p>
      </section>

      <section>
        <h2>5. Message disclosures</h2>
        <p>
          ApolloEMS SMS messages may be recurring. Message frequency varies
          according to operational activity and the notification categories
          selected by the user. Message and data rates may apply.
        </p>
        <p>
          Recipients may reply <strong>STOP</strong> to unsubscribe or{' '}
          <strong>HELP</strong> for assistance. Consent is voluntary and is not
          a condition of using ApolloEMS or employment.
        </p>
      </section>

      <section>
        <h2>6. Retention and security</h2>
        <p>
          ApolloEMS retains SMS consent, preference, opt-out, and delivery
          records as reasonably necessary to operate the notification program,
          document compliance, prevent unwanted messages, and maintain
          security. ApolloEMS uses administrative and technical safeguards
          designed to protect this information.
        </p>
      </section>

      <section>
        <h2>7. User choices</h2>
        <p>
          Authorized users may select notification categories, update their
          preferences, or disable SMS notifications through ApolloEMS.
          Recipients may also opt out at any time by replying{' '}
          <strong>STOP</strong>.
        </p>
      </section>

      <section>
        <h2>8. Related terms</h2>
        <p>
          Additional program information is available in the{' '}
          <a href="/sms-terms">ApolloEMS SMS Terms and Conditions</a>. The
          documented enrollment workflow is available on the{' '}
          <a href="/sms-opt-in-process">SMS Opt-In Process</a> page.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          Questions about mobile privacy or the ApolloEMS SMS Notification
          Program may be sent to{' '}
          <a href="mailto:support@apolloems.org">
            support@apolloems.org
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}

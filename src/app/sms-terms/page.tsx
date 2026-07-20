import type { Metadata } from 'next';
import LegalPageShell from '@/components/LegalPageShell';

export const metadata: Metadata = {
  title: 'SMS Terms and Conditions | ApolloEMS',
  description:
    'Terms governing optional ApolloEMS operational SMS notifications.',
};

export default function SmsTermsPage() {
  return (
    <LegalPageShell
      eyebrow="SMS notification program"
      title="SMS Terms and Conditions"
      description="These terms govern optional operational text messages sent by ApolloEMS to authorized users."
    >
      <p className="policy-date">Last updated: July 18, 2026</p>

      <section>
        <h2>1. Program description</h2>
        <p>
          The ApolloEMS SMS Notification Program provides optional,
          non-marketing operational text messages to authorized ApolloEMS
          users who affirmatively consent to receive them.
        </p>
        <p>Messages may include:</p>
        <ul>
          <li>Company-announcement notifications.</li>
          <li>New ApolloEMS message notifications.</li>
          <li>Shift-request approval or denial notices.</li>
          <li>Shift-trade approval or denial notices.</li>
          <li>Certification-renewal reminders.</li>
          <li>Timecard-submission reminders.</li>
          <li>Timecard approval or correction notices.</li>
          <li>
            Operational messages sent by an authorized supervisor to selected
            employees or workforce groups.
          </li>
        </ul>
        <p>
          ApolloEMS SMS messages are not used for advertising or unrelated
          promotional marketing.
        </p>
      </section>

      <section>
        <h2>2. How users opt in</h2>
        <p>
          An authorized user opts in by signing in to ApolloEMS, reviewing the
          SMS disclosure, confirming the mobile number associated with the
          employee profile, and affirmatively enabling SMS notifications.
          Consent is recorded with the user, date, time, and applicable
          notification preferences.
        </p>
        <p>
          By opting in, the user confirms that the provided mobile number
          belongs to the user or that the user is authorized to receive
          messages at that number.
        </p>
        <p>
          Consent to receive SMS messages is voluntary and is not a condition
          of using ApolloEMS or employment. Operational information may remain
          available through ApolloEMS or other communication methods.
        </p>
      </section>

      <section>
        <h2>3. Message frequency</h2>
        <p>
          Message frequency varies based on scheduling activity, certification
          status, timecard deadlines, company announcements, supervisor
          communications, and the user&apos;s selected notification
          preferences. Messages may be recurring.
        </p>
      </section>

      <section>
        <h2>4. Message and data rates</h2>
        <p>
          Message and data rates may apply according to the recipient&apos;s
          mobile-service plan. ApolloEMS does not charge recipients a separate
          fee for participating in the SMS Notification Program.
        </p>
      </section>

      <section>
        <h2>5. Opting out</h2>
        <p>
          Recipients may opt out at any time by replying{' '}
          <strong>STOP</strong> to an ApolloEMS text message. After opting out,
          the recipient will receive a confirmation and no further ApolloEMS
          SMS messages will be sent unless the recipient later opts in again.
        </p>
        <p>
          Where supported, replying <strong>START</strong> may restore SMS
          notifications after an opt-out. Users may also update SMS preferences
          inside ApolloEMS.
        </p>
      </section>

      <section>
        <h2>6. Help and support</h2>
        <p>
          Reply <strong>HELP</strong> for assistance. Users may also contact{' '}
          <a href="mailto:support@apolloems.org">
            support@apolloems.org
          </a>
          .
        </p>
        <p>
          The ApolloEMS sending number is intended for automated notifications
          and is not continuously monitored for ordinary replies. Employees
          should use ApolloEMS messaging or their organization&apos;s approved
          communication process for operational responses.
        </p>
      </section>

      <section>
        <h2>7. Privacy</h2>
        <p>
          <strong>
            ApolloEMS does not share, sell, rent, or otherwise provide mobile
            phone numbers or messaging consent information to any third parties
            or affiliates for marketing or promotional purposes.
          </strong>
        </p>
        <p>
          All information-sharing categories described in the ApolloEMS Privacy
          Policy exclude text-messaging originator opt-in data and consent. This
          information will not be shared with any third parties or affiliates
          for marketing or promotional purposes.
        </p>
        <p>
          Additional information is available in the{' '}
          <a href="/sms-privacy">ApolloEMS SMS Privacy Policy</a>.
        </p>
      </section>

      <section>
        <h2>8. Appropriate message content</h2>
        <p>
          The SMS program is intended for workforce and operational
          notifications. Authorized supervisors must not include protected
          patient information, clinical details, passwords, payment-card
          information, or other highly sensitive information in SMS messages.
          When more detail is necessary, the SMS should direct the recipient to
          sign in to ApolloEMS or use another authorized secure method.
        </p>
      </section>

      <section>
        <h2>9. Delivery and availability</h2>
        <p>
          Message delivery is subject to wireless-carrier availability,
          network conditions, device settings, number validity, and other
          factors outside ApolloEMS&apos;s control. Delivery is not guaranteed.
          Wireless carriers are not responsible for delayed or undelivered
          messages.
        </p>
      </section>

      <section>
        <h2>10. Changes to the program or terms</h2>
        <p>
          ApolloEMS may modify or discontinue the SMS Notification Program and
          may update these terms. Updated terms will be posted on this page
          with a revised effective date.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          Questions about the ApolloEMS SMS Notification Program may be sent to{' '}
          <a href="mailto:support@apolloems.org">
            support@apolloems.org
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}

import type { Metadata } from 'next';
import Image from 'next/image';
import LegalPageShell from '@/components/LegalPageShell';

export const metadata: Metadata = {
  title: 'SMS Opt-In Process | ApolloEMS',
  description:
    'Documentation of the affirmative employee opt-in process for ApolloEMS operational SMS notifications.',
};

export default function SmsOptInProcessPage() {
  return (
    <LegalPageShell
      eyebrow="SMS compliance documentation"
      title="ApolloEMS SMS Opt-In Process"
      description="This page documents how authorized ApolloEMS users affirmatively consent to receive operational SMS notifications."
    >
      <p className="policy-date">Process documented: July 18, 2026</p>

      <section>
        <h2>1. Authorized users sign in</h2>
        <p>
          ApolloEMS SMS enrollment is available only to authorized users with
          an active ApolloEMS account. The user signs in at{' '}
          <a href="https://apolloems.org/login">
            https://apolloems.org/login
          </a>{' '}
          and opens the SMS Notifications card from the employee dashboard.
        </p>
        <p>
          ApolloEMS does not request SMS consent through an unsolicited text
          message. Consent is collected through the authenticated dashboard.
        </p>
      </section>

      <section>
        <h2>2. The employee reviews the mobile number</h2>
        <p>
          The SMS card displays the mobile number maintained in the
          employee&apos;s authorized profile. The number is read-only in the
          consent interface. If it is missing or incorrect, the employee must
          contact an authorized supervisor to update the employee profile before
          providing SMS consent.
        </p>
      </section>

      <section>
        <h2>3. The employee selects notification categories</h2>
        <p>The employee may select operational categories including:</p>
        <ul>
          <li>Company announcements.</li>
          <li>ApolloEMS message-received notifications.</li>
          <li>Shift-request approval or denial notices.</li>
          <li>Shift-trade approval or denial notices.</li>
          <li>Certification-renewal reminders.</li>
          <li>Timecard reminders, approvals, and correction notices.</li>
          <li>Operational messages sent by authorized supervisors.</li>
        </ul>
      </section>

      <section>
        <h2>4. Affirmative consent is required</h2>
        <p>
          Before enrollment, the employee is shown the complete SMS disclosure,
          message categories, varying message-frequency notice, message-and-data
          rate disclosure, STOP and HELP instructions, and links to the public{' '}
          <a href="/sms-terms">SMS Terms and Conditions</a> and{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>
        <p>
          The consent checkbox is unchecked by default. The Enable SMS
          Notifications button remains disabled until the employee
          affirmatively checks the consent box. Consent is voluntary and is not
          a condition of using ApolloEMS or employment.
        </p>
        <p>
          <strong>
            ApolloEMS does not share, sell, rent, or otherwise provide mobile
            phone numbers or messaging consent information to any third parties
            or affiliates for marketing or promotional purposes.
          </strong>
        </p>

        <figure className="mt-5 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
          <Image
            src="/sms-compliance/sms-opt-in.png"
            alt="ApolloEMS SMS notification category selection and affirmative opt-in disclosure"
            width={1000}
            height={777}
            className="h-auto w-full"
            unoptimized
          />
          <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            ApolloEMS SMS enrollment before consent. The mobile number has been
            redacted for this public documentation.
          </figcaption>
        </figure>
      </section>

      <section>
        <h2>5. ApolloEMS records the consent</h2>
        <p>
          When the employee enables SMS notifications, ApolloEMS records the
          employee identifier, authorized mobile number in E.164 format,
          selected notification categories, consent timestamp, disclosure
          version, and consent source. If the profile mobile number later
          changes, ApolloEMS suspends eligibility for SMS delivery until the
          employee reviews the disclosure and authorizes the new number.
        </p>

        <figure className="mt-5 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
          <Image
            src="/sms-compliance/sms-enabled.png"
            alt="ApolloEMS SMS notifications enabled with recorded consent date and selected categories"
            width={1000}
            height={616}
            className="h-auto w-full"
            unoptimized
          />
          <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            ApolloEMS enabled state showing the recorded consent date and
            selected notification categories. The mobile number has been
            redacted for this public documentation.
          </figcaption>
        </figure>
      </section>

      <section>
        <h2>6. Opt-out process</h2>
        <p>
          An enrolled employee may disable SMS notifications through the same
          dashboard card at any time. Recipients may also reply{' '}
          <strong>STOP</strong> to an ApolloEMS SMS message. ApolloEMS records
          the opt-out time and source and suppresses future SMS delivery unless
          the recipient later opts in again. Recipients may reply{' '}
          <strong>HELP</strong> for assistance.
        </p>
      </section>

      <section>
        <h2>7. Support</h2>
        <p>
          Questions about SMS enrollment or the ApolloEMS notification program
          may be sent to{' '}
          <a href="mailto:support@apolloems.org">
            support@apolloems.org
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}

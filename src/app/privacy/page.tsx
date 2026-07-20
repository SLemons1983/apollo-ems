import type { Metadata } from 'next';
import LegalPageShell from '@/components/LegalPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy | ApolloEMS',
  description:
    'Learn how ApolloEMS collects, uses, protects, and shares information, including mobile phone information used for SMS notifications.',
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Legal and privacy"
      title="Privacy Policy"
      description="This policy explains how ApolloEMS handles account, workforce, operational, and SMS notification information."
    >
      <p className="policy-date">Last updated: July 18, 2026</p>

      <section>
        <h2>1. About ApolloEMS</h2>
        <p>
          ApolloEMS is an EMS workforce-management software service operated by
          Steven Lemons as a sole proprietor. ApolloEMS helps authorized
          organizations and their personnel manage scheduling, company
          communications, employee records, certifications, timecards,
          operational documentation, and related workforce functions.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <p>
          The information ApolloEMS processes depends on the features used and
          may include:
        </p>
        <ul>
          <li>
            Account information such as name, company email address, role, job
            title, and authentication identifiers.
          </li>
          <li>
            Employee profile information such as phone number, employment
            status, scope of practice, seniority, and certification records.
          </li>
          <li>
            Scheduling, shift-request, shift-trade, timecard, payroll-review,
            and attendance-related information.
          </li>
          <li>
            Messages, announcements, incident reports, inspection records, and
            other information entered into authorized ApolloEMS features.
          </li>
          <li>
            Technical information necessary to operate and secure the service,
            such as authentication events, device or browser information,
            timestamps, and system logs.
          </li>
          <li>
            SMS preferences, consent records, opt-out records, message status,
            and delivery information.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How information is used</h2>
        <p>ApolloEMS uses information to:</p>
        <ul>
          <li>Provide and maintain authorized ApolloEMS services.</li>
          <li>
            Authenticate users and apply role-based access and security
            controls.
          </li>
          <li>
            Support scheduling, workforce communication, certification,
            timecard, and operational workflows.
          </li>
          <li>
            Deliver requested account and operational notifications by
            application message, email, or SMS.
          </li>
          <li>
            Monitor delivery, troubleshoot failures, prevent misuse, and
            improve reliability.
          </li>
          <li>
            Meet applicable legal, security, recordkeeping, and compliance
            obligations.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Mobile information and SMS privacy</h2>
        <p>
          Mobile phone numbers are used only for ApolloEMS account,
          workforce, scheduling, certification, timecard, announcement, and
          other authorized operational notifications.
        </p>
        <p>
          <strong>
            ApolloEMS does not share, sell, rent, or otherwise provide mobile
            phone numbers or messaging consent information to any third parties
            or affiliates for marketing or promotional purposes.
          </strong>
        </p>
        <p>
          All information-sharing categories described in this Privacy Policy
          exclude text-messaging originator opt-in data and consent. This
          information will not be shared with any third parties or affiliates
          for marketing or promotional purposes.
        </p>
        <p>
          ApolloEMS SMS messages may be recurring. Message frequency varies
          based on the notifications selected by the user and operational
          activity. Message and data rates may apply. Recipients may reply{' '}
          <strong>STOP</strong> to unsubscribe or <strong>HELP</strong> for
          assistance.
        </p>
        <p>
          Additional mobile-specific information is available in the{' '}
          <a href="/sms-privacy">ApolloEMS SMS Privacy Policy</a>.
        </p>
      </section>

      <section>
        <h2>5. Service providers</h2>
        <p>
          ApolloEMS uses service providers for functions such as hosting,
          database services, authentication, email delivery, SMS delivery,
          storage, monitoring, and security. These providers receive only the
          information reasonably necessary to perform their services and are
          prohibited from using information received from ApolloEMS for their
          own marketing or promotional purposes. The SMS-specific restrictions
          in Section 4 apply regardless of anything else stated in this policy.
        </p>
      </section>

      <section>
        <h2>6. Information sharing</h2>
        <p>
          Subject to the SMS-specific restrictions in Section 4, ApolloEMS may
          share non-SMS information:
        </p>
        <ul>
          <li>
            With the authorized organization that manages the user&apos;s
            ApolloEMS account and its authorized supervisors or administrators.
          </li>
          <li>
            With service providers acting on ApolloEMS&apos;s behalf.
          </li>
          <li>
            When reasonably necessary to protect users, ApolloEMS, another
            person, or the security and integrity of the service.
          </li>
          <li>
            When required by law, legal process, or a valid governmental
            request.
          </li>
          <li>
            In connection with a merger, acquisition, financing, sale, or
            transfer of the ApolloEMS service, subject to appropriate privacy
            protections.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Data retention</h2>
        <p>
          ApolloEMS retains information for as long as reasonably necessary to
          provide the service, support authorized organizational records,
          maintain security and audit history, resolve disputes, and meet legal
          obligations. Retention periods may vary by record type and the
          requirements of the organization using ApolloEMS.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          ApolloEMS uses administrative, technical, and organizational
          safeguards designed to protect information. No internet-based system
          can guarantee absolute security, and users must protect their account
          credentials and promptly report suspected unauthorized access.
        </p>
      </section>

      <section>
        <h2>9. Your choices</h2>
        <p>
          Authorized users may review or update certain profile information
          through ApolloEMS or by contacting an authorized supervisor or
          administrator. SMS recipients may opt out of text notifications at
          any time by replying <strong>STOP</strong>. Replying{' '}
          <strong>START</strong> may restore messages after a previous opt-out,
          where supported.
        </p>
      </section>

      <section>
        <h2>10. Policy updates</h2>
        <p>
          ApolloEMS may update this policy as services or legal requirements
          change. The revised policy will be posted on this page with an
          updated effective date.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          Questions about this policy or ApolloEMS privacy practices may be
          sent to{' '}
          <a href="mailto:support@apolloems.org">
            support@apolloems.org
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}

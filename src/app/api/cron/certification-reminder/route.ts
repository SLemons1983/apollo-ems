import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendApolloEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = 'https://xyrusrspvyuwpplhhett.supabase.co';
const DAY_MS = 24 * 60 * 60 * 1000;

const REMINDER_DAYS = new Set([90, 30, 23, 16, 14, 9, 2]);

type CertificationField =
  | 'driversLicense'
  | 'ambulanceDriversLicense'
  | 'ahaBlsCpr'
  | 'medicalExaminerCertificate'
  | 'annualTbScreen'
  | 'californiaParamedicLicense'
  | 'ccemsaParamedicLicense'
  | 'acls'
  | 'pals'
  | 'californiaEmtLicense'
  | 'ccemsaEmtLicense';

type EmployeeRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  scope: string | null;
  status: string | null;
  certifications: Record<string, unknown> | null;
};

type CertificationReminder = {
  label: string;
  expirationDate: string;
  daysRemaining: number;
};

function getUtcDateKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function getDaysRemaining(expirationDate: string, todayUtc: number): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expirationDate)) {
    return null;
  }

  const [year, month, day] = expirationDate.split('-').map(Number);
  const expirationUtc = Date.UTC(year, month - 1, day);

  if (Number.isNaN(expirationUtc)) {
    return null;
  }

  return Math.round((expirationUtc - todayUtc) / DAY_MS);
}

function formatExpirationDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function getEmployeeName(employee: EmployeeRow): string {
  return [employee.first_name, employee.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Employee';
}

function getRequiredCertificationFields(
  scope: string | null,
): Array<[CertificationField, string]> {
  const commonFields: Array<[CertificationField, string]> = [
    ['driversLicense', "Driver's License"],
    ['ambulanceDriversLicense', "Ambulance Driver's License"],
    ['ahaBlsCpr', 'AHA BLS CPR'],
    ['medicalExaminerCertificate', 'Medical Examiner Certificate'],
  ];

  if (scope === 'ALS') {
    return [
      ...commonFields,
      ['californiaParamedicLicense', 'California Paramedic License'],
      ['ccemsaParamedicLicense', 'CCEMSA Paramedic License'],
      ['acls', 'ACLS'],
      ['pals', 'PALS'],
    ];
  }

  return [
    ...commonFields,
    ['californiaEmtLicense', 'California EMT License'],
    ['ccemsaEmtLicense', 'CCEMSA EMT License'],
  ];
}

function getReminderMessage(
  employeeName: string,
  reminders: CertificationReminder[],
): string {
  const certificationLines = reminders
    .map((reminder) => {
      return [
        `${reminder.label}`,
        `Expiration date: ${formatExpirationDate(reminder.expirationDate)}`,
        `Days remaining: ${reminder.daysRemaining}`,
      ].join('\n');
    })
    .join('\n\n');

  return `Hello ${employeeName},

This is an automated ApolloEMS certification expiration reminder.

The following certification${reminders.length === 1 ? ' is' : 's are'} approaching expiration:

${certificationLines}

Please submit your renewed certification documentation as soon as it becomes available so your employee certification record can be updated.

If you have already renewed the certification, please provide the updated documentation to your supervisor.

ApolloEMS
https://apolloems.org/dashboard`;
}

export async function GET(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!serviceRoleKey || !cronSecret) {
    return NextResponse.json(
      { error: 'Server configuration missing.' },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  const supabase = createClient(SUPABASE_URL, serviceRoleKey);

  const { data, error } = await supabase
    .from('employees')
    .select(
      'id,first_name,last_name,email,scope,status,certifications',
    );

  if (error) {
    console.error('Failed to load employees for certification reminders:', error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  const employees = (data ?? []) as EmployeeRow[];

  let emailsSent = 0;
  let employeesSkipped = 0;
  const failures: Array<{
    employeeId: string;
    error: string;
  }> = [];

  for (const employee of employees) {
    const email = employee.email?.trim();

    if (!email || employee.status === 'Inactive') {
      employeesSkipped += 1;
      continue;
    }

    const certifications =
      employee.certifications &&
      typeof employee.certifications === 'object'
        ? employee.certifications
        : {};

    const reminders: CertificationReminder[] = [];

    for (const [field, label] of getRequiredCertificationFields(employee.scope)) {
      const expirationDate = certifications[field];

      if (typeof expirationDate !== 'string' || !expirationDate) {
        continue;
      }

      const daysRemaining = getDaysRemaining(expirationDate, todayUtc);

      if (
        daysRemaining === null ||
        !REMINDER_DAYS.has(daysRemaining)
      ) {
        continue;
      }

      reminders.push({
        label,
        expirationDate,
        daysRemaining,
      });
    }

    if (reminders.length === 0) {
      continue;
    }

    const employeeName = getEmployeeName(employee);
    const nearestExpiration = Math.min(
      ...reminders.map((reminder) => reminder.daysRemaining),
    );

    try {
      await sendApolloEmail({
        to: email,
        subject:
          reminders.length === 1
            ? `Certification expires in ${nearestExpiration} days`
            : `${reminders.length} certifications approaching expiration`,
        text: getReminderMessage(employeeName, reminders),
      });

      emailsSent += 1;
    } catch (sendError) {
      console.error(
        `Failed to send certification reminder to employee ${employee.id}:`,
        sendError,
      );

      failures.push({
        employeeId: employee.id,
        error:
          sendError instanceof Error
            ? sendError.message
            : 'Unknown email error',
      });
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    runDate: getUtcDateKey(now),
    reminderDays: Array.from(REMINDER_DAYS),
    employeesChecked: employees.length,
    employeesSkipped,
    emailsSent,
    failures,
  });
}

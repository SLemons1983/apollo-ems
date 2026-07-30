import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://xyrusrspvyuwpplhhett.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU';

const RECIPIENT_MODES = new Set([
  'INDIVIDUAL',
  'ALL_ACTIVE',
  'ALL_ON_DUTY',
  'FULL_TIME',
  'PER_DIEM',
  'PARAMEDICS',
  'EMTS',
  'FULL_TIME_PARAMEDICS',
  'FULL_TIME_EMTS',
  'PER_DIEM_PARAMEDICS',
  'PER_DIEM_EMTS',
  'SUPERVISORS',
]);

type EmployeeRow = {
  id: string;
  email: string | null;
  role: string;
  scope: string;
  employee_type: string;
  status: string;
};

type SmsPreferenceRow = {
  employee_id: string;
  employee_email: string;
  phone_e164: string;
};

type ScheduleRow = {
  date_key: string;
  shift_key: string;
  shift_label: string;
  employee_id: string | null;
  start_time: string;
  end_time: string;
  held_over: boolean | null;
  shift_type: string | null;
};

function addDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function getPacificNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';

  return {
    dateKey: `${part('year')}-${part('month')}-${part('day')}`,
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
}

function isOnDuty(row: ScheduleRow, nowDateKey: string, nowMinutes: number) {
  const excluded = `${row.shift_key} ${row.shift_label} ${row.shift_type ?? ''}`
    .trim()
    .toLowerCase();
  if (['sick', 'vacation', 'leave'].some((value) => excluded.includes(value))) {
    return false;
  }

  const startMinutes = timeToMinutes(row.start_time);
  const endMinutes = timeToMinutes(row.end_time);
  const isStandardTwentyFourHourShift = ['R1', 'R2', 'P', 'OC'].includes(
    row.shift_key,
  );
  const endDateKey =
    endMinutes <= startMinutes ||
    (isStandardTwentyFourHourShift && row.held_over && endMinutes > startMinutes)
      ? addDays(row.date_key, 1)
      : row.date_key;

  const afterStart =
    nowDateKey > row.date_key ||
    (nowDateKey === row.date_key && nowMinutes >= startMinutes);
  const beforeEnd =
    nowDateKey < endDateKey ||
    (nowDateKey === endDateKey && nowMinutes < endMinutes);

  return afterStart && beforeEnd;
}

function matchesMode(employee: EmployeeRow, mode: string) {
  const employeeType = employee.employee_type.toLowerCase();
  const isFullTime = employeeType.includes('full');
  const isPerDiem = employeeType.includes('per');
  const isParamedic = employee.role === 'Paramedic' || employee.scope === 'ALS';
  const isEmt = employee.role === 'EMT' || employee.scope === 'BLS';

  if (mode === 'FULL_TIME') return isFullTime;
  if (mode === 'PER_DIEM') return isPerDiem;
  if (mode === 'PARAMEDICS') return isParamedic;
  if (mode === 'EMTS') return isEmt;
  if (mode === 'FULL_TIME_PARAMEDICS') return isFullTime && isParamedic;
  if (mode === 'FULL_TIME_EMTS') return isFullTime && isEmt;
  if (mode === 'PER_DIEM_PARAMEDICS') return isPerDiem && isParamedic;
  if (mode === 'PER_DIEM_EMTS') return isPerDiem && isEmt;
  if (mode === 'SUPERVISORS') return employee.role === 'Supervisor';
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') ?? '';
    const accessToken = authorization.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : '';
    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    const userEmail = userData.user?.email?.trim().toLowerCase() ?? '';
    if (userError || !userData.user || !userEmail) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const { data: authorized, error: authorizationError } = await supabase.rpc(
      'is_authorized_sms_supervisor',
    );
    if (authorizationError || authorized !== true) {
      return NextResponse.json({ error: 'Supervisor authorization required.' }, { status: 403 });
    }

    const { recipientMode, recipientEmployeeId, messageBody } = await request.json();
    const mode = typeof recipientMode === 'string' ? recipientMode : '';
    const body = typeof messageBody === 'string' ? messageBody.trim() : '';
    if (!RECIPIENT_MODES.has(mode) || !body || body.length > 480) {
      return NextResponse.json({ error: 'Invalid SMS request.' }, { status: 400 });
    }
    if (mode === 'INDIVIDUAL' && typeof recipientEmployeeId !== 'string') {
      return NextResponse.json({ error: 'Select an employee.' }, { status: 400 });
    }

    const { data: sender, error: senderError } = await supabase
      .from('employees')
      .select('id,email')
      .ilike('email', userEmail)
      .single();
    if (senderError || !sender) {
      return NextResponse.json({ error: 'Supervisor employee record not found.' }, { status: 403 });
    }

    const [{ data: employees, error: employeesError }, { data: preferences, error: preferencesError }] =
      await Promise.all([
        supabase
          .from('employees')
          .select('id,email,role,scope,employee_type,status')
          .ilike('status', 'Active'),
        supabase
          .from('employee_sms_preferences')
          .select('employee_id,employee_email,phone_e164')
          .eq('sms_enabled', true)
          .eq('notify_supervisor_messages', true)
          .not('consented_at', 'is', null)
          .is('opted_out_at', null),
      ]);
    if (employeesError || preferencesError) {
      throw employeesError ?? preferencesError;
    }

    const activeEmployees = (employees ?? []) as EmployeeRow[];
    let permittedEmployeeIds: Set<string> | null = null;

    if (mode === 'ALL_ON_DUTY') {
      const now = getPacificNow();
      const { data: schedule, error: scheduleError } = await supabase
        .from('schedule_assignments')
        .select('date_key,shift_key,shift_label,employee_id,start_time,end_time,held_over,shift_type')
        .in('date_key', [addDays(now.dateKey, -1), now.dateKey])
        .eq('is_open_slot', false)
        .not('employee_id', 'is', null);
      if (scheduleError) throw scheduleError;

      permittedEmployeeIds = new Set(
        ((schedule ?? []) as ScheduleRow[])
          .filter((row) => isOnDuty(row, now.dateKey, now.minutes))
          .flatMap((row) => (row.employee_id ? [row.employee_id] : [])),
      );
    }

    const employeeById = new Map(activeEmployees.map((employee) => [employee.id, employee]));
    const recipients = ((preferences ?? []) as SmsPreferenceRow[]).filter((preference) => {
      const employee = employeeById.get(preference.employee_id);
      if (!employee) return false;
      if (mode === 'INDIVIDUAL') return employee.id === recipientEmployeeId;
      if (mode === 'ALL_ON_DUTY') return permittedEmployeeIds?.has(employee.id) === true;
      return matchesMode(employee, mode);
    });

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No consented, SMS-enabled recipients were found.' },
        { status: 400 },
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    if (!accountSid || !authToken || !messagingServiceSid) {
      return NextResponse.json({ error: 'SMS delivery is not configured.' }, { status: 503 });
    }

    const results = [];
    for (const recipient of recipients) {
      let status: 'SENT' | 'FAILED' = 'FAILED';
      let messageSid: string | null = null;
      let errorCode: string | null = null;
      let errorMessage: string | null = null;

      try {
        const form = new URLSearchParams({
          To: recipient.phone_e164,
          MessagingServiceSid: messagingServiceSid,
          Body: body,
        });
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: form,
            cache: 'no-store',
          },
        );
        const twilioResult = await twilioResponse.json();
        if (!twilioResponse.ok) {
          errorCode = twilioResult.code ? String(twilioResult.code) : null;
          errorMessage = twilioResult.message ?? 'Twilio rejected the message.';
        } else {
          status = 'SENT';
          messageSid = twilioResult.sid ?? null;
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Twilio request failed.';
      }

      const { error: auditError } = await supabase.from('sms_notification_audit').insert({
        sent_by_employee_id: sender.id,
        sent_by_email: userEmail,
        recipient_employee_id: recipient.employee_id,
        recipient_email: recipient.employee_email,
        recipient_phone_e164: recipient.phone_e164,
        recipient_mode: mode,
        message_body: body,
        delivery_status: status,
        twilio_message_sid: messageSid,
        error_code: errorCode,
        error_message: errorMessage,
      });
      if (auditError) console.error('Failed to save SMS audit record:', auditError);

      results.push({ employeeId: recipient.employee_id, status });
    }

    return NextResponse.json({
      ok: true,
      sent: results.filter((result) => result.status === 'SENT').length,
      failed: results.filter((result) => result.status === 'FAILED').length,
    });
  } catch (error) {
    console.error('SMS delivery error:', error);
    return NextResponse.json({ error: 'Failed to send SMS notification.' }, { status: 500 });
  }
}

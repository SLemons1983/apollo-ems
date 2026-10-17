'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { EmployeeOption } from './shared';

type SmsRecipientMode =
  | 'INDIVIDUAL'
  | 'ALL_ACTIVE'
  | 'ALL_ON_DUTY'
  | 'FULL_TIME'
  | 'PER_DIEM'
  | 'PARAMEDICS'
  | 'EMTS'
  | 'FULL_TIME_PARAMEDICS'
  | 'FULL_TIME_EMTS'
  | 'PER_DIEM_PARAMEDICS'
  | 'PER_DIEM_EMTS'
  | 'SUPERVISORS';

type SmsAuditRow = {
  id: string;
  sent_at: string;
  sent_by_employee_id: string;
  sent_by_email: string;
  recipient_employee_id: string;
  recipient_email: string;
  recipient_phone_e164: string;
  recipient_mode: string;
  message_body: string;
  delivery_status: 'SENT' | 'FAILED';
  twilio_message_sid: string | null;
  error_code: string | null;
  error_message: string | null;
};

function fetchSmsAuditRows() {
  return supabase
    .from('sms_notification_audit')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(250);
}

type SmsNotificationsTileProps = {
  // Every employee, for naming senders and recipients in the audit log.
  employees: EmployeeOption[];
  // Active employees who have opted in to supervisor SMS messages.
  smsEligibleEmployees: EmployeeOption[];
};

function SmsNotificationsTile({ employees, smsEligibleEmployees }: SmsNotificationsTileProps) {
  const [smsRecipientMode, setSmsRecipientMode] =
    useState<SmsRecipientMode>('INDIVIDUAL');
  const [smsRecipientEmployeeId, setSmsRecipientEmployeeId] = useState('');
  const [smsMessageBody, setSmsMessageBody] = useState('');
  const [smsAuditSearch, setSmsAuditSearch] = useState('');
  const [smsAuditRows, setSmsAuditRows] = useState<SmsAuditRow[]>([]);
  const [smsAuditLoading, setSmsAuditLoading] = useState(true);
  const [smsSending, setSmsSending] = useState(false);
  const [smsSendStatus, setSmsSendStatus] = useState('');

  const smsSelectedRecipientCount = useMemo(() => {
    if (smsRecipientMode === 'INDIVIDUAL') {
      return smsEligibleEmployees.some(
        (employee) => employee.id === smsRecipientEmployeeId,
      )
        ? 1
        : 0;
    }

    if (smsRecipientMode === 'ALL_ON_DUTY') {
      return null;
    }

    return smsEligibleEmployees.filter((employee) => {
      const employeeType = employee.employeeType.toLowerCase();
      const isFullTime = employeeType.includes('full');
      const isPerDiem = employeeType.includes('per');
      const isParamedic =
        employee.role === 'Paramedic' || employee.scope === 'ALS';
      const isEmt = employee.role === 'EMT' || employee.scope === 'BLS';

      if (smsRecipientMode === 'FULL_TIME') {
        return isFullTime;
      }

      if (smsRecipientMode === 'PER_DIEM') {
        return isPerDiem;
      }

      if (smsRecipientMode === 'PARAMEDICS') {
        return isParamedic;
      }

      if (smsRecipientMode === 'EMTS') {
        return isEmt;
      }

      if (smsRecipientMode === 'FULL_TIME_PARAMEDICS') {
        return isFullTime && isParamedic;
      }

      if (smsRecipientMode === 'FULL_TIME_EMTS') {
        return isFullTime && isEmt;
      }

      if (smsRecipientMode === 'PER_DIEM_PARAMEDICS') {
        return isPerDiem && isParamedic;
      }

      if (smsRecipientMode === 'PER_DIEM_EMTS') {
        return isPerDiem && isEmt;
      }

      if (smsRecipientMode === 'SUPERVISORS') {
        return employee.role === 'Supervisor';
      }

      return true;
    }).length;
  }, [
    smsEligibleEmployees,
    smsRecipientEmployeeId,
    smsRecipientMode,
  ]);

  const filteredSmsAuditRows = useMemo(() => {
    const search = smsAuditSearch.trim().toLowerCase();
    if (!search) return smsAuditRows;

    return smsAuditRows.filter((row) =>
      [
        row.sent_by_email,
        row.recipient_email,
        row.recipient_phone_e164,
        row.recipient_mode,
        row.message_body,
        row.delivery_status,
        row.error_message ?? '',
      ].some((value) => value.toLowerCase().includes(search)),
    );
  }, [smsAuditRows, smsAuditSearch]);

  async function loadSmsAuditRows() {
    setSmsAuditLoading(true);
    const { data, error } = await fetchSmsAuditRows();

    if (error) {
      console.error('Failed to load SMS audit records:', error);
    } else {
      setSmsAuditRows((data ?? []) as SmsAuditRow[]);
    }
    setSmsAuditLoading(false);
  }

  async function sendSmsNotification() {
    const messageBody = smsMessageBody.trim();
    if (!messageBody) {
      window.alert('Enter a message before sending.');
      return;
    }
    if (smsRecipientMode === 'INDIVIDUAL' && !smsRecipientEmployeeId) {
      window.alert('Select an eligible employee.');
      return;
    }
    if (smsSelectedRecipientCount === 0) {
      window.alert('No SMS-eligible recipients were found for that selection.');
      return;
    }

    const audience =
      smsRecipientMode === 'INDIVIDUAL'
        ? smsEligibleEmployees.find(
            (employee) => employee.id === smsRecipientEmployeeId,
          )?.name ?? 'the selected employee'
        : smsRecipientMode.replaceAll('_', ' ').toLowerCase();

    if (!window.confirm(`Send this SMS notification to ${audience}?`)) return;

    setSmsSending(true);
    setSmsSendStatus('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Your session expired. Sign in again.');

      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          recipientMode: smsRecipientMode,
          recipientEmployeeId:
            smsRecipientMode === 'INDIVIDUAL'
              ? smsRecipientEmployeeId
              : null,
          messageBody,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'SMS delivery failed.');
      }

      setSmsSendStatus(
        `${result.sent} sent${result.failed ? `, ${result.failed} failed` : ''}.`,
      );
      setSmsMessageBody('');
      await loadSmsAuditRows();
    } catch (error) {
      setSmsSendStatus(
        error instanceof Error ? error.message : 'SMS delivery failed.',
      );
    } finally {
      setSmsSending(false);
    }
  }

  // Loads when the tile is first opened, and again each time it is reopened,
  // so the log is current without being fetched for supervisors who never
  // open this tile.
  useEffect(() => {
    let isActive = true;

    fetchSmsAuditRows().then(({ data, error }) => {
      if (!isActive) return;

      if (error) {
        console.error('Failed to load SMS audit records:', error);
      } else {
        setSmsAuditRows((data ?? []) as SmsAuditRow[]);
      }
      setSmsAuditLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-bold text-slate-900">
            Compose SMS Notification
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Recipient Group
              <select
                value={smsRecipientMode}
                onChange={(event) => {
                  setSmsRecipientMode(
                    event.target.value as SmsRecipientMode,
                  );
                  setSmsRecipientEmployeeId('');
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-slate-500"
              >
                <option value="INDIVIDUAL">Individual Employee</option>
                <option value="ALL_ACTIVE">All Employees</option>
                <option value="ALL_ON_DUTY">All On Duty</option>
                <option value="FULL_TIME">Full-Time Employees</option>
                <option value="PER_DIEM">Per-Diem Employees</option>
                <option value="PARAMEDICS">All Paramedics</option>
                <option value="EMTS">All EMTs</option>
                <option value="FULL_TIME_PARAMEDICS">
                  Full-Time Paramedics
                </option>
                <option value="FULL_TIME_EMTS">
                  Full-Time EMTs
                </option>
                <option value="PER_DIEM_PARAMEDICS">
                  Per-Diem Paramedics
                </option>
                <option value="PER_DIEM_EMTS">
                  Per-Diem EMTs
                </option>
                <option value="SUPERVISORS">Supervisors</option>
              </select>
            </label>

            {smsRecipientMode === 'INDIVIDUAL' && (
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Employee
                <select
                  value={smsRecipientEmployeeId}
                  onChange={(event) =>
                    setSmsRecipientEmployeeId(event.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-slate-500"
                >
                  <option value="">Select an eligible employee</option>
                  {smsEligibleEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {smsRecipientMode === 'ALL_ON_DUTY' && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-white p-3 text-sm text-blue-800">
              Recipients are calculated from the live schedule when you
              send. Vacation, Sick, and Leave assignments are excluded.
            </div>
          )}

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Message
            <textarea
              value={smsMessageBody}
              onChange={(event) =>
                setSmsMessageBody(event.target.value.slice(0, 480))
              }
              rows={6}
              placeholder="Enter an operational notification..."
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-slate-500"
            />
          </label>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {smsMessageBody.length}/480 characters
            </span>
            <span>
              Selected recipients:{' '}
              {smsSelectedRecipientCount === null
                ? 'Calculated when sent'
                : smsSelectedRecipientCount}
            </span>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void sendSmsNotification()}
              disabled={
                smsSending ||
                !smsMessageBody.trim() ||
                (smsRecipientMode === 'INDIVIDUAL' &&
                  !smsRecipientEmployeeId) ||
                smsSelectedRecipientCount === 0
              }
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {smsSending ? 'Sending…' : 'Send SMS'}
            </button>
          </div>

          {smsSendStatus && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
              {smsSendStatus}
            </div>
          )}
        </div>

      </div>

      <details className="group rounded-xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
          <div>
            <div className="text-sm font-bold text-slate-900">
              SMS Audit Log
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Sent messages, recipients, delivery status, and failure details.
            </div>
          </div>

          <span className="shrink-0 text-sm font-semibold text-blue-700 group-open:hidden">
            Show Log
          </span>
          <span className="hidden shrink-0 text-sm font-semibold text-blue-700 group-open:inline">
            Hide Log
          </span>
        </summary>

        <div className="border-t border-slate-200 p-4">
          <div className="flex justify-end">
            <input
              type="search"
              value={smsAuditSearch}
              onChange={(event) => setSmsAuditSearch(event.target.value)}
              placeholder="Search audit log..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 sm:w-72"
            />
          </div>

          {smsAuditLoading ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
              Loading SMS audit records…
            </div>
          ) : filteredSmsAuditRows.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
              No matching SMS audit records.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredSmsAuditRows.map((row) => {
                const sender =
                  employees.find(
                    (employee) =>
                      employee.id === row.sent_by_employee_id ||
                      employee.email.trim().toLowerCase() ===
                        row.sent_by_email.trim().toLowerCase(),
                  )?.name ?? row.sent_by_email;

                const recipient =
                  row.recipient_mode === 'INDIVIDUAL'
                    ? employees.find(
                        (employee) =>
                          employee.id === row.recipient_employee_id,
                      )?.name ?? row.recipient_email
                    : ({
                        ALL_ACTIVE: 'All Employees',
                        ALL_ON_DUTY: 'All On Duty',
                        FULL_TIME: 'Full-Time Employees',
                        PER_DIEM: 'Per-Diem Employees',
                        PARAMEDICS: 'All Paramedics',
                        EMTS: 'All EMTs',
                        FULL_TIME_PARAMEDICS: 'Full-Time Paramedics',
                        FULL_TIME_EMTS: 'Full-Time EMTs',
                        PER_DIEM_PARAMEDICS: 'Per-Diem Paramedics',
                        PER_DIEM_EMTS: 'Per-Diem EMTs',
                        SUPERVISORS: 'Supervisors',
                      } as Record<string, string>)[row.recipient_mode] ??
                      row.recipient_mode.replaceAll('_', ' ');

                return (
                  <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {sender}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {new Date(row.sent_at).toLocaleString()} · Sent to {recipient}
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.delivery_status === 'SENT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {row.delivery_status}
                      </span>
                    </div>
                    <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{row.message_body}</div>
                    {row.error_message && (
                      <div className="mt-2 text-xs text-red-700">{row.error_message}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

export default memo(SmsNotificationsTile);

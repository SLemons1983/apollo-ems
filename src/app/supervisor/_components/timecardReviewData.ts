'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { buildPayPeriodOptions, getCurrentPayPeriodOption } from '@/lib/payPeriods';
import {
  buildSupervisorTimecardQueues,
  getPayrollStatusForRecord,
  selectCurrentTimecards,
} from '@/lib/timecardWorkflow';
import { type EmployeeOption, makeDateInputValue, mergeRefreshedRecords } from './shared';

// Timecard data for the supervisor page: submitted timecards, schedule
// assignments and payroll submissions, the selected pay period and its review
// queues. It lives on the page so the Timecard Review tile header can show
// its counts before the tile is opened.

export type TimecardPayType =
  | 'DAILY_OT_DT'
  | 'TWENTY_FOUR_HOUR'
  | 'CALL_IN'
  | 'SICK_TIME'
  | 'VACATION'
  | 'JURY_DUTY';

export type TimePunch = {
  id: string;
  employeeId: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT';
  timestamp: string;
  shiftDateKey: string;
  shiftLabel: string;
  payType?: TimecardPayType;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  distanceFeet: number | null;
  geofenceStatus: 'APPROVED' | 'OUTSIDE_GEOFENCE' | 'LOCATION_UNAVAILABLE';
};

export type MissedMealBreak = {
  id: string;
  employeeId: string;
  dateKey: string;
  reason: string;
  createdAt: string;
};

export type TimecardCorrectionRequest = {
  id: string;
  employeeId: string;
  payPeriodKey: string;
  dateKey: string;
  shiftLabel: string;
  correctionType: 'ADD_CLOCK_IN' | 'ADD_CLOCK_OUT' | 'CORRECT_CLOCK_IN' | 'CORRECT_CLOCK_OUT' | 'REMOVE_PUNCH';
  requestedDate: string;
  requestedTime: string;
  reason: string;
  createdAt: string;
};

export type AdditionalCompensation = {
  id: string;
  employeeId: string;
  dateKey: string;
  compensationType: 'LDT_STIPEND' | 'MEAL_PAY';
  amount: number;
  createdAt: string;
};

export type PayBreakdown = {
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  holidayPremiumHours: number;
  missedMealPenaltyHours: number;
  week1: {
    regularHours: number;
    overtimeHours: number;
    doubleTimeHours: number;
  };
  week2: {
    regularHours: number;
    overtimeHours: number;
    doubleTimeHours: number;
  };
};

export type TimecardSubmissionAcknowledgement = {
  employeeId: string;
  employeeName: string;
  acceptedAt: string;
  submissionAction: 'SUBMITTED' | 'RESUBMITTED';
  certificationText: string;
};

export type SubmittedTimecard = {
  id: string;
  versionNumber: number;
  parentTimecardId?: string;
  versionReason?: string;
  createdByRole?: string;
  createdByEmployeeId?: string;
  supervisorEditAt?: string;
  supervisorEditBy?: string;
  supervisorEditComment?: string;
  employeeReviewRequired: boolean;
  employeeReviewedAt?: string;
  employeeReviewedBy?: string;
  employeeReviewAcknowledgement?: Record<string, unknown> | null;
  employeeId: string;
  employeeName: string;
  payPeriodKey: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  submittedAt: string;
  totalHours: number;
  payBreakdown?: PayBreakdown;
  punches: TimePunch[];
  missedMealBreaks: MissedMealBreak[];
  corrections: TimecardCorrectionRequest[];
  additionalCompensation: AdditionalCompensation[];
  submissionAcknowledgement: TimecardSubmissionAcknowledgement | null;
  note: string;
  status: 'PENDING_SUPERVISOR_REVIEW' | 'APPROVED' | 'RETURNED';
  supervisorComment?: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type SupervisorTimecardEditRow = {
  id: string;
  shiftDateKey: string;
  shiftLabel: string;
  payType: TimecardPayType;
  clockInValue: string;
  clockOutValue: string;
  clockInId: string | null;
  clockOutId: string | null;
};

export type PayrollStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING_REVIEW'
  | 'PENDING_RESUBMISSION'
  | 'APPROVED';

export type PayrollStatusRow = {
  employeeId: string;
  employeeName: string;
  status: PayrollStatus;
  submittedAt: string | null;
};

export const CURRENT_SUPERVISOR_EMPLOYEE_ID = 'emp-001';

export function escapePrintHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function formatDateTimeLocalInput(timestamp: string | undefined): string {
  if (!timestamp) {
    return '';
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function getNthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  nth: number,
): Date {
  const date = new Date(year, monthIndex, 1);

  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() + 1);
  }

  date.setDate(date.getDate() + (nth - 1) * 7);
  return date;
}

export function getLastWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
): Date {
  const date = new Date(year, monthIndex + 1, 0);

  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() - 1);
  }

  return date;
}

export function getCompanyHolidayDateKeys(year: number): string[] {
  return [
    makeDateInputValue(new Date(year, 0, 1)),
    makeDateInputValue(getLastWeekdayOfMonth(year, 4, 1)),
    makeDateInputValue(new Date(year, 6, 4)),
    makeDateInputValue(getNthWeekdayOfMonth(year, 8, 1, 1)),
    makeDateInputValue(getNthWeekdayOfMonth(year, 10, 4, 4)),
    makeDateInputValue(new Date(year, 11, 25)),
  ];
}

export function isCompanyHoliday(date: Date): boolean {
  return getCompanyHolidayDateKeys(date.getFullYear()).includes(
    makeDateInputValue(date),
  );
}

export function mapSubmittedTimecardRow(row: any): SubmittedTimecard {
  return {
    id: row.id,
    versionNumber: Number(row.version_number ?? 1),
    parentTimecardId: row.parent_timecard_id ?? undefined,
    versionReason: row.version_reason ?? undefined,
    createdByRole: row.created_by_role ?? undefined,
    createdByEmployeeId: row.created_by_employee_id ?? undefined,
    supervisorEditAt: row.supervisor_edit_at ?? undefined,
    supervisorEditBy: row.supervisor_edit_by ?? undefined,
    supervisorEditComment: row.supervisor_edit_comment ?? undefined,
    employeeReviewRequired: Boolean(row.employee_review_required),
    employeeReviewedAt: row.employee_reviewed_at ?? undefined,
    employeeReviewedBy: row.employee_reviewed_by ?? undefined,
    employeeReviewAcknowledgement:
      row.employee_review_acknowledgement &&
      typeof row.employee_review_acknowledgement === 'object'
        ? row.employee_review_acknowledgement
        : null,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    payPeriodKey: row.pay_period_key,
    payPeriodStart: row.pay_period_start,
    payPeriodEnd: row.pay_period_end,
    submittedAt: row.submitted_at,
    totalHours: Number(row.total_hours ?? 0),
    payBreakdown: row.pay_breakdown ?? undefined,
    punches: Array.isArray(row.punches) ? row.punches : [],
    missedMealBreaks: Array.isArray(row.missed_meal_breaks)
      ? row.missed_meal_breaks
      : [],
    corrections: Array.isArray(row.corrections) ? row.corrections : [],
    additionalCompensation: Array.isArray(row.additional_compensation)
      ? row.additional_compensation
      : [],
    submissionAcknowledgement:
      row.submission_acknowledgement &&
      typeof row.submission_acknowledgement === 'object'
        ? row.submission_acknowledgement
        : null,
    note: row.note ?? '',
    status: row.status,
    supervisorComment: row.supervisor_comment ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
  };
}

export function useTimecardReviewData({
  employees,
  employeesLoaded,
}: {
  employees: EmployeeOption[];
  employeesLoaded: boolean;
}) {
  const [submittedTimecards, setSubmittedTimecards] = useState<SubmittedTimecard[]>([]);
  const [scheduleAssignments, setScheduleAssignments] = useState<any[]>([]);
  const [selectedPayPeriodKey, setSelectedPayPeriodKey] = useState('');
  const [submittedTimecardsLoaded, setSubmittedTimecardsLoaded] = useState(false);
  const [scheduleAssignmentsLoaded, setScheduleAssignmentsLoaded] = useState(false);
  const [timecardReviewPeriodInitialized, setTimecardReviewPeriodInitialized] = useState(false);
  // Finalized payroll records for every pay period, keyed by pay period. The
  // lock must reflect whichever period is selected, not only the period that
  // was current when the page loaded.
  const [payrollSubmissionsByPeriod, setPayrollSubmissionsByPeriod] = useState<
    Record<
      string,
      {
        submittedBy: string;
        submittedAt: string;
        payPeriodKey: string;
        approvedCount: number;
      }
    >
  >({});

  const payPeriodOptions = useMemo(() => buildPayPeriodOptions(new Date(), 28), []);
  const currentPayPeriod = useMemo(() => getCurrentPayPeriodOption(payPeriodOptions, new Date()), [payPeriodOptions]);

  const selectedPayPeriod = useMemo(() => {
    return payPeriodOptions.find((option) => option.key === selectedPayPeriodKey) ?? currentPayPeriod;
  }, [currentPayPeriod, payPeriodOptions, selectedPayPeriodKey]);

  useEffect(() => {
    if (
      timecardReviewPeriodInitialized ||
      !submittedTimecardsLoaded ||
      !scheduleAssignmentsLoaded ||
      !employeesLoaded
    ) {
      return;
    }

    const previousPayPeriod = [...payPeriodOptions]
      .filter((option) => option.end < currentPayPeriod.start)
      .sort((a, b) => b.end.getTime() - a.end.getTime())[0];

    if (!previousPayPeriod) {
      setSelectedPayPeriodKey(currentPayPeriod.key);
      setTimecardReviewPeriodInitialized(true);
      return;
    }

    const previousStartKey = makeDateInputValue(previousPayPeriod.start);
    const previousEndKey = makeDateInputValue(previousPayPeriod.end);

    const scheduledEmployeeIds = new Set(
      scheduleAssignments
        .filter(
          (row) =>
            row.employee_id &&
            !row.is_open_slot &&
            row.date_key >= previousStartKey &&
            row.date_key <= previousEndKey,
        )
        .map((row) => row.employee_id as string),
    );

    // Only an employee's current record counts; a superseded approval does not.
    const approvedEmployeeIds = new Set(
      selectCurrentTimecards(
        submittedTimecards.filter((timecard) => timecard.payPeriodKey === previousPayPeriod.key),
      )
        .filter((timecard) => timecard.status === 'APPROVED')
        .map((timecard) => timecard.employeeId),
    );

    const previousPeriodHasUnresolvedTimecards =
      scheduledEmployeeIds.size > 0 &&
      Array.from(scheduledEmployeeIds).some(
        (employeeId) => !approvedEmployeeIds.has(employeeId),
      );

    setSelectedPayPeriodKey(
      previousPeriodHasUnresolvedTimecards
        ? previousPayPeriod.key
        : currentPayPeriod.key,
    );
    setTimecardReviewPeriodInitialized(true);
  }, [
    currentPayPeriod,
    employeesLoaded,
    payPeriodOptions,
    scheduleAssignments,
    scheduleAssignmentsLoaded,
    submittedTimecards,
    submittedTimecardsLoaded,
    timecardReviewPeriodInitialized,
  ]);

  const payrollSubmission = payrollSubmissionsByPeriod[selectedPayPeriod.key] ?? null;
  const payrollLocked = Boolean(payrollSubmission);

  const selectedPayPeriodTimecards = useMemo(() => {
    // The pay-period key identifies the payroll period. Serialized midnight
    // timestamps depend on the submitting device's timezone and must not
    // exclude a saved submission from its supervisor review queue.
    return submittedTimecards.filter(
      (timecard) => timecard.payPeriodKey === selectedPayPeriod.key,
    );
  }, [selectedPayPeriod.key, submittedTimecards]);

  // One shared definition of the current record per employee (see
  // src/lib/timecardWorkflow.ts) drives every queue, the payroll status table
  // and the approved payroll packet, and matches the employee dashboard.
  const timecardQueues = useMemo(
    () => buildSupervisorTimecardQueues(selectedPayPeriodTimecards),
    [selectedPayPeriodTimecards],
  );
  const pendingTimecards = timecardQueues.pendingReview;
  const resubmittedTimecards = timecardQueues.resubmitted;
  const pendingResubmissionTimecards = timecardQueues.awaitingEmployeeResubmission;
  // Exactly one record per employee: the current record, and only when it is
  // approved. Superseded or outdated approvals never enter the packet.
  const approvedTimecards = timecardQueues.approvedForPayroll;
  const supersededApprovals = timecardQueues.supersededApprovals;

  const scheduledEmployeeIds = useMemo(() => {
    const startKey = makeDateInputValue(selectedPayPeriod.start);
    const endKey = makeDateInputValue(selectedPayPeriod.end);

    return new Set(
      scheduleAssignments
        .filter((row) => row.employee_id && row.date_key >= startKey && row.date_key <= endKey && !row.is_open_slot)
        .map((row) => row.employee_id),
    );
  }, [scheduleAssignments, selectedPayPeriod.end, selectedPayPeriod.start]);

  const employeesNotSubmitted = useMemo(() => {
    const submittedEmployeeIds = new Set(selectedPayPeriodTimecards.map((timecard) => timecard.employeeId));

    return employees.filter((employee) => scheduledEmployeeIds.has(employee.id) && !submittedEmployeeIds.has(employee.id));
  }, [employees, scheduledEmployeeIds, selectedPayPeriodTimecards]);

  const payrollStatusRows = useMemo<PayrollStatusRow[]>(() => {
    const latestTimecardByEmployeeId = timecardQueues.currentByEmployeeId;

    const participatingEmployeeIds = new Set<string>([
      ...scheduledEmployeeIds,
      ...latestTimecardByEmployeeId.keys(),
    ]);

    const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

    return [...participatingEmployeeIds]
      .map((employeeId) => {
        const timecard = latestTimecardByEmployeeId.get(employeeId);
        const status: PayrollStatus = getPayrollStatusForRecord(timecard);

        return {
          employeeId,
          employeeName:
            employeeById.get(employeeId)?.name ??
            timecard?.employeeName ??
            employeeId,
          status,
          submittedAt: timecard?.submittedAt ?? null,
        };
      })
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [employees, scheduledEmployeeIds, timecardQueues]);

  const submittedTimecardsRefreshInFlight = useRef(false);

  // Without payPeriodKeys, every timecard is reloaded. With them, only those
  // pay periods are fetched and merged in; everything else is left as is.
  async function refreshSubmittedTimecards(payPeriodKeys?: string[]) {
    if (submittedTimecardsRefreshInFlight.current) return;
    submittedTimecardsRefreshInFlight.current = true;

    try {
      const rows: any[] = [];
      const pageSize = 1000;
      let pageStart = 0;

      while (true) {
        let query = supabase.from('submitted_timecards').select('*');

        if (payPeriodKeys) {
          query = query.in('pay_period_key', payPeriodKeys);
        }

        const { data, error } = await query
          .order('submitted_at', { ascending: false })
          .range(pageStart, pageStart + pageSize - 1);

        if (error) {
          console.error('Failed to refresh submitted timecards:', error);
          return;
        }

        rows.push(...(data ?? []));

        if (!data || data.length < pageSize) {
          break;
        }

        pageStart += pageSize;
      }

      const fetched = rows.map(mapSubmittedTimecardRow);
      const refreshedKeys = payPeriodKeys ? new Set(payPeriodKeys) : null;

      setSubmittedTimecards((current) => {
        const merged = mergeRefreshedRecords(
          current,
          fetched,
          (timecard) => !refreshedKeys || refreshedKeys.has(timecard.payPeriodKey),
        );

        if (merged === current) return current;

        // Same newest-first order the full query returns.
        return [...merged].sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
        );
      });
      setSubmittedTimecardsLoaded(true);
    } finally {
      submittedTimecardsRefreshInFlight.current = false;
    }
  }

  // The 5-second poll only fetches the pay periods on screen (selected and
  // current). A full reload runs every 2 minutes and when the tab regains
  // focus, so edits to any other period still show up. Polling pauses while
  // the tab is hidden.
  const activeTimecardPayPeriodKeys = useRef<string[]>([]);

  useEffect(() => {
    activeTimecardPayPeriodKeys.current = Array.from(
      new Set([selectedPayPeriod.key, currentPayPeriod.key]),
    );
  }, [currentPayPeriod.key, selectedPayPeriod.key]);

  useEffect(() => {
    let tick = 0;

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;

      tick += 1;
      if (tick % 24 === 0 || activeTimecardPayPeriodKeys.current.length === 0) {
        void refreshSubmittedTimecards();
      } else {
        void refreshSubmittedTimecards(activeTimecardPayPeriodKeys.current);
      }
    }, 5000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') void refreshSubmittedTimecards();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    void refreshSubmittedTimecards();

    void (async () => {
      const assignments: any[] = [];
      const assignmentPageSize = 1000;
      let assignmentPageStart = 0;

      while (true) {
        const { data, error } = await supabase
          .from('schedule_assignments')
          .select('date_key,employee_id,is_open_slot,shift_label')
          .order('date_key', { ascending: true })
          .order('employee_id', { ascending: true })
          .range(
            assignmentPageStart,
            assignmentPageStart + assignmentPageSize - 1,
          );

        if (error) {
          console.error('Failed to load schedule assignments:', error);
          return;
        }

        assignments.push(...(data ?? []));

        if (!data || data.length < assignmentPageSize) {
          break;
        }

        assignmentPageStart += assignmentPageSize;
      }

      setScheduleAssignments(assignments);
      setScheduleAssignmentsLoaded(true);
    })();

    supabase
      .from('payroll_submissions')
      .select('*')
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load payroll submissions:', error);
        } else {
          setPayrollSubmissionsByPeriod(
            Object.fromEntries(
              (data ?? [])
                .filter((row: { pay_period_key?: string | null }) => Boolean(row.pay_period_key))
                .map((row: {
                  pay_period_key: string;
                  submitted_by: string;
                  submitted_at: string;
                  approved_timecards: number;
                }) => [
                  row.pay_period_key,
                  {
                    submittedBy: row.submitted_by,
                    submittedAt: row.submitted_at,
                    payPeriodKey: row.pay_period_key,
                    approvedCount: row.approved_timecards,
                  },
                ]),
            ),
          );
        }
      });
  }, []);

  return useMemo(
    () => ({
      submittedTimecards,
      setSubmittedTimecards,
      scheduleAssignments,
      setSelectedPayPeriodKey,
      setTimecardReviewPeriodInitialized,
      setPayrollSubmissionsByPeriod,
      payPeriodOptions,
      currentPayPeriod,
      selectedPayPeriod,
      payrollSubmission,
      payrollLocked,
      selectedPayPeriodTimecards,
      pendingTimecards,
      resubmittedTimecards,
      pendingResubmissionTimecards,
      approvedTimecards,
      supersededApprovals,
      scheduledEmployeeIds,
      employeesNotSubmitted,
      payrollStatusRows,
    }),
    [
      approvedTimecards,
      currentPayPeriod,
      employeesNotSubmitted,
      payPeriodOptions,
      payrollLocked,
      payrollStatusRows,
      payrollSubmission,
      pendingResubmissionTimecards,
      pendingTimecards,
      resubmittedTimecards,
      scheduleAssignments,
      scheduledEmployeeIds,
      selectedPayPeriod,
      selectedPayPeriodTimecards,
      submittedTimecards,
      supersededApprovals,
    ],
  );
}

export type TimecardReviewData = ReturnType<typeof useTimecardReviewData>;

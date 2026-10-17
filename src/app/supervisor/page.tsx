'use client';

import React, { Activity, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { supabase } from '@/lib/supabase';
import {
  addDays,
  buildPayPeriodOptions,
  getCurrentPayPeriodOption,
  type PayPeriodOption,
} from '@/lib/payPeriods';
import {
  buildSupervisorTimecardQueues,
  getNextTimecardVersionNumber,
  getPayrollStatusForRecord,
  isOwnTimecard,
  selectCurrentTimecards,
} from '@/lib/timecardWorkflow';
import AnnouncementsTile from './_components/AnnouncementsTile';
import FleetServicesTile from './_components/FleetServicesTile';
import InventoryTrackingTile from './_components/InventoryTrackingTile';
import ScheduleManagementTile from './_components/ScheduleManagementTile';
import SmsNotificationsTile from './_components/SmsNotificationsTile';
import SupervisorShiftReportTile from './_components/SupervisorShiftReportTile';
import SystemConfigurationTile from './_components/SystemConfigurationTile';
import {
  type AuditLogEntry,
  type EmployeeCertificationRecord,
  type EmployeeOption,
  type SystemConfig,
  formatShortDate,
  getChangedRecords,
  makeDateInputValue,
  mergeRefreshedRecords,
  useStableCallback,
} from './_components/shared';

type ApolloMessageRecipient = {
  employeeId: string;
  deliveredAt: string;
  readAt: string | null;
};

type ApolloMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipients: ApolloMessageRecipient[];
  audienceLabel: string;
  title: string;
  body: string;
  createdAt: string;
  relatedType?: string;
  relatedId?: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
};

type SmsPreferenceRow = {
  employee_id: string;
  employee_email: string;
  phone_e164: string;
  sms_enabled: boolean;
  notify_supervisor_messages: boolean;
  consented_at: string | null;
  opted_out_at: string | null;
};

type TimecardPayType =
  | 'DAILY_OT_DT'
  | 'TWENTY_FOUR_HOUR'
  | 'CALL_IN'
  | 'SICK_TIME'
  | 'VACATION'
  | 'JURY_DUTY';

type TimePunch = {
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

type MissedMealBreak = {
  id: string;
  employeeId: string;
  dateKey: string;
  reason: string;
  createdAt: string;
};

type TimecardCorrectionRequest = {
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

type AdditionalCompensation = {
  id: string;
  employeeId: string;
  dateKey: string;
  compensationType: 'LDT_STIPEND' | 'MEAL_PAY';
  amount: number;
  createdAt: string;
};

type PayBreakdown = {
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

type TimecardSubmissionAcknowledgement = {
  employeeId: string;
  employeeName: string;
  acceptedAt: string;
  submissionAction: 'SUBMITTED' | 'RESUBMITTED';
  certificationText: string;
};

type SubmittedTimecard = {
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

type SupervisorTimecardEditRow = {
  id: string;
  shiftDateKey: string;
  shiftLabel: string;
  payType: TimecardPayType;
  clockInValue: string;
  clockOutValue: string;
  clockInId: string | null;
  clockOutId: string | null;
};

type PayrollStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING_REVIEW'
  | 'PENDING_RESUBMISSION'
  | 'APPROVED';

type PayrollStatusRow = {
  employeeId: string;
  employeeName: string;
  status: PayrollStatus;
  submittedAt: string | null;
};

type IncidentReport = {
  id: string;
  incident_number: string;
  created_at: string;
  employee_name: string;
  employee_phone: string | null;
  employee_email: string | null;
  category: string;
  supervisor_notified: string | null;
  supervisor_name: string | null;
  assigned_supervisor: string | null;
  narrative: string;
  status: string;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_path: string | null;
  supervisor_notes: string | null;
  updated_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
};

type StoredEmployeeProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  scope?: string;
  employeeType?: string;
  status?: string;
};

type SupabaseEmployeeRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  scope: string | null;
  employee_type: string | null;
  status: string | null;
  certifications?: EmployeeCertificationRecord | null;
};

type OpenShiftRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  dateKey: string;
  shiftKey: string;
  shiftLabel: string;
  payPeriodKey: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  supervisorNote?: string;
};

const SCHEDULE_STORAGE_KEY = 'apollo-schedule-page-v6';
const ANNOUNCEMENTS_STORAGE_KEY = 'apollo-company-announcements-v1';
const SUBMITTED_TIMECARDS_STORAGE_KEY = 'apollo-submitted-timecards-v1';
const EMPLOYEE_STORAGE_KEY = 'apollo-employee-profiles-v2';
const APOLLO_MESSAGES_STORAGE_KEY = 'apollo-messages-v2';
const SYSTEM_CONFIG_STORAGE_KEY = 'apollo-system-config-v1';
const OPEN_SHIFT_REQUESTS_STORAGE_KEY = 'apollo-open-shift-requests-v1';
const AUDIT_LOG_STORAGE_KEY = 'apollo-audit-log-v1';
const CURRENT_SUPERVISOR_ID = 'supervisor-001';
const CURRENT_SUPERVISOR_EMPLOYEE_ID = 'emp-001';

function buildEmployeeName(profile: StoredEmployeeProfile): string {
  const first = (profile.firstName ?? '').trim();
  const last = (profile.lastName ?? '').trim();
  if (last && first) return `${last}, ${first}`;
  return `${first} ${last}`.trim() || profile.id || 'Unnamed Employee';
}

function normalizeRole(value: string | undefined): 'Paramedic' | 'EMT' | 'Supervisor' {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'paramedic') return 'Paramedic';
  if (normalized === 'supervisor') return 'Supervisor';
  return 'EMT';
}

function normalizeScope(scopeValue: string | undefined, roleValue: string | undefined): 'ALS' | 'BLS' {
  const normalized = (scopeValue ?? '').trim().toUpperCase();
  if (normalized === 'ALS') return 'ALS';
  if (normalized === 'BLS') return 'BLS';
  return normalizeRole(roleValue) === 'Paramedic' ? 'ALS' : 'BLS';
}

function loadEmployeesFromProfiles(): EmployeeOption[] {
  try {
    const raw = null;
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as StoredEmployeeProfile[];

    return parsed
      .map((profile) => ({
        id: profile.id,
        name: buildEmployeeName(profile),
        email: '',
        role: normalizeRole(profile.role),
        scope: normalizeScope(profile.scope, profile.role),
        employeeType: (profile.employeeType ?? 'Full Time').trim() || 'Full Time',
        status: (profile.status ?? 'Active').trim() || 'Active',
      }))
      .filter((employee) => employee.id && employee.status.toLowerCase() !== 'removed')
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Failed to load employees:', error);
    return [];
  }
}


function buildSupabaseEmployeeName(employee: SupabaseEmployeeRow): string {
  const first = (employee.first_name ?? '').trim();
  const last = (employee.last_name ?? '').trim();
  if (last && first) return `${last}, ${first}`;
  return `${first} ${last}`.trim() || employee.id || 'Unnamed Employee';
}

function mapSupabaseEmployee(employee: SupabaseEmployeeRow): EmployeeOption {
  return {
    id: employee.id,
    name: buildSupabaseEmployeeName(employee),
    email: (employee.email ?? '').trim().toLowerCase(),
    role: normalizeRole(employee.role ?? undefined),
    scope: normalizeScope(employee.scope ?? undefined, employee.role ?? undefined),
    employeeType: (employee.employee_type ?? 'Full Time').trim() || 'Full Time',
    status: (employee.status ?? 'Active').trim() || 'Active',
    certifications: employee.certifications ?? null,
  };
}

async function loadEmployeesFromSupabase(): Promise<EmployeeOption[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id,email,first_name,last_name,role,scope,employee_type,status,certifications')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SupabaseEmployeeRow[])
    .map((employee) => mapSupabaseEmployee(employee))
    .filter((employee) => employee.id && employee.status.toLowerCase() !== 'removed')
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getDefaultSystemConfig(): SystemConfig {
  return {
    companyName: 'Sequoia Safety Council',
    logoDataUrl: '',
    importantLinks: [
      {
        id: 'ccemsa-policies',
        label: 'CCEMSA Policies',
        url: 'https://www.fresnocountyca.gov/Departments/Public-Health/Community-Health/Emergency-Medical-Services',
      },
      {
        id: 'child-abuse-reporting',
        label: 'Child Abuse Reporting',
        url: 'https://oag.ca.gov/childabuse',
      },
      {
        id: 'adult-protective-services',
        label: 'Adult Protective Services',
        url: 'https://www.cdss.ca.gov/reporting/report-abuse/adult-protective-services',
      },
    ],
    geofences: [
      {
        id: 'reedley-1',
        shiftLabel: 'Reedley 1',
        locationLabel: 'Reedley Station',
        latitude: 36.60163763301681,
        longitude: -119.44390972540988,
        radiusFeet: 500,
      },
      {
        id: 'reedley-2',
        shiftLabel: 'Reedley 2',
        locationLabel: 'Reedley Station',
        latitude: 36.60163763301681,
        longitude: -119.44390972540988,
        radiusFeet: 500,
      },
      {
        id: 'parlier',
        shiftLabel: 'Parlier',
        locationLabel: 'Parlier Station',
        latitude: 36.608647190346666,
        longitude: -119.52968530322042,
        radiusFeet: 500,
      },
      {
        id: 'orange-cove',
        shiftLabel: 'Orange Cove',
        locationLabel: 'Orange Cove Station',
        latitude: 36.62257333716054,
        longitude: -119.32320178090212,
        radiusFeet: 500,
      },
    ],
  };
}

function escapePrintHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDateTimeLocalInput(timestamp: string | undefined): string {
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

function getNthWeekdayOfMonth(
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

function getLastWeekdayOfMonth(
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

function getCompanyHolidayDateKeys(year: number): string[] {
  return [
    makeDateInputValue(new Date(year, 0, 1)),
    makeDateInputValue(getLastWeekdayOfMonth(year, 4, 1)),
    makeDateInputValue(new Date(year, 6, 4)),
    makeDateInputValue(getNthWeekdayOfMonth(year, 8, 1, 1)),
    makeDateInputValue(getNthWeekdayOfMonth(year, 10, 4, 4)),
    makeDateInputValue(new Date(year, 11, 25)),
  ];
}

function isCompanyHoliday(date: Date): boolean {
  return getCompanyHolidayDateKeys(date.getFullYear()).includes(
    makeDateInputValue(date),
  );
}

function mapSubmittedTimecardRow(row: any): SubmittedTimecard {
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

function mapApolloMessageRow(row: any): ApolloMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderRole: row.sender_role,
    recipients: row.recipients ?? [],
    audienceLabel: row.audience_label,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    relatedType: row.related_type ?? undefined,
    relatedId: row.related_id ?? undefined,
    priority: row.priority ?? 'NORMAL',
  };
}

function apolloMessageToRow(message: ApolloMessage) {
  return {
    id: message.id,
    conversation_id: message.conversationId,
    sender_id: message.senderId,
    sender_name: message.senderName,
    sender_role: message.senderRole,
    recipients: message.recipients ?? [],
    audience_label: message.audienceLabel,
    title: message.title,
    body: message.body,
    created_at: message.createdAt,
    related_type: message.relatedType ?? null,
    related_id: message.relatedId ?? null,
    priority: message.priority ?? 'NORMAL',
    updated_at: new Date().toISOString(),
  };
}

export default function SupervisorPage() {
  const [activeTile, setActiveTile] = useState<string | null>(null);

  const [showEmployeesNotSubmitted, setShowEmployeesNotSubmitted] = useState(false);
  const [showPendingReview, setShowPendingReview] = useState(false);
  const [showPendingResubmission, setShowPendingResubmission] = useState(false);
  const [showReviewedTimecards, setShowReviewedTimecards] = useState(false);
  const [showPayrollStatusTracker, setShowPayrollStatusTracker] = useState(true);
  const [selectedTimecardId, setSelectedTimecardId] = useState<string | null>(null);
  const [editingTimecardId, setEditingTimecardId] = useState<string | null>(null);
  const [supervisorEditRows, setSupervisorEditRows] = useState<SupervisorTimecardEditRow[]>([]);
  const [supervisorEditReason, setSupervisorEditReason] = useState('');
  const [isSavingSupervisorEdit, setIsSavingSupervisorEdit] = useState(false);
  const [submittedTimecards, setSubmittedTimecards] = useState<SubmittedTimecard[]>([]);
  const [scheduleAssignments, setScheduleAssignments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [authEmail, setAuthEmail] = useState('');
  const [apolloMessages, setApolloMessages] = useState<ApolloMessage[]>([]);
  const [smsPreferences, setSmsPreferences] = useState<SmsPreferenceRow[]>([]);
  const [smsPreferencesLoading, setSmsPreferencesLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(getDefaultSystemConfig());
  const [openShiftRequests, setOpenShiftRequests] = useState<OpenShiftRequest[]>([]);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [selectedIncidentReportId, setSelectedIncidentReportId] = useState<string | null>(null);
  const [incidentReportStatusDraft, setIncidentReportStatusDraft] = useState('NEW');
  const [incidentReportAssignedSupervisorDraft, setIncidentReportAssignedSupervisorDraft] = useState('');
  const [incidentReportNotesDraft, setIncidentReportNotesDraft] = useState('');
  const [incidentReportFollowUpDraft, setIncidentReportFollowUpDraft] = useState('');

  const [incidentReportSearch, setIncidentReportSearch] = useState('');
  const [incidentReportStatusFilter, setIncidentReportStatusFilter] = useState('ALL');
  const [incidentReportCategoryFilter, setIncidentReportCategoryFilter] = useState('ALL');
  const [incidentReportSupervisorFilter, setIncidentReportSupervisorFilter] = useState('ALL');
  const [incidentReportSaveStatus, setIncidentReportSaveStatus] = useState('');
  const [showClosedIncidentReports, setShowClosedIncidentReports] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [returnComments, setReturnComments] = useState<Record<string, string>>({});
  const [selectedPayPeriodKey, setSelectedPayPeriodKey] = useState('');
  const [submittedTimecardsLoaded, setSubmittedTimecardsLoaded] = useState(false);
  const [scheduleAssignmentsLoaded, setScheduleAssignmentsLoaded] = useState(false);
  const [employeesLoaded, setEmployeesLoaded] = useState(false);
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
  const [payrollActionPending, setPayrollActionPending] = useState(false);
  const [messageRecipientMode, setMessageRecipientMode] = useState('ALL_ACTIVE');
  const [messageRecipientEmployeeId, setMessageRecipientEmployeeId] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [messagePriority, setMessagePriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('NORMAL');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [hideReadMessages, setHideReadMessages] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');

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

  const smsEligibleEmployeeIds = useMemo(
    () => new Set(smsPreferences.map((preference) => preference.employee_id)),
    [smsPreferences],
  );

  const smsEligibleEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.status.toLowerCase() === 'active' &&
          smsEligibleEmployeeIds.has(employee.id),
      ),
    [employees, smsEligibleEmployeeIds],
  );

  const currentEmployee = useMemo(() => {
    const normalizedAuthEmail = authEmail.trim().toLowerCase();

    if (!normalizedAuthEmail) {
      return null;
    }

    return employees.find((employee) => employee.email.trim().toLowerCase() === normalizedAuthEmail) ?? null;
  }, [authEmail, employees]);

  useEffect(() => {
    let isMounted = true;

    async function loadAuthenticatedUser() {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setAuthEmail(data.session?.user?.email?.trim().toLowerCase() ?? '');
    }

    loadAuthenticatedUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setAuthEmail(session?.user?.email?.trim().toLowerCase() ?? '');
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
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

      void refreshApolloMessages();

      supabase
        .from('employee_sms_preferences')
        .select(
          'employee_id,employee_email,phone_e164,sms_enabled,notify_supervisor_messages,consented_at,opted_out_at',
        )
        .then(({ data: smsPreferenceData, error: smsPreferenceError }) => {
          if (smsPreferenceError) {
            console.error(
              'Failed to load employee SMS preferences:',
              smsPreferenceError,
            );
            setSmsPreferences([]);
          } else {
            setSmsPreferences(
              ((smsPreferenceData ?? []) as SmsPreferenceRow[]).filter(
                (preference) =>
                  preference.sms_enabled &&
                  preference.notify_supervisor_messages &&
                  Boolean(preference.phone_e164) &&
                  !preference.opted_out_at,
              ),
            );
          }

          setSmsPreferencesLoading(false);
        });

      supabase
        .from('system_config')
        .select('*')
        .eq('id', 'default')
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to load system config:', error);
          } else if (data) {
            setSystemConfig({
              companyName: data.company_name,
              logoDataUrl: data.logo_data_url,
              importantLinks: data.important_links ?? [],
              geofences: data.geofences ?? [],
            });
          }
        });

      supabase
        .from('open_shift_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .then(({ data: openShiftData, error: openShiftError }) => {
          if (openShiftError) {
            console.error('Failed to load open shift requests:', openShiftError);
          } else {
            setOpenShiftRequests(
              (openShiftData ?? []).map((row: any) => ({
                id: row.id,
                employeeId: row.employee_id,
                employeeName: row.employee_name,
                dateKey: row.date_key,
                shiftKey: row.shift_key,
                shiftLabel: row.shift_label,
                payPeriodKey: row.pay_period_key,
                requestedAt: row.requested_at,
                status: row.status,
                supervisorNote: row.supervisor_note ?? undefined,
              })),
            );
          }
        });

      fetch('/api/incident-reports/list')
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to load incident reports.');
          }

          return response.json();
        })
        .then((data) => {
          setIncidentReports((data.incidentReports ?? []) as IncidentReport[]);
        })
        .catch((error) => {
          console.error('Failed to load incident reports:', error);
        });

      supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to load audit log:', error);
          } else {
            setAuditLog(data ?? []);
          }
        });

      loadEmployeesFromSupabase()
        .then((loadedEmployees) => {
          setEmployees(loadedEmployees);
          setEmployeesLoaded(true);
        })
        .catch((employeeError) => {
          console.error('Failed to load employees from Supabase:', employeeError);
          setEmployees(loadEmployeesFromProfiles());
          setEmployeesLoaded(true);
        });
    } catch (error) {
      console.error('Failed to load supervisor data:', error);
    }
  }, [currentPayPeriod.key]);

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

  function sendTimecardReminders() {
    if (employeesNotSubmitted.length === 0) {
      window.alert('All active employees have submitted timecards for this pay period.');
      return;
    }

    const confirmed = window.confirm(`Send timecard reminder to ${employeesNotSubmitted.length} employee${employeesNotSubmitted.length === 1 ? '' : 's'}?`);
    if (!confirmed) return;

    const createdAt = new Date().toISOString();
    const reminderMessage: ApolloMessage = {
      id: `timecard-reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      conversationId: `conversation-timecard-reminder-${selectedPayPeriod.key}-${Date.now()}`,
      senderId: CURRENT_SUPERVISOR_ID,
      senderName: currentEmployee?.name || 'Supervisor',
      senderRole: 'Supervisor',
      recipients: employeesNotSubmitted.map((employee) => ({
        employeeId: employee.id,
        deliveredAt: createdAt,
        readAt: null,
      })),
      audienceLabel: `Employees missing timecards (${employeesNotSubmitted.length})`,
      title: 'Timecard Reminder',
      body: `Your timecard for the pay period ${formatShortDate(selectedPayPeriod.start)} to ${formatShortDate(selectedPayPeriod.end)} has not been submitted yet. Please log into ApolloEMS and submit your timecard as soon as possible.`,
      createdAt,
      relatedType: 'TIMECARD_REMINDER',
      relatedId: selectedPayPeriod.key,
      priority: 'IMPORTANT',
    };

    saveApolloMessages([reminderMessage, ...apolloMessages]);
    window.alert('Timecard reminders sent.');
  }



  // Polls overlap when a request outlasts the interval; these flags skip a
  // refresh while the previous one is still in flight.
  const apolloMessagesRefreshInFlight = useRef(false);
  const submittedTimecardsRefreshInFlight = useRef(false);

  async function refreshApolloMessages() {
    if (apolloMessagesRefreshInFlight.current) return;
    apolloMessagesRefreshInFlight.current = true;

    try {
      const { data, error } = await supabase
        .from('apollo_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supervisor Apollo message refresh failed:', error);
        return;
      }

      const fetched = (data ?? []).map(mapApolloMessageRow);
      setApolloMessages((current) => {
        const merged = mergeRefreshedRecords(current, fetched, () => true);
        if (merged === current) return current;

        // Keep the newest-first order the query returned.
        const mergedById = new Map(merged.map((message) => [message.id, message]));
        return fetched.map((message) => mergedById.get(message.id) ?? message);
      });
    } finally {
      apolloMessagesRefreshInFlight.current = false;
    }
  }

  useEffect(() => {
    // apollo_messages is not in the supabase_realtime publication yet, so this
    // channel stays quiet and the poll below keeps the inbox current. If
    // realtime is enabled later, each change triggers one de-duplicated refresh.
    const channel = supabase
      .channel('supervisor-apollo-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'apollo_messages',
        },
        () => {
          void refreshApolloMessages();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void refreshApolloMessages();
    }, 10000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') void refreshApolloMessages();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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

  async function saveSubmittedTimecard(timecard: SubmittedTimecard) {
    const payload = {
      id: timecard.id,
      version_number: timecard.versionNumber ?? 1,
      parent_timecard_id: timecard.parentTimecardId ?? null,
      version_reason: timecard.versionReason ?? null,
      created_by_role: timecard.createdByRole ?? 'EMPLOYEE',
      created_by_employee_id: timecard.createdByEmployeeId ?? timecard.employeeId,
      supervisor_edit_at: timecard.supervisorEditAt ?? null,
      supervisor_edit_by: timecard.supervisorEditBy ?? null,
      supervisor_edit_comment: timecard.supervisorEditComment ?? null,
      employee_review_required: Boolean(timecard.employeeReviewRequired),
      employee_reviewed_at: timecard.employeeReviewedAt ?? null,
      employee_reviewed_by: timecard.employeeReviewedBy ?? null,
      employee_review_acknowledgement: timecard.employeeReviewAcknowledgement ?? null,
      employee_id: timecard.employeeId,
      employee_name: timecard.employeeName,
      pay_period_key: timecard.payPeriodKey,
      pay_period_start: timecard.payPeriodStart,
      pay_period_end: timecard.payPeriodEnd,
      submitted_at: timecard.submittedAt,
      total_hours: timecard.totalHours,
      pay_breakdown: timecard.payBreakdown ?? null,
      punches: timecard.punches ?? [],
      missed_meal_breaks: timecard.missedMealBreaks ?? [],
      corrections: timecard.corrections ?? [],
      additional_compensation: timecard.additionalCompensation ?? [],
      submission_acknowledgement: timecard.submissionAcknowledgement ?? null,
      note: timecard.note ?? '',
      status: timecard.status,
      supervisor_comment: timecard.supervisorComment ?? null,
      reviewed_at: timecard.reviewedAt ?? null,
      reviewed_by: timecard.reviewedBy ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('submitted_timecards')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      throw error;
    }

    setSubmittedTimecards((current) =>
      current.map((item) => (item.id === timecard.id ? timecard : item)),
    );
  }

  async function approveTimecard(timecardId: string) {
    if (payrollLocked) {
      window.alert(
        'This payroll period has been finalized and is locked. Reopen payroll before changing a timecard.',
      );
      return;
    }

    const timecard = submittedTimecards.find((item) => item.id === timecardId);

    if (!currentEmployee?.id) {
      window.alert('Apollo could not identify your supervisor profile, so this timecard cannot be approved. Reload the page or contact an administrator.');
      return;
    }

    if (timecard && isOwnTimecard(timecard.employeeId, currentEmployee.id)) {
      window.alert('You cannot approve your own timecard. It must be reviewed by another supervisor or GM.');
      return;
    }

    if (!timecard) {
      return;
    }

    const approvedTimecard: SubmittedTimecard = {
      ...timecard,
      status: 'APPROVED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: currentEmployee?.name ?? 'Supervisor',
      supervisorComment: '',
    };

    try {
      await saveSubmittedTimecard(approvedTimecard);
    } catch (error) {
      console.error('Failed to approve submitted timecard:', error);
      const message = error instanceof Error ? error.message : 'Unknown database error';
      window.alert(`Timecard approval failed: ${message}`);
    }
  }

  function saveApolloMessages(nextMessages: ApolloMessage[]) {
    const changedMessages = getChangedRecords(apolloMessages, nextMessages);
    setApolloMessages(nextMessages);

    if (changedMessages.length === 0) {
      return;
    }

    supabase
      .from('apollo_messages')
      .upsert(changedMessages.map(apolloMessageToRow), { onConflict: 'id' })
      .then(({ error }) => {
        if (error) {
          console.error('Failed to save Apollo messages:', error);
          window.alert('Failed to save Apollo message.');
        }
      });
  }

  const supervisorEmployeeIds = useMemo(() => {
    return employees
      .filter((employee) => employee.role === 'Supervisor')
      .map((employee) => employee.id);
  }, [employees]);

  const supervisorInboxIds = useMemo(() => {
    return Array.from(new Set([CURRENT_SUPERVISOR_ID, ...supervisorEmployeeIds]));
  }, [supervisorEmployeeIds]);

  const supervisorMessages = useMemo(() => {
    return apolloMessages
      .filter(
        (message) =>
          supervisorInboxIds.includes(message.senderId) ||
          message.recipients.some((recipient) => supervisorInboxIds.includes(recipient.employeeId)),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [apolloMessages, supervisorInboxIds]);

  const supervisorUnreadCount = supervisorMessages.filter(
    (message) =>
      !supervisorInboxIds.includes(message.senderId) &&
      message.recipients.some((recipient) => supervisorInboxIds.includes(recipient.employeeId) && !recipient.readAt),
  ).length;

  const employeeCertificationAlertCount = useMemo(() => {
    const expirationKeys = [
      'driversLicense',
      'ambulanceDriversLicense',
      'ahaBlsCpr',
      'medicalExaminerCertificate',
      'californiaParamedicLicense',
      'ccemsaParamedicLicense',
      'acls',
      'pals',
      'californiaEmtLicense',
      'ccemsaEmtLicense',
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return employees.filter((employee) => {
      const certs = employee.certifications ?? {};

      return expirationKeys.some((key) => {
        const value = certs[key];
        if (!value) return false;

        const expiration = new Date(`${value}T23:59:59`);
        if (Number.isNaN(expiration.getTime())) return false;

        const days = Math.ceil((expiration.getTime() - today.getTime()) / 86400000);
        return days <= 90;
      });
    }).length;
  }, [employees]);

  const supervisorConversations = useMemo(() => {
    const grouped = new Map<string, ApolloMessage[]>();

    supervisorMessages.forEach((message) => {
      const list = grouped.get(message.conversationId) ?? [];
      list.push(message);
      grouped.set(message.conversationId, list);
    });

    return Array.from(grouped.entries())
      .map(([conversationId, messages]) => ({
        conversationId,
        messages: messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        latest: messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0],
        unreadCount: messages.filter(
          (message) => message.senderId !== CURRENT_SUPERVISOR_ID && message.recipients.some((recipient) => recipient.employeeId === CURRENT_SUPERVISOR_ID && !recipient.readAt),
        ).length,
      }))
      .sort((a, b) => new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime());
  }, [supervisorMessages]);

  const filteredSupervisorConversations = useMemo(() => {
    const search = messageSearch.trim().toLowerCase();

    return supervisorConversations.filter((conversation) => {
      if (hideReadMessages && conversation.unreadCount === 0) return false;
      if (!search) return true;

      return [
        conversation.conversationId,
        conversation.latest.title,
        conversation.latest.body,
        conversation.latest.senderName,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }, [supervisorConversations, hideReadMessages, messageSearch]);

  const selectedSupervisorConversation =
    filteredSupervisorConversations.find((conversation) => conversation.conversationId === selectedConversationId) ?? filteredSupervisorConversations[0] ?? null;

  function getMessageStatus(message: ApolloMessage, viewerId: string): string {
    if (message.senderId !== viewerId) {
      const mine = message.recipients.find((recipient) => recipient.employeeId === viewerId);
      return mine?.readAt ? 'Read' : 'Delivered';
    }

    const recipientCount = message.recipients.length;
    const readCount = message.recipients.filter((recipient) => recipient.readAt).length;
    if (recipientCount > 0 && readCount === recipientCount) return 'Read';
    if (message.recipients.some((recipient) => recipient.deliveredAt)) return 'Delivered';
    return 'Sent';
  }

  function markSupervisorConversationRead(conversationId: string) {
    const now = new Date().toISOString();
    const updated = apolloMessages.map((message) => {
      if (message.conversationId !== conversationId) return message;
      return {
        ...message,
        recipients: message.recipients.map((recipient) =>
          recipient.employeeId === CURRENT_SUPERVISOR_ID && !recipient.readAt ? { ...recipient, readAt: now } : recipient,
        ),
      };
    });

    saveApolloMessages(updated);
  }

  function markAllSupervisorMessagesRead() {
    const now = new Date().toISOString();
    const updated = apolloMessages.map((message) => ({
      ...message,
      recipients: message.recipients.map((recipient) =>
        supervisorInboxIds.includes(recipient.employeeId) && !recipient.readAt ? { ...recipient, readAt: now } : recipient,
      ),
    }));

    saveApolloMessages(updated);
  }

  function getRecipientsForMode(mode: string): EmployeeOption[] {
    const activeEmployees = employees.filter((employee) => employee.status.toLowerCase() === 'active');
    if (mode === 'INDIVIDUAL') return activeEmployees.filter((employee) => employee.id === messageRecipientEmployeeId);
    if (mode === 'FULLTIME') return activeEmployees.filter((employee) => employee.employeeType.toLowerCase().includes('full'));
    if (mode === 'PERDIEM') return activeEmployees.filter((employee) => employee.employeeType.toLowerCase().includes('per'));
    if (mode === 'PARAMEDIC') return activeEmployees.filter((employee) => employee.role === 'Paramedic' || employee.scope === 'ALS');
    if (mode === 'EMT') return activeEmployees.filter((employee) => employee.role === 'EMT' || employee.scope === 'BLS');
    if (mode === 'SUPERVISORS') return activeEmployees.filter((employee) => employee.role === 'Supervisor');
    return activeEmployees;
  }

  function sendSupervisorMessage() {
    if (!messageSubject.trim() || !messageBody.trim()) {
      window.alert('Enter a subject and message before sending.');
      return;
    }

    const recipients = getRecipientsForMode(messageRecipientMode);
    if (recipients.length === 0) {
      window.alert('No recipients were found for that selection.');
      return;
    }

    const createdAt = new Date().toISOString();
    const message: ApolloMessage = {
      id: `message-${Date.now()}`,
      conversationId: `conversation-${Date.now()}`,
      senderId: CURRENT_SUPERVISOR_ID,
      senderName: 'Supervisor',
      senderRole: 'SUPERVISOR',
      recipients: recipients.map((employee) => ({
        employeeId: employee.id,
        deliveredAt: createdAt,
        readAt: null,
      })),
      audienceLabel: messageRecipientMode === 'INDIVIDUAL' ? recipients[0]?.name ?? 'Individual' : messageRecipientMode.replace('_', ' '),
      title: messageSubject.trim(),
      body: messageBody.trim(),
      createdAt,
      relatedType: messagePriority === 'URGENT' ? 'URGENT' : 'GENERAL',
      priority: messagePriority,
    };

    saveApolloMessages([message, ...apolloMessages]);

    void Promise.allSettled(
      recipients
        .filter((employee) => employee.email)
        .map((employee) =>
          fetch('/api/email/message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: employee.email,
              senderName: 'Supervisor',
              subject: message.title,
              message: message.body,
            }),
          }).then(async (response) => {
            if (!response.ok) {
              const details = await response.text();
              throw new Error(`Email notification failed for ${employee.email}: ${details}`);
            }
          }),
        ),
    ).then((results) => {
      const failed = results.filter((result) => result.status === 'rejected');
      if (failed.length > 0) {
        console.error('Some Apollo email notifications failed:', failed);
      }
    });

    setMessageSubject('');
    setMessageBody('');
    setMessageRecipientEmployeeId('');
    setMessageRecipientMode('ALL_ACTIVE');
    setMessagePriority('NORMAL');
    setSelectedConversationId(message.conversationId);
  }

  function sendSupervisorReply() {
    if (!selectedSupervisorConversation || !replyBody.trim()) {
      return;
    }

    const createdAt = new Date().toISOString();
    const existingParticipantIds = Array.from(
      new Set([
        ...selectedSupervisorConversation.messages.map((message) => message.senderId),
        ...selectedSupervisorConversation.messages.flatMap((message) => message.recipients.map((recipient) => recipient.employeeId)),
      ]),
    );

    const recipientIds = existingParticipantIds.filter((id) => id !== CURRENT_SUPERVISOR_ID);
    const reply: ApolloMessage = {
      id: `message-${Date.now()}`,
      conversationId: selectedSupervisorConversation.conversationId,
      senderId: CURRENT_SUPERVISOR_ID,
      senderName: 'Supervisor',
      senderRole: 'SUPERVISOR',
      recipients: recipientIds.map((employeeId) => ({
        employeeId,
        deliveredAt: createdAt,
        readAt: null,
      })),
      audienceLabel: selectedSupervisorConversation.latest.audienceLabel,
      title: selectedSupervisorConversation.latest.title,
      body: replyBody.trim(),
      createdAt,
      relatedType: selectedSupervisorConversation.latest.relatedType,
      relatedId: selectedSupervisorConversation.latest.relatedId,
      priority: selectedSupervisorConversation.latest.priority,
    };

    saveApolloMessages([reply, ...apolloMessages]);

    const recipientEmployees = employees.filter((employee) =>
      recipientIds.includes(employee.id) && employee.email,
    );

    void Promise.allSettled(
      recipientEmployees.map((employee) =>
        fetch('/api/email/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: employee.email,
            senderName: 'Supervisor',
            subject: reply.title,
            message: reply.body,
          }),
        }).then(async (response) => {
          if (!response.ok) {
            const details = await response.text();
            throw new Error(`Reply email notification failed for ${employee.email}: ${details}`);
          }
        }),
      ),
    ).then((results) => {
      const failed = results.filter((result) => result.status === 'rejected');
      if (failed.length > 0) {
        console.error('Some Apollo reply email notifications failed:', failed);
      }
    });

    setReplyBody('');
    setSelectedConversationId(selectedSupervisorConversation.conversationId);
  }

  const incidentReportCategories = useMemo(() => {
    return Array.from(new Set(
      incidentReports
        .filter((report) => report.category !== 'Check Request')
        .map((report) => report.category)
        .filter(Boolean),
    )).sort();
  }, [incidentReports]);

  const incidentReportSupervisors = useMemo(() => {
    return Array.from(new Set(incidentReports.map((report) => report.assigned_supervisor || 'Unassigned'))).sort();
  }, [incidentReports]);

  const filteredIncidentReports = useMemo(() => {
    const search = incidentReportSearch.trim().toLowerCase();

    return incidentReports.filter((report) => {
      if (report.category === 'Check Request') return false;
      const assignedSupervisor = report.assigned_supervisor || 'Unassigned';
      const searchText = [
        report.incident_number,
        report.employee_name,
        report.category,
        assignedSupervisor,
        report.status,
      ].join(' ').toLowerCase();

      return (
        (!search || searchText.includes(search)) &&
        (incidentReportStatusFilter === 'ALL' || report.status === incidentReportStatusFilter) &&
        (incidentReportCategoryFilter === 'ALL' || report.category === incidentReportCategoryFilter) &&
        (incidentReportSupervisorFilter === 'ALL' || assignedSupervisor === incidentReportSupervisorFilter)
      );
    });
  }, [
    incidentReportCategoryFilter,
    incidentReportSearch,
    incidentReportStatusFilter,
    incidentReportSupervisorFilter,
    incidentReports,
  ]);

  const openIncidentReports = useMemo(() => {
    return filteredIncidentReports.filter((report) => report.status !== 'CLOSED');
  }, [filteredIncidentReports]);

  const closedIncidentReports = useMemo(() => {
    return filteredIncidentReports.filter((report) => report.status === 'CLOSED');
  }, [filteredIncidentReports]);

  const selectedIncidentAuditEntries = useMemo(() => {
    const selectedReport = incidentReports.find((report) => report.id === selectedIncidentReportId);

    if (!selectedReport) {
      return [];
    }

    return auditLog.filter((entry) => entry.details.includes(selectedReport.incident_number));
  }, [auditLog, incidentReports, selectedIncidentReportId]);

  const pendingOpenShiftRequests = useMemo(() => {
    return openShiftRequests
      .filter((request) => request.status === 'PENDING')
      .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());
  }, [openShiftRequests]);

  const reviewedOpenShiftRequests = useMemo(() => {
    return openShiftRequests
      .filter((request) => request.status !== 'PENDING')
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [openShiftRequests]);

  function saveOpenShiftRequests(nextRequests: OpenShiftRequest[]) {
    const changedRequests = getChangedRecords(openShiftRequests, nextRequests);
    setOpenShiftRequests(nextRequests);

    if (changedRequests.length === 0) {
      return;
    }

    const rows = changedRequests.map((request) => ({
      id: request.id,
      employee_id: request.employeeId,
      employee_name: request.employeeName,
      date_key: request.dateKey,
      shift_key: request.shiftKey,
      shift_label: request.shiftLabel,
      pay_period_key: request.payPeriodKey,
      requested_at: request.requestedAt,
      status: request.status,
      supervisor_note: request.supervisorNote ?? null,
      updated_at: new Date().toISOString(),
    }));

    supabase
      .from('open_shift_requests')
      .upsert(rows, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) {
          console.error('Failed to save open shift requests:', error);
          window.alert('Failed to save open shift requests.');
        }
      });
  }

  function updateOpenShiftRequestStatus(requestId: string, status: OpenShiftRequest['status']) {
    const request = openShiftRequests.find((item) => item.id === requestId);
    if (!request) {
      return;
    }

    const confirmed =
      status === 'APPROVED'
        ? window.confirm(`Approve ${request.employeeName} for ${request.shiftLabel} on ${request.dateKey}? Confirm the final assignment on the Schedule page.`)
        : window.confirm(`Deny ${request.employeeName}'s request for ${request.shiftLabel} on ${request.dateKey}?`);

    if (!confirmed) {
      return;
    }

    const nextRequests = openShiftRequests.map((item) =>
      item.id === requestId
        ? {
            ...item,
            status,
            supervisorNote:
              status === 'APPROVED'
                ? 'Approved by supervisor. Confirm assignment on Schedule page.'
                : 'Denied by supervisor.',
          }
        : item,
    );

    saveOpenShiftRequests(nextRequests);
    addAuditEntry(
      status === 'APPROVED' ? 'OPEN_SHIFT_REQUEST_APPROVED' : 'OPEN_SHIFT_REQUEST_DENIED',
      `${request.employeeName} — ${request.shiftLabel} on ${request.dateKey}`,
    );
  }

  async function returnTimecard(timecardId: string) {
    if (payrollLocked) {
      window.alert(
        'This payroll period has been finalized and is locked. Reopen payroll before returning a timecard.',
      );
      return;
    }

    const timecard = submittedTimecards.find((item) => item.id === timecardId);
    const comment = (returnComments[timecardId] ?? '').trim();

    if (!timecard) {
      return;
    }

    if (!comment) {
      window.alert('Enter a message before returning this timecard for correction.');
      return;
    }

    const confirmed = window.confirm(
      'Return this timecard for correction and send this message to the employee through Apollo Messages?',
    );

    if (!confirmed) {
      return;
    }

    const returnedTimecard: SubmittedTimecard = {
      ...timecard,
      status: 'RETURNED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: currentEmployee?.name ?? 'Supervisor',
      supervisorComment: comment,
    };

    const createdAt = new Date().toISOString();
    const message: ApolloMessage = {
      id: `message-${Date.now()}`,
      conversationId: `timecard-${timecard.id}`,
      senderId: CURRENT_SUPERVISOR_ID,
      senderName: 'Supervisor',
      senderRole: 'SUPERVISOR',
      recipients: [
        {
          employeeId: timecard.employeeId,
          deliveredAt: createdAt,
          readAt: null,
        },
      ],
      audienceLabel: timecard.employeeName,
      title: 'Timecard Returned for Correction',
      body: `Your timecard for ${formatShortDate(new Date(timecard.payPeriodStart))} to ${formatShortDate(
        new Date(timecard.payPeriodEnd),
      )} was returned for correction.\n\nSupervisor message:\n${comment}`,
      createdAt,
      relatedType: 'TIMECARD_RETURNED',
      relatedId: timecard.id,
      priority: 'IMPORTANT',
    };

    try {
      await saveSubmittedTimecard(returnedTimecard);
      saveApolloMessages([message, ...apolloMessages]);

      setReturnComments((current) => ({
        ...current,
        [timecardId]: '',
      }));
    } catch (error) {
      console.error('Failed to return submitted timecard:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown database error';
      window.alert(`Timecard return failed: ${errorMessage}`);
    }
  }

  function normalizeSupervisorEditPayType(
    value: string | undefined,
  ): TimecardPayType {
    if (
      value === 'DAILY_OT_DT' ||
      value === 'TWENTY_FOUR_HOUR' ||
      value === 'CALL_IN' ||
      value === 'SICK_TIME' ||
      value === 'VACATION' ||
      value === 'JURY_DUTY'
    ) {
      return value;
    }

    return 'DAILY_OT_DT';
  }

  function buildSupervisorTimecardEditRows(
    timecard: SubmittedTimecard,
  ): SupervisorTimecardEditRow[] {
    const grouped = new Map<string, TimePunch[]>();

    [...timecard.punches]
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      .forEach((punch) => {
        const groupKey = punch.id
          .replace(/^editable-clock-in-/, '')
          .replace(/^editable-clock-out-/, '');

        grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), punch]);
      });

    return [...grouped.entries()]
      .map(([id, group]) => {
        const clockIn = group.find((punch) => punch.type === 'CLOCK_IN') ?? null;
        const clockOut =
          [...group].reverse().find((punch) => punch.type === 'CLOCK_OUT') ??
          null;

        return {
          id,
          shiftDateKey:
            clockIn?.shiftDateKey ?? clockOut?.shiftDateKey ?? '',
          shiftLabel: clockIn?.shiftLabel ?? clockOut?.shiftLabel ?? '',
          payType: normalizeSupervisorEditPayType(
            clockIn?.payType ?? clockOut?.payType,
          ),
          clockInValue: formatDateTimeLocalInput(clockIn?.timestamp),
          clockOutValue: formatDateTimeLocalInput(clockOut?.timestamp),
          clockInId: clockIn?.id ?? null,
          clockOutId: clockOut?.id ?? null,
        };
      })
      .filter((row) => row.shiftDateKey)
      .sort((a, b) =>
        `${a.shiftDateKey}|${a.clockInValue}`.localeCompare(
          `${b.shiftDateKey}|${b.clockInValue}`,
        ),
      );
  }

  function startSupervisorTimecardEdit(timecard: SubmittedTimecard) {
    const rows = buildSupervisorTimecardEditRows(timecard);

    if (rows.length === 0) {
      window.alert(
        'This submitted timecard has no punch rows to edit. Return it to the employee so the missing shift can be entered.',
      );
      return;
    }

    setEditingTimecardId(timecard.id);
    setSupervisorEditRows(rows);
    setSupervisorEditReason('');
  }

  function cancelSupervisorTimecardEdit() {
    setEditingTimecardId(null);
    setSupervisorEditRows([]);
    setSupervisorEditReason('');
  }

  function updateSupervisorTimecardEditRow(
    rowId: string,
    updates: Partial<SupervisorTimecardEditRow>,
  ) {
    setSupervisorEditRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...updates } : row)),
    );
  }

  function getSupervisorEditRowHours(
    row: SupervisorTimecardEditRow,
  ): number {
    if (!row.clockInValue || !row.clockOutValue) {
      return 0;
    }

    const start = new Date(row.clockInValue);
    const end = new Date(row.clockOutValue);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return 0;
    }

    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  function calculateSupervisorEditPayBreakdown(
    timecard: SubmittedTimecard,
    rows: SupervisorTimecardEditRow[],
  ): PayBreakdown {
    let week1 = { regularHours: 0, overtimeHours: 0, doubleTimeHours: 0 };
    let week2 = { regularHours: 0, overtimeHours: 0, doubleTimeHours: 0 };
    const weeklyOtTrackedHours = [0, 0];
    let holidayPremiumHours = 0;
    const payPeriodStartKey = makeDateInputValue(
      new Date(timecard.payPeriodStart),
    );
    const payPeriodStart = new Date(`${payPeriodStartKey}T12:00:00`);

    [...rows]
      .sort((a, b) =>
        `${a.shiftDateKey}|${a.clockInValue}`.localeCompare(
          `${b.shiftDateKey}|${b.clockInValue}`,
        ),
      )
      .forEach((row) => {
        const hours = getSupervisorEditRowHours(row);

        if (!hours || !row.shiftLabel.trim()) {
          return;
        }

        const shiftDate = new Date(`${row.shiftDateKey}T12:00:00`);
        const dayIndex = Math.round(
          (shiftDate.getTime() - payPeriodStart.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        const weekIndex = dayIndex < 7 ? 0 : 1;
        const targetWeek = weekIndex === 0 ? week1 : week2;
        let nextWeek = targetWeek;

        if (
          row.payType === 'SICK_TIME' ||
          row.payType === 'VACATION' ||
          row.payType === 'JURY_DUTY'
        ) {
          nextWeek = {
            ...targetWeek,
            regularHours: targetWeek.regularHours + hours,
          };
        } else if (
          row.payType === 'DAILY_OT_DT' ||
          row.payType === 'CALL_IN'
        ) {
          const doubleTimeHours = Math.max(0, hours - 12);
          const nonDoubleTimeHours = Math.max(0, hours - doubleTimeHours);
          const dailyOvertimeFloor = Math.max(
            0,
            Math.min(nonDoubleTimeHours, 12) - 8,
          );
          const weeklyRegularRemaining = Math.max(
            0,
            40 - weeklyOtTrackedHours[weekIndex],
          );
          const regularHours = Math.min(
            nonDoubleTimeHours - dailyOvertimeFloor,
            weeklyRegularRemaining,
          );
          const overtimeHours = Math.max(
            0,
            nonDoubleTimeHours - regularHours,
          );

          weeklyOtTrackedHours[weekIndex] += nonDoubleTimeHours;
          nextWeek = {
            regularHours: targetWeek.regularHours + regularHours,
            overtimeHours: targetWeek.overtimeHours + overtimeHours,
            doubleTimeHours: targetWeek.doubleTimeHours + doubleTimeHours,
          };
        } else {
          const regularRemainingThisWeek = Math.max(
            0,
            40 - weeklyOtTrackedHours[weekIndex],
          );
          const regularHours = Math.min(hours, regularRemainingThisWeek);
          const overtimeHours = Math.max(0, hours - regularHours);

          weeklyOtTrackedHours[weekIndex] += hours;
          nextWeek = {
            regularHours: targetWeek.regularHours + regularHours,
            overtimeHours: targetWeek.overtimeHours + overtimeHours,
            doubleTimeHours: targetWeek.doubleTimeHours,
          };
        }

        if (isCompanyHoliday(shiftDate)) {
          if (row.payType === 'TWENTY_FOUR_HOUR') {
            holidayPremiumHours += 12;
          } else if (row.payType === 'DAILY_OT_DT') {
            holidayPremiumHours += 6;
          }
        }

        if (weekIndex === 0) {
          week1 = nextWeek;
        } else {
          week2 = nextWeek;
        }
      });

    return {
      regularHours: week1.regularHours + week2.regularHours,
      overtimeHours: week1.overtimeHours + week2.overtimeHours,
      doubleTimeHours: week1.doubleTimeHours + week2.doubleTimeHours,
      holidayPremiumHours,
      missedMealPenaltyHours: timecard.missedMealBreaks.length,
      week1,
      week2,
    };
  }

  function payBreakdownChanged(
    previous: PayBreakdown,
    next: PayBreakdown,
  ): boolean {
    const values = [
      [previous.regularHours, next.regularHours],
      [previous.overtimeHours, next.overtimeHours],
      [previous.doubleTimeHours, next.doubleTimeHours],
      [previous.holidayPremiumHours, next.holidayPremiumHours],
      [previous.missedMealPenaltyHours, next.missedMealPenaltyHours],
      [previous.week1.regularHours, next.week1.regularHours],
      [previous.week1.overtimeHours, next.week1.overtimeHours],
      [previous.week1.doubleTimeHours, next.week1.doubleTimeHours],
      [previous.week2.regularHours, next.week2.regularHours],
      [previous.week2.overtimeHours, next.week2.overtimeHours],
      [previous.week2.doubleTimeHours, next.week2.doubleTimeHours],
    ];

    return values.some(([before, after]) => Math.abs(before - after) > 0.001);
  }

  function formatSupervisorEditAuditValue(value: string): string {
    if (!value) {
      return 'Missing';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  async function saveSupervisorTimecardEdit(timecard: SubmittedTimecard) {
    if (payrollLocked) {
      window.alert(
        'This payroll period has been finalized and is locked. Reopen payroll before editing a timecard.',
      );
      return;
    }

    const reason = supervisorEditReason.trim();

    if (!reason) {
      window.alert('Enter a required correction reason before saving.');
      return;
    }

    const invalidRow = supervisorEditRows.find((row) => {
      if (!row.shiftLabel.trim() || !row.clockInValue || !row.clockOutValue) {
        return true;
      }

      return getSupervisorEditRowHours(row) <= 0;
    });

    if (invalidRow) {
      window.alert(
        `Complete a valid shift, clock-in, and clock-out for ${invalidRow.shiftDateKey}. Clock-out must be after clock-in.`,
      );
      return;
    }

    const originalPunchById = new Map(
      timecard.punches.map((punch) => [punch.id, punch]),
    );
    const changeDescriptions: string[] = [];
    const correctedPunches: TimePunch[] = [];
    let compensationRelevantChangeDetected = false;

    supervisorEditRows.forEach((row) => {
      const originalClockIn = row.clockInId
        ? originalPunchById.get(row.clockInId) ?? null
        : null;
      const originalClockOut = row.clockOutId
        ? originalPunchById.get(row.clockOutId) ?? null
        : null;
      const originalShiftLabel =
        originalClockIn?.shiftLabel ?? originalClockOut?.shiftLabel ?? '';
      const originalPayType = normalizeSupervisorEditPayType(
        originalClockIn?.payType ?? originalClockOut?.payType,
      );
      const originalClockInValue = formatDateTimeLocalInput(
        originalClockIn?.timestamp,
      );
      const originalClockOutValue = formatDateTimeLocalInput(
        originalClockOut?.timestamp,
      );
      const rowChanges: string[] = [];

      if (originalShiftLabel !== row.shiftLabel.trim()) {
        rowChanges.push(
          `shift “${originalShiftLabel || 'Missing'}” → “${row.shiftLabel.trim()}”`,
        );
      }

      if (originalPayType !== row.payType) {
        compensationRelevantChangeDetected = true;
        rowChanges.push(
          `pay type ${getPayTypeLabel(originalPayType)} → ${getPayTypeLabel(row.payType)}`,
        );
      }

      if (originalClockInValue !== row.clockInValue) {
        compensationRelevantChangeDetected = true;
        rowChanges.push(
          `clock-in ${formatSupervisorEditAuditValue(originalClockInValue)} → ${formatSupervisorEditAuditValue(row.clockInValue)}`,
        );
      }

      if (originalClockOutValue !== row.clockOutValue) {
        compensationRelevantChangeDetected = true;
        rowChanges.push(
          `clock-out ${formatSupervisorEditAuditValue(originalClockOutValue)} → ${formatSupervisorEditAuditValue(row.clockOutValue)}`,
        );
      }

      const rowWasChanged = rowChanges.length > 0;

      if (rowWasChanged) {
        changeDescriptions.push(
          `${row.shiftDateKey}: ${rowChanges.join(', ')}`,
        );
      }

      const buildCorrectedPunch = (
        type: TimePunch['type'],
        value: string,
        originalPunch: TimePunch | null,
      ): TimePunch => ({
        id:
          originalPunch?.id ??
          `editable-${type === 'CLOCK_IN' ? 'clock-in' : 'clock-out'}-${row.id}`,
        employeeId: timecard.employeeId,
        type,
        timestamp:
          originalPunch &&
          formatDateTimeLocalInput(originalPunch.timestamp) === value
            ? originalPunch.timestamp
            : new Date(value).toISOString(),
        shiftDateKey: row.shiftDateKey,
        shiftLabel: row.shiftLabel.trim(),
        payType: row.payType,
        locationLabel: rowWasChanged
          ? 'Supervisor corrected timecard'
          : originalPunch?.locationLabel ?? 'Submitted timecard',
        latitude: originalPunch?.latitude ?? null,
        longitude: originalPunch?.longitude ?? null,
        distanceFeet: originalPunch?.distanceFeet ?? null,
        geofenceStatus: rowWasChanged
          ? 'LOCATION_UNAVAILABLE'
          : originalPunch?.geofenceStatus ?? 'LOCATION_UNAVAILABLE',
      });

      correctedPunches.push(
        buildCorrectedPunch('CLOCK_IN', row.clockInValue, originalClockIn),
        buildCorrectedPunch('CLOCK_OUT', row.clockOutValue, originalClockOut),
      );
    });

    if (changeDescriptions.length === 0) {
      window.alert('No timecard changes were detected.');
      return;
    }

    const previousPayBreakdown = getPayBreakdown(timecard);
    const recalculatedPayBreakdown = calculateSupervisorEditPayBreakdown(
      timecard,
      supervisorEditRows,
    );
    const recalculatedTotalHours = supervisorEditRows.reduce(
      (total, row) => total + getSupervisorEditRowHours(row),
      0,
    );
    const affectsCompensation =
      compensationRelevantChangeDetected &&
      (Math.abs(recalculatedTotalHours - timecard.totalHours) > 0.001 ||
        payBreakdownChanged(previousPayBreakdown, recalculatedPayBreakdown));
    const nextPayBreakdown = compensationRelevantChangeDetected
      ? recalculatedPayBreakdown
      : previousPayBreakdown;
    const nextTotalHours = compensationRelevantChangeDetected
      ? recalculatedTotalHours
      : timecard.totalHours;
    const correctedAt = new Date().toISOString();
    const correctedBy = currentEmployee?.name ?? 'Supervisor';
    const correctionType = affectsCompensation
      ? 'Compensation-affecting correction'
      : 'Administrative correction';
    const supervisorComment =
      `${correctionType} by ${correctedBy} on ${new Date(correctedAt).toLocaleString('en-US')}.\n` +
      `Reason: ${reason}\n` +
      `Changes: ${changeDescriptions.join(' | ')}`;
    // Next number across every record for this employee and pay period, so a
    // correction never reuses a version number already in the audit trail.
    const nextVersionNumber = getNextTimecardVersionNumber(
      submittedTimecards.filter(
        (item) => item.employeeId === timecard.employeeId && item.payPeriodKey === timecard.payPeriodKey,
      ),
    );
    const correctedTimecard: SubmittedTimecard = {
      ...timecard,
      id: crypto.randomUUID(),
      versionNumber: nextVersionNumber,
      parentTimecardId: timecard.id,
      versionReason: affectsCompensation
        ? 'SUPERVISOR_COMPENSATION_CORRECTION'
        : 'SUPERVISOR_ADMINISTRATIVE_CORRECTION',
      createdByRole: 'SUPERVISOR',
      createdByEmployeeId: currentEmployee?.id ?? CURRENT_SUPERVISOR_EMPLOYEE_ID,
      supervisorEditAt: correctedAt,
      supervisorEditBy: currentEmployee?.name ?? 'Supervisor',
      supervisorEditComment: supervisorComment,
      employeeReviewRequired: affectsCompensation,
      employeeReviewedAt: undefined,
      employeeReviewedBy: undefined,
      employeeReviewAcknowledgement: null,
      totalHours: nextTotalHours,
      payBreakdown: nextPayBreakdown,
      punches: correctedPunches,
      submissionAcknowledgement: timecard.submissionAcknowledgement,
      status: 'PENDING_SUPERVISOR_REVIEW',
      supervisorComment,
      reviewedAt: undefined,
      reviewedBy: undefined,
      submittedAt: correctedAt,
    };
    const auditEntry: AuditLogEntry = {
      id: `audit-timecard-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: correctedAt,
      actor: correctedBy,
      action: 'TIMECARD_SUPERVISOR_EDITED',
      details:
        `${timecard.employeeName} — ${correctionType}. Reason: ${reason}. ` +
        `Total hours ${timecard.totalHours.toFixed(2)} → ${nextTotalHours.toFixed(2)}. ` +
        `Original and corrected values: ${changeDescriptions.join(' | ')}`,
    };

    setIsSavingSupervisorEdit(true);

    try {
      await saveSubmittedTimecard(correctedTimecard);

      const { error: auditError } = await supabase.from('audit_logs').insert({
        id: auditEntry.id,
        timestamp: auditEntry.timestamp,
        actor: auditEntry.actor,
        action: auditEntry.action,
        details: auditEntry.details,
      });

      if (auditError) {
        const { error: cleanupError } = await supabase
          .from('submitted_timecards')
          .delete()
          .eq('id', correctedTimecard.id);

        if (cleanupError) {
          console.error('Failed to remove unsafely-audited correction version:', cleanupError);
        }

        throw new Error(
          `The correction audit could not be saved, so Apollo did not publish the new correction version. ${auditError.message}`,
        );
      }

      setSubmittedTimecards((current) => [
        correctedTimecard,
        ...current,
      ]);
      setAuditLog((current) => [auditEntry, ...current]);

      cancelSupervisorTimecardEdit();
      setSelectedTimecardId(null);
      window.alert(
        affectsCompensation
          ? 'The correction was saved and audited. The timecard remains pending supervisor review and may now be approved.'
          : 'The administrative correction was saved. The timecard remains pending review and may now be approved.',
      );
    } catch (error) {
      console.error('Failed to save supervisor timecard correction:', error);
      const message = error instanceof Error ? error.message : 'Unknown database error';
      window.alert(`Timecard correction failed: ${message}`);
    } finally {
      setIsSavingSupervisorEdit(false);
    }
  }

  function getPunchPairForDate(timecard: SubmittedTimecard, dateKey: string) {
    const pairs = getPunchPairsForDate(timecard, dateKey);
    return pairs[0] ?? { clockIn: null, clockOut: null, shiftLabel: '' };
  }

  function getPunchPairsForDate(timecard: SubmittedTimecard, dateKey: string) {
    const punches = timecard.punches
      .filter((punch) => punch.shiftDateKey === dateKey)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const grouped = new Map<string, TimePunch[]>();

    punches.forEach((punch) => {
      const groupKey = punch.id
        .replace(/^editable-clock-in-/, '')
        .replace(/^editable-clock-out-/, '');
      grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), punch]);
    });

    return [...grouped.values()].map((group) => {
      const clockIn = group.find((punch) => punch.type === 'CLOCK_IN') ?? null;
      const clockOut = [...group].reverse().find((punch) => punch.type === 'CLOCK_OUT') ?? null;
      const shiftLabel = clockIn?.shiftLabel ?? clockOut?.shiftLabel ?? '';
      const payType = clockIn?.payType ?? clockOut?.payType ?? '';

      return { clockIn, clockOut, shiftLabel, payType };
    });
  }

  function getPayTypeLabel(payType: string | undefined): string {
    const labels: Record<string, string> = {
      DAILY_OT_DT: 'Non 24-Shift',
      TWENTY_FOUR_HOUR: '24-Hour Shift',
      CALL_IN: 'Call In',
      SICK_TIME: 'Sick Time',
      VACATION: 'Vacation',
      JURY_DUTY: 'Jury Duty',
    };

    return payType ? labels[payType] ?? payType : '';
  }

  function getHoursBetween(clockIn: TimePunch | null, clockOut: TimePunch | null): string {
    if (!clockIn || !clockOut) {
      return '';
    }

    const start = new Date(clockIn.timestamp);
    const end = new Date(clockOut.timestamp);
    const hours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
    return hours.toFixed(2);
  }

  function getPayBreakdown(timecard: SubmittedTimecard): PayBreakdown {
    const stored = timecard.payBreakdown;
    const totalHours = Number(timecard.totalHours ?? 0);
    const week1 = stored?.week1;
    const week2 = stored?.week2;

    return {
      regularHours: Number(stored?.regularHours ?? totalHours),
      overtimeHours: Number(stored?.overtimeHours ?? 0),
      doubleTimeHours: Number(stored?.doubleTimeHours ?? 0),
      holidayPremiumHours: Number(stored?.holidayPremiumHours ?? 0),
      missedMealPenaltyHours: Number(
        stored?.missedMealPenaltyHours ?? timecard.missedMealBreaks.length,
      ),
      week1: {
        regularHours: Number(week1?.regularHours ?? totalHours),
        overtimeHours: Number(week1?.overtimeHours ?? 0),
        doubleTimeHours: Number(week1?.doubleTimeHours ?? 0),
      },
      week2: {
        regularHours: Number(week2?.regularHours ?? 0),
        overtimeHours: Number(week2?.overtimeHours ?? 0),
        doubleTimeHours: Number(week2?.doubleTimeHours ?? 0),
      },
    };
  }

  function hasManualEditFlag(timecard: SubmittedTimecard): boolean {
    return timecard.punches.some((punch) => punch.locationLabel === 'Employee edited timecard');
  }

  function hasSupervisorEditFlag(timecard: SubmittedTimecard): boolean {
    return timecard.punches.some(
      (punch) => punch.locationLabel === 'Supervisor corrected timecard',
    );
  }

  function hasGeofenceReviewFlag(timecard: SubmittedTimecard): boolean {
    return timecard.punches.some((punch) => punch.geofenceStatus !== 'APPROVED');
  }

  function hasMissingPunchFlag(timecard: SubmittedTimecard, weeks: { label: string; dates: Date[] }[]): boolean {
    return weeks.some((week) =>
      week.dates.some((date) => {
        const pair = getPunchPairForDate(timecard, getDateKeyFromDate(date));
        return Boolean(pair.shiftLabel && (!pair.clockIn || !pair.clockOut));
      }),
    );
  }

  function normalizeShiftLabelForReview(value: string | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }

  // 8,000+ schedule rows; index them once instead of scanning per timecard.
  const scheduleAssignmentsByEmployeeId = useMemo(() => {
    const byEmployeeId = new Map<string, any[]>();
    scheduleAssignments.forEach((row) => {
      if (!row.employee_id) return;
      const list = byEmployeeId.get(row.employee_id) ?? [];
      list.push(row);
      byEmployeeId.set(row.employee_id, list);
    });
    return byEmployeeId;
  }, [scheduleAssignments]);

  function getScheduleMatchStatus(timecard: SubmittedTimecard): 'MATCH' | 'REVIEW' {
    if (
      hasManualEditFlag(timecard) ||
      hasSupervisorEditFlag(timecard) ||
      hasGeofenceReviewFlag(timecard) ||
      timecard.missedMealBreaks.length > 0
    ) {
      return 'REVIEW';
    }

    const startKey = makeDateInputValue(new Date(timecard.payPeriodStart));
    const endKey = makeDateInputValue(new Date(timecard.payPeriodEnd));

    const scheduledRows = (scheduleAssignmentsByEmployeeId.get(timecard.employeeId) ?? []).filter(
      (row) =>
        row.date_key >= startKey &&
        row.date_key <= endKey &&
        !row.is_open_slot,
    );

    if (scheduledRows.length === 0) {
      return timecard.punches.length === 0 ? 'MATCH' : 'REVIEW';
    }

    const scheduledKeys = new Set(
      scheduledRows.map((row) => `${row.date_key}|${normalizeShiftLabelForReview(row.shift_label)}`),
    );

    const punchKeys = new Set(
      timecard.punches
        .filter((punch) => punch.shiftDateKey && punch.shiftLabel)
        .map((punch) => `${punch.shiftDateKey}|${normalizeShiftLabelForReview(punch.shiftLabel)}`),
    );

    const missingScheduledPunch = [...scheduledKeys].some((key) => !punchKeys.has(key));
    const unscheduledPunch = [...punchKeys].some((key) => !scheduledKeys.has(key));

    const missingClockPair = scheduledRows.some((row) => {
      const pair = getPunchPairForDate(timecard, row.date_key);
      return (
        normalizeShiftLabelForReview(pair.shiftLabel) === normalizeShiftLabelForReview(row.shift_label) &&
        (!pair.clockIn || !pair.clockOut)
      );
    });

    return missingScheduledPunch || unscheduledPunch || missingClockPair ? 'REVIEW' : 'MATCH';
  }

  function getDateKeyFromDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async function saveIncidentReportWorkflow(report: IncidentReport) {
    setIncidentReportSaveStatus('Saving incident report...');

    try {
      const response = await fetch('/api/incident-reports/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: report.id,
          status: incidentReportStatusDraft,
          assignedSupervisor: incidentReportAssignedSupervisorDraft,
          supervisorNotes: incidentReportNotesDraft,
          closedBy: currentEmployee?.name ?? 'Supervisor',
        }),
      });

      if (!response.ok) {
        throw new Error('Incident report update failed.');
      }

      const data = await response.json();
      const updatedReport = data.incidentReport as IncidentReport;
      const actorName = currentEmployee?.name ?? 'Supervisor';
      const previousAssignedSupervisor = report.assigned_supervisor || 'Unassigned';
      const nextAssignedSupervisor = updatedReport.assigned_supervisor || 'Unassigned';

      if (report.status === 'CLOSED' && updatedReport.status === 'IN_REVIEW') {
        await addAuditEntry(
          'INCIDENT_REOPENED',
          `${updatedReport.incident_number}: Closed report reopened by ${actorName}`,
        );
      } else if (report.status !== updatedReport.status) {
        await addAuditEntry(
          'INCIDENT_STATUS_CHANGED',
          `${updatedReport.incident_number}: ${report.status} → ${updatedReport.status} by ${actorName}`,
        );
      }

      if (previousAssignedSupervisor !== nextAssignedSupervisor) {
        await addAuditEntry(
          'INCIDENT_REASSIGNED',
          `${updatedReport.incident_number}: ${previousAssignedSupervisor} → ${nextAssignedSupervisor} by ${actorName}`,
        );
      }

      if (
        report.status !== 'PENDING_EMPLOYEE_RESPONSE' &&
        updatedReport.status === 'PENDING_EMPLOYEE_RESPONSE'
      ) {
        const employee = employees.find(
          (item) => item.email.trim().toLowerCase() === (updatedReport.employee_email ?? '').trim().toLowerCase(),
        );

        if (employee) {
          const createdAt = new Date().toISOString();
          const followUpMessage: ApolloMessage = {
            id: `incident-follow-up-${updatedReport.id}-${Date.now()}`,
            conversationId: `incident-report-${updatedReport.id}`,
            senderId: CURRENT_SUPERVISOR_ID,
            senderName: actorName,
            senderRole: 'SUPERVISOR',
            recipients: [{
              employeeId: employee.id,
              deliveredAt: createdAt,
              readAt: null,
            }],
            audienceLabel: updatedReport.employee_name,
            title: `Incident Report Follow-Up: ${updatedReport.incident_number}`,
            body: incidentReportFollowUpDraft.trim() || `Additional information is needed for Incident Report ${updatedReport.incident_number}. Please reply to this ApolloEMS message with the requested clarification or follow-up documentation.`,
            createdAt,
            relatedType: 'INCIDENT_REPORT',
            relatedId: updatedReport.id,
            priority: 'IMPORTANT',
          };

          saveApolloMessages([followUpMessage, ...apolloMessages]);
        }

        await addAuditEntry(
          'INCIDENT_EMPLOYEE_RESPONSE_REQUESTED',
          `${updatedReport.incident_number}: Employee response requested by ${actorName}`,
        );
      }

      setIncidentReports((current) =>
        current.map((item) => (item.id === updatedReport.id ? updatedReport : item)),
      );
      setIncidentReportSaveStatus('Incident report saved.');
    } catch (error) {
      console.error('Failed to save incident report:', error);
      setIncidentReportSaveStatus('Unable to save incident report.');
    }
  }

  async function openIncidentAttachment(report: IncidentReport, download = false) {
    if (!report.attachment_path) {
      window.alert('No attachment is available for this incident report.');
      return;
    }

    try {
      const response = await fetch('/api/incident-reports/attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentPath: report.attachment_path }),
      });

      if (!response.ok) {
        throw new Error('Unable to open attachment.');
      }

      const data = await response.json();
      const signedUrl = data.signedUrl as string;

      if (download) {
        const link = document.createElement('a');
        link.href = signedUrl;
        link.download = report.attachment_name || 'incident-report-attachment';
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to open incident attachment:', error);
      window.alert('Unable to open attachment.');
    }
  }

  function printIncidentReport(report: IncidentReport) {
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      window.alert('Unable to open print window. Please allow pop-ups for ApolloEMS.');
      return;
    }

    const submittedAt = new Date(report.created_at).toLocaleString('en-US');

    printWindow.document.write(`
      <html>
        <head>
          <title>${report.incident_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            .sub { color: #475569; margin-bottom: 24px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin-bottom: 24px; }
            .label { font-weight: 700; }
            .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; white-space: pre-wrap; }
            .footer { margin-top: 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <h1>ApolloEMS Incident Report</h1>
          <div class="sub">${report.incident_number} • Submitted ${submittedAt}</div>

          <div class="grid">
            <div><span class="label">Employee:</span> ${report.employee_name}</div>
            <div><span class="label">Status:</span> ${report.status}</div>
            <div><span class="label">Phone:</span> ${report.employee_phone || '—'}</div>
            <div><span class="label">Email:</span> ${report.employee_email || '—'}</div>
            <div><span class="label">Category:</span> ${report.category}</div>
            <div><span class="label">Assigned To:</span> ${report.assigned_supervisor || 'Unassigned'}</div>
            <div><span class="label">Supervisor Notified:</span> ${report.supervisor_notified || '—'}</div>
            <div><span class="label">Supervisor Listed:</span> ${report.supervisor_name || '—'}</div>
            <div><span class="label">Attachment:</span> ${report.attachment_name || 'None'}</div>
            <div><span class="label">Attachment Type:</span> ${report.attachment_type || '—'}</div>
          </div>

          <h2>Narrative</h2>
          <div class="box">${report.narrative}</div>

          <div class="footer">ApolloEMS Incident Report • Generated ${new Date().toLocaleString('en-US')}</div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  function printTimecard(timecardId: string) {
    const printable = document.getElementById(`printable-${timecardId}`);
    if (!printable) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Timecard</title>
          <style>
            @page {
              size: letter landscape;
              margin: 0.25in;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #0f172a;
              font-size: 12px;
              line-height: 1.15;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              page-break-inside: avoid;
            }

            th,
            td {
              border: 1px solid #334155;
              padding: 2px 3px;
              text-align: center;
              vertical-align: middle;
            }

            .no-print {
              display: none !important;
            }

            .rounded-2xl,
            .rounded-xl {
              border-radius: 4px !important;
            }

            .p-5,
            .p-4,
            .p-3 {
              padding: 4px !important;
            }

            .mt-5,
            .mt-4,
            .mt-3,
            .mt-2,
            .mt-1,
            .mb-5,
            .mb-4,
            .mb-3,
            .mb-2,
            .mb-1 {
              margin-top: 3px !important;
              margin-bottom: 3px !important;
            }

            .grid {
              display: grid;
            }

            .md\\:grid-cols-2 {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .xl\\:grid-cols-5 {
              grid-template-columns: repeat(5, minmax(0, 1fr));
            }

            .text-xl {
              font-size: 16px !important;
            }

            .text-base,
            .text-sm {
              font-size: 12px !important;
            }

            .text-xs {
              font-size: 11px !important;
            }

            .overflow-auto {
              overflow: visible !important;
            }

            #print-root {
              width: 100%;
              max-height: 7.5in;
              overflow: hidden;
              page-break-after: avoid;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body><div id="print-root">${printable.innerHTML}</div></body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function reopenPayroll() {
    if (!payrollLocked || payrollActionPending) {
      return;
    }

    const confirmed = window.confirm(
      'Reopen this pay period? This will remove the payroll submission record and allow timecard changes again.',
    );

    if (!confirmed) {
      return;
    }

    setPayrollActionPending(true);

    try {
      const { error } = await supabase
        .from('payroll_submissions')
        .delete()
        .eq('pay_period_key', selectedPayPeriod.key);

      if (error) {
        throw error;
      }

      setPayrollSubmissionsByPeriod((current) => {
        const next = { ...current };
        delete next[selectedPayPeriod.key];
        return next;
      });

      await addAuditEntry(
        'PAYROLL_REOPENED',
        `Payroll reopened for ${formatShortDate(selectedPayPeriod.start)} to ${formatShortDate(selectedPayPeriod.end)}.`,
      );

      window.alert('Payroll reopened. Timecard changes are now allowed.');
    } catch (error) {
      console.error('Failed to reopen payroll:', error);
      const message =
        error instanceof Error ? error.message : 'Unknown database error';
      window.alert(`Payroll reopen failed: ${message}`);
    } finally {
      setPayrollActionPending(false);
    }
  }

  async function submitPayroll() {
    if (payrollLocked || payrollActionPending) {
      return;
    }
    const approvedCount = approvedTimecards.length;

    if (employeesNotSubmitted.length > 0) {
      window.alert('Payroll cannot be submitted. Employees still have missing timecards.');
      return;
    }

    if (pendingTimecards.length > 0 || resubmittedTimecards.length > 0) {
      window.alert('Payroll cannot be submitted. Timecards are still pending review.');
      return;
    }

    if (pendingResubmissionTimecards.length > 0) {
      window.alert(
        'Payroll cannot be submitted. Timecards are still pending employee resubmission.',
      );
      return;
    }

    if (approvedCount === 0) {
      window.alert('Payroll cannot be submitted. No approved timecards were found.');
      return;
    }

    const confirmed = window.confirm(
      `Submit payroll for ${approvedCount} approved timecard(s)?`
    );

    if (!confirmed) return;

    const submission = {
      submittedBy: currentEmployee?.name ?? 'Supervisor',
      submittedAt: new Date().toISOString(),
      payPeriodKey: selectedPayPeriod.key,
      approvedCount,
    };

    setPayrollActionPending(true);

    try {
      const { error } = await supabase
        .from('payroll_submissions')
        .upsert(
          {
            pay_period_key: submission.payPeriodKey,
            submitted_by: submission.submittedBy,
            submitted_at: submission.submittedAt,
            approved_timecards: submission.approvedCount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'pay_period_key' },
        );

      if (error) {
        throw error;
      }

      setPayrollSubmissionsByPeriod((current) => ({ ...current, [submission.payPeriodKey]: submission }));

      await addAuditEntry(
        'PAYROLL_SUBMITTED',
        `Payroll submitted for ${formatShortDate(selectedPayPeriod.start)} to ${formatShortDate(selectedPayPeriod.end)} (${approvedCount} approved timecards).`,
      );

      void fetch('/api/email/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'steve@sscems.org',
          senderName: submission.submittedBy,
          subject: `ApolloEMS Payroll Submitted - ${formatShortDate(selectedPayPeriod.start)} to ${formatShortDate(selectedPayPeriod.end)}`,
          message:
            `Payroll has been submitted in ApolloEMS.\n\n` +
            `Pay Period: ${formatShortDate(selectedPayPeriod.start)} to ${formatShortDate(selectedPayPeriod.end)}\n` +
            `Submitted By: ${submission.submittedBy}\n` +
            `Submitted At: ${new Date(submission.submittedAt).toLocaleString()}\n` +
            `Approved Timecards: ${submission.approvedCount}\n\n` +
            `Please log into ApolloEMS to review the payroll packet.`,
        }),
      }).catch((emailError) => {
        console.error('Payroll submission email failed:', emailError);
      });

      window.alert(
        'Payroll finalized and locked. Kira has been notified by email.',
      );
    } catch (error) {
      console.error('Failed to save payroll submission:', error);
      const message =
        error instanceof Error ? error.message : 'Unknown database error';
      window.alert(`Payroll submission failed: ${message}`);
    } finally {
      setPayrollActionPending(false);
    }
  }

  const [printPacketTimecards, setPrintPacketTimecards] = useState<SubmittedTimecard[] | null>(null);
  const printPacketContainerRef = useRef<HTMLDivElement>(null);

  function printTimecardPacket(
    packetCards: SubmittedTimecard[],
    packetTitle: string,
    emptyMessage: string,
  ) {
    if (packetCards.length === 0) {
      window.alert(emptyMessage);
      return;
    }

    // Render the packet's cards off-screen just long enough to copy their
    // markup, instead of keeping every card rendered at all times.
    flushSync(() => setPrintPacketTimecards(packetCards));
    const printContainer = printPacketContainerRef.current;

    const html = packetCards
      .map((timecard) => {
        const element = printContainer?.querySelector(`[id="printable-${CSS.escape(timecard.id)}"]`);
        if (!element) return '';

        return `
          <div class="payroll-packet-page">
            ${element.innerHTML}
          </div>
        `;
      })
      .join('');

    setPrintPacketTimecards(null);

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapePrintHtml(packetTitle)}</title>
          <style>
            @page {
              size: letter landscape;
              margin: 0.25in;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #0f172a;
              font-size: 12px;
              line-height: 1.15;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              page-break-inside: avoid;
            }

            th,
            td {
              border: 1px solid #334155;
              padding: 2px 3px;
              text-align: center;
              vertical-align: middle;
            }

            .no-print {
              display: none !important;
            }

            .payroll-packet-page {
              width: 100%;
              max-height: 7.5in;
              overflow: hidden;
              page-break-after: always;
              page-break-inside: avoid;
            }

            .payroll-packet-page:last-child {
              page-break-after: avoid;
            }

            .rounded-2xl,
            .rounded-xl {
              border-radius: 4px !important;
            }

            .p-5,
            .p-4,
            .p-3 {
              padding: 4px !important;
            }

            .mt-5,
            .mt-4,
            .mt-3,
            .mt-2,
            .mt-1,
            .mb-5,
            .mb-4,
            .mb-3,
            .mb-2,
            .mb-1 {
              margin-top: 3px !important;
              margin-bottom: 3px !important;
            }

            .grid {
              display: grid;
            }

            .md\\:grid-cols-2 {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .xl\\:grid-cols-5 {
              grid-template-columns: repeat(5, minmax(0, 1fr));
            }

            .text-xl {
              font-size: 16px !important;
            }

            .text-base,
            .text-sm {
              font-size: 12px !important;
            }

            .text-xs {
              font-size: 11px !important;
            }

            .overflow-auto {
              overflow: visible !important;
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function printAllTimecards() {
    printTimecardPacket(
      approvedTimecards,
      'Approved Payroll Packet',
      'No approved timecards are available for printing.',
    );
  }

  function printPendingResubmissions() {
    printTimecardPacket(
      pendingResubmissionTimecards,
      'Pending Resubmission Timecards — Not Approved',
      'No timecards are pending employee resubmission.',
    );
  }

  function getPayrollStatusLabel(status: PayrollStatus): string {
    const labels: Record<PayrollStatus, string> = {
      NOT_SUBMITTED: 'Not Submitted',
      PENDING_REVIEW: 'Pending Review',
      PENDING_RESUBMISSION: 'Pending Resubmission',
      APPROVED: 'Approved',
    };

    return labels[status];
  }

  function printPayrollStatusTracker() {
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      window.alert(
        'Unable to open the payroll status tracker. Please allow pop-ups for ApolloEMS.',
      );
      return;
    }

    const tableRows = payrollStatusRows
      .map(
        (row) => `
          <tr>
            <td>${escapePrintHtml(row.employeeName)}</td>
            <td class="status status-${row.status.toLowerCase()}">${escapePrintHtml(getPayrollStatusLabel(row.status))}</td>
            <td>${row.submittedAt ? escapePrintHtml(new Date(row.submittedAt).toLocaleString('en-US')) : '—'}</td>
          </tr>
        `,
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Payroll Status Tracker</title>
          <style>
            @page { size: letter portrait; margin: 0.5in; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
            h1 { font-size: 22px; margin: 0 0 6px; }
            .period { color: #475569; font-size: 13px; margin-bottom: 18px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
            .summary div { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; font-size: 12px; }
            .summary strong { display: block; font-size: 18px; margin-top: 3px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #94a3b8; padding: 7px; text-align: left; }
            th { background: #e2e8f0; }
            .status { font-weight: 700; }
            .status-not_submitted { color: #b91c1c; }
            .status-pending_review { color: #1d4ed8; }
            .status-pending_resubmission { color: #b45309; }
            .status-approved { color: #047857; }
            .footer { color: #64748b; font-size: 10px; margin-top: 12px; }
          </style>
        </head>
        <body>
          <h1>ApolloEMS Payroll Status Tracker</h1>
          <div class="period">Pay Period: ${escapePrintHtml(formatShortDate(selectedPayPeriod.start))} to ${escapePrintHtml(formatShortDate(selectedPayPeriod.end))}</div>
          <div class="summary">
            <div>Not Submitted<strong>${employeesNotSubmitted.length}</strong></div>
            <div>Pending Review<strong>${pendingTimecards.length}</strong></div>
            <div>Pending Resubmission<strong>${pendingResubmissionTimecards.length}</strong></div>
            <div>Approved<strong>${approvedTimecards.length}</strong></div>
          </div>
          <table>
            <thead><tr><th>Employee</th><th>Status</th><th>Last Submitted</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="footer">Generated ${escapePrintHtml(new Date().toLocaleString('en-US'))}. Pending resubmission timecards are not approved payroll records.</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function renderSubmittedTimecard(timecard: SubmittedTimecard) {
    const payPeriodStart = new Date(timecard.payPeriodStart);
    const allDates = Array.from({ length: 14 }, (_, index) => addDays(payPeriodStart, index));
    const weeks = [
      { label: 'Week-1', dates: allDates.slice(0, 7) },
      { label: 'Week-2', dates: allDates.slice(7, 14) },
    ];

    const breakdown = getPayBreakdown(timecard);
    const hasManualEdits = hasManualEditFlag(timecard);
    const hasSupervisorEdits = hasSupervisorEditFlag(timecard);
    const hasGeofenceFlags = hasGeofenceReviewFlag(timecard);
    const hasMissingPunches = hasMissingPunchFlag(timecard, weeks);
    const hasMissedMeals = timecard.missedMealBreaks.length > 0;
    const hasFlags = hasManualEdits || hasSupervisorEdits || hasGeofenceFlags || hasMissingPunches || hasMissedMeals;
    const isOwnSupervisorTimecard = isOwnTimecard(timecard.employeeId, currentEmployee?.id);
    const scheduleMatchStatus = getScheduleMatchStatus(timecard);

    return (
      <div id={`printable-${timecard.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
        {timecard.status === 'RETURNED' && (
          <div className="mb-4 rounded-xl border-2 border-amber-500 bg-amber-50 px-4 py-3 text-center text-sm font-black uppercase tracking-wide text-amber-900">
            Pending Resubmission — Not Approved
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-bold text-slate-900">{timecard.employeeName}</div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  scheduleMatchStatus === 'MATCH'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {scheduleMatchStatus === 'MATCH' ? 'Schedule Match' : 'Schedule Review Needed'}
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Pay Period: {formatShortDate(new Date(timecard.payPeriodStart))} to {formatShortDate(new Date(timecard.payPeriodEnd))}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Version: {timecard.versionNumber ?? 1}
              {timecard.parentTimecardId ? ' • Supervisor correction version' : ' • Original submission'}
            </div>
            {timecard.versionReason && (
              <div className="mt-1 text-xs font-semibold text-slate-500">
                {timecard.versionReason.replaceAll('_', ' ')}
              </div>
            )}
            <div className="mt-1 text-sm text-slate-600">
              Submitted: {new Date(timecard.submittedAt).toLocaleString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800">
              {timecard.totalHours.toFixed(2)} hrs
            </div>
            <div
              className={`rounded-xl px-3 py-2 text-sm font-bold ${
                timecard.status === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-700'
                  : timecard.status === 'RETURNED'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
              }`}
            >
              {timecard.status === 'PENDING_SUPERVISOR_REVIEW'
                ? 'Pending Review'
                : timecard.status === 'APPROVED'
                  ? 'Approved'
                  : 'Returned'}
            </div>
            {hasFlags && (
              <div className="rounded-xl bg-red-100 px-3 py-2 text-sm font-bold text-red-700">
                Review Flags
              </div>
            )}
            {isOwnSupervisorTimecard && (
              <div className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-700">
                Own Timecard — Needs Another Approver
              </div>
            )}
            {(timecard.status === 'APPROVED' || timecard.status === 'RETURNED') && (
              <button
                type="button"
                onClick={() => printTimecard(timecard.id)}
                className="no-print rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {timecard.status === 'RETURNED'
                  ? 'Print Pending Copy'
                  : 'Print / Save PDF'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Hours</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{timecard.totalHours.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Regular</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{breakdown.regularHours.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overtime</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{breakdown.overtimeHours.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Double Time</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{breakdown.doubleTimeHours.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Holiday Premium</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{(breakdown.holidayPremiumHours ?? 0).toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missed Meal</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{breakdown.missedMealPenaltyHours.toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Week 1</div>
            <div className="mt-1 text-sm text-slate-700">
              Reg {breakdown.week1.regularHours.toFixed(2)} • OT {breakdown.week1.overtimeHours.toFixed(2)} • DT {breakdown.week1.doubleTimeHours.toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Week 2</div>
            <div className="mt-1 text-sm text-slate-700">
              Reg {breakdown.week2.regularHours.toFixed(2)} • OT {breakdown.week2.overtimeHours.toFixed(2)} • DT {breakdown.week2.doubleTimeHours.toFixed(2)}
            </div>
          </div>
        </div>

        {hasFlags && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <div className="text-sm font-bold text-red-800">Supervisor Review Flags</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {hasManualEdits && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                  Manual Edit Detected
                </span>
              )}
              {hasSupervisorEdits && (
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                  Supervisor Correction Recorded
                </span>
              )}
              {hasGeofenceFlags && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                  Outside Geofence — Requires Supervisor Review
                </span>
              )}
              {hasMissingPunches && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                  Missing Punch
                </span>
              )}
              {hasMissedMeals && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                  Missed Meal Pending Approval
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 overflow-auto rounded-xl border border-slate-300">
          <div className="min-w-[1080px] p-4">
            {weeks.map((week) => (
              <div key={`${timecard.id}-${week.label}`} className="mb-5">
                <div className="border border-slate-400 bg-slate-100 py-1 text-center text-xs font-bold">
                  {week.label}
                </div>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th rowSpan={2} className="border border-slate-400 bg-slate-50 px-2 py-1">Shift #</th>
                      <th rowSpan={2} className="border border-slate-400 bg-slate-50 px-2 py-1">Shift</th>
                      <th rowSpan={2} className="border border-slate-400 bg-slate-50 px-2 py-1">Pay Type</th>
                      <th colSpan={2} className="border border-slate-400 bg-slate-50 px-2 py-1">Date &amp; Time In</th>
                      <th colSpan={2} className="border border-slate-400 bg-slate-50 px-2 py-1">Date &amp; Time Out</th>
                      <th rowSpan={2} className="border border-slate-400 bg-slate-50 px-2 py-1">Total Hours</th>
                      <th rowSpan={2} className="border border-slate-400 bg-slate-50 px-2 py-1">Flag</th>
                    </tr>
                    <tr>
                      <th className="border border-slate-400 bg-slate-50 px-2 py-1">Date</th>
                      <th className="border border-slate-400 bg-slate-50 px-2 py-1">Time</th>
                      <th className="border border-slate-400 bg-slate-50 px-2 py-1">Date</th>
                      <th className="border border-slate-400 bg-slate-50 px-2 py-1">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.dates.flatMap((date, index) => {
                      const dateKey = getDateKeyFromDate(date);
                      const pairs = getPunchPairsForDate(timecard, dateKey);
                      const rows = pairs.length > 0 ? pairs : [{ clockIn: null, clockOut: null, shiftLabel: '', payType: '' }];

                      return rows.map((pair, pairIndex) => {
                        const clockInDate = pair.clockIn ? new Date(pair.clockIn.timestamp) : null;
                        const clockOutDate = pair.clockOut ? new Date(pair.clockOut.timestamp) : null;
                        const hasMissingPunch = Boolean(pair.shiftLabel && (!pair.clockIn || !pair.clockOut));
                        const hasGeofenceFlag = Boolean(
                          pair.clockIn?.geofenceStatus !== 'APPROVED' || pair.clockOut?.geofenceStatus !== 'APPROVED',
                        );
                        const hasManualEdit = Boolean(
                          pair.clockIn?.locationLabel === 'Employee edited timecard' ||
                            pair.clockOut?.locationLabel === 'Employee edited timecard',
                        );
                        const hasSupervisorEdit = Boolean(
                          pair.clockIn?.locationLabel === 'Supervisor corrected timecard' ||
                            pair.clockOut?.locationLabel === 'Supervisor corrected timecard',
                        );

                        return (
                          <tr key={`${timecard.id}-${week.label}-${dateKey}-${pairIndex}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}>
                            <td className="border border-slate-400 px-2 py-1 text-center font-semibold">
                              {pairIndex === 0 ? index + 1 : '↳'}
                            </td>
                            <td className="border border-slate-400 px-2 py-1 text-center">{pair.shiftLabel}</td>
                            <td className="border border-slate-400 px-2 py-1 text-center font-semibold">{getPayTypeLabel(pair.payType)}</td>
                            <td className="border border-slate-400 px-2 py-1 text-center">{clockInDate ? formatShortDate(clockInDate) : ''}</td>
                            <td className="border border-slate-400 px-2 py-1 text-center">
                              {clockInDate ? clockInDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
                            </td>
                            <td className="border border-slate-400 px-2 py-1 text-center">{clockOutDate ? formatShortDate(clockOutDate) : ''}</td>
                            <td className="border border-slate-400 px-2 py-1 text-center">
                              {clockOutDate ? clockOutDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
                            </td>
                            <td className="border border-slate-400 px-2 py-1 text-center font-semibold">{getHoursBetween(pair.clockIn, pair.clockOut)}</td>
                            <td className="border border-slate-400 px-2 py-1 text-center">
                              {hasMissingPunch ? (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-700">Missing</span>
                              ) : hasGeofenceFlag ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">Geofence</span>
                              ) : hasManualEdit ? (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 font-bold text-blue-700">Edited</span>
                              ) : hasSupervisorEdit ? (
                                <span className="rounded-full bg-violet-100 px-2 py-0.5 font-bold text-violet-700">Supervisor</span>
                              ) : pair.shiftLabel ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">OK</span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            ))}

            {timecard.missedMealBreaks.length > 0 && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="text-sm font-bold text-amber-800">Missed Meal Breaks</div>
                <div className="mt-2 space-y-2">
                  {timecard.missedMealBreaks.map((item) => (
                    <div key={item.id} className="text-sm text-amber-800">
                      <span className="font-semibold">{item.dateKey}:</span> {item.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {timecard.submissionAcknowledgement && (
              <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-emerald-950">
                      Employee Submission Acknowledgement
                    </div>

                    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                      {timecard.submissionAcknowledgement.submissionAction ===
                      'RESUBMITTED'
                        ? 'Timecard Resubmitted'
                        : 'Timecard Submitted'}
                    </div>
                  </div>

                  <div className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-right text-xs text-slate-700">
                    <div className="font-bold text-slate-900">
                      {timecard.submissionAcknowledgement.employeeName}
                    </div>

                    <div>
                      Accepted{' '}
                      {new Date(
                        timecard.submissionAcknowledgement.acceptedAt,
                      ).toLocaleString('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3 text-sm leading-6 text-slate-800">
                  “{timecard.submissionAcknowledgement.certificationText}”
                </div>

                <div className="mt-2 text-xs font-semibold text-emerald-900">
                  By submitting this timecard, the employee affirmed the
                  certification above.
                </div>
              </div>
            )}

            <div
              className={`mb-4 rounded-xl border p-4 ${
                timecard.missedMealBreaks.length > 0
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-emerald-300 bg-emerald-50'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div
                    className={`text-sm font-bold ${
                      timecard.missedMealBreaks.length > 0
                        ? 'text-amber-950'
                        : 'text-emerald-950'
                    }`}
                  >
                    Meal Break Acknowledgement
                  </div>

                  <div
                    className={`mt-1 text-xs font-semibold uppercase tracking-wide ${
                      timecard.missedMealBreaks.length > 0
                        ? 'text-amber-800'
                        : 'text-emerald-800'
                    }`}
                  >
                    {timecard.missedMealBreaks.length > 0
                      ? `${timecard.missedMealBreaks.length} Missed Meal ${
                          timecard.missedMealBreaks.length === 1
                            ? 'Break'
                            : 'Breaks'
                        } Reported`
                      : 'Meal Breaks Received'}
                  </div>
                </div>

                <div
                  className={`rounded-lg border bg-white px-3 py-2 text-right text-xs text-slate-700 ${
                    timecard.missedMealBreaks.length > 0
                      ? 'border-amber-300'
                      : 'border-emerald-300'
                  }`}
                >
                  <div className="font-bold text-slate-900">
                    {timecard.employeeName}
                  </div>

                  <div>
                    Acknowledged{' '}
                    {new Date(
                      timecard.submissionAcknowledgement?.acceptedAt ??
                        timecard.submittedAt,
                    ).toLocaleString('en-US', {
                      month: 'numeric',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              {timecard.missedMealBreaks.length === 0 ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3 text-sm leading-6 text-slate-800">
                  The employee acknowledged that they received adequate time
                  for their meal breaks and that no additional meal-break
                  compensation is needed for this pay period.
                </div>
              ) : (
                <>
                  <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3 text-sm leading-6 text-slate-800">
                    The employee reported the following missed meal break
                    {timecard.missedMealBreaks.length === 1 ? '' : 's'} and
                    requested the applicable meal-period compensation.
                  </div>

                  <div className="mt-3 space-y-2">
                    {[...timecard.missedMealBreaks]
                      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
                      .map((mealBreak) => (
                        <div
                          key={mealBreak.id}
                          className="rounded-lg border border-amber-200 bg-white p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                {new Date(
                                  `${mealBreak.dateKey}T12:00:00`,
                                ).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </div>

                              <div className="mt-1 text-sm text-slate-800">
                                <span className="font-semibold">
                                  Employee reason:
                                </span>{' '}
                                {mealBreak.reason}
                              </div>
                            </div>

                            <div className="text-xs text-slate-600">
                              Declared{' '}
                              {new Date(mealBreak.createdAt).toLocaleString(
                                'en-US',
                                {
                                  month: 'numeric',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                },
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="mt-3 text-xs font-semibold text-amber-900">
                    Requested meal-period compensation:{' '}
                    {timecard.missedMealBreaks.length}{' '}
                    {timecard.missedMealBreaks.length === 1
                      ? 'meal premium'
                      : 'meal premiums'}
                  </div>
                </>
              )}
            </div>

            {timecard.additionalCompensation.length > 0 && (
              <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-violet-900">
                    Additional Compensation
                  </div>

                  <div className="text-sm font-bold text-violet-900">
                    ${timecard.additionalCompensation
                      .reduce((total, item) => total + Number(item.amount || 0), 0)
                      .toFixed(2)}
                  </div>
                </div>

                <div className="mt-2 space-y-2">
                  {timecard.additionalCompensation.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">
                          {item.dateKey}
                        </span>

                        <span className="ml-2 text-slate-700">
                          {item.compensationType === 'LDT_STIPEND'
                            ? 'LDT Stipend'
                            : 'Meal Pay'}
                        </span>
                      </div>

                      <div className="font-bold text-violet-900">
                        ${Number(item.amount || 0).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {timecard.note && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-bold text-slate-900">Employee Note</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{timecard.note}</div>
              </div>
            )}

            {timecard.supervisorComment && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="text-sm font-bold text-amber-800">Supervisor Comment</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-amber-800">{timecard.supervisorComment}</div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-xl border border-slate-300 bg-white p-3 text-sm md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Employee Approved / Submitted
            </div>
            <div className="mt-1 font-semibold text-slate-900">
              {new Date(timecard.submittedAt).toLocaleString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Employee: {timecard.employeeName}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Supervisor Approved
            </div>
            <div className="mt-1 font-semibold text-slate-900">
              {timecard.reviewedAt
                ? new Date(timecard.reviewedAt).toLocaleString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Not approved yet'}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Supervisor: {timecard.reviewedBy || 'Pending'}
            </div>
          </div>
        </div>

        {timecard.status === 'PENDING_SUPERVISOR_REVIEW' &&
          editingTimecardId === timecard.id && (
            <div className="no-print mt-4 rounded-xl border-2 border-blue-300 bg-blue-50 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-base font-bold text-blue-950">
                    Supervisor Timecard Correction
                  </div>
                  <div className="mt-1 text-sm text-blue-800">
                    Edit submitted shift details and punch times. Apollo will
                    recalculate regular, overtime, double-time, and holiday
                    hours before saving.
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800">
                  Pay-changing edits require employee acknowledgement.
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {supervisorEditRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid gap-3 rounded-xl border border-blue-200 bg-white p-3 md:grid-cols-2 xl:grid-cols-[140px_1fr_180px_1fr_1fr]"
                  >
                    <label className="text-xs font-semibold text-slate-600">
                      Shift Date
                      <input
                        value={row.shiftDateKey}
                        readOnly
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                      />
                    </label>

                    <label className="text-xs font-semibold text-slate-600">
                      Shift
                      <input
                        value={row.shiftLabel}
                        onChange={(event) =>
                          updateSupervisorTimecardEditRow(row.id, {
                            shiftLabel: event.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>

                    <label className="text-xs font-semibold text-slate-600">
                      Pay Type
                      <select
                        value={row.payType}
                        onChange={(event) =>
                          updateSupervisorTimecardEditRow(row.id, {
                            payType: event.target.value as TimecardPayType,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      >
                        <option value="DAILY_OT_DT">Non 24-Shift</option>
                        <option value="TWENTY_FOUR_HOUR">24-Hour Shift</option>
                        <option value="CALL_IN">Call In</option>
                        <option value="SICK_TIME">Sick Time</option>
                        <option value="VACATION">Vacation</option>
                        <option value="JURY_DUTY">Jury Duty</option>
                      </select>
                    </label>

                    <label className="text-xs font-semibold text-slate-600">
                      Clock In
                      <input
                        type="datetime-local"
                        value={row.clockInValue}
                        onChange={(event) =>
                          updateSupervisorTimecardEditRow(row.id, {
                            clockInValue: event.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>

                    <label className="text-xs font-semibold text-slate-600">
                      Clock Out
                      <input
                        type="datetime-local"
                        value={row.clockOutValue}
                        onChange={(event) =>
                          updateSupervisorTimecardEditRow(row.id, {
                            clockOutValue: event.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                  </div>
                ))}
              </div>

              <label className="mt-4 block text-xs font-semibold text-slate-700">
                Required Correction Reason
                <textarea
                  value={supervisorEditReason}
                  onChange={(event) => setSupervisorEditReason(event.target.value)}
                  rows={3}
                  placeholder="Explain why the submitted timecard is being corrected..."
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={isSavingSupervisorEdit}
                  onClick={cancelSupervisorTimecardEdit}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isSavingSupervisorEdit}
                  onClick={() => void saveSupervisorTimecardEdit(timecard)}
                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSavingSupervisorEdit
                    ? 'Saving Correction...'
                    : 'Save Audited Correction'}
                </button>
              </div>
            </div>
          )}

        {timecard.status === 'PENDING_SUPERVISOR_REVIEW' && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
              <textarea
                value={returnComments[timecard.id] ?? ''}
                onChange={(event) =>
                  setReturnComments((current) => ({
                    ...current,
                    [timecard.id]: event.target.value,
                  }))
                }
                rows={2}
                placeholder="Message to employee explaining what needs to be corrected..."
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              />

              <button
                type="button"
                disabled={
                  isOwnSupervisorTimecard ||
                  payrollLocked ||
                  editingTimecardId === timecard.id
                }
                onClick={() => startSupervisorTimecardEdit(timecard)}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {payrollLocked
                  ? 'Payroll Locked'
                  : isOwnSupervisorTimecard
                    ? 'Needs Other Supervisor'
                    : editingTimecardId === timecard.id
                      ? 'Editing'
                      : 'Edit Timecard'}
              </button>

              <button
                type="button"
                disabled={payrollLocked || editingTimecardId === timecard.id}
                onClick={() => returnTimecard(timecard.id)}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {payrollLocked
                  ? 'Payroll Locked'
                  : editingTimecardId === timecard.id
                    ? 'Finish Editing First'
                    : 'Return for Correction'}
              </button>

              <button
                type="button"
                disabled={
                  isOwnSupervisorTimecard ||
                  payrollLocked ||
                  editingTimecardId === timecard.id
                }
                onClick={() => approveTimecard(timecard.id)}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {payrollLocked
                  ? 'Payroll Locked'
                  : isOwnSupervisorTimecard
                    ? 'Needs Other Approver'
                    : editingTimecardId === timecard.id
                      ? 'Finish Editing First'
                      : 'Approve'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function saveAuditLog(nextLog: AuditLogEntry[]) {
    setAuditLog(nextLog);
  }

  async function addAuditEntry(action: string, details: string) {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      actor: 'Supervisor',
      action,
      details,
    };

    const { error } = await supabase.from('audit_logs').insert({
      id: entry.id,
      timestamp: entry.timestamp,
      actor: entry.actor,
      action,
      details,
    });

    if (error) {
      console.error('Failed to save audit log:', error);
      return;
    }

    setAuditLog((current) => [entry, ...current]);
  }

  async function saveSystemConfig(nextConfig: SystemConfig, action = 'SYSTEM_CONFIG_UPDATED', details = 'System configuration updated') {
    const logoChanged = nextConfig.logoDataUrl !== systemConfig.logoDataUrl;
    setSystemConfig(nextConfig);

    // The logo is a large data URL; only send it when it actually changed.
    // Columns left out of the upsert keep their stored values.
    const { error } = await supabase
      .from('system_config')
      .upsert(
        {
          id: 'default',
          company_name: nextConfig.companyName,
          ...(logoChanged ? { logo_data_url: nextConfig.logoDataUrl } : {}),
          important_links: nextConfig.importantLinks,
          geofences: nextConfig.geofences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

    if (error) {
      console.error('Failed to save system config:', error);
      window.alert(`System configuration save failed: ${error.message}`);
      return;
    }

    void addAuditEntry(action, details);
  }

  // Tiles opened at least once this visit. Tiles that live in their own
  // component stay mounted (hidden) after closing so drafts and loaded data
  // survive, the same as when all state lived on this page.
  const [openedTileIds, setOpenedTileIds] = useState<ReadonlySet<string>>(() => new Set());

  const stableAddAuditEntry = useStableCallback(addAuditEntry);
  const stableSaveSystemConfig = useStableCallback(saveSystemConfig);

  function toggleTile(tileId: string) {
    setActiveTile((current) => (current === tileId ? null : tileId));
    setOpenedTileIds((current) => (current.has(tileId) ? current : new Set(current).add(tileId)));
  }

  function renderTile(
    id: string,
    titleText: string,
    description: string,
    // Built only while the tile is open, so closed tiles cost nothing to render.
    renderChildren: () => React.ReactNode,
    hasAlert = false,
    // For tiles that are their own memoized component: keep them mounted but
    // hidden once opened, so closing a tile does not discard its state.
    keepMountedWhenClosed = false,
  ) {
    const isOpen = activeTile === id;
    const keepMounted = keepMountedWhenClosed && openedTileIds.has(id);

    return (
      <div
        className={`rounded-2xl border bg-white shadow-sm ${
          hasAlert ? 'border-red-400 ring-2 ring-red-200' : 'border-slate-200'
        }`}
      >
        <button
          type="button"
          onClick={() => toggleTile(id)}
          className="flex w-full items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 text-left transition hover:bg-slate-50"
        >
          <div>
            <div className={`text-base font-bold ${hasAlert ? 'text-red-700' : 'text-slate-900'}`}>{titleText}</div>
            <div className={`mt-1 text-sm ${hasAlert ? 'font-semibold text-red-700' : 'text-slate-600'}`}>{description}</div>
          </div>

          <div
            className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${
              isOpen ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {isOpen ? 'Close' : 'Open'}
          </div>
        </button>

        {keepMounted ? (
          <Activity mode={isOpen ? 'visible' : 'hidden'}>
            <div className="border-t border-slate-200 p-5">{renderChildren()}</div>
          </Activity>
        ) : (
          isOpen && <div className="border-t border-slate-200 p-5">{renderChildren()}</div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071632] via-[#0b3f78] to-[#0795e6] px-4 py-6 md:px-6">
      {printPacketTimecards && (
        <div ref={printPacketContainerRef} className="hidden">
          {printPacketTimecards.map((timecard) => renderSubmittedTimecard(timecard))}
        </div>
      )}
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {systemConfig.logoDataUrl && (
              <img
                src={systemConfig.logoDataUrl}
                alt={`${systemConfig.companyName} logo`}
                className="h-16 w-16 rounded-xl object-contain"
              />
            )}

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {systemConfig.companyName} Supervisor
              </h1>
              <div className="mt-1 text-sm text-slate-600">
                Supervisor tools, scheduling, timecards, announcements, and employee communication.
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-700">
                Welcome, {currentEmployee?.name || 'Supervisor'}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {renderTile(
            'schedule-management',
            'Schedule Management',
            pendingOpenShiftRequests.length > 0
              ? `${pendingOpenShiftRequests.length} open shift request${pendingOpenShiftRequests.length === 1 ? '' : 's'} pending.`
              : 'Open the supervisor schedule board and review open shift requests.',
            () => (
              <ScheduleManagementTile employees={employees} addAuditEntry={stableAddAuditEntry} />
            ),
            pendingOpenShiftRequests.length > 0,
            true,
          )}

          {renderTile(
            'company-announcements',
            'Company Announcements',
            'Create time-limited announcements that display on the employee dashboard.',
            () => <AnnouncementsTile addAuditEntry={stableAddAuditEntry} />,
            false,
            true,
          )}

          {renderTile(
            'sms-notifications',
            'SMS Notifications',
            smsPreferencesLoading
              ? 'Loading employee SMS consent records...'
              : `${smsEligibleEmployees.length} employee${
                  smsEligibleEmployees.length === 1 ? '' : 's'
                } currently eligible for supervisor SMS messages.`,
            () => (
              <SmsNotificationsTile
                employees={employees}
                smsEligibleEmployees={smsEligibleEmployees}
              />
            ),
            false,
            true,
          )}

          {renderTile(
            'incident-reports',
            'Incident Reports',
            openIncidentReports.length > 0
              ? `${openIncidentReports.length} open incident report${openIncidentReports.length === 1 ? '' : 's'}.`
              : 'No open incident reports.',
            () => (<div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowClosedIncidentReports((current) => !current)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {showClosedIncidentReports
                    ? 'Hide Closed Reports'
                    : `Show Closed Reports (${closedIncidentReports.length})`}
                </button>
              </div>
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
                <label className="text-xs font-semibold text-slate-600">
                  Search
                  <input
                    type="text"
                    value={incidentReportSearch}
                    onChange={(event) => setIncidentReportSearch(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="Incident #, employee, category..."
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Status
                  <select
                    value={incidentReportStatusFilter}
                    onChange={(event) => setIncidentReportStatusFilter(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="NEW">New</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="PENDING_EMPLOYEE_RESPONSE">Pending Employee Response</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Category
                  <select
                    value={incidentReportCategoryFilter}
                    onChange={(event) => setIncidentReportCategoryFilter(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="ALL">All Categories</option>
                    {incidentReportCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Assigned To
                  <select
                    value={incidentReportSupervisorFilter}
                    onChange={(event) => setIncidentReportSupervisorFilter(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="ALL">All Supervisors</option>
                    {incidentReportSupervisors.map((supervisor) => (
                      <option key={supervisor} value={supervisor}>{supervisor}</option>
                    ))}
                  </select>
                </label>
              </div>

              {openIncidentReports.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No open incident reports.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="border-y-2 border-slate-700 px-3 py-3">Incident #</th>
                        <th className="border-y-2 border-slate-700 px-3 py-3">Date</th>
                        <th className="border-y-2 border-slate-700 px-3 py-3">Employee</th>
                        <th className="border-y-2 border-slate-700 px-3 py-3">Category</th>
                        <th className="border-y-2 border-slate-700 px-3 py-3">Assigned To</th>
                        <th className="border-y-2 border-slate-700 px-3 py-3">Status</th>
                        <th className="border-y-2 border-slate-700 px-3 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openIncidentReports.map((report) => (
                        <React.Fragment key={report.id}>
                          <tr className="border-t border-slate-200">
                            <td className="rounded-l-xl border-y-2 border-l-2 border-slate-700 px-3 py-3 font-semibold text-slate-900">{report.incident_number}</td>
                            <td className="px-3 py-2 text-slate-600">{formatShortDate(new Date(report.created_at))}</td>
                            <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{report.employee_name}</td>
                            <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{report.category}</td>
                            <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{report.assigned_supervisor || 'Unassigned'}</td>
                            <td className="px-3 py-2 font-semibold text-blue-700">{report.status}</td>
                            <td className="border-y-2 border-slate-700 px-3 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIncidentReportId(report.id);
                                  setIncidentReportStatusDraft(report.status);
                                  setIncidentReportAssignedSupervisorDraft(report.assigned_supervisor ?? '');
                                  setIncidentReportNotesDraft(report.supervisor_notes ?? '');
                                  setIncidentReportFollowUpDraft('');
                                  setIncidentReportSaveStatus('');
                                }}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {showClosedIncidentReports && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900">
                    Closed Incident Reports
                  </div>

                  {closedIncidentReports.length === 0 ? (
                    <div className="p-4 text-sm text-slate-600">No closed incident reports.</div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="border-y-2 border-slate-700 px-3 py-3">Incident #</th>
                          <th className="border-y-2 border-slate-700 px-3 py-3">Date</th>
                          <th className="border-y-2 border-slate-700 px-3 py-3">Employee</th>
                          <th className="border-y-2 border-slate-700 px-3 py-3">Category</th>
                          <th className="border-y-2 border-slate-700 px-3 py-3">Assigned To</th>
                          <th className="border-y-2 border-slate-700 px-3 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {closedIncidentReports.map((report) => (
                          <tr key={report.id} className="border-t border-slate-200">
                            <td className="border-y-2 border-slate-700 px-3 py-3 font-semibold text-slate-900">{report.incident_number}</td>
                            <td className="px-3 py-2 text-slate-600">{formatShortDate(new Date(report.created_at))}</td>
                            <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{report.employee_name}</td>
                            <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{report.category}</td>
                            <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{report.assigned_supervisor || 'Unassigned'}</td>
                            <td className="border-y-2 border-slate-700 px-3 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIncidentReportId(report.id);
                                  setIncidentReportStatusDraft(report.status);
                                  setIncidentReportAssignedSupervisorDraft(report.assigned_supervisor ?? '');
                                  setIncidentReportNotesDraft(report.supervisor_notes ?? '');
                                  setIncidentReportFollowUpDraft('');
                                  setIncidentReportSaveStatus('');
                                }}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>),
            openIncidentReports.length > 0,
          )}

          {renderTile(
            'continuing-education',
            'Continuing Education (CE)',
            'Create CE classes, record attendance, and generate California EMS CE certificates.',
            () => (<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <a
                href="/supervisor/continuing-education"
                className="inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Open Continuing Education
              </a>
            </div>),
          )}

          {renderTile(
            'analytics-reports',
            'Analytics & Reports',
            'Review workforce hours, attendance, staffing, payroll exceptions, and certification compliance.',
            () => (<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">
                Turn Apollo data into operational insight
              </div>

              <div className="mt-1 text-xs text-slate-600">
                Select a reporting period, filter employees, review company totals,
                drill down to individual employees, and export reports.
              </div>

              <a
                href="/supervisor/analytics"
                className="mt-4 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Open Analytics & Reports
              </a>
            </div>),
          )}

          {renderTile(
            'timecard-review',
            'Timecard Review',
            pendingTimecards.length + resubmittedTimecards.length + pendingResubmissionTimecards.length > 0
              ? `${pendingTimecards.length} pending review; ${resubmittedTimecards.length} resubmitted; ${pendingResubmissionTimecards.length} pending employee resubmission.`
              : 'Review, approve, or return submitted employee timecards.',
            () => (<div className="space-y-5">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Selected Pay Period</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {formatShortDate(selectedPayPeriod.start)} to {formatShortDate(selectedPayPeriod.end)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedPayPeriod.key}
                    onChange={(event) => {
                      setTimecardReviewPeriodInitialized(true);
                      setSelectedTimecardId(null);
                      setSelectedPayPeriodKey(event.target.value);
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-500"
                  >
                    {payPeriodOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {`Pay Period ${option.number} (${formatShortDate(option.start)} - ${formatShortDate(option.end)})`}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setTimecardReviewPeriodInitialized(true);
                      setSelectedTimecardId(null);
                      setSelectedPayPeriodKey(currentPayPeriod.key);
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Current Pay Period
                  </button>
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 ${
                  employeesNotSubmitted.length === 0 &&
                  pendingTimecards.length === 0 &&
                  resubmittedTimecards.length === 0 &&
                  pendingResubmissionTimecards.length === 0
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-amber-300 bg-amber-50'
                }`}
              >
                {employeesNotSubmitted.length === 0 &&
                pendingTimecards.length === 0 &&
                resubmittedTimecards.length === 0 &&
                pendingResubmissionTimecards.length === 0 ? (
                  <>
                    <div className="text-lg font-bold text-emerald-800">
                      ✅ PAYROLL READY
                    </div>

                    <div className="mt-2 text-sm text-emerald-700">
                      Scheduled Employees: {scheduledEmployeeIds.size}
                    </div>

                    <div className="text-sm text-emerald-700">
                      Submitted Timecards: {selectedPayPeriodTimecards.length}
                    </div>

                    <div className="text-sm text-emerald-700">
                      Pending Reviews: 0
                    </div>

                    <div className="text-sm text-emerald-700">
                      Pending Resubmissions: 0
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-bold text-amber-800">
                      ⚠ PAYROLL NOT READY
                    </div>

                    <div className="mt-2 text-sm text-amber-700">
                      Missing Timecards: {employeesNotSubmitted.length}
                    </div>

                    <div className="text-sm text-amber-700">
                      Pending Reviews: {pendingTimecards.length + resubmittedTimecards.length}
                    </div>

                    <div className="text-sm text-amber-700">
                      Pending Resubmissions: {pendingResubmissionTimecards.length}
                    </div>
                  </>
                )}
              </div>

              {payrollSubmission?.payPeriodKey === selectedPayPeriod.key && (
                <div className="rounded-xl border border-blue-300 bg-blue-50 p-4">
                  <div className="text-lg font-bold text-blue-800">
                    🔒 PAYROLL FINALIZED / LOCKED
                  </div>

                  <div className="mt-2 text-sm text-blue-700">
                    Submitted By: {payrollSubmission.submittedBy}
                  </div>

                  <div className="text-sm text-blue-700">
                    Submitted On: {new Date(payrollSubmission.submittedAt).toLocaleString()}
                  </div>

                  <div className="text-sm text-blue-700">
                    Approved Timecards: {payrollSubmission.approvedCount}
                  </div>

                  <div className="mt-2 text-sm text-blue-700">
                    This pay period is read-only. Reopen payroll only if an authorized correction is required.
                  </div>

                  <button
                    type="button"
                    disabled={payrollActionPending}
                    onClick={() => void reopenPayroll()}
                    className="mt-3 rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {payrollActionPending ? 'Reopening...' : 'Reopen Payroll'}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={printAllTimecards}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                >
                  Save Approved PDF
                </button>

                <button
                  type="button"
                  disabled={pendingResubmissionTimecards.length === 0}
                  onClick={printPendingResubmissions}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Save Pending Resubmissions PDF
                </button>

                <button
                  type="button"
                  onClick={printPayrollStatusTracker}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Print Status Tracker
                </button>

                <button
                  type="button"
                  disabled={payrollLocked || payrollActionPending}
                  onClick={() => void submitPayroll()}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {payrollLocked
                    ? 'Payroll Finalized / Locked'
                    : payrollActionPending
                      ? 'Finalizing Payroll...'
                      : 'Finalize & Lock Payroll'}
                </button>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    setShowPayrollStatusTracker((current) => !current)
                  }
                  className="mb-2 flex w-full items-center justify-between rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-left transition hover:bg-slate-200"
                >
                  <span className="text-sm font-bold text-slate-900">
                    Payroll Status Tracker ({payrollStatusRows.length})
                  </span>

                  <span className="text-xs font-bold text-slate-500">
                    {showPayrollStatusTracker ? 'Hide' : 'Show'}
                  </span>
                </button>

                {showPayrollStatusTracker && (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-red-700">
                          Not Submitted
                        </div>
                        <div className="mt-1 text-2xl font-black text-red-800">
                          {employeesNotSubmitted.length}
                        </div>
                      </div>

                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Pending Review
                        </div>
                        <div className="mt-1 text-2xl font-black text-blue-800">
                          {pendingTimecards.length}
                        </div>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                          Pending Resubmission
                        </div>
                        <div className="mt-1 text-2xl font-black text-amber-800">
                          {pendingResubmissionTimecards.length}
                        </div>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          Approved
                        </div>
                        <div className="mt-1 text-2xl font-black text-emerald-800">
                          {approvedTimecards.length}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                              Employee
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                              Status
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                              Last Submitted
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {payrollStatusRows.map((row) => (
                            <tr key={row.employeeId}>
                              <td className="px-3 py-2 font-semibold text-slate-900">
                                {row.employeeName}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                    row.status === 'APPROVED'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : row.status === 'PENDING_REVIEW'
                                        ? 'bg-blue-100 text-blue-700'
                                        : row.status === 'PENDING_RESUBMISSION'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {getPayrollStatusLabel(row.status)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {row.submittedAt
                                  ? new Date(row.submittedAt).toLocaleString(
                                      'en-US',
                                      {
                                        month: 'numeric',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                      },
                                    )
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowEmployeesNotSubmitted((current) => !current)}
                  className="mb-2 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                >
                  <span className="text-sm font-semibold text-slate-900">
                    Employees Not Submitted ({employeesNotSubmitted.length})
                  </span>

                  <span className="text-xs font-bold text-slate-500">
                    {showEmployeesNotSubmitted ? 'Hide' : 'Show'}
                  </span>
                </button>

                {showEmployeesNotSubmitted && (
                  <>
                    {employeesNotSubmitted.length === 0 ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                        All active employees have submitted a timecard for this pay period.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={sendTimecardReminders}
                          className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                        >
                          Remind Employees
                        </button>

                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {employeesNotSubmitted.map((employee) => (
                            <div key={employee.id} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                              {employee.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowPendingReview((current) => !current)}
                  className="mb-2 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                >
                  <span className="text-sm font-semibold text-slate-900">
                    Pending Review ({pendingTimecards.length})
                  </span>

                  <span className="text-xs font-bold text-slate-500">
                    {showPendingReview ? 'Hide' : 'Show'}
                  </span>
                </button>

                {showPendingReview && (
                  <>
                    {pendingTimecards.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                        No submitted timecards are pending review.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {pendingTimecards.map((timecard) => (
                            <button
                              key={timecard.id}
                              type="button"
                              onClick={() => setSelectedTimecardId(selectedTimecardId === timecard.id ? null : timecard.id)}
                              className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                                selectedTimecardId === timecard.id
                                  ? 'border-blue-300 bg-blue-50 text-blue-800'
                                  : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                              }`}
                            >
                              {timecard.employeeName}
                            </button>
                          ))}
                        </div>

                        {pendingTimecards.map((timecard) =>
                          selectedTimecardId === timecard.id ? renderSubmittedTimecard(timecard) : null
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <div className="mb-2 flex w-full items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
                  <span className="text-sm font-semibold text-violet-900">
                    Resubmitted Timecards ({resubmittedTimecards.length})
                  </span>
                </div>

                {resubmittedTimecards.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                    No corrected timecards have been resubmitted for review.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {resubmittedTimecards.map((timecard) => (
                        <button
                          key={timecard.id}
                          type="button"
                          onClick={() => setSelectedTimecardId(selectedTimecardId === timecard.id ? null : timecard.id)}
                          className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                            selectedTimecardId === timecard.id
                              ? 'border-violet-400 bg-violet-100 text-violet-900'
                              : 'border-violet-200 bg-white text-slate-800 hover:bg-violet-50'
                          }`}
                        >
                          {timecard.employeeName}
                        </button>
                      ))}
                    </div>
                    {resubmittedTimecards.map((timecard) =>
                      selectedTimecardId === timecard.id ? renderSubmittedTimecard(timecard) : null
                    )}
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    setShowPendingResubmission((current) => !current)
                  }
                  className="mb-2 flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100"
                >
                  <span className="text-sm font-semibold text-amber-900">
                    Pending Resubmission ({pendingResubmissionTimecards.length})
                  </span>

                  <span className="text-xs font-bold text-amber-700">
                    {showPendingResubmission ? 'Hide' : 'Show'}
                  </span>
                </button>

                {showPendingResubmission && (
                  <>
                    {pendingResubmissionTimecards.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                        No timecards are awaiting employee correction and
                        resubmission.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          These timecards are not approved. They remain visible
                          and printable while employees make corrections or
                          acknowledge supervisor-adjusted paid hours.
                        </div>

                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {pendingResubmissionTimecards.map((timecard) => (
                            <button
                              key={timecard.id}
                              type="button"
                              onClick={() =>
                                setSelectedTimecardId(
                                  selectedTimecardId === timecard.id
                                    ? null
                                    : timecard.id,
                                )
                              }
                              className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                                selectedTimecardId === timecard.id
                                  ? 'border-amber-400 bg-amber-100 text-amber-900'
                                  : 'border-amber-200 bg-white text-slate-800 hover:bg-amber-50'
                              }`}
                            >
                              {timecard.employeeName}
                            </button>
                          ))}
                        </div>

                        {pendingResubmissionTimecards.map((timecard) =>
                          selectedTimecardId === timecard.id
                            ? renderSubmittedTimecard(timecard)
                            : null,
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                {supersededApprovals.length > 0 && (
                  <div className="mb-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                    <div className="font-semibold">
                      Earlier approval replaced by a newer version ({supersededApprovals.length})
                    </div>
                    <div className="mt-1 text-xs leading-5">
                      These employees have a newer timecard version that is pending review or awaiting
                      resubmission. Their earlier approved version is kept in the audit trail but is
                      not included in the approved payroll packet until the newer version is approved.
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-xs">
                      {supersededApprovals.map((item) => (
                        <li key={item.employeeId}>
                          {item.current.employeeName}: current version is{' '}
                          {item.current.status === 'RETURNED' ? 'awaiting employee resubmission' : 'pending review'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowReviewedTimecards((current) => !current)}
                  className="mb-2 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                >
                  <span className="text-sm font-semibold text-slate-900">
                    Approved ({approvedTimecards.length})
                  </span>

                  <span className="text-xs font-bold text-slate-500">
                    {showReviewedTimecards ? 'Hide' : 'Show'}
                  </span>
                </button>

                {showReviewedTimecards && (
                  <>
                    {approvedTimecards.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                        No timecards have been approved for this pay period.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {approvedTimecards.map((timecard) => (
                            <button
                              key={timecard.id}
                              type="button"
                              onClick={() => setSelectedTimecardId(selectedTimecardId === timecard.id ? null : timecard.id)}
                              className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                                selectedTimecardId === timecard.id
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                  : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                              }`}
                            >
                              {timecard.employeeName}
                            </button>
                          ))}
                        </div>

                        {approvedTimecards.map((timecard) =>
                          selectedTimecardId === timecard.id ? renderSubmittedTimecard(timecard) : null
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>),
            pendingTimecards.length + resubmittedTimecards.length + pendingResubmissionTimecards.length > 0,
          )}

          {renderTile(
            'supervisor-shift-report',
            'Daily Supervisor Shift Report',
            'Submit a daily operational report for supervisor review and recordkeeping.',
            () => (
              <SupervisorShiftReportTile currentEmployee={currentEmployee} authEmail={authEmail} />
            ),
            false,
            true,
          )}

          {renderTile(
            'employee-management',
            'Employee Profiles',
            employeeCertificationAlertCount > 0
              ? `${employeeCertificationAlertCount} employee${employeeCertificationAlertCount === 1 ? '' : 's'} with expired or soon-expiring certifications.`
              : 'Manage employees, seniority, certifications, and employment status.',
            () => (<div className={`rounded-xl border p-4 ${
              employeeCertificationAlertCount > 0
                ? 'border-red-300 bg-red-50'
                : 'border-slate-200 bg-slate-50'
            }`}>
              {employeeCertificationAlertCount > 0 && (
                <div className="mb-3 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white">
                  Certification review needed
                </div>
              )}

              <a
                href="/employees"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Open Employee Profiles
              </a>
            </div>),
            employeeCertificationAlertCount > 0,
          )}

          {renderTile(
            'fleet-services',
            'Fleet Services',
            'Track vehicle status, mileage, service readiness, and maintenance records.',
            () => <FleetServicesTile />,
            false,
            true,
          )}

          {renderTile(
            'inventory-tracking',
            'Inventory Tracking',
            'Manage supply rooms, inventory levels, PAR counts, transfers, and ordering status.',
            () => <InventoryTrackingTile employees={employees} authEmail={authEmail} />,
            false,
            true,
          )}

          {renderTile(
            'system-configuration',
            'System Configuration',
            'Configure company branding, permissions reference, important links, geofences, and review the activity log.',
            () => (
              <SystemConfigurationTile
                systemConfig={systemConfig}
                auditLog={auditLog}
                saveSystemConfig={stableSaveSystemConfig}
              />
            ),
            false,
            true,
          )}

        </div>
      </div>

      {incidentReports.find((report) => report.id === selectedIncidentReportId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Incident Report</div>
                <div className="mt-1 text-xl font-bold text-slate-900">{incidentReports.find((report) => report.id === selectedIncidentReportId)!.incident_number}</div>
                <div className="mt-1 text-sm text-slate-500">
                  Submitted {new Date(incidentReports.find((report) => report.id === selectedIncidentReportId)!.created_at).toLocaleString('en-US')}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => printIncidentReport(incidentReports.find((report) => report.id === selectedIncidentReportId)!)}
                  className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIncidentReportId(null)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div><span className="font-semibold">Employee:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.employee_name}</div>
                <div><span className="font-semibold">Status:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.status}</div>
                <div><span className="font-semibold">Phone:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.employee_phone || '—'}</div>
                <div><span className="font-semibold">Email:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.employee_email || '—'}</div>
                <div><span className="font-semibold">Category:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.category}</div>
                <div><span className="font-semibold">Assigned To:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.assigned_supervisor || 'Unassigned'}</div>
                <div><span className="font-semibold">Supervisor Notified:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.supervisor_notified || '—'}</div>
                <div><span className="font-semibold">Supervisor Listed:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.supervisor_name || '—'}</div>
                <div><span className="font-semibold">Attachment:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.attachment_name || 'None'}</div>
                <div><span className="font-semibold">Attachment Type:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.attachment_type || '—'}</div>
              </div>

              {incidentReports.find((report) => report.id === selectedIncidentReportId)!.attachment_path && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openIncidentAttachment(incidentReports.find((report) => report.id === selectedIncidentReportId)!)}
                    className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    View Attachment
                  </button>
                  <button
                    type="button"
                    onClick={() => openIncidentAttachment(incidentReports.find((report) => report.id === selectedIncidentReportId)!, true)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Download Attachment
                  </button>
                </div>
              )}

              <div>
                <div className="text-sm font-semibold text-slate-900">Narrative</div>
                <div className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {incidentReports.find((report) => report.id === selectedIncidentReportId)!.narrative}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">Incident History</div>

                <div className="mt-3 max-h-64 space-y-2 overflow-auto">
                  {selectedIncidentAuditEntries.length === 0 ? (
                    <div className="text-sm text-slate-500">No incident history recorded yet.</div>
                  ) : (
                    selectedIncidentAuditEntries.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="text-xs text-slate-500">
                          {new Date(entry.timestamp).toLocaleString('en-US')}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{entry.actor}</div>
                        <div className="text-sm text-slate-700">{entry.action}</div>
                        <div className="mt-1 text-sm text-slate-600">{entry.details}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">Supervisor Workflow</div>

                <div className="mt-3 grid gap-3 md:grid-cols-[220px_220px_1fr]">
                  <label className="text-xs font-semibold text-slate-600">
                    Status
                    <select
                      value={incidentReportStatusDraft}
                      onChange={(event) => setIncidentReportStatusDraft(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="NEW">New</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="PENDING_EMPLOYEE_RESPONSE">Pending Employee Response</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Reassign Incident Report
                    <select
                      value={incidentReportAssignedSupervisorDraft}
                      onChange={(event) => setIncidentReportAssignedSupervisorDraft(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {employees
                        .filter((employee) => employee.status?.toLowerCase() !== 'removed' && employee.role === 'Supervisor')
                        .map((employee) => (
                          <option key={employee.id} value={employee.name}>
                            {employee.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Employee Follow-Up Request
                    <textarea
                      value={incidentReportFollowUpDraft}
                      onChange={(event) => setIncidentReportFollowUpDraft(event.target.value)}
                      className="mt-1 min-h-[110px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Tell the employee exactly what additional information is needed."
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Supervisor Notes
                    <textarea
                      value={incidentReportNotesDraft}
                      onChange={(event) => setIncidentReportNotesDraft(event.target.value)}
                      className="mt-1 min-h-[110px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Add supervisor notes, follow-up, or disposition details."
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => saveIncidentReportWorkflow(incidentReports.find((report) => report.id === selectedIncidentReportId)!)}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    Save Changes
                  </button>

                  {incidentReportSaveStatus && (
                    <span className="text-sm font-semibold text-slate-700">{incidentReportSaveStatus}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

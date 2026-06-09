'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  addDays,
  buildPayPeriodOptions,
  getCurrentPayPeriodOption,
  type PayPeriodOption,
} from '@/lib/payPeriods';

type ImportantLink = {
  id: string;
  label: string;
  url: string;
};

type GeofenceConfig = {
  id: string;
  shiftLabel: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  radiusFeet: number;
};

type SystemConfig = {
  companyName: string;
  logoDataUrl: string;
  importantLinks: ImportantLink[];
  geofences: GeofenceConfig[];
};

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

type AuditLogEntry = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
};


type CompanyAnnouncement = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  expiresAt: string;
  postedBy: string;
};

type TimePunch = {
  id: string;
  employeeId: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT';
  timestamp: string;
  shiftDateKey: string;
  shiftLabel: string;
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

type SubmittedTimecard = {
  id: string;
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
  note: string;
  status: 'PENDING_SUPERVISOR_REVIEW' | 'APPROVED' | 'RETURNED';
  supervisorComment?: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

type IncidentReport = {
  id: string;
  incident_number: string;
  created_at: string;
  employee_name: string;
  category: string;
  assigned_supervisor: string | null;
  status: string;
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

type EmployeeCertificationRecord = Record<string, string>;

type EmployeeOption = {
  id: string;
  name: string;
  email: string;
  role: 'Paramedic' | 'EMT' | 'Supervisor';
  scope: 'ALS' | 'BLS';
  employeeType: string;
  status: string;
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

type BuilderShiftKey = 'R1' | 'R2' | 'P' | 'OC' | 'FIELD_SUP';

type BuilderShift = {
  employee1: string;
  employee2: string;
};

type BuilderDay = Record<BuilderShiftKey, BuilderShift>;

type BuilderSchedule = Record<string, BuilderDay>;

type BuilderWarning = {
  id: string;
  severity: 'warning' | 'danger';
  message: string;
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
const OPEN_ALS_SLOT_ID = '__OPEN_ALS__';
const OPEN_BLS_SLOT_ID = '__OPEN_BLS__';

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

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

function makeDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function SupervisorPage() {
  const [activeTile, setActiveTile] = useState<string | null>(null);

  const [showEmployeesNotSubmitted, setShowEmployeesNotSubmitted] = useState(false);
  const [showPendingReview, setShowPendingReview] = useState(false);
  const [showReviewedTimecards, setShowReviewedTimecards] = useState(false);
  const [selectedTimecardId, setSelectedTimecardId] = useState<string | null>(null);
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);
  const [showEula, setShowEula] = useState(false);
  const [announcements, setAnnouncements] = useState<CompanyAnnouncement[]>([]);
  const [submittedTimecards, setSubmittedTimecards] = useState<SubmittedTimecard[]>([]);
  const [scheduleAssignments, setScheduleAssignments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [authEmail, setAuthEmail] = useState('');
  const [apolloMessages, setApolloMessages] = useState<ApolloMessage[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(getDefaultSystemConfig());
  const [openShiftRequests, setOpenShiftRequests] = useState<OpenShiftRequest[]>([]);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [returnComments, setReturnComments] = useState<Record<string, string>>({});
  const [selectedPayPeriodKey, setSelectedPayPeriodKey] = useState('');
  const [payrollSubmission, setPayrollSubmission] = useState<{
    submittedBy: string;
    submittedAt: string;
    payPeriodKey: string;
    approvedCount: number;
  } | null>(null);
  const [builderStartDate, setBuilderStartDate] = useState('');
  const [builderEndDate, setBuilderEndDate] = useState('');
  const [builderSchedule, setBuilderSchedule] = useState<BuilderSchedule>({});
  const [messageRecipientMode, setMessageRecipientMode] = useState('ALL_ACTIVE');
  const [messageRecipientEmployeeId, setMessageRecipientEmployeeId] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [messagePriority, setMessagePriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('NORMAL');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState(makeDateInputValue(addDays(new Date(), 7)));

  const payPeriodOptions = useMemo(() => buildPayPeriodOptions(new Date(), 28), []);
  const currentPayPeriod = useMemo(() => getCurrentPayPeriodOption(payPeriodOptions, new Date()), [payPeriodOptions]);

  const selectedPayPeriod = useMemo(() => {
    return payPeriodOptions.find((option) => option.key === selectedPayPeriodKey) ?? currentPayPeriod;
  }, [currentPayPeriod, payPeriodOptions, selectedPayPeriodKey]);

  const payrollLocked = payrollSubmission?.payPeriodKey === selectedPayPeriod.key;

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
      supabase
        .from('company_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to load announcements:', error);
          } else {
            setAnnouncements(
              (data ?? []).map((row: any) => ({
                id: row.id,
                title: row.title,
                message: row.message,
                createdAt: row.created_at,
                expiresAt: row.expires_at,
                postedBy: row.posted_by,
              })),
            );
          }
        });

      supabase
        .from('submitted_timecards')
        .select('*')
        .order('submitted_at', { ascending: false })
        .then(({ data: submittedData, error: submittedError }) => {
          if (submittedError) {
            console.error('Failed to load submitted timecards:', submittedError);
          } else {
            setSubmittedTimecards(
              (submittedData ?? []).map((row: any) => ({
                id: row.id,
                employeeId: row.employee_id,
                employeeName: row.employee_name,
                payPeriodKey: row.pay_period_key,
                payPeriodStart: row.pay_period_start,
                payPeriodEnd: row.pay_period_end,
                submittedAt: row.submitted_at,
                totalHours: row.total_hours ?? 0,
                payBreakdown: row.pay_breakdown ?? undefined,
                punches: row.punches ?? [],
                missedMealBreaks: row.missed_meal_breaks ?? [],
                corrections: row.corrections ?? [],
                note: row.note ?? '',
                status: row.status,
                supervisorComment: row.supervisor_comment ?? undefined,
                reviewedAt: row.reviewed_at ?? undefined,
                reviewedBy: row.reviewed_by ?? undefined,
              })),
            );
          }
        });

      supabase
        .from('schedule_assignments')
        .select('date_key,employee_id,is_open_slot,shift_label')
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to load schedule assignments:', error);
          } else {
            setScheduleAssignments(data ?? []);
          }
        });

      supabase
        .from('payroll_submissions')
        .select('*')
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to load payroll submissions:', error);
          } else {
            const currentSubmission = (data ?? []).find(
              (row: any) => row.pay_period_key === selectedPayPeriod.key,
            );

            setPayrollSubmission(
              currentSubmission
                ? {
                    submittedBy: currentSubmission.submitted_by,
                    submittedAt: currentSubmission.submitted_at,
                    payPeriodKey: currentSubmission.pay_period_key,
                    approvedCount: currentSubmission.approved_timecards,
                  }
                : null,
            );
          }
        });

      supabase
        .from('apollo_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data: messageData, error: messageError }) => {
          if (messageError) {
            console.error('Failed to load Apollo messages:', messageError);
          } else {
            setApolloMessages(
              (messageData ?? []).map((row: any) => ({
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
              })),
            );
          }
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

      supabase
        .from('incident_reports')
        .select('id,incident_number,created_at,employee_name,category,assigned_supervisor,status')
        .order('created_at', { ascending: false })
        .then(({ data: incidentData, error: incidentError }) => {
          if (incidentError) {
            console.error('Failed to load incident reports:', incidentError);
          } else {
            setIncidentReports((incidentData ?? []) as IncidentReport[]);
          }
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
        })
        .catch((employeeError) => {
          console.error('Failed to load employees from Supabase:', employeeError);
          setEmployees(loadEmployeesFromProfiles());
        });

      setSelectedPayPeriodKey(currentPayPeriod.key);
    } catch (error) {
      console.error('Failed to load supervisor data:', error);
    }
  }, [currentPayPeriod.key]);

  const activeAnnouncements = useMemo(() => {
    const now = new Date();

    return announcements
      .filter((announcement) => new Date(announcement.expiresAt) >= now)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [announcements]);

  const expiredAnnouncements = useMemo(() => {
    const now = new Date();

    return announcements
      .filter((announcement) => new Date(announcement.expiresAt) < now)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [announcements]);

  const selectedPayPeriodTimecards = useMemo(() => {
    const selectedStartKey = makeDateInputValue(selectedPayPeriod.start);
    const selectedEndKey = makeDateInputValue(selectedPayPeriod.end);

    return submittedTimecards.filter((timecard) => {
      const timecardStartKey = makeDateInputValue(new Date(timecard.payPeriodStart));
      const timecardEndKey = makeDateInputValue(new Date(timecard.payPeriodEnd));

      return (
        timecard.payPeriodKey === selectedPayPeriod.key &&
        timecardStartKey === selectedStartKey &&
        timecardEndKey === selectedEndKey
      );
    });
  }, [selectedPayPeriod.end, selectedPayPeriod.key, selectedPayPeriod.start, submittedTimecards]);

  const pendingTimecards = useMemo(() => {
    return selectedPayPeriodTimecards
      .filter((timecard) => timecard.status === 'PENDING_SUPERVISOR_REVIEW')
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [selectedPayPeriodTimecards]);

  const reviewedTimecards = useMemo(() => {
    return selectedPayPeriodTimecards
      .filter((timecard) => timecard.status !== 'PENDING_SUPERVISOR_REVIEW')
      .sort((a, b) => new Date(b.reviewedAt ?? b.submittedAt).getTime() - new Date(a.reviewedAt ?? a.submittedAt).getTime());
  }, [selectedPayPeriodTimecards]);

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



  async function refreshApolloMessages() {
    const { data, error } = await supabase
      .from('apollo_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supervisor Apollo message refresh failed:', error);
      return;
    }

    setApolloMessages(
      (data ?? []).map((row: any) => ({
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
      })),
    );
  }

  useEffect(() => {
    const channel = supabase
      .channel('supervisor-apollo-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'apollo_messages',
        },
        async () => {
          const { data, error } = await supabase
            .from('apollo_messages')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Realtime supervisor Apollo message refresh failed:', error);
            return;
          }

          setApolloMessages(
            (data ?? []).map((row: any) => ({
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
            })),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshApolloMessages();
    }, 10000);

    return () => window.clearInterval(interval);
  }, []);

  function saveSubmittedTimecards(nextTimecards: SubmittedTimecard[]) {
    setSubmittedTimecards(nextTimecards);

    const payload = nextTimecards.map((timecard) => ({
      id: timecard.id,
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
      note: timecard.note ?? '',
      status: timecard.status,
      supervisor_comment: 'supervisorComment' in timecard ? (timecard.supervisorComment ?? null) : null,
      reviewed_at: 'reviewedAt' in timecard ? (timecard.reviewedAt ?? null) : null,
      reviewed_by: 'reviewedBy' in timecard ? (timecard.reviewedBy ?? null) : null,
      updated_at: new Date().toISOString(),
    }));

    supabase
      .from('submitted_timecards')
      .upsert(payload, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) {
          console.error('Failed to save submitted timecards:', error);
          window.alert(`Submitted timecard save failed: ${error.message}`);
        }
      });
  }

  function approveTimecard(timecardId: string) {
    const timecard = submittedTimecards.find((item) => item.id === timecardId);

    if (timecard?.employeeId === CURRENT_SUPERVISOR_EMPLOYEE_ID) {
      window.alert('You cannot approve your own timecard. It must be reviewed by another supervisor or GM.');
      return;
    }

    const nextTimecards = submittedTimecards.map((item) =>
      item.id === timecardId
        ? {
            ...item,
            status: 'APPROVED' as const,
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'Supervisor',
            supervisorComment: '',
          }
        : item,
    );

    saveSubmittedTimecards(nextTimecards);
  }

  function saveApolloMessages(nextMessages: ApolloMessage[]) {
    setApolloMessages(nextMessages);

    const rows = nextMessages.map((message) => ({
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
    }));

    supabase
      .from('apollo_messages')
      .upsert(rows, { onConflict: 'id' })
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
      'annualTbScreen',
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

  const selectedSupervisorConversation =
    supervisorConversations.find((conversation) => conversation.conversationId === selectedConversationId) ?? supervisorConversations[0] ?? null;

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

  function getIsoDateInputValue(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function getBuilderDateRange(start: string, end: string): string[] {
    const dates: string[] = [];
    const current = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);

    if (Number.isNaN(current.getTime()) || Number.isNaN(last.getTime()) || current > last) {
      return dates;
    }

    while (current <= last) {
      dates.push(getIsoDateInputValue(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  function getBuilderTemplateDateKeys(): string[] {
    if (!builderStartDate) {
      return [];
    }

    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(`${builderStartDate}T00:00:00`);
      date.setDate(date.getDate() + index);
      return getIsoDateInputValue(date);
    });
  }

  function createEmptyBuilderDay(): BuilderDay {
    return {
      R1: { employee1: '', employee2: '' },
      R2: { employee1: '', employee2: '' },
      P: { employee1: '', employee2: '' },
      OC: { employee1: '', employee2: '' },
      FIELD_SUP: { employee1: '', employee2: '' },
    };
  }

  function initializeScheduleBuilder() {
    if (!builderStartDate || !builderEndDate) {
      window.alert('Select a start date and end date before building the layout.');
      return;
    }

    const launchDates = getBuilderDateRange(builderStartDate, builderEndDate);

    if (launchDates.length === 0) {
      window.alert('Select a valid date range.');
      return;
    }

    if (launchDates.length < 14) {
      window.alert('The Schedule Builder needs at least a 14-day date range.');
      return;
    }

    const nextSchedule: BuilderSchedule = {};
    getBuilderTemplateDateKeys().forEach((dateKey) => {
      nextSchedule[dateKey] = createEmptyBuilderDay();
    });

    setBuilderSchedule(nextSchedule);
  }

  function updateBuilderSlot(dateKey: string, shiftKey: BuilderShiftKey, slot: keyof BuilderShift, employeeId: string) {
    setBuilderSchedule((current) => ({
      ...current,
      [dateKey]: {
        ...current[dateKey],
        [shiftKey]: {
          ...current[dateKey][shiftKey],
          [slot]: employeeId,
        },
      },
    }));
  }

  function getBuilderEmployeeName(employeeId: string): string {
    if (!employeeId) {
      return '';
    }

    if (employeeId === OPEN_ALS_SLOT_ID) {
      return 'Open ALS';
    }

    if (employeeId === OPEN_BLS_SLOT_ID) {
      return 'Open BLS';
    }

    return employees.find((employee) => employee.id === employeeId)?.name ?? employeeId;
  }

  function buildScheduleSlot(employeeId: string, startTime = '06:00', endTime = '06:00') {
    return {
      employeeId,
      startTime,
      endTime,
      note: '',
    };
  }

  function buildEmptyScheduleShift() {
    return {
      employee1: buildScheduleSlot(''),
      employee2: buildScheduleSlot(''),
      employee3: buildScheduleSlot(''),
      showEmployee3: false,
      vehicle: '',
      allowExtendedHours: false,
    };
  }

  function getBuilderShiftLabel(shiftKey: BuilderShiftKey): string {
    if (shiftKey === 'R1') return 'Reedley 1';
    if (shiftKey === 'R2') return 'Reedley 2';
    if (shiftKey === 'P') return 'Parlier';
    if (shiftKey === 'OC') return 'Orange Cove';
    return 'Field Supervisor';
  }

  function getBuilderEmployeeAssignments() {
    const assignments: Record<
      string,
      {
        employeeName: string;
        totalHours: number;
        week1Hours: number;
        week2Hours: number;
        assignedDateKeys: string[];
        weekendDateKeys: string[];
      }
    > = {};

    Object.entries(builderSchedule).forEach(([dateKey, day], dayIndex) => {
      const date = new Date(`${dateKey}T00:00:00`);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const weekNumber = dayIndex < 7 ? 1 : 2;

      (Object.keys(day) as BuilderShiftKey[]).forEach((shiftKey) => {
        const shift = day[shiftKey];
        [shift.employee1, shift.employee2].forEach((employeeId) => {
          if (!employeeId || employeeId === OPEN_ALS_SLOT_ID || employeeId === OPEN_BLS_SLOT_ID) return;

          if (!assignments[employeeId]) {
            assignments[employeeId] = {
              employeeName: getBuilderEmployeeName(employeeId),
              totalHours: 0,
              week1Hours: 0,
              week2Hours: 0,
              assignedDateKeys: [],
              weekendDateKeys: [],
            };
          }

          assignments[employeeId].totalHours += 24;
          assignments[employeeId].assignedDateKeys.push(dateKey);

          if (weekNumber === 1) {
            assignments[employeeId].week1Hours += 24;
          } else {
            assignments[employeeId].week2Hours += 24;
          }

          if (isWeekend) {
            assignments[employeeId].weekendDateKeys.push(dateKey);
          }
        });
      });
    });

    return assignments;
  }

  function getBuilderWarnings(): BuilderWarning[] {
    const warnings: BuilderWarning[] = [];
    const assignments = getBuilderEmployeeAssignments();

    Object.entries(assignments).forEach(([employeeId, assignment]) => {
      const hasExpectedTotal = assignment.totalHours === 120;
      const hasExpectedWeeklySplit =
        (assignment.week1Hours === 48 && assignment.week2Hours === 72) ||
        (assignment.week1Hours === 72 && assignment.week2Hours === 48);

      if (!hasExpectedTotal || !hasExpectedWeeklySplit) {
        warnings.push({
          id: `hours-${employeeId}`,
          severity: 'warning',
          message: `${assignment.employeeName} is scheduled ${assignment.totalHours} hours (${assignment.week1Hours}/${assignment.week2Hours}). Expected 120 hours with a 48/72 or 72/48 split.`,
        });
      }

      const sortedDates = Array.from(new Set(assignment.assignedDateKeys)).sort();
      let consecutiveDays = 1;

      for (let index = 1; index < sortedDates.length; index += 1) {
        const previous = new Date(`${sortedDates[index - 1]}T00:00:00`);
        const current = new Date(`${sortedDates[index]}T00:00:00`);
        const dayDifference = Math.round((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDifference === 1) {
          consecutiveDays += 1;
        } else {
          consecutiveDays = 1;
        }

        if (consecutiveDays > 2) {
          warnings.push({
            id: `consecutive-${employeeId}-${sortedDates[index]}`,
            severity: 'danger',
            message: `${assignment.employeeName} appears to exceed 48 consecutive hours around ${sortedDates[index]}.`,
          });
          break;
        }
      }

      if (assignment.weekendDateKeys.length === 0) {
        warnings.push({
          id: `weekend-${employeeId}`,
          severity: 'warning',
          message: `${assignment.employeeName} is not scheduled for a Saturday or Sunday in this 2-week template.`,
        });
      }
    });

    return warnings;
  }

  function getLaunchedScheduleDayFromBuilderDay(day: BuilderDay) {
    return {
      standard: {
        R1: {
          ...buildEmptyScheduleShift(),
          employee1: buildScheduleSlot(day.R1.employee1),
          employee2: buildScheduleSlot(day.R1.employee2),
        },
        R2: {
          ...buildEmptyScheduleShift(),
          employee1: buildScheduleSlot(day.R2.employee1),
          employee2: buildScheduleSlot(day.R2.employee2),
        },
        P: {
          ...buildEmptyScheduleShift(),
          employee1: buildScheduleSlot(day.P.employee1),
          employee2: buildScheduleSlot(day.P.employee2),
        },
        OC: {
          ...buildEmptyScheduleShift(),
          employee1: buildScheduleSlot(day.OC.employee1),
          employee2: buildScheduleSlot(day.OC.employee2),
        },
        GM: buildEmptyScheduleShift(),
        FIELD_SUP: {
          ...buildEmptyScheduleShift(),
          employee1: buildScheduleSlot(day.FIELD_SUP.employee1),
        },
      },
      extras: [],
    };
  }

  async function launchBuilderSchedule() {
    const templateDateKeys = Object.keys(builderSchedule).sort();
    const launchDateKeys = getBuilderDateRange(builderStartDate, builderEndDate);

    console.log('Apollo schedule launch range', {
      builderStartDate,
      builderEndDate,
      launchDateCount: launchDateKeys.length,
      firstLaunchDate: launchDateKeys[0] ?? null,
      lastLaunchDate: launchDateKeys[launchDateKeys.length - 1] ?? null,
    });

    if (launchDateKeys.length < 14) {
      window.alert(`Schedule launch cancelled. The selected launch range only has ${launchDateKeys.length} day(s). Select the full pay period before launching.`);
      return;
    }

    if (templateDateKeys.length === 0) {
      window.alert('Build a schedule layout before launching.');
      return;
    }

    if (launchDateKeys.length === 0) {
      window.alert('Select a valid start and end date before launching.');
      return;
    }

    const warningCount = getBuilderWarnings().length;
    const firstConfirm = window.confirm(
      `Launch this schedule from ${launchDateKeys[0]} through ${launchDateKeys[launchDateKeys.length - 1]}? This will overwrite and replace any currently published schedule in that date range.${warningCount > 0 ? `\n\nThere are ${warningCount} schedule warning(s).` : ''}`,
    );

    if (!firstConfirm) {
      return;
    }

    const acknowledgement = window.prompt('Type LAUNCH to confirm publishing this schedule.');
    if (acknowledgement !== 'LAUNCH') {
      window.alert('Schedule launch cancelled.');
      return;
    }

    try {
      for (const dateKey of launchDateKeys) {
        const { error: scheduleError } = await supabase.from('schedules').upsert({
          id: dateKey,
          date_key: dateKey,
          updated_at: new Date().toISOString(),
        });

        if (scheduleError) {
          throw scheduleError;
        }

        const { error: deleteError } = await supabase
          .from('schedule_assignments')
          .delete()
          .eq('date_key', dateKey);

        if (deleteError) {
          throw deleteError;
        }
      }

      const rows: any[] = [];

      launchDateKeys.forEach((dateKey, index) => {
        const templateIndex = index % 14;
        const normalizedTemplateDateKey = templateDateKeys[templateIndex];
        const normalizedTemplateDay = builderSchedule[normalizedTemplateDateKey];

        if (!normalizedTemplateDay) {
          return;
        }

        const normalizedLaunchedDay = getLaunchedScheduleDayFromBuilderDay(normalizedTemplateDay);

        Object.entries(normalizedLaunchedDay.standard).forEach(([shiftKey, shift]: any) => {
          const shiftLabel =
            shiftKey === 'R1'
              ? 'Reedley 1'
              : shiftKey === 'R2'
                ? 'Reedley 2'
                : shiftKey === 'P'
                  ? 'Parlier'
                  : shiftKey === 'OC'
                    ? 'Orange Cove'
                    : shiftKey === 'FIELD_SUP'
                      ? 'Field Supervisor'
                      : 'GM';

          rows.push({
            id: `${dateKey}-${shiftKey}-0`,
            schedule_id: dateKey,
            date_key: dateKey,
            shift_key: shiftKey,
            shift_label: shiftLabel,
            slot_number: 0,
            employee_id: null,
            start_time: shift.employee1?.startTime ?? '06:00',
            end_time: shift.employee1?.endTime ?? '06:00',
            note: '',
            vehicle: shift.vehicle || '',
            allow_extended_hours: Boolean(shift.allowExtendedHours),
            is_open_slot: false,
            open_slot_scope: null,
            updated_at: new Date().toISOString(),
          });

          (['employee1', 'employee2', 'employee3'] as const).forEach((slotKey, slotIndex) => {
            const slot = shift[slotKey];
            const employeeId = slot?.employeeId ?? '';

            if (!employeeId && !slot?.startTime && !slot?.endTime && !slot?.note) {
              return;
            }

            const isOpenSlot = employeeId === OPEN_ALS_SLOT_ID || employeeId === OPEN_BLS_SLOT_ID;

            rows.push({
              id: `${dateKey}-${shiftKey}-${slotIndex + 1}`,
              schedule_id: dateKey,
              date_key: dateKey,
              shift_key: shiftKey,
              shift_label: shiftLabel,
              slot_number: slotIndex + 1,
              employee_id: isOpenSlot ? null : employeeId || null,
              start_time: slot?.startTime ?? '06:00',
              end_time: slot?.endTime ?? '06:00',
              note: slot?.note ?? '',
              vehicle: shift.vehicle || '',
              allow_extended_hours: Boolean(shift.allowExtendedHours),
              is_open_slot: isOpenSlot,
              open_slot_scope: employeeId === OPEN_ALS_SLOT_ID ? 'ALS' : employeeId === OPEN_BLS_SLOT_ID ? 'BLS' : null,
              updated_at: new Date().toISOString(),
            });
          });
        });
      });

      if (rows.length > 0) {
        const chunkSize = 100;

        for (let index = 0; index < rows.length; index += chunkSize) {
          const chunk = rows.slice(index, index + chunkSize);

          const { error: assignmentError } = await supabase
            .from('schedule_assignments')
            .upsert(chunk, { onConflict: 'id' });

          if (assignmentError) {
            throw assignmentError;
          }
        }
      }

      void addAuditEntry('SCHEDULE_LAUNCHED', `Schedule launched for ${launchDateKeys[0]} through ${launchDateKeys[launchDateKeys.length - 1]}`);

      localStorage.setItem('apollo-schedule-refresh', new Date().toISOString());

      window.alert('Schedule launched successfully.');
    } catch (error) {
      console.error('Schedule launch failed:', error);
      window.alert('Schedule launch failed. Check console for details.');
    }
  }

  const builderDateKeys = Object.keys(builderSchedule).sort();
  const builderWarnings = getBuilderWarnings();

  const openIncidentReports = useMemo(() => {
    return incidentReports.filter((report) => report.status !== 'CLOSED');
  }, [incidentReports]);

  const closedIncidentReports = useMemo(() => {
    return incidentReports.filter((report) => report.status === 'CLOSED');
  }, [incidentReports]);

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
    setOpenShiftRequests(nextRequests);

    const rows = nextRequests.map((request) => ({
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

  function returnTimecard(timecardId: string) {
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

    const nextTimecards = submittedTimecards.map((item) =>
      item.id === timecardId
        ? {
            ...item,
            status: 'RETURNED' as const,
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'Supervisor',
            supervisorComment: comment,
          }
        : item,
    );

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

    saveSubmittedTimecards(nextTimecards);
    saveApolloMessages([message, ...apolloMessages]);

    setReturnComments((current) => ({
      ...current,
      [timecardId]: '',
    }));
  }

  function getPunchPairForDate(timecard: SubmittedTimecard, dateKey: string) {
    const punches = timecard.punches
      .filter((punch) => punch.shiftDateKey === dateKey)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const clockIn = punches.find((punch) => punch.type === 'CLOCK_IN') ?? null;
    const clockOut = [...punches].reverse().find((punch) => punch.type === 'CLOCK_OUT') ?? null;
    const shiftLabel = clockIn?.shiftLabel ?? clockOut?.shiftLabel ?? '';

    return { clockIn, clockOut, shiftLabel };
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
    if (timecard.payBreakdown) {
      return timecard.payBreakdown;
    }

    return {
      regularHours: timecard.totalHours,
      overtimeHours: 0,
      doubleTimeHours: 0,
      holidayPremiumHours: 0,
      missedMealPenaltyHours: timecard.missedMealBreaks.length,
      week1: {
        regularHours: timecard.totalHours,
        overtimeHours: 0,
        doubleTimeHours: 0,
      },
      week2: {
        regularHours: 0,
        overtimeHours: 0,
        doubleTimeHours: 0,
      },
    };
  }

  function hasManualEditFlag(timecard: SubmittedTimecard): boolean {
    return timecard.punches.some((punch) => punch.locationLabel === 'Employee edited timecard');
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

  function getScheduleMatchStatus(timecard: SubmittedTimecard): 'MATCH' | 'REVIEW' {
    if (
      hasManualEditFlag(timecard) ||
      hasGeofenceReviewFlag(timecard) ||
      timecard.missedMealBreaks.length > 0
    ) {
      return 'REVIEW';
    }

    const startKey = makeDateInputValue(new Date(timecard.payPeriodStart));
    const endKey = makeDateInputValue(new Date(timecard.payPeriodEnd));

    const scheduledRows = scheduleAssignments.filter(
      (row) =>
        row.employee_id === timecard.employeeId &&
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

  function reopenPayroll() {
    if (!payrollLocked) {
      return;
    }

    const confirmed = window.confirm(
      'Reopen this pay period? This will remove the payroll submission record and allow timecard changes again.',
    );

    if (!confirmed) {
      return;
    }

    supabase
      .from('payroll_submissions')
      .delete()
      .eq('pay_period_key', selectedPayPeriod.key)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to reopen payroll:', error);
          window.alert(`Payroll reopen failed: ${error.message}`);
        } else {
          setPayrollSubmission(null);
          void addAuditEntry('PAYROLL_REOPENED', `Payroll reopened for ${formatShortDate(selectedPayPeriod.start)} to ${formatShortDate(selectedPayPeriod.end)}.`);
          window.alert('Payroll reopened.');
        }
      });
  }

  function submitPayroll() {
    const approvedCount = reviewedTimecards.filter(
      (timecard) => timecard.status === 'APPROVED'
    ).length;

    if (employeesNotSubmitted.length > 0) {
      window.alert('Payroll cannot be submitted. Employees still have missing timecards.');
      return;
    }

    if (pendingTimecards.length > 0) {
      window.alert('Payroll cannot be submitted. Timecards are still pending review.');
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

    setPayrollSubmission(submission);
    void addAuditEntry('PAYROLL_SUBMITTED', `Payroll submitted for ${formatShortDate(selectedPayPeriod.start)} to ${formatShortDate(selectedPayPeriod.end)} (${approvedCount} approved timecards).`);

    supabase
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
      )
      .then(({ error }) => {
        if (error) {
          console.error('Failed to save payroll submission:', error);
          window.alert(`Payroll submission save failed: ${error.message}`);
        } else {
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

          window.alert('Payroll submission recorded. Kira has been notified by email.');
        }
      });
  }

  function printAllTimecards() {
    const approvedCards = reviewedTimecards.filter((timecard) => timecard.status === 'APPROVED');

    if (approvedCards.length === 0) {
      window.alert('No approved timecards available for printing.');
      return;
    }

    const html = approvedCards
      .map((timecard) => {
        const element = document.getElementById(`printable-${timecard.id}`);
        if (!element) return '';

        return `
          <div class="payroll-packet-page">
            ${element.innerHTML}
          </div>
        `;
      })
      .join('');

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Payroll Packet</title>
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

  function renderSubmittedTimecard(timecard: SubmittedTimecard) {
    const payPeriodStart = new Date(timecard.payPeriodStart);
    const allDates = Array.from({ length: 14 }, (_, index) => addDays(payPeriodStart, index));
    const weeks = [
      { label: 'Week-1', dates: allDates.slice(0, 7) },
      { label: 'Week-2', dates: allDates.slice(7, 14) },
    ];

    const breakdown = getPayBreakdown(timecard);
    const hasManualEdits = hasManualEditFlag(timecard);
    const hasGeofenceFlags = hasGeofenceReviewFlag(timecard);
    const hasMissingPunches = hasMissingPunchFlag(timecard, weeks);
    const hasMissedMeals = timecard.missedMealBreaks.length > 0;
    const hasFlags = hasManualEdits || hasGeofenceFlags || hasMissingPunches || hasMissedMeals;
    const isOwnSupervisorTimecard = timecard.employeeId === CURRENT_SUPERVISOR_EMPLOYEE_ID;
    const scheduleMatchStatus = getScheduleMatchStatus(timecard);

    return (
      <div id={`printable-${timecard.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
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
                ? 'Pending Review ({pendingTimecards.length})'
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
            {timecard.status === 'APPROVED' && (
              <button
                type="button"
                onClick={() => printTimecard(timecard.id)}
                className="no-print rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Print / Save PDF
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
          <div className="min-w-[980px] p-4">
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
                    {week.dates.map((date, index) => {
                      const dateKey = getDateKeyFromDate(date);
                      const pair = getPunchPairForDate(timecard, dateKey);
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

                      return (
                        <tr key={`${timecard.id}-${week.label}-${dateKey}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}>
                          <td className="border border-slate-400 px-2 py-1 text-center font-semibold">{index + 1}</td>
                          <td className="border border-slate-400 px-2 py-1 text-center">{pair.shiftLabel}</td>
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
                            ) : pair.shiftLabel ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">OK</span>
                            ) : null}
                          </td>
                        </tr>
                      );
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

        {timecard.status === 'PENDING_SUPERVISOR_REVIEW' && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
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
                disabled={payrollLocked}
                onClick={() => returnTimecard(timecard.id)}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {payrollLocked ? 'Payroll Locked' : 'Return for Correction'}
              </button>

              <button
                type="button"
                disabled={isOwnSupervisorTimecard || payrollLocked}
                onClick={() => approveTimecard(timecard.id)}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {payrollLocked ? 'Payroll Locked' : isOwnSupervisorTimecard ? 'Needs Other Approver' : 'Approve'}
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
      id: `audit-${Date.now()}`,
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

    setAuditLog((current) => [entry, ...current].slice(0, 250));
  }

  async function saveSystemConfig(nextConfig: SystemConfig, action = 'SYSTEM_CONFIG_UPDATED', details = 'System configuration updated') {
    setSystemConfig(nextConfig);

    const { error } = await supabase
      .from('system_config')
      .upsert(
        {
          id: 'default',
          company_name: nextConfig.companyName,
          logo_data_url: nextConfig.logoDataUrl,
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

  function updateCompanyName(value: string) {
    saveSystemConfig(
      { ...systemConfig, companyName: value },
      'COMPANY_NAME_UPDATED',
      `Company name changed to "${value}"`,
    );
  }

  function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      saveSystemConfig(
        { ...systemConfig, logoDataUrl: String(reader.result ?? '') },
        'COMPANY_LOGO_UPDATED',
        `Company logo uploaded: ${file.name}`,
      );
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    if (!window.confirm('Remove the current company logo from Apollo?')) return;
    saveSystemConfig({ ...systemConfig, logoDataUrl: '' }, 'COMPANY_LOGO_REMOVED', 'Company logo removed');
  }

  function addImportantLink() {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) {
      window.alert('Enter both a label and URL before adding a link.');
      return;
    }

    saveSystemConfig(
      {
        ...systemConfig,
        importantLinks: [
          ...systemConfig.importantLinks,
          { id: `link-${Date.now()}`, label: newLinkLabel.trim(), url: newLinkUrl.trim() },
        ],
      },
      'IMPORTANT_LINK_ADDED',
      `Added important link: ${newLinkLabel.trim()}`,
    );

    setNewLinkLabel('');
    setNewLinkUrl('');
  }

  function updateImportantLink(id: string, partial: Partial<ImportantLink>) {
    const existing = systemConfig.importantLinks.find((link) => link.id === id);
    saveSystemConfig(
      {
        ...systemConfig,
        importantLinks: systemConfig.importantLinks.map((link) => (link.id === id ? { ...link, ...partial } : link)),
      },
      'IMPORTANT_LINK_UPDATED',
      `Updated important link: ${existing?.label ?? id}`,
    );
  }

  function removeImportantLink(id: string) {
    const existing = systemConfig.importantLinks.find((link) => link.id === id);
    if (!window.confirm(`Delete important link "${existing?.label ?? 'selected link'}"? This removes it from the Employee Dashboard.`)) return;

    saveSystemConfig(
      { ...systemConfig, importantLinks: systemConfig.importantLinks.filter((link) => link.id !== id) },
      'IMPORTANT_LINK_DELETED',
      `Deleted important link: ${existing?.label ?? id}`,
    );
  }

  function updateGeofence(id: string, partial: Partial<GeofenceConfig>) {
    const existing = systemConfig.geofences.find((geofence) => geofence.id === id);
    saveSystemConfig(
      {
        ...systemConfig,
        geofences: systemConfig.geofences.map((geofence) => (geofence.id === id ? { ...geofence, ...partial } : geofence)),
      },
      'GEOFENCE_UPDATED',
      `Updated geofence: ${existing?.shiftLabel ?? id}`,
    );
  }

  function addGeofence() {
    saveSystemConfig(
      {
        ...systemConfig,
        geofences: [
          ...systemConfig.geofences,
          { id: `geofence-${Date.now()}`, shiftLabel: 'New Location', locationLabel: 'New Location', latitude: 0, longitude: 0, radiusFeet: 500 },
        ],
      },
      'GEOFENCE_ADDED',
      'Added new geofence',
    );
  }

  function removeGeofence(id: string) {
    const existing = systemConfig.geofences.find((geofence) => geofence.id === id);
    if (!window.confirm(`Delete geofence "${existing?.shiftLabel ?? 'selected geofence'}"? Employees assigned to that shift may no longer have an approved clock-in location.`)) return;

    saveSystemConfig(
      { ...systemConfig, geofences: systemConfig.geofences.filter((geofence) => geofence.id !== id) },
      'GEOFENCE_DELETED',
      `Deleted geofence: ${existing?.shiftLabel ?? id}`,
    );
  }

  function saveAnnouncements(nextAnnouncements: CompanyAnnouncement[]) {
    setAnnouncements(nextAnnouncements);

    const rows = nextAnnouncements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      created_at: announcement.createdAt,
      expires_at: announcement.expiresAt,
      posted_by: announcement.postedBy,
      updated_at: new Date().toISOString(),
    }));

    supabase
      .from('company_announcements')
      .upsert(rows, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) {
          console.error('Failed to save announcements:', error);
          window.alert(`Announcement save failed: ${error.message}`);
        }
      });
  }

  function createAnnouncement() {
    if (!title.trim() || !message.trim() || !expiresAt) {
      return;
    }

    const expiresDate = new Date(`${expiresAt}T23:59:59`);

    const announcement: CompanyAnnouncement = {
      id: `announcement-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
      expiresAt: expiresDate.toISOString(),
      postedBy: 'Supervisor',
    };

    saveAnnouncements([announcement, ...announcements]);
    setTitle('');
    setMessage('');
    setExpiresAt(makeDateInputValue(addDays(new Date(), 7)));
  }

  function deleteAnnouncement(announcementId: string) {
    const existing = announcements.find((announcement) => announcement.id === announcementId);

    if (!window.confirm(`Delete announcement "${existing?.title ?? 'selected announcement'}"?`)) {
      return;
    }

    setAnnouncements((current) => current.filter((announcement) => announcement.id !== announcementId));

    supabase
      .from('company_announcements')
      .delete()
      .eq('id', announcementId)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete announcement:', error);
          window.alert(`Announcement delete failed: ${error.message}`);
          return;
        }

        void addAuditEntry(
          'ANNOUNCEMENT_DELETED',
          `Deleted announcement: ${existing?.title ?? announcementId}`,
        );
      });
  }

  function toggleTile(tileId: string) {
    setActiveTile((current) => (current === tileId ? null : tileId));
  }

  function renderTile(
    id: string,
    titleText: string,
    description: string,
    children: React.ReactNode,
    hasAlert = false,
  ) {
    const isOpen = activeTile === id;

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

        {isOpen && <div className="border-t border-slate-200 p-5">{children}</div>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 px-4 py-6 md:px-6">
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
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <a
                  href="/schedule"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Open Schedule
                </a>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <button
                  type="button"
                  onClick={() => setShowScheduleBuilder((value) => !value)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Schedule Builder
                    </div>

                    <div className="mt-1 text-sm text-slate-600">
                      Build and launch repeating 2-week schedule templates.
                    </div>
                  </div>

                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                    {showScheduleBuilder ? 'Hide Builder' : 'Open Builder'}
                  </span>
                </button>

                {showScheduleBuilder && (
                  <>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={builderStartDate}
                      onChange={(event) => setBuilderStartDate(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Repeat Until / End Date
                    </label>
                    <input
                      type="date"
                      value={builderEndDate}
                      onChange={(event) => setBuilderEndDate(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={initializeScheduleBuilder}
                      className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 md:w-auto"
                    >
                      Build Layout
                    </button>
                  </div>
                </div>

                {builderDateKeys.length > 0 && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-bold text-slate-900">Schedule Builder Warnings</div>
                    <div className="mt-1 text-xs text-slate-600">
                      These warnings help catch schedule issues before launch. They do not block launch, but launching requires acknowledgement.
                    </div>

                    {builderWarnings.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                        No schedule warnings found in this 2-week template.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {builderWarnings.map((warning) => (
                          <div
                            key={warning.id}
                            className={`rounded-xl border p-3 text-sm font-semibold ${
                              warning.severity === 'danger'
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                            }`}
                          >
                            {warning.message}
                          </div>
                        ))}
                      </div>
                    )}
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={launchBuilderSchedule}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Launch Schedule
                    </button>
                  </div>


                  </div>
                )}

                {builderDateKeys.length > 0 && (
                  <div className="mt-5 space-y-6">
                    <div className="overflow-auto rounded-xl border border-slate-200">
                      <div className="min-w-[1200px]">
                        <div className="border-b border-slate-200 bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                          Week 1
                        </div>

                        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                          {builderDateKeys.slice(0, 7).map((dateKey) => (
                            <div
                              key={`builder-header-week1-${dateKey}`}
                              className="border-r border-slate-200 p-3 text-center text-sm font-bold text-slate-900 last:border-r-0"
                            >
                              {new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7">
                          {builderDateKeys.slice(0, 7).map((dateKey) => (
                            <div key={`builder-week1-${dateKey}`} className="space-y-3 border-r border-slate-200 p-3 last:border-r-0">
                              {(['R1', 'R2', 'P', 'OC', 'FIELD_SUP'] as BuilderShiftKey[]).map((shiftKey) => (
                                <div key={`${dateKey}-${shiftKey}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                    {getBuilderShiftLabel(shiftKey)}
                                  </div>

                                  <select
                                    value={builderSchedule[dateKey][shiftKey].employee1}
                                    onChange={(event) => updateBuilderSlot(dateKey, shiftKey, 'employee1', event.target.value)}
                                    className="mb-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-slate-500"
                                  >
                                    <option value="">Employee 1</option>
                                    <option value={OPEN_ALS_SLOT_ID}>Open ALS</option>
                                    <option value={OPEN_BLS_SLOT_ID}>Open BLS</option>
                                    {employees.map((employee) => (
                                      <option key={employee.id} value={employee.id}>
                                        {employee.name}
                                      </option>
                                    ))}
                                  </select>

                                  {shiftKey !== 'FIELD_SUP' && (
                                    <select
                                      value={builderSchedule[dateKey][shiftKey].employee2}
                                      onChange={(event) => updateBuilderSlot(dateKey, shiftKey, 'employee2', event.target.value)}
                                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-slate-500"
                                    >
                                      <option value="">Employee 2</option>
                                      <option value={OPEN_ALS_SLOT_ID}>Open ALS</option>
                                      <option value={OPEN_BLS_SLOT_ID}>Open BLS</option>
                                      {employees.map((employee) => (
                                        <option key={employee.id} value={employee.id}>
                                          {employee.name}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {builderDateKeys.length > 7 && (
                      <div className="overflow-auto rounded-xl border border-slate-200">
                        <div className="min-w-[1200px]">
                          <div className="border-b border-slate-200 bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                            Week 2
                          </div>

                          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                            {builderDateKeys.slice(7, 14).map((dateKey) => (
                              <div
                                key={`builder-header-week2-${dateKey}`}
                                className="border-r border-slate-200 p-3 text-center text-sm font-bold text-slate-900 last:border-r-0"
                              >
                                {new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })}
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7">
                            {builderDateKeys.slice(7, 14).map((dateKey) => (
                              <div key={`builder-week2-${dateKey}`} className="space-y-3 border-r border-slate-200 p-3 last:border-r-0">
                                {(['R1', 'R2', 'P', 'OC', 'FIELD_SUP'] as BuilderShiftKey[]).map((shiftKey) => (
                                  <div key={`${dateKey}-${shiftKey}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                      {getBuilderShiftLabel(shiftKey)}
                                    </div>

                                    <select
                                      value={builderSchedule[dateKey][shiftKey].employee1}
                                      onChange={(event) => updateBuilderSlot(dateKey, shiftKey, 'employee1', event.target.value)}
                                      className="mb-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-slate-500"
                                    >
                                      <option value="">Employee 1</option>
                                      <option value={OPEN_ALS_SLOT_ID}>Open ALS</option>
                                      <option value={OPEN_BLS_SLOT_ID}>Open BLS</option>
                                      {employees.map((employee) => (
                                        <option key={employee.id} value={employee.id}>
                                          {employee.name}
                                        </option>
                                      ))}
                                    </select>

                                    {shiftKey !== 'FIELD_SUP' && (
                                      <select
                                        value={builderSchedule[dateKey][shiftKey].employee2}
                                        onChange={(event) => updateBuilderSlot(dateKey, shiftKey, 'employee2', event.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-slate-500"
                                      >
                                        <option value="">Employee 2</option>
                                        <option value={OPEN_ALS_SLOT_ID}>Open ALS</option>
                                        <option value={OPEN_BLS_SLOT_ID}>Open BLS</option>
                                        {employees.map((employee) => (
                                          <option key={employee.id} value={employee.id}>
                                            {employee.name}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {builderDateKeys.length > 0 && (
                  <div className="mt-3 text-xs text-slate-500">
                    Builder template loaded for {builderDateKeys[0]} through {builderDateKeys[builderDateKeys.length - 1]}. Launching repeats this 2-week template through the selected end date and overwrites the published schedule in that date range.
                  </div>
                )}
                  </>
                )}
              </div>

            </div>,
            pendingOpenShiftRequests.length > 0,
          )}

          {renderTile(
            'messaging',
            'Messages',
            supervisorUnreadCount > 0
              ? `${supervisorUnreadCount} unread Apollo message${supervisorUnreadCount === 1 ? '' : 's'}.`
              : 'Send and receive Apollo messages.',
            <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-bold text-slate-900">New Message</div>
                  <div className="mt-3 grid gap-3">
                    <select
                      value={messageRecipientMode}
                      onChange={(event) => setMessageRecipientMode(event.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                    >
                      <option value="ALL_ACTIVE">All Active Employees</option>
                      <option value="INDIVIDUAL">Individual Employee</option>
                      <option value="FULLTIME">Full-Time Employees</option>
                      <option value="PERDIEM">Per Diem Employees</option>
                      <option value="PARAMEDIC">Paramedics / ALS</option>
                      <option value="EMT">EMTs / BLS</option>
                      <option value="SUPERVISORS">Supervisors</option>
                    </select>

                    {messageRecipientMode === 'INDIVIDUAL' && (
                      <select
                        value={messageRecipientEmployeeId}
                        onChange={(event) => setMessageRecipientEmployeeId(event.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                      >
                        <option value="">Select employee</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                      </select>
                    )}

                    <select
                      value={messagePriority}
                      onChange={(event) => setMessagePriority(event.target.value as 'NORMAL' | 'IMPORTANT' | 'URGENT')}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="IMPORTANT">Important</option>
                      <option value="URGENT">Urgent</option>
                    </select>

                    <input
                      type="text"
                      value={messageSubject}
                      onChange={(event) => setMessageSubject(event.target.value)}
                      placeholder="Subject"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                    />

                    <textarea
                      value={messageBody}
                      onChange={(event) => setMessageBody(event.target.value)}
                      rows={4}
                      placeholder="Write your message..."
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                    />

                    <button
                      type="button"
                      onClick={sendSupervisorMessage}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Send Message
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-slate-900">Conversations</div>
                    {supervisorUnreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllSupervisorMessagesRead}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        Mark All Read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[520px] space-y-2 overflow-auto">
                    {supervisorConversations.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                        No Apollo messages yet.
                      </div>
                    ) : (
                      supervisorConversations.map((conversation) => (
                        <button
                          type="button"
                          key={conversation.conversationId}
                          onClick={() => {
                            setSelectedConversationId(conversation.conversationId);
                            markSupervisorConversationRead(conversation.conversationId);
                          }}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            selectedSupervisorConversation?.conversationId === conversation.conversationId
                              ? 'border-slate-900 bg-slate-100'
                              : conversation.unreadCount > 0
                                ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-bold text-slate-900">{conversation.latest.title}</div>
                              <div className="mt-1 line-clamp-2 text-xs text-slate-600">{conversation.latest.body}</div>
                              <div className="mt-2 text-xs text-slate-500">
                                {conversation.latest.senderName} • {formatShortDate(new Date(conversation.latest.createdAt))}
                              </div>
                            </div>
                            {conversation.unreadCount > 0 && (
                              <div className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                                {conversation.unreadCount}
                              </div>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                {!selectedSupervisorConversation ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    Select a conversation to view messages.
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 border-b border-slate-200 pb-3">
                      <div className="text-base font-bold text-slate-900">{selectedSupervisorConversation.latest.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Audience: {selectedSupervisorConversation.latest.audienceLabel}
                      </div>
                    </div>

                    <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
                      {selectedSupervisorConversation.messages.map((message) => {
                        const isMine = message.senderId === CURRENT_SUPERVISOR_ID;
                        const isUrgent = message.priority === 'URGENT' || message.relatedType === 'URGENT';

                        return (
                          <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                                isMine
                                  ? 'bg-slate-900 text-white'
                                  : isUrgent
                                    ? 'bg-red-50 text-red-800 ring-1 ring-red-200'
                                    : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              <div className="text-xs font-semibold opacity-80">{message.senderName}</div>
                              <div className="mt-1 whitespace-pre-wrap text-sm">{message.body}</div>
                              <div className={`mt-2 text-right text-[11px] ${isMine ? 'text-slate-300' : 'text-slate-500'}`}>
                                {formatShortDate(new Date(message.createdAt))} • {getMessageStatus(message, CURRENT_SUPERVISOR_ID)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Reply
                      </label>
                      <textarea
                        value={replyBody}
                        onChange={(event) => setReplyBody(event.target.value)}
                        rows={3}
                        placeholder="Write a reply..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={sendSupervisorReply}
                          disabled={!replyBody.trim()}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Send Reply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>,
            supervisorUnreadCount > 0,
          )}

          {renderTile(
            'company-announcements',
            'Company Announcements',
            'Create time-limited announcements that display on the employee dashboard.',
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Announcement Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Example: Mandatory training reminder"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Display Until
                    </label>
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(event) => setExpiresAt(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      rows={5}
                      placeholder="Write the announcement employees should see..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={createAnnouncement}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Post Announcement
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold text-slate-900">Active Announcements</div>

                {activeAnnouncements.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                    No active announcements.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeAnnouncements.map((announcement) => (
                      <div key={announcement.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-sm font-bold text-slate-900">{announcement.title}</div>
                            <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{announcement.message}</div>
                            <div className="mt-3 text-xs text-slate-500">
                              Posted {formatShortDate(new Date(announcement.createdAt))} • Expires {formatShortDate(new Date(announcement.expiresAt))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteAnnouncement(announcement.id)}
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold text-slate-900">Expired Announcements</div>

                {expiredAnnouncements.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                    No expired announcements.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expiredAnnouncements.slice(0, 5).map((announcement) => (
                      <div key={announcement.id} className="rounded-xl border border-slate-200 bg-white p-4 opacity-75">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-sm font-bold text-slate-900">{announcement.title}</div>
                            <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{announcement.message}</div>
                            <div className="mt-3 text-xs text-slate-500">
                              Expired {formatShortDate(new Date(announcement.expiresAt))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteAnnouncement(announcement.id)}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>,
          )}

          {renderTile(
            'incident-reports',
            'Incident Reports',
            openIncidentReports.length > 0
              ? `${openIncidentReports.length} open incident report${openIncidentReports.length === 1 ? '' : 's'}.`
              : 'No open incident reports.',
            <div className="space-y-3">
              {openIncidentReports.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No open incident reports.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Incident #</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Employee</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Assigned To</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openIncidentReports.map((report) => (
                        <tr key={report.id} className="border-t border-slate-200">
                          <td className="px-3 py-2 font-semibold text-slate-900">{report.incident_number}</td>
                          <td className="px-3 py-2 text-slate-600">{formatShortDate(new Date(report.created_at))}</td>
                          <td className="px-3 py-2 text-slate-700">{report.employee_name}</td>
                          <td className="px-3 py-2 text-slate-700">{report.category}</td>
                          <td className="px-3 py-2 text-slate-700">{report.assigned_supervisor || 'Unassigned'}</td>
                          <td className="px-3 py-2 font-semibold text-blue-700">{report.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>,
            openIncidentReports.length > 0,
          )}

          {renderTile(
            'timecard-review',
            'Timecard Review',
            pendingTimecards.length > 0
              ? `${pendingTimecards.length} timecard${pendingTimecards.length === 1 ? '' : 's'} pending supervisor review.`
              : 'Review, approve, or return submitted employee timecards.',
            <div className="space-y-5">
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
                    onChange={(event) => setSelectedPayPeriodKey(event.target.value)}
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
                    onClick={() => setSelectedPayPeriodKey(currentPayPeriod.key)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Current Pay Period
                  </button>
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 ${
                  employeesNotSubmitted.length === 0 && pendingTimecards.length === 0
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-amber-300 bg-amber-50'
                }`}
              >
                {employeesNotSubmitted.length === 0 && pendingTimecards.length === 0 ? (
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
                      Pending Reviews: {pendingTimecards.length}
                    </div>
                  </>
                )}
              </div>

              {payrollSubmission?.payPeriodKey === selectedPayPeriod.key && (
                <div className="rounded-xl border border-blue-300 bg-blue-50 p-4">
                  <div className="text-lg font-bold text-blue-800">
                    🔒 PAYROLL LOCKED
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

                  <button
                    type="button"
                    onClick={reopenPayroll}
                    className="mt-3 rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                  >
                    Reopen Payroll
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={printAllTimecards}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                >
                  Save All PDF
                </button>

                <button
                  type="button"
                  disabled={payrollLocked}
                  onClick={submitPayroll}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {payrollLocked ? 'Payroll Locked' : 'Submit Payroll'}
                </button>
              </div>

              <div className="hidden">
                {reviewedTimecards
                  .filter((timecard) => timecard.status === 'APPROVED')
                  .map((timecard) => renderSubmittedTimecard(timecard))}
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
                    Pending Review
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
                <button
                  type="button"
                  onClick={() => setShowReviewedTimecards((current) => !current)}
                  className="mb-2 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                >
                  <span className="text-sm font-semibold text-slate-900">
                    Reviewed Timecards ({reviewedTimecards.length})
                  </span>

                  <span className="text-xs font-bold text-slate-500">
                    {showReviewedTimecards ? 'Hide' : 'Show'}
                  </span>
                </button>

                {showReviewedTimecards && (
                  <>
                    {reviewedTimecards.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                        No reviewed timecards yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {reviewedTimecards.slice(0, 10).map((timecard) => (
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

                        {reviewedTimecards.slice(0, 10).map((timecard) =>
                          selectedTimecardId === timecard.id ? renderSubmittedTimecard(timecard) : null
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>,
            pendingTimecards.length > 0,
          )}

          {renderTile(
            'employee-management',
            'Employee Profiles',
            employeeCertificationAlertCount > 0
              ? `${employeeCertificationAlertCount} employee${employeeCertificationAlertCount === 1 ? '' : 's'} with expired or soon-expiring certifications.`
              : 'Manage employees, seniority, certifications, and employment status.',
            <div className={`rounded-xl border p-4 ${
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
                className="inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Open Employee Profiles
              </a>
            </div>,
            employeeCertificationAlertCount > 0,
          )}

          {renderTile(
            'system-configuration',
            'System Configuration',
            'Configure company branding, permissions reference, important links, geofences, and review the activity log.',
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">Roles & Permissions Reference</div>
                <div className="mt-1 text-xs text-slate-600">
                  Employee accounts use the dashboard only. Supervisor, Admin, and GM accounts share the same Supervisor Tools permissions.
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-bold text-slate-900">Employee</div>
                    <div className="mt-2 text-sm text-slate-600">
                      Dashboard only: announcements, personal timecard, schedule, messages, incident report, handbook, and links.
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-bold text-slate-900">Supervisor / Admin / GM</div>
                    <div className="mt-2 text-sm text-slate-600">
                      Can approve timecards, post announcements, edit system configuration, manage schedule rules, and use Supervisor Tools.
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-sm font-bold text-amber-800">Approval Rule</div>
                    <div className="mt-2 text-sm text-amber-800">
                      Supervisors cannot approve their own timecard. It must be reviewed by another supervisor or GM.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">Company Branding</div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_240px]">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Company Name</label>
                    <input
                      type="text"
                      value={systemConfig.companyName}
                      onChange={(event) => updateCompanyName(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                    />

                    <label className="mt-4 mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Upload Logo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    />

                    <button
                      type="button"
                      onClick={clearLogo}
                      disabled={!systemConfig.logoDataUrl}
                      className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      Remove Logo
                    </button>

                    <div className="mt-2 text-xs text-slate-500">
                      Production logo files should move to Supabase Storage.
                    </div>
                  </div>

                  <div className="flex min-h-[170px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-4">
                    {systemConfig.logoDataUrl ? (
                      <img src={systemConfig.logoDataUrl} alt="Company logo preview" className="max-h-36 max-w-full object-contain" />
                    ) : (
                      <div className="text-center text-sm font-bold text-slate-400">No Logo Uploaded</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">Important Links</div>
                <div className="mt-1 text-xs text-slate-600">These links display in the Employee Dashboard Important Links tile.</div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.5fr_auto]">
                  <input
                    type="text"
                    value={newLinkLabel}
                    onChange={(event) => setNewLinkLabel(event.target.value)}
                    placeholder="Link label"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(event) => setNewLinkUrl(event.target.value)}
                    placeholder="https://..."
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                  <button type="button" onClick={addImportantLink} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                    Add Link
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {systemConfig.importantLinks.map((link) => (
                    <div key={link.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:grid-cols-[1fr_1.5fr_auto]">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(event) => updateImportantLink(link.id, { label: event.target.value })}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(event) => updateImportantLink(link.id, { url: event.target.value })}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                      />
                      <button type="button" onClick={() => removeImportantLink(link.id)} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Geofencing</div>
                    <div className="mt-1 text-xs text-slate-600">
                      Approved clock-in locations. GPS failure, outside radius, and manual overrides should still clock the employee but require supervisor review.
                    </div>
                  </div>
                  <button type="button" onClick={addGeofence} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                    Add Geofence
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="hidden gap-3 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 xl:grid xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
                    <div>Shift</div>
                    <div>Location Name</div>
                    <div>Latitude</div>
                    <div>Longitude</div>
                    <div>Radius (ft)</div>
                    <div></div>
                  </div>

                  {systemConfig.geofences.map((geofence) => (
                    <div key={geofence.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
                      <input type="text" value={geofence.shiftLabel} onChange={(event) => updateGeofence(geofence.id, { shiftLabel: event.target.value })} placeholder="Shift" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500" />
                      <input type="text" value={geofence.locationLabel} onChange={(event) => updateGeofence(geofence.id, { locationLabel: event.target.value })} placeholder="Location" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500" />
                      <input type="number" value={geofence.latitude} onChange={(event) => updateGeofence(geofence.id, { latitude: Number(event.target.value) })} placeholder="Latitude" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500" />
                      <input type="number" value={geofence.longitude} onChange={(event) => updateGeofence(geofence.id, { longitude: Number(event.target.value) })} placeholder="Longitude" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500" />
                      <input type="number" value={geofence.radiusFeet} onChange={(event) => updateGeofence(geofence.id, { radiusFeet: Number(event.target.value) })} placeholder="Radius ft" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500" />
                      <button type="button" onClick={() => removeGeofence(geofence.id)} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <button
                  type="button"
                  onClick={() => setShowEula((current) => !current)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">Legal</div>
                    <div className="mt-1 text-xs text-slate-600">
                      ApolloEMS End User Agreement, ownership notice, and intellectual property protections.
                    </div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {showEula ? 'Hide' : 'Show'}
                  </span>
                </button>

                {showEula && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-bold text-slate-900">ApolloEMS End User Agreement</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Version 1.0 • Last Updated June 7, 2026
                    </div>
                    <div className="mt-3 max-h-[420px] space-y-4 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      <div>
                        <div className="font-bold text-slate-900">1. Acceptance of Agreement</div>
                        <p className="mt-1">By accessing or using ApolloEMS, you acknowledge that you have read, understood, and agree to be bound by this End User Agreement. If you do not agree, you must discontinue use immediately.</p>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">2. Ownership of ApolloEMS</div>
                        <p className="mt-1">ApolloEMS, including its software, source code, databases, designs, user interfaces, workflows, branding, documentation, intellectual property, and related materials, is the sole and exclusive property of Steven Lemons. Steven Lemons is the sole creator, designer, developer, engineer, and owner of ApolloEMS.</p>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">3. Beta Software Status</div>
                        <p className="mt-1">ApolloEMS may contain features that are under active development and testing. Users acknowledge that functionality may change, be modified, be discontinued, or contain errors while the platform remains under active development. Use during beta testing is voluntary and at the user's own risk.</p>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">4. No Ownership or Financial Interest</div>
                        <p className="mt-1">Use of ApolloEMS, participation in testing, feedback, operational use, implementation assistance, feature requests, recommendations, bug reports, or other contributions does not create ownership rights, equity rights, partnership rights, joint venture rights, revenue sharing rights, royalty rights, licensing rights, rights to future sale proceeds, or rights to future compensation.</p>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">5. Feedback and Suggestions</div>
                        <p className="mt-1">Any suggestions, recommendations, comments, feature requests, bug reports, or other feedback regarding ApolloEMS may be used by the owner without restriction or compensation.</p>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">6. Right to Modify, License, or Sell ApolloEMS</div>
                        <p className="mt-1">The owner reserves the unrestricted right to modify ApolloEMS, add or remove features, change pricing, change licensing models, rebrand the platform, transfer ownership, assign ownership, license the software, merge ApolloEMS with another product, or sell ApolloEMS in whole or in part at any time.</p>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">7. Right to Suspend or Terminate Access</div>
                        <p className="mt-1">The owner reserves the right to suspend, restrict, or terminate access to ApolloEMS at any time, with or without notice, and for any reason. Upon termination, users must immediately discontinue use.</p>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">8. Data Ownership</div>
                        <p className="mt-1">Users and organizations retain ownership of the operational data they enter into ApolloEMS. By using ApolloEMS, users grant the owner the right to store, process, transmit, back up, and manage such data as necessary to provide the software and related services.</p>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">9. No Warranty</div>
                        <p className="mt-1">ApolloEMS is provided &quot;AS IS&quot; and &quot;AS AVAILABLE.&quot; The owner makes no warranties, express or implied, regarding availability, reliability, accuracy, performance, fitness for a particular purpose, merchantability, or uninterrupted operation.</p>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">10. Limitation of Liability</div>
                        <p className="mt-1">To the maximum extent permitted by law, the owner shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages arising from the use of ApolloEMS. Users are responsible for verifying platform information and maintaining appropriate operational procedures.</p>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">11. Governing Law</div>
                        <p className="mt-1">This Agreement shall be governed by and interpreted under the laws of the State of California, without regard to conflict-of-law principles.</p>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">12. Changes to This Agreement</div>
                        <p className="mt-1">The owner may modify this Agreement at any time. Updated versions may be published within ApolloEMS or through other reasonable means of notice. Continued use after publication of updated terms constitutes acceptance of those changes.</p>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">13. Entire Agreement</div>
                        <p className="mt-1">This End User Agreement constitutes the entire agreement regarding use of ApolloEMS and supersedes any prior verbal or written understandings concerning platform use.</p>
                      </div>

                      <div className="border-t border-slate-200 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        ApolloEMS • Copyright © 2026 Steven Lemons • All Rights Reserved
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">System Activity Log</div>

                <div className="mt-1 text-xs text-slate-600">
                  Tracks system configuration changes now. Later this will also include schedule changes, certification edits, timecard approvals/returns, and rule overrides.
                </div>

                <div className="mt-4 max-h-[360px] space-y-3 overflow-auto">
                  {auditLog.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                      No activity has been logged yet.
                    </div>
                  ) : (
                    auditLog.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-sm font-bold text-slate-900">{entry.action}</div>
                            <div className="mt-1 text-sm text-slate-600">{entry.details}</div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {entry.actor} • {new Date(entry.timestamp).toLocaleString('en-US', {
                              month: 'numeric',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>,
          )}

        </div>
      </div>
    </div>
  );
}

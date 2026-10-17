'use client';

import React, { Activity, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AnnouncementsTile from './_components/AnnouncementsTile';
import FleetServicesTile from './_components/FleetServicesTile';
import IncidentReportsTile from './_components/IncidentReportsTile';
import InventoryTrackingTile from './_components/InventoryTrackingTile';
import ScheduleManagementTile from './_components/ScheduleManagementTile';
import SmsNotificationsTile from './_components/SmsNotificationsTile';
import SupervisorShiftReportTile from './_components/SupervisorShiftReportTile';
import SystemConfigurationTile from './_components/SystemConfigurationTile';
import TimecardReviewTile from './_components/TimecardReviewTile';
import { useTimecardReviewData } from './_components/timecardReviewData';
import {
  type ApolloMessage,
  type AuditLogEntry,
  type EmployeeCertificationRecord,
  type EmployeeOption,
  type IncidentReport,
  type SystemConfig,
  CURRENT_SUPERVISOR_ID,
  getChangedRecords,
  mergeRefreshedRecords,
  useStableCallback,
} from './_components/shared';

type SmsPreferenceRow = {
  employee_id: string;
  employee_email: string;
  phone_e164: string;
  sms_enabled: boolean;
  notify_supervisor_messages: boolean;
  consented_at: string | null;
  opted_out_at: string | null;
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

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [authEmail, setAuthEmail] = useState('');
  const [apolloMessages, setApolloMessages] = useState<ApolloMessage[]>([]);
  const [smsPreferences, setSmsPreferences] = useState<SmsPreferenceRow[]>([]);
  const [smsPreferencesLoading, setSmsPreferencesLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(getDefaultSystemConfig());
  const [openShiftRequests, setOpenShiftRequests] = useState<OpenShiftRequest[]>([]);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [employeesLoaded, setEmployeesLoaded] = useState(false);
  const [messageRecipientMode, setMessageRecipientMode] = useState('ALL_ACTIVE');
  const [messageRecipientEmployeeId, setMessageRecipientEmployeeId] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [messagePriority, setMessagePriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('NORMAL');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [hideReadMessages, setHideReadMessages] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');

  const timecardReview = useTimecardReviewData({ employees, employeesLoaded });

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
  }, []);

  // Polls overlap when a request outlasts the interval; these flags skip a
  // refresh while the previous one is still in flight.
  const apolloMessagesRefreshInFlight = useRef(false);

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

  // Open reports matching the Incident Reports tile's filters, reported by the
  // tile once opened. Until then its filters are at their defaults.
  const [filteredOpenIncidentCount, setFilteredOpenIncidentCount] = useState<number | null>(null);
  const openIncidentReportCount =
    filteredOpenIncidentCount ??
    incidentReports.filter((report) => report.category !== 'Check Request' && report.status !== 'CLOSED').length;

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
  const stableAddApolloMessage = useStableCallback((message: ApolloMessage) => {
    saveApolloMessages([message, ...apolloMessages]);
  });
  const stableSaveSystemConfig = useStableCallback(saveSystemConfig);
  const stableAppendAuditEntry = useStableCallback((entry: AuditLogEntry) => {
    setAuditLog((current) => [entry, ...current]);
  });

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
            openIncidentReportCount > 0
              ? `${openIncidentReportCount} open incident report${openIncidentReportCount === 1 ? '' : 's'}.`
              : 'No open incident reports.',
            () => (
              <IncidentReportsTile
                incidentReports={incidentReports}
                setIncidentReports={setIncidentReports}
                auditLog={auditLog}
                addAuditEntry={stableAddAuditEntry}
                employees={employees}
                currentEmployeeName={currentEmployee?.name}
                addApolloMessage={stableAddApolloMessage}
                onOpenCountChange={setFilteredOpenIncidentCount}
              />
            ),
            openIncidentReportCount > 0,
            true,
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
            timecardReview.pendingTimecards.length + timecardReview.resubmittedTimecards.length + timecardReview.pendingResubmissionTimecards.length > 0
              ? `${timecardReview.pendingTimecards.length} pending review; ${timecardReview.resubmittedTimecards.length} resubmitted; ${timecardReview.pendingResubmissionTimecards.length} pending employee resubmission.`
              : 'Review, approve, or return submitted employee timecards.',
            () => (
              <TimecardReviewTile
                timecardReview={timecardReview}
                employees={employees}
                currentEmployee={currentEmployee}
                addApolloMessage={stableAddApolloMessage}
                addAuditEntry={stableAddAuditEntry}
                appendAuditEntry={stableAppendAuditEntry}
              />
            ),
            timecardReview.pendingTimecards.length + timecardReview.resubmittedTimecards.length + timecardReview.pendingResubmissionTimecards.length > 0,
            true,
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
    </div>
  );
}

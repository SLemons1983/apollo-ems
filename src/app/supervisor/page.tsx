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

type InventorySupplyRoom = {
  id: string;
  name: string;
  createdAt: string;
};

type InventoryItem = {
  id: string;
  supplyRoomId: string;
  itemName: string;
  itemNumber: string;
  qtyOnHand: number;
  par: number;
  unitCost: number;
  lotCount: number;
  nearestExpiration: string;
  orderStatus: string;
  orderedBy: string;
  orderedDate: string;
  expectedDeliveryDate: string;
  receivedDate: string;
  createdAt: string;
};

type InventoryLot = {
  id: string;
  itemId: string;
  lotNumber: string;
  expirationDate: string;
  qtyOnHand: number;
  manufacturer: string;
  notes: string;
  createdAt: string;
};

type InventoryTransaction = {
  id: string;
  itemId: string;
  transactionType: 'ADD' | 'REMOVE' | 'TRANSFER';
  quantity: number;
  reason: string;
  sourceRoomId: string;
  destinationRoomId: string;
  createdBy: string;
  createdAt: string;
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
  const [inventorySupplyRooms, setInventorySupplyRooms] = useState<InventorySupplyRoom[]>([]);
  const [selectedSupplyRoomId, setSelectedSupplyRoomId] = useState('');
  const [showInventoryRoomDetail, setShowInventoryRoomDetail] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryLotsByItemId, setInventoryLotsByItemId] = useState<Record<string, InventoryLot[]>>({});
  const [expandedInventoryItemId, setExpandedInventoryItemId] = useState('');
  const [newSupplyRoomName, setNewSupplyRoomName] = useState('');
  const [showCreateSupplyRoomForm, setShowCreateSupplyRoomForm] = useState(false);
  const [showCreateInventoryReports, setShowCreateInventoryReports] = useState(false);
  const [inventoryReportModal, setInventoryReportModal] = useState<string | null>(null);
  const [showCreateInventoryItemForm, setShowCreateInventoryItemForm] = useState(false);
  const [newInventoryItemName, setNewInventoryItemName] = useState('');
  const [newInventoryItemNumber, setNewInventoryItemNumber] = useState('');
  const [newInventoryItemPar, setNewInventoryItemPar] = useState('');
  const [newInventoryItemUnitCost, setNewInventoryItemUnitCost] = useState('');
  const [selectedAddInventoryItem, setSelectedAddInventoryItem] = useState<InventoryItem | null>(null);
  const [addInventoryQty, setAddInventoryQty] = useState('');
  const [addInventoryLotNumber, setAddInventoryLotNumber] = useState('');
  const [addInventoryExpirationDate, setAddInventoryExpirationDate] = useState('');
  const [addInventoryManufacturer, setAddInventoryManufacturer] = useState('');
  const [addInventoryNotes, setAddInventoryNotes] = useState('');

  const [selectedRemoveInventoryItem, setSelectedRemoveInventoryItem] = useState<InventoryItem | null>(null);
  const [removeInventoryQty, setRemoveInventoryQty] = useState('');
  const [removeInventoryReason, setRemoveInventoryReason] = useState('Expired');

  const [selectedTransferInventoryItem, setSelectedTransferInventoryItem] = useState<InventoryItem | null>(null);
  const [transferInventoryQty, setTransferInventoryQty] = useState('');
  const [transferDestinationRoomId, setTransferDestinationRoomId] = useState('');

  const [selectedEditInventoryItem, setSelectedEditInventoryItem] = useState<InventoryItem | null>(null);
  const [editInventoryItemName, setEditInventoryItemName] = useState('');
  const [editInventoryItemNumber, setEditInventoryItemNumber] = useState('');
  const [editInventoryItemPar, setEditInventoryItemPar] = useState('');
  const [editInventoryItemUnitCost, setEditInventoryItemUnitCost] = useState('');

  const [inventoryStatus, setInventoryStatus] = useState('');
  const [inventoryReportStartDate, setInventoryReportStartDate] = useState('');
  const [inventoryReportEndDate, setInventoryReportEndDate] = useState('');
  const [inventoryReportSupplyRoomId, setInventoryReportSupplyRoomId] = useState('');
  const [inventoryReportItemId, setInventoryReportItemId] = useState('');
  const [inventoryReportReason, setInventoryReportReason] = useState('');
  const [inventoryUsageTransactions, setInventoryUsageTransactions] = useState<InventoryTransaction[]>([]);
  const inventoryToday = new Date(new Date().toDateString());
  const expiredInventoryLots = inventoryItems.flatMap((item) =>
    (inventoryLotsByItemId[item.id] ?? [])
      .filter((lot) => lot.expirationDate && new Date(`${lot.expirationDate}T00:00:00`) < inventoryToday)
      .map((lot) => ({ item, lot })),
  );
  const expiringSoonInventoryLots = inventoryItems.flatMap((item) =>
    (inventoryLotsByItemId[item.id] ?? [])
      .filter((lot) => {
        if (!lot.expirationDate) return false;
        const expiration = new Date(`${lot.expirationDate}T00:00:00`);
        const daysUntilExpiration = Math.ceil((expiration.getTime() - inventoryToday.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiration >= 0 && daysUntilExpiration <= 90;
      })
      .map((lot) => ({ item, lot })),
  );

  const totalInventoryValue = inventoryItems.reduce(
    (total, item) => total + (item.qtyOnHand * item.unitCost),
    0,
  );

  function getInventoryItemLabel(itemId: string) {
    const item = allInventoryItems.find((inventoryItem) => inventoryItem.id === itemId)
      ?? inventoryItems.find((inventoryItem) => inventoryItem.id === itemId);

    return item ? `${item.itemName}${item.itemNumber ? ` (${item.itemNumber})` : ''}` : itemId || '—';
  }

  function getInventoryRoomLabel(roomId: string) {
    const room = inventorySupplyRooms.find((supplyRoom) => supplyRoom.id === roomId);
    return room?.name || roomId || '—';
  }

  function getInventoryUserLabel(createdBy: string) {
    const normalizedCreatedBy = createdBy.trim().toLowerCase();
    const employee = employees.find((employeeOption) => (
      employeeOption.email?.trim().toLowerCase() === normalizedCreatedBy
      || employeeOption.name.trim().toLowerCase() === normalizedCreatedBy
    ));

    return employee?.name || createdBy || '—';
  }
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
  const [supervisorShiftReportDate, setSupervisorShiftReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [supervisorShiftReportAbsences, setSupervisorShiftReportAbsences] = useState('No');
  const [supervisorShiftReportTardies, setSupervisorShiftReportTardies] = useState('No');
  const [supervisorShiftReportVehicleIssues, setSupervisorShiftReportVehicleIssues] = useState('No');
  const [supervisorShiftReportOtherIssues, setSupervisorShiftReportOtherIssues] = useState('No');
  const [supervisorShiftReportNarrative, setSupervisorShiftReportNarrative] = useState('');
  const [supervisorShiftReportStatus, setSupervisorShiftReportStatus] = useState('');
  const [isSubmittingSupervisorShiftReport, setIsSubmittingSupervisorShiftReport] = useState(false);
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
  const [hideReadMessages, setHideReadMessages] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
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
  }, []);  useEffect(() => {
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

      loadInventorySupplyRooms();
      loadAllInventoryItemsForReports();

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

  useEffect(() => {
    if (!selectedSupplyRoomId) {
      setInventoryItems([]);
      return;
    }

    loadInventoryItems(selectedSupplyRoomId);
  }, [selectedSupplyRoomId]);

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

  const incidentReportCategories = useMemo(() => {
    return Array.from(new Set(incidentReports.map((report) => report.category).filter(Boolean))).sort();
  }, [incidentReports]);

  const incidentReportSupervisors = useMemo(() => {
    return Array.from(new Set(incidentReports.map((report) => report.assigned_supervisor || 'Unassigned'))).sort();
  }, [incidentReports]);

  const filteredIncidentReports = useMemo(() => {
    const search = incidentReportSearch.trim().toLowerCase();

    return incidentReports.filter((report) => {
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

  async function handleSupervisorShiftReportSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentEmployee) {
      setSupervisorShiftReportStatus('Unable to identify the logged-in supervisor.');
      return;
    }

    const requiresDetail = [
      supervisorShiftReportAbsences,
      supervisorShiftReportTardies,
      supervisorShiftReportVehicleIssues,
      supervisorShiftReportOtherIssues,
    ].includes('Yes');

    if (requiresDetail && supervisorShiftReportNarrative.trim().length < 20) {
      setSupervisorShiftReportStatus('Narrative must include details when any issue is marked Yes.');
      return;
    }

    setIsSubmittingSupervisorShiftReport(true);
    setSupervisorShiftReportStatus('Submitting supervisor shift report...');

    try {
      const formData = new FormData();
      formData.append('supervisorName', currentEmployee.name);
      formData.append('supervisorEmail', currentEmployee.email || authEmail);
      formData.append('shiftDate', supervisorShiftReportDate);
      formData.append('unscheduledAbsences', supervisorShiftReportAbsences);
      formData.append('tardyEmployees', supervisorShiftReportTardies);
      formData.append('vehicleIssues', supervisorShiftReportVehicleIssues);
      formData.append('otherNotableIssues', supervisorShiftReportOtherIssues);
      formData.append('narrative', supervisorShiftReportNarrative.trim());

      const response = await fetch('/api/supervisor-shift-report/submit', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Supervisor shift report submission failed.');
      }

      setSupervisorShiftReportAbsences('No');
      setSupervisorShiftReportTardies('No');
      setSupervisorShiftReportVehicleIssues('No');
      setSupervisorShiftReportOtherIssues('No');
      setSupervisorShiftReportNarrative('');
      setSupervisorShiftReportStatus('Supervisor shift report submitted successfully.');
    } catch (error) {
      console.error('Supervisor shift report submission failed:', error);
      setSupervisorShiftReportStatus('Unable to submit supervisor shift report.');
    } finally {
      setIsSubmittingSupervisorShiftReport(false);
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

  function getInventoryExpirationClass(expirationDate: string) {
    if (!expirationDate) {
      return 'text-slate-700';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiration = new Date(`${expirationDate}T00:00:00`);
    const daysUntilExpiration = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration < 0) {
      return 'rounded-lg bg-red-100 px-2 py-1 font-bold text-red-800';
    }

    if (daysUntilExpiration <= 30) {
      return 'rounded-lg bg-orange-200 px-2 py-1 font-bold text-orange-900';
    }

    if (daysUntilExpiration <= 90) {
      return 'rounded-lg bg-yellow-100 px-2 py-1 font-bold text-yellow-700';
    }

    return 'text-slate-700';
  }

  async function loadInventorySupplyRooms() {
    const { data, error } = await supabase
      .from('inventory_supply_rooms')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to load inventory supply rooms:', error);
      setInventoryStatus('Unable to load supply rooms.');
      return;
    }

    const rooms = (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
    }));

    setInventorySupplyRooms(rooms);
  }

  async function loadAllInventoryItemsForReports() {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('item_name', { ascending: true });

    if (error) {
      console.error('Failed to load all inventory items for reports:', error);
      return;
    }

    setAllInventoryItems(
      (data ?? []).map((row: any) => ({
        id: row.id,
        supplyRoomId: row.supply_room_id,
        itemName: row.item_name,
        itemNumber: row.item_number ?? '',
        qtyOnHand: row.qty_on_hand ?? 0,
        par: row.par ?? 0,
        unitCost: row.unit_cost ?? 0,
        lotCount: 0,
        nearestExpiration: '',
        orderStatus: row.order_status ?? 'NEEDS_ORDER',
        orderedBy: row.ordered_by ?? '',
        orderedDate: row.ordered_date ?? '',
        expectedDeliveryDate: row.expected_delivery_date ?? '',
        receivedDate: row.received_date ?? '',
        createdAt: row.created_at,
      })),
    );
  }

  async function loadInventoryItems(supplyRoomId: string) {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('supply_room_id', supplyRoomId)
      .order('item_name', { ascending: true });

    if (error) {
      console.error('Failed to load inventory items:', error);
      setInventoryStatus('Unable to load inventory items.');
      return;
    }

    const itemIds = (data ?? []).map((row: any) => row.id);
    const lotSummaryByItemId: Record<string, { lotCount: number; nearestExpiration: string }> = {};

    if (itemIds.length > 0) {
      const { data: lots, error: lotsError } = await supabase
        .from('inventory_lots')
        .select('*')
        .in('item_id', itemIds)
        .gt('qty_on_hand', 0)
        .order('expiration_date', { ascending: true });

      if (lotsError) {
        console.error('Failed to load inventory lots:', lotsError);
      } else {
        const lotsByItemId: Record<string, InventoryLot[]> = {};

        (lots ?? []).forEach((lot: any) => {
          const itemId = lot.item_id;
          const current = lotSummaryByItemId[itemId] ?? { lotCount: 0, nearestExpiration: '' };
          const expiration = lot.expiration_date ?? '';

          lotSummaryByItemId[itemId] = {
            lotCount: current.lotCount + 1,
            nearestExpiration:
              expiration && (!current.nearestExpiration || expiration < current.nearestExpiration)
                ? expiration
                : current.nearestExpiration,
          };

          lotsByItemId[itemId] = [
            ...(lotsByItemId[itemId] ?? []),
            {
              id: lot.id,
              itemId,
              lotNumber: lot.lot_number ?? '',
              expirationDate: lot.expiration_date ?? '',
              qtyOnHand: lot.qty_on_hand ?? 0,
              manufacturer: lot.manufacturer ?? '',
              notes: lot.notes ?? '',
              createdAt: lot.created_at,
            },
          ];
        });

        setInventoryLotsByItemId(lotsByItemId);
      }
    } else {
      setInventoryLotsByItemId({});
    }

    setInventoryItems(
      (data ?? []).map((row: any) => ({
        id: row.id,
        supplyRoomId: row.supply_room_id,
        itemName: row.item_name,
        itemNumber: row.item_number ?? '',
        qtyOnHand: row.qty_on_hand ?? 0,
        par: row.par ?? 0,
        unitCost: Number(row.unit_cost ?? 0),
        lotCount: lotSummaryByItemId[row.id]?.lotCount ?? 0,
        nearestExpiration: lotSummaryByItemId[row.id]?.nearestExpiration ?? '',
        orderStatus: row.order_status ?? 'NEEDS_ORDER',
        orderedBy: row.ordered_by ?? '',
        orderedDate: row.ordered_date ?? '',
        expectedDeliveryDate: row.expected_delivery_date ?? '',
        receivedDate: row.received_date ?? '',
        createdAt: row.created_at,
      })),
    );
  }

  function getInventoryOrderStatusLabel(status: string) {
    switch (status) {
      case 'ORDERED':
        return 'Ordered';
      case 'AWAITING_DELIVERY':
        return 'Awaiting Delivery';
      case 'RECEIVED':
        return 'Received';
      case 'NEEDS_ORDER':
      default:
        return 'Needs Order';
    }
  }

  function getInventoryOrderStatusClass(status: string) {
    switch (status) {
      case 'ORDERED':
        return 'bg-blue-100 text-blue-800';
      case 'AWAITING_DELIVERY':
        return 'bg-purple-100 text-purple-800';
      case 'RECEIVED':
        return 'bg-emerald-100 text-emerald-800';
      case 'NEEDS_ORDER':
      default:
        return 'bg-amber-100 text-amber-800';
    }
  }

  async function handleMarkInventoryItemOrdered(item: InventoryItem) {
    setInventoryStatus(`Marking ${item.itemName} as ordered...`);

    const { error } = await supabase
      .from('inventory_items')
      .update({
        order_status: 'ORDERED',
        ordered_by: authEmail || null,
        ordered_date: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (error) {
      console.error('Failed to mark inventory item ordered:', error);
      setInventoryStatus('Unable to mark item as ordered.');
      return;
    }

    setInventoryStatus(`${item.itemName} marked as ordered.`);
    await loadAllInventoryItemsForReports();

    if (selectedSupplyRoomId) {
      await loadInventoryItems(selectedSupplyRoomId);
    }
  }

  async function handleMarkInventoryItemAwaitingDelivery(item: InventoryItem) {
    setInventoryStatus(`Marking ${item.itemName} as awaiting delivery...`);

    const { error } = await supabase
      .from('inventory_items')
      .update({
        order_status: 'AWAITING_DELIVERY',
        expected_delivery_date: item.expectedDeliveryDate || null,
      })
      .eq('id', item.id);

    if (error) {
      console.error('Failed to mark inventory item awaiting delivery:', error);
      setInventoryStatus('Unable to mark item as awaiting delivery.');
      return;
    }

    setInventoryStatus(`${item.itemName} marked as awaiting delivery.`);
    await loadAllInventoryItemsForReports();

    if (selectedSupplyRoomId) {
      await loadInventoryItems(selectedSupplyRoomId);
    }
  }

  async function handleMarkInventoryItemReceived(item: InventoryItem) {
    setInventoryStatus(`Marking ${item.itemName} as received...`);

    const { error } = await supabase
      .from('inventory_items')
      .update({
        order_status: 'RECEIVED',
        received_date: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (error) {
      console.error('Failed to mark inventory item received:', error);
      setInventoryStatus('Unable to mark item as received.');
      return;
    }

    setInventoryStatus(`${item.itemName} marked as received. Use Add to place received supplies into inventory.`);
    await loadAllInventoryItemsForReports();

    if (selectedSupplyRoomId) {
      await loadInventoryItems(selectedSupplyRoomId);
    }
  }

  async function handleRunInventoryUsageReport() {
    if (!inventoryReportStartDate || !inventoryReportEndDate) {
      setInventoryStatus('Select a start and end date for the usage report.');
      return;
    }

    if (inventoryReportStartDate > inventoryReportEndDate) {
      setInventoryStatus('Usage report start date must be before the end date.');
      return;
    }

    setInventoryStatus('Running usage report...');

    let query = supabase
      .from('inventory_transactions')
      .select('*')
      .eq('transaction_type', 'REMOVE')
      .gte('created_at', `${inventoryReportStartDate}T00:00:00`)
      .lte('created_at', `${inventoryReportEndDate}T23:59:59`);

    if (inventoryReportSupplyRoomId) {
      query = query.eq('source_room_id', inventoryReportSupplyRoomId);
    }

    if (inventoryReportItemId) {
      query = query.eq('item_id', inventoryReportItemId);
    }

    if (inventoryReportReason) {
      query = query.eq('reason', inventoryReportReason);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load inventory usage report:', error);
      setInventoryStatus('Unable to load usage report.');
      return;
    }

    setInventoryUsageTransactions(
      (data ?? []).map((row: any) => ({
        id: row.id,
        itemId: row.item_id,
        transactionType: row.transaction_type,
        quantity: row.quantity ?? 0,
        reason: row.reason ?? '',
        sourceRoomId: row.source_room_id ?? '',
        destinationRoomId: row.destination_room_id ?? '',
        createdBy: row.created_by ?? '',
        createdAt: row.created_at,
      })),
    );
    setInventoryStatus(`Usage report loaded: ${(data ?? []).length} transaction${(data ?? []).length === 1 ? '' : 's'}.`);
  }

  async function handleCreateInventoryItem() {
    const itemName = newInventoryItemName.trim();
    const itemNumber = newInventoryItemNumber.trim();
    const par = Number(newInventoryItemPar);
    const unitCost = newInventoryItemUnitCost.trim() ? Number(newInventoryItemUnitCost) : 0;

    if (!selectedSupplyRoomId) {
      setInventoryStatus('Select a supply room first.');
      return;
    }

    if (!itemName) {
      setInventoryStatus('Enter an item name.');
      return;
    }

    if (!Number.isFinite(par) || par < 0) {
      setInventoryStatus('Enter a valid PAR.');
      return;
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setInventoryStatus('Enter a valid unit cost.');
      return;
    }

    if (itemNumber && inventoryItems.some((item) => item.itemNumber.toLowerCase() === itemNumber.toLowerCase())) {
      setInventoryStatus('An item with this item number already exists in this supply room.');
      return;
    }

    setInventoryStatus('Creating inventory item...');

    const { error } = await supabase.from('inventory_items').insert({
      supply_room_id: selectedSupplyRoomId,
      item_name: itemName,
      item_number: itemNumber || null,
      qty_on_hand: 0,
      par,
      unit_cost: unitCost,
    });

    if (error) {
      console.error('Failed to create inventory item:', error);
      setInventoryStatus('Unable to create inventory item.');
      return;
    }

    setNewInventoryItemName('');
    setNewInventoryItemNumber('');
    setNewInventoryItemPar('');
    setNewInventoryItemUnitCost('');
    setInventoryStatus('Inventory item created.');
    await loadInventoryItems(selectedSupplyRoomId);
  }

  async function handleUpdateInventoryItem() {
    if (!selectedEditInventoryItem || !selectedSupplyRoomId) {
      setInventoryStatus('Select an inventory item first.');
      return;
    }

    const itemName = editInventoryItemName.trim();
    const itemNumber = editInventoryItemNumber.trim();
    const par = Number(editInventoryItemPar);
    const unitCost = editInventoryItemUnitCost.trim() ? Number(editInventoryItemUnitCost) : 0;

    if (!itemName) {
      setInventoryStatus('Enter an item name.');
      return;
    }

    if (!Number.isFinite(par) || par < 0) {
      setInventoryStatus('Enter a valid PAR.');
      return;
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setInventoryStatus('Enter a valid unit cost.');
      return;
    }

    if (
      itemNumber &&
      inventoryItems.some(
        (item) =>
          item.id !== selectedEditInventoryItem.id &&
          item.itemNumber.toLowerCase() === itemNumber.toLowerCase(),
      )
    ) {
      setInventoryStatus('An item with this item number already exists in this supply room.');
      return;
    }

    setInventoryStatus('Updating inventory item...');

    const { error } = await supabase
      .from('inventory_items')
      .update({
        item_name: itemName,
        item_number: itemNumber || null,
        par,
        unit_cost: unitCost,
      })
      .eq('id', selectedEditInventoryItem.id);

    if (error) {
      console.error('Failed to update inventory item:', error);
      setInventoryStatus('Unable to update inventory item.');
      return;
    }

    setSelectedEditInventoryItem(null);
    setEditInventoryItemName('');
    setEditInventoryItemNumber('');
    setEditInventoryItemPar('');
    setEditInventoryItemUnitCost('');
    setInventoryStatus('Inventory item updated.');
    await loadInventoryItems(selectedSupplyRoomId);
  }

  async function handleDeleteInventoryItem() {
    if (!selectedEditInventoryItem || !selectedSupplyRoomId) {
      setInventoryStatus('Select an inventory item first.');
      return;
    }

    if (selectedEditInventoryItem.qtyOnHand > 0) {
      setInventoryStatus('Remove or transfer all inventory before deleting this item.');
      return;
    }

    if ((inventoryLotsByItemId[selectedEditInventoryItem.id] ?? []).some((lot) => lot.qtyOnHand > 0)) {
      setInventoryStatus('Remove or transfer all active lots before deleting this item.');
      return;
    }

    const confirmed = window.confirm(`Delete inventory item "${selectedEditInventoryItem.itemName}"?`);

    if (!confirmed) {
      return;
    }

    setInventoryStatus('Deleting inventory item...');

    const { error } = await supabase.from('inventory_items').delete().eq('id', selectedEditInventoryItem.id);

    if (error) {
      console.error('Failed to delete inventory item:', error);
      setInventoryStatus('Unable to delete inventory item.');
      return;
    }

    setSelectedEditInventoryItem(null);
    setEditInventoryItemName('');
    setEditInventoryItemNumber('');
    setEditInventoryItemPar('');
    setInventoryStatus('Inventory item deleted.');
    await loadInventoryItems(selectedSupplyRoomId);
  }

  async function handleAddInventoryQuantity() {
    if (!selectedAddInventoryItem || !selectedSupplyRoomId) {
      setInventoryStatus('Select an inventory item first.');
      return;
    }

    const quantity = Number(addInventoryQty);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setInventoryStatus('Enter a valid quantity.');
      return;
    }

    setInventoryStatus('Adding inventory...');

    const { error: lotError } = await supabase.from('inventory_lots').insert({
      item_id: selectedAddInventoryItem.id,
      supply_room_id: selectedSupplyRoomId,
      lot_number: addInventoryLotNumber.trim() || null,
      expiration_date: addInventoryExpirationDate || null,
      qty_on_hand: quantity,
      manufacturer: addInventoryManufacturer.trim() || null,
      notes: addInventoryNotes.trim() || null,
    });

    if (lotError) {
      console.error('Failed to create inventory lot:', lotError);
      setInventoryStatus('Unable to add inventory lot.');
      return;
    }

    const { error: itemError } = await supabase
      .from('inventory_items')
      .update({ qty_on_hand: selectedAddInventoryItem.qtyOnHand + quantity })
      .eq('id', selectedAddInventoryItem.id);

    if (itemError) {
      console.error('Failed to update inventory item quantity:', itemError);
      setInventoryStatus('Inventory lot was created, but item quantity did not update.');
      return;
    }

    const { error: transactionError } = await supabase.from('inventory_transactions').insert({
      item_id: selectedAddInventoryItem.id,
      transaction_type: 'ADD',
      quantity,
      destination_room_id: selectedSupplyRoomId,
      created_by: authEmail || null,
    });

    if (transactionError) {
      console.error('Failed to create inventory transaction:', transactionError);
      setInventoryStatus('Inventory was added, but transaction history did not save.');
      return;
    }

    setSelectedAddInventoryItem(null);
    setAddInventoryQty('');
    setAddInventoryLotNumber('');
    setAddInventoryExpirationDate('');
    setAddInventoryManufacturer('');
    setAddInventoryNotes('');
    setInventoryStatus('Inventory added.');
    await loadInventoryItems(selectedSupplyRoomId);
  }

  async function handleRemoveInventoryQuantity() {
    if (!selectedRemoveInventoryItem || !selectedSupplyRoomId) {
      setInventoryStatus('Select an inventory item first.');
      return;
    }

    const quantity = Number(removeInventoryQty);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setInventoryStatus('Enter a valid quantity.');
      return;
    }

    if (quantity > selectedRemoveInventoryItem.qtyOnHand) {
      setInventoryStatus('Cannot remove more than qty on hand.');
      return;
    }

    setInventoryStatus('Removing inventory...');

    const { error: itemError } = await supabase
      .from('inventory_items')
      .update({ qty_on_hand: selectedRemoveInventoryItem.qtyOnHand - quantity })
      .eq('id', selectedRemoveInventoryItem.id);

    if (itemError) {
      console.error('Failed to update inventory item quantity:', itemError);
      setInventoryStatus('Unable to update inventory quantity.');
      return;
    }

    const { error: transactionError } = await supabase.from('inventory_transactions').insert({
      item_id: selectedRemoveInventoryItem.id,
      transaction_type: 'REMOVE',
      quantity,
      reason: removeInventoryReason,
      source_room_id: selectedSupplyRoomId,
      created_by: authEmail || null,
    });

    if (transactionError) {
      console.error('Failed to create inventory transaction:', transactionError);
      setInventoryStatus('Inventory was removed, but transaction history did not save.');
      return;
    }

    setSelectedRemoveInventoryItem(null);
    setRemoveInventoryQty('');
    setRemoveInventoryReason('Expired');
    setInventoryStatus('Inventory removed.');
    await loadInventoryItems(selectedSupplyRoomId);
  }

  async function handleTransferInventoryQuantity() {
    if (!selectedTransferInventoryItem || !selectedSupplyRoomId) {
      setInventoryStatus('Select an inventory item first.');
      return;
    }

    if (!transferDestinationRoomId) {
      setInventoryStatus('Select a destination supply room.');
      return;
    }

    if (transferDestinationRoomId === selectedSupplyRoomId) {
      setInventoryStatus('Destination must be different from source room.');
      return;
    }

    const quantity = Number(transferInventoryQty);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setInventoryStatus('Enter a valid quantity.');
      return;
    }

    if (quantity > selectedTransferInventoryItem.qtyOnHand) {
      setInventoryStatus('Cannot transfer more than qty on hand.');
      return;
    }

    setInventoryStatus('Transferring inventory...');

    const { error: sourceError } = await supabase
      .from('inventory_items')
      .update({ qty_on_hand: selectedTransferInventoryItem.qtyOnHand - quantity })
      .eq('id', selectedTransferInventoryItem.id);

    if (sourceError) {
      console.error('Failed to update source inventory item:', sourceError);
      setInventoryStatus('Unable to update source inventory.');
      return;
    }

    const { data: existingDestinationItem, error: lookupError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('supply_room_id', transferDestinationRoomId)
      .eq('item_number', selectedTransferInventoryItem.itemNumber || '')
      .maybeSingle();

    if (lookupError) {
      console.error('Failed to find destination inventory item:', lookupError);
      setInventoryStatus('Source was updated, but destination lookup failed.');
      return;
    }

    let destinationItemId = existingDestinationItem?.id;

    if (existingDestinationItem) {
      const { error: destinationUpdateError } = await supabase
        .from('inventory_items')
        .update({ qty_on_hand: (existingDestinationItem.qty_on_hand ?? 0) + quantity })
        .eq('id', existingDestinationItem.id);

      if (destinationUpdateError) {
        console.error('Failed to update destination inventory item:', destinationUpdateError);
        setInventoryStatus('Source was updated, but destination update failed.');
        return;
      }
    } else {
      const { data: newDestinationItem, error: destinationInsertError } = await supabase
        .from('inventory_items')
        .insert({
          supply_room_id: transferDestinationRoomId,
          item_name: selectedTransferInventoryItem.itemName,
          item_number: selectedTransferInventoryItem.itemNumber || null,
          qty_on_hand: quantity,
          par: selectedTransferInventoryItem.par,
        })
        .select('id')
        .single();

      if (destinationInsertError) {
        console.error('Failed to create destination inventory item:', destinationInsertError);
        setInventoryStatus('Source was updated, but destination item was not created.');
        return;
      }

      destinationItemId = newDestinationItem.id;
    }

    const { error: transactionError } = await supabase.from('inventory_transactions').insert({
      item_id: selectedTransferInventoryItem.id,
      transaction_type: 'TRANSFER',
      quantity,
      source_room_id: selectedSupplyRoomId,
      destination_room_id: transferDestinationRoomId,
      created_by: authEmail || null,
    });

    if (transactionError) {
      console.error('Failed to create inventory transaction:', transactionError);
      setInventoryStatus('Inventory was transferred, but transaction history did not save.');
      return;
    }

    setSelectedTransferInventoryItem(null);
    setTransferInventoryQty('');
    setTransferDestinationRoomId('');
    setInventoryStatus('Inventory transferred.');
    await loadInventoryItems(selectedSupplyRoomId);
  }

  async function handleCreateSupplyRoom() {
    const roomName = newSupplyRoomName.trim();

    if (!roomName) {
      setInventoryStatus('Enter a supply room name.');
      return;
    }

    setInventoryStatus('Creating supply room...');

    const { data, error } = await supabase
      .from('inventory_supply_rooms')
      .insert({ name: roomName })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create supply room:', error);
      setInventoryStatus('Unable to create supply room.');
      return;
    }

    setNewSupplyRoomName('');
    setInventoryStatus('Supply room created.');
    await loadInventorySupplyRooms();

    if (data?.id) {
      setSelectedSupplyRoomId(data.id);
      setShowInventoryRoomDetail(true);
    }
  }

  async function handleDeleteSupplyRoom(room: InventorySupplyRoom) {
    const confirmed = window.confirm(
      `Delete supply room "${room.name}"? This can only be done if the room has no inventory items.`,
    );

    if (!confirmed) {
      return;
    }

    setInventoryStatus('Checking supply room inventory...');

    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('supply_room_id', room.id)
      .limit(1);

    if (itemsError) {
      console.error('Failed to check supply room inventory:', itemsError);
      setInventoryStatus('Unable to check supply room inventory.');
      return;
    }

    if ((items ?? []).length > 0) {
      setInventoryStatus('Cannot delete supply room. Remove or transfer inventory items first.');
      return;
    }

    setInventoryStatus('Deleting supply room...');

    const { error } = await supabase.from('inventory_supply_rooms').delete().eq('id', room.id);

    if (error) {
      console.error('Failed to delete supply room:', error);
      setInventoryStatus('Unable to delete supply room.');
      return;
    }

    if (selectedSupplyRoomId === room.id) {
      setSelectedSupplyRoomId('');
      setShowInventoryRoomDetail(false);
      setInventoryItems([]);
    }

    setInventoryStatus('Supply room deleted.');
    await loadInventorySupplyRooms();
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
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Conversations</div>
                      <div className="text-xs text-slate-500">
                        {filteredSupervisorConversations.length} shown · {supervisorUnreadCount} unread
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setHideReadMessages((value) => !value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {hideReadMessages ? 'Show All Messages' : 'Hide Read Messages'}
                      </button>
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
                  </div>

                  <input
                    type="text"
                    value={messageSearch}
                    onChange={(event) => setMessageSearch(event.target.value)}
                    placeholder="Search messages..."
                    className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />

                  <div className="max-h-[520px] space-y-2 overflow-auto">
                    {supervisorConversations.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                        No Apollo messages yet.
                      </div>
                    ) : (
                      filteredSupervisorConversations.map((conversation) => (
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
                        <th className="px-3 py-2">Incident #</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Employee</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Assigned To</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openIncidentReports.map((report) => (
                        <React.Fragment key={report.id}>
                          <tr className="border-t border-slate-200">
                            <td className="px-3 py-2 font-semibold text-slate-900">{report.incident_number}</td>
                            <td className="px-3 py-2 text-slate-600">{formatShortDate(new Date(report.created_at))}</td>
                            <td className="px-3 py-2 text-slate-700">{report.employee_name}</td>
                            <td className="px-3 py-2 text-slate-700">{report.category}</td>
                            <td className="px-3 py-2 text-slate-700">{report.assigned_supervisor || 'Unassigned'}</td>
                            <td className="px-3 py-2 font-semibold text-blue-700">{report.status}</td>
                            <td className="px-3 py-2">
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
                          <th className="px-3 py-2">Incident #</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Employee</th>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2">Assigned To</th>
                          <th className="px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {closedIncidentReports.map((report) => (
                          <tr key={report.id} className="border-t border-slate-200">
                            <td className="px-3 py-2 font-semibold text-slate-900">{report.incident_number}</td>
                            <td className="px-3 py-2 text-slate-600">{formatShortDate(new Date(report.created_at))}</td>
                            <td className="px-3 py-2 text-slate-700">{report.employee_name}</td>
                            <td className="px-3 py-2 text-slate-700">{report.category}</td>
                            <td className="px-3 py-2 text-slate-700">{report.assigned_supervisor || 'Unassigned'}</td>
                            <td className="px-3 py-2">
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
            'supervisor-shift-report',
            'Daily Supervisor Shift Report',
            'Submit a daily operational report for supervisor review and recordkeeping.',
            <form className="space-y-4" onSubmit={handleSupervisorShiftReportSubmit}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Supervisor Completing Report
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                    value={currentEmployee?.name ?? 'Supervisor'}
                    readOnly
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Date of Shift
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={supervisorShiftReportDate}
                    onChange={(event) => setSupervisorShiftReportDate(event.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ['Unscheduled Absences', supervisorShiftReportAbsences, setSupervisorShiftReportAbsences],
                  ['Tardy Employees', supervisorShiftReportTardies, setSupervisorShiftReportTardies],
                  ['Company Vehicle Issues', supervisorShiftReportVehicleIssues, setSupervisorShiftReportVehicleIssues],
                  ['Other Notable Issues', supervisorShiftReportOtherIssues, setSupervisorShiftReportOtherIssues],
                ].map(([label, value, setter]) => (
                  <label key={label as string} className="text-xs font-semibold text-slate-600">
                    {label as string}
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={value as string}
                      onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)}
                      required
                    >
                      <option>No</option>
                      <option>Yes</option>
                    </select>
                  </label>
                ))}
              </div>

              <label className="block text-xs font-semibold text-slate-600">
                Narrative of Events / Tasks Completed
                <textarea
                  className="mt-1 min-h-[180px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={supervisorShiftReportNarrative}
                  onChange={(event) => setSupervisorShiftReportNarrative(event.target.value)}
                  placeholder="Describe any operational issues, tasks completed, absences, tardies, vehicle concerns, or other notable events."
                  required
                />
              </label>

              <label className="block rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
                <input type="checkbox" className="mr-2" required />
                I acknowledge that I personally completed this shift report and that the information provided is accurate to the best of my knowledge. I understand that this report becomes part of the operational record of the company and may be used for quality improvement, investigations, personnel review, and operational planning.
              </label>

              {supervisorShiftReportStatus && <p className="text-sm font-semibold text-slate-700">{supervisorShiftReportStatus}</p>}

              <button
                type="submit"
                disabled={isSubmittingSupervisorShiftReport}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
              >
                {isSubmittingSupervisorShiftReport ? 'Submitting...' : 'Submit Supervisor Shift Report'}
              </button>
            </form>,
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
            'inventory-tracking',
            'Inventory Tracking',
            'Manage supply rooms, inventory levels, PAR counts, transfers, and ordering status.',
            <div className="space-y-4">
              {!showInventoryRoomDetail && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">Supply Rooms</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateInventoryReports((value) => !value)}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                    >
                      {showCreateInventoryReports ? 'Hide Inventory Reports' : 'Run Inventory Reports'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCreateSupplyRoomForm((value) => !value)}
                      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                    >
                      {showCreateSupplyRoomForm ? 'Cancel' : 'Add Supply Room'}
                    </button>
                  </div>
                </div>

                {showCreateSupplyRoomForm && (
                  <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
                    <label className="flex-1 text-xs font-semibold text-slate-600">
                      New Supply Room Name
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={newSupplyRoomName}
                        onChange={(event) => setNewSupplyRoomName(event.target.value)}
                        placeholder="Main Supply Room"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleCreateSupplyRoom}
                      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                    >
                      Create Supply Room
                    </button>
                  </div>
                )}

                {showCreateInventoryReports && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-bold text-slate-900">Inventory Reports</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Report tools will be added here for usage, transfers, expirations, low stock, and inventory value.
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        'Usage by Date Range',
                        'Order List',
                        'Transfers',
                        'Expiration Management',
                        'Inventory Value',
                      ].map((reportName) => (
                        <button
                          key={reportName}
                          type="button"
                          onClick={() => setInventoryReportModal(reportName)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          {reportName}
                        </button>
                      ))}
                    </div>

                    {inventoryReportModal && (
                      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
                        <div className="apollo-print-report mt-6 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
                          <style>{`
                            @media print {
                              body * {
                                visibility: hidden;
                              }

                              .apollo-print-report,
                              .apollo-print-report * {
                                visibility: visible;
                              }

                              .apollo-print-report {
                                position: absolute !important;
                                left: 0 !important;
                                top: 0 !important;
                                width: 100% !important;
                                max-width: none !important;
                                max-height: none !important;
                                overflow: visible !important;
                                border-radius: 0 !important;
                                box-shadow: none !important;
                                padding: 16px !important;
                              }

                              .apollo-no-print {
                                display: none !important;
                              }

                              table {
                                page-break-inside: auto;
                              }

                              tr {
                                page-break-inside: avoid;
                                page-break-after: auto;
                              }
                            }
                          `}</style>
                          <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                            <div>
                              <div className="text-lg font-bold text-slate-900">{inventoryReportModal}</div>
                              <div className="text-sm text-slate-500">Inventory report viewer</div>
                            </div>
                            <div className="apollo-no-print flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                onClick={() => window.print()}
                              >
                                Print / Save PDF
                              </button>
                              <button
                                type="button"
                                onClick={() => setInventoryReportModal(null)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                              >
                                Close
                              </button>
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-sm font-bold text-slate-900">Report Parameters</div>

                            {inventoryReportModal === 'Usage by Date Range' || inventoryReportModal === 'Order List' || inventoryReportModal === 'Expiration Management' || inventoryReportModal === 'Inventory Value' ? (
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Supply Room</div>
                                  {inventoryReportModal === 'Usage by Date Range' || inventoryReportModal === 'Order List' || inventoryReportModal === 'Inventory Value' ? (
                                    <>
                                      <select
                                        value={inventoryReportSupplyRoomId}
                                        onChange={(event) => setInventoryReportSupplyRoomId(event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900"
                                      >
                                        <option value="">All Supply Rooms</option>
                                        {inventorySupplyRooms.map((room) => (
                                          <option key={room.id} value={room.id}>
                                            {room.name}
                                          </option>
                                        ))}
                                      </select>
                                      <div className="mt-1 text-xs text-slate-500">
                                        {inventoryReportModal === 'Usage by Date Range'
                                          ? 'Filters usage transactions by source supply room.'
                                          : inventoryReportModal === 'Order List'
                                            ? 'Builds an order worksheet for one supply room or all supply rooms.'
                                            : 'Calculates inventory value for one supply room or all supply rooms.'}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="mt-1 text-sm font-bold text-slate-900">
                                        {inventorySupplyRooms.find((room) => room.id === selectedSupplyRoomId)?.name ?? 'Selected Supply Room'}
                                      </div>
                                      <div className="mt-1 text-xs text-slate-500">This report uses the currently selected supply room.</div>
                                    </>
                                  )}
                                </div>

                                {inventoryReportModal === 'Order List' && (
                                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    {(() => {
                                      const orderItems = allInventoryItems
                                        .filter((item) => item.par > 0 && item.qtyOnHand < item.par)
                                        .filter((item) => !inventoryReportSupplyRoomId || item.supplyRoomId === inventoryReportSupplyRoomId);

                                      const supplyRoomCount = new Set(orderItems.map((item) => item.supplyRoomId)).size;
                                      const totalUnitsToOrder = orderItems.reduce((sum, item) => sum + (item.par - item.qtyOnHand), 0);

                                      return (
                                        <>
                                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Order Summary</div>
                                          <div className="mt-2 grid gap-2 text-sm">
                                            <div className="flex justify-between gap-3">
                                              <span className="text-slate-600">Supply Rooms Included</span>
                                              <span className="font-bold text-slate-900">{supplyRoomCount}</span>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                              <span className="text-slate-600">Items Requiring Order</span>
                                              <span className="font-bold text-slate-900">{orderItems.length}</span>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                              <span className="text-slate-600">Total Units To Order</span>
                                              <span className="font-bold text-red-700">{totalUnitsToOrder}</span>
                                            </div>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}

                                {inventoryReportModal === 'Inventory Value' && (
                                  <div className="rounded-lg border border-slate-200 bg-white p-3 md:col-span-2">
                                    <div className="grid gap-3 md:grid-cols-2">
                                      <label className="text-xs font-semibold text-slate-700">
                                        Item
                                        <select
                                          value={inventoryReportItemId}
                                          onChange={(event) => setInventoryReportItemId(event.target.value)}
                                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                        >
                                          <option value="">All Items</option>
                                          {allInventoryItems
                                            .filter((item) => !inventoryReportSupplyRoomId || item.supplyRoomId === inventoryReportSupplyRoomId)
                                            .map((item) => (
                                              <option key={item.id} value={item.id}>
                                                {item.itemName}{item.itemNumber ? ` (${item.itemNumber})` : ''}
                                              </option>
                                            ))}
                                        </select>
                                      </label>

                                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                        This report calculates value using Qty On Hand × Unit Cost. Items with no unit cost entered will calculate as $0.00.
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {inventoryReportModal === 'Usage by Date Range' && (
                                  <div className="rounded-lg border border-slate-200 bg-white p-3 md:col-span-2">
                                    <div className="grid gap-3 md:grid-cols-5">
                                      <label className="text-xs font-semibold text-slate-700">
                                        Start Date
                                        <input
                                          type="date"
                                          value={inventoryReportStartDate}
                                          onChange={(event) => setInventoryReportStartDate(event.target.value)}
                                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                        />
                                      </label>

                                      <label className="text-xs font-semibold text-slate-700">
                                        End Date
                                        <input
                                          type="date"
                                          value={inventoryReportEndDate}
                                          onChange={(event) => setInventoryReportEndDate(event.target.value)}
                                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                        />
                                      </label>

                                      <label className="text-xs font-semibold text-slate-700">
                                        Item
                                        <select
                                          value={inventoryReportItemId}
                                          onChange={(event) => setInventoryReportItemId(event.target.value)}
                                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                        >
                                          <option value="">All Items</option>
                                          {allInventoryItems.map((item) => (
                                            <option key={item.id} value={item.id}>
                                              {item.itemName}{item.itemNumber ? ` (${item.itemNumber})` : ''}
                                            </option>
                                          ))}
                                        </select>
                                      </label>

                                      <label className="text-xs font-semibold text-slate-700">
                                        Reason
                                        <select
                                          value={inventoryReportReason}
                                          onChange={(event) => setInventoryReportReason(event.target.value)}
                                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                        >
                                          <option value="">All Reasons</option>
                                          <option value="Expired">Expired</option>
                                          <option value="Damaged">Damaged</option>
                                          <option value="Shrink">Shrink</option>
                                          <option value="Other">Other</option>
                                        </select>
                                      </label>

                                      <div className="flex items-end">
                                        <button
                                          type="button"
                                          onClick={handleRunInventoryUsageReport}
                                          className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                                        >
                                          Run Usage Report
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                              </div>
                            ) : (
                              <div className="mt-2 text-sm text-slate-600">
                                Parameters for this report will be shown here as each report is moved into this viewer.
                              </div>
                            )}
                          </div>

                          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-bold text-slate-900">Report Results</div>
                              {inventoryReportModal === 'Expiration Management' && (
                                <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-900">
                                  {expiredInventoryLots.length} lot{expiredInventoryLots.length === 1 ? '' : 's'}
                                </div>
                              )}
                              {inventoryReportModal === 'Inventory Value' && (
                                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
                                  ${totalInventoryValue.toFixed(2)}
                                </div>
                              )}
                              {inventoryReportModal === 'Usage by Date Range' && (
                                <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900">
                                  {inventoryUsageTransactions.length} transaction{inventoryUsageTransactions.length === 1 ? '' : 's'}
                                </div>
                              )}
                              {inventoryReportModal === 'Order List' && (
                                <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
                                  Order Worksheet
                                </div>
                              )}
                            </div>

                            {inventoryReportModal === 'Expiration Management' ? (
                              (() => {
                                const expirationLots = [...expiredInventoryLots, ...expiringSoonInventoryLots]
                                  .map(({ item, lot }) => {
                                    const expiration = new Date(`${lot.expirationDate}T00:00:00`);
                                    const daysUntilExpiration = Math.ceil((expiration.getTime() - inventoryToday.getTime()) / (1000 * 60 * 60 * 24));
                                    return { item, lot, daysUntilExpiration };
                                  })
                                  .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

                                const expiredCount = expirationLots.filter(({ daysUntilExpiration }) => daysUntilExpiration < 0).length;
                                const expiresTodayCount = expirationLots.filter(({ daysUntilExpiration }) => daysUntilExpiration === 0).length;
                                const expiresThirtyCount = expirationLots.filter(({ daysUntilExpiration }) => daysUntilExpiration >= 1 && daysUntilExpiration <= 30).length;
                                const expiresNinetyCount = expirationLots.filter(({ daysUntilExpiration }) => daysUntilExpiration >= 31 && daysUntilExpiration <= 90).length;

                                return expirationLots.length === 0 ? (
                                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                                    No expired or expiring lots found for the selected supply room.
                                  </div>
                                ) : (
                                  <div className="mt-4 space-y-4">
                                    <div className="grid gap-3 md:grid-cols-4">
                                      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                        <div className="text-xs font-bold uppercase tracking-wide text-red-700">Expired</div>
                                        <div className="mt-1 text-2xl font-black text-red-800">{expiredCount}</div>
                                      </div>
                                      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                                        <div className="text-xs font-bold uppercase tracking-wide text-orange-700">Expires Today</div>
                                        <div className="mt-1 text-2xl font-black text-orange-800">{expiresTodayCount}</div>
                                      </div>
                                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                        <div className="text-xs font-bold uppercase tracking-wide text-amber-700">Expiring 1-30 Days</div>
                                        <div className="mt-1 text-2xl font-black text-amber-800">{expiresThirtyCount}</div>
                                      </div>
                                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                                        <div className="text-xs font-bold uppercase tracking-wide text-yellow-700">Expiring 31-90 Days</div>
                                        <div className="mt-1 text-2xl font-black text-yellow-800">{expiresNinetyCount}</div>
                                      </div>
                                    </div>

                                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 text-slate-800">
                                          <tr>
                                            <th className="px-3 py-2">Item</th>
                                            <th className="px-3 py-2">Item Number</th>
                                            <th className="px-3 py-2">Lot Number</th>
                                            <th className="px-3 py-2">Manufacturer</th>
                                            <th className="px-3 py-2">Qty On Hand</th>
                                            <th className="px-3 py-2">Expiration Date</th>
                                            <th className="px-3 py-2">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {expirationLots.map(({ item, lot, daysUntilExpiration }) => {
                                            const statusText = daysUntilExpiration < 0
                                              ? `${Math.abs(daysUntilExpiration)} day${Math.abs(daysUntilExpiration) === 1 ? '' : 's'} expired`
                                              : daysUntilExpiration === 0
                                                ? 'Expires Today'
                                                : `${daysUntilExpiration} day${daysUntilExpiration === 1 ? '' : 's'}`;

                                            const statusClass = daysUntilExpiration < 0
                                              ? 'rounded-full bg-red-100 px-2 py-1 text-[11px] font-bold text-red-700'
                                              : daysUntilExpiration <= 30
                                                ? 'rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800'
                                                : 'rounded-full bg-yellow-100 px-2 py-1 text-[11px] font-bold text-yellow-800';

                                            return (
                                              <tr key={lot.id} className="border-t border-slate-100">
                                                <td className="px-3 py-2 font-semibold text-slate-900">{item.itemName}</td>
                                                <td className="px-3 py-2 text-slate-600">{item.itemNumber || '—'}</td>
                                                <td className="px-3 py-2 text-slate-700">{lot.lotNumber || '—'}</td>
                                                <td className="px-3 py-2 text-slate-700">{lot.manufacturer || '—'}</td>
                                                <td className="px-3 py-2 font-bold text-slate-900">{lot.qtyOnHand}</td>
                                                <td className="px-3 py-2">
                                                  <span className={getInventoryExpirationClass(lot.expirationDate)}>
                                                    {lot.expirationDate}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                  <span className={statusClass}>{statusText}</span>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : inventoryReportModal === 'Usage by Date Range' ? (
                              inventoryUsageTransactions.length === 0 ? (
                                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                                  No usage transactions loaded for the selected date range.
                                </div>
                              ) : (
                                <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 text-slate-800">
                                      <tr>
                                        <th className="px-3 py-2">Date</th>
                                        <th className="px-3 py-2">Item</th>
                                        <th className="px-3 py-2">Qty Removed</th>
                                        <th className="px-3 py-2">Reason</th>
                                        <th className="px-3 py-2">Source Room</th>
                                        <th className="px-3 py-2">Created By</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {inventoryUsageTransactions.map((transaction) => (
                                        <tr key={transaction.id} className="border-t border-slate-100">
                                          <td className="px-3 py-2 text-slate-700">
                                            {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : '—'}
                                          </td>
                                          <td className="px-3 py-2 font-semibold text-slate-900">{getInventoryItemLabel(transaction.itemId)}</td>
                                          <td className="px-3 py-2 font-bold text-slate-900">{transaction.quantity}</td>
                                          <td className="px-3 py-2 text-slate-700">{transaction.reason || '—'}</td>
                                          <td className="px-3 py-2 text-slate-700">{getInventoryRoomLabel(transaction.sourceRoomId)}</td>
                                          <td className="px-3 py-2 text-slate-700">{getInventoryUserLabel(transaction.createdBy)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )
                            ) : inventoryReportModal === 'Order List' ? (
                              (() => {
                                const orderItems = allInventoryItems
                                  .filter((item) => item.par > 0 && item.qtyOnHand < item.par)
                                  .filter((item) => !inventoryReportSupplyRoomId || item.supplyRoomId === inventoryReportSupplyRoomId)
                                  .sort((a, b) => {
                                    const roomCompare = getInventoryRoomLabel(a.supplyRoomId).localeCompare(getInventoryRoomLabel(b.supplyRoomId));
                                    if (roomCompare !== 0) return roomCompare;
                                    return (b.par - b.qtyOnHand) - (a.par - a.qtyOnHand);
                                  });

                                const groupedOrderItems = inventorySupplyRooms
                                  .map((room) => ({
                                    room,
                                    items: orderItems.filter((item) => item.supplyRoomId === room.id),
                                  }))
                                  .filter((group) => group.items.length > 0);

                                const generatedAt = new Date().toLocaleString();

                                return orderItems.length === 0 ? (
                                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                                    No items currently require ordering for the selected supply room filter.
                                  </div>
                                ) : (
                                  <div className="mt-4 space-y-4">
                                    {groupedOrderItems.map(({ room, items }) => (
                                      <div key={room.id} className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                                          <div className="text-sm font-bold text-slate-900">{room.name}</div>
                                          <div className="mt-1 text-xs font-semibold text-slate-500">
                                            {items.length} item{items.length === 1 ? '' : 's'} requiring order • {items.reduce((sum, item) => sum + (item.par - item.qtyOnHand), 0)} unit{items.reduce((sum, item) => sum + (item.par - item.qtyOnHand), 0) === 1 ? '' : 's'} to order
                                          </div>
                                        </div>
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-slate-100 text-slate-800">
                                            <tr>
                                              <th className="px-3 py-2">Ordered</th>
                                              <th className="px-3 py-2">Item Name</th>
                                              <th className="px-3 py-2">Item Number</th>
                                              <th className="px-3 py-2">Qty On Hand</th>
                                              <th className="px-3 py-2">PAR</th>
                                              <th className="px-3 py-2">Qty To Order</th>
                                              <th className="px-3 py-2">Status</th>
                                              <th className="px-3 py-2">Qty Ordered</th>
                                              <th className="apollo-no-print px-3 py-2">Action</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {items.map((item) => (
                                              <tr key={item.id} className="border-t border-slate-100">
                                                <td className="px-3 py-2 text-center">
                                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-400 bg-white text-xs font-bold text-blue-700">
                                                    {item.orderStatus === 'ORDERED' || item.orderStatus === 'AWAITING_DELIVERY' || item.orderStatus === 'RECEIVED' ? '✓' : ''}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2 font-semibold text-slate-900">{item.itemName}</td>
                                                <td className="px-3 py-2 text-slate-700">{item.itemNumber || '—'}</td>
                                                <td className="px-3 py-2 font-bold text-slate-900">{item.qtyOnHand}</td>
                                                <td className="px-3 py-2 text-slate-700">{item.par}</td>
                                                <td className="px-3 py-2 font-bold text-red-700">
                                                  {item.par - item.qtyOnHand}
                                                </td>
                                                <td className="px-3 py-2">
                                                  <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${getInventoryOrderStatusClass(item.orderStatus)}`}>
                                                    {getInventoryOrderStatusLabel(item.orderStatus)}
                                                  </span>
                                                  {item.orderedBy && (
                                                    <div className="mt-1 text-[10px] text-slate-500">
                                                      Ordered by {getInventoryUserLabel(item.orderedBy)}
                                                    </div>
                                                  )}
                                                  {item.orderedDate && (
                                                    <div className="text-[10px] text-slate-500">
                                                      Ordered {new Date(item.orderedDate).toLocaleString()}
                                                    </div>
                                                  )}
                                                  {item.orderStatus === 'AWAITING_DELIVERY' && (
                                                    <div className="mt-1 text-[10px] font-bold text-purple-700">
                                                      Awaiting delivery
                                                    </div>
                                                  )}
                                                  {item.receivedDate && (
                                                    <div className="mt-1 text-[10px] font-bold text-emerald-700">
                                                      Received {new Date(item.receivedDate).toLocaleString()}
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="px-3 py-2">
                                                  <div className="h-6 min-w-20 border-b border-slate-400"></div>
                                                </td>
                                                <td className="apollo-no-print px-3 py-2">
                                                  {item.orderStatus === 'ORDERED' ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => handleMarkInventoryItemAwaitingDelivery(item)}
                                                      className="rounded-lg border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] font-bold text-purple-800 hover:bg-purple-100"
                                                    >
                                                      Awaiting Delivery
                                                    </button>
                                                  ) : item.orderStatus === 'AWAITING_DELIVERY' ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => handleMarkInventoryItemReceived(item)}
                                                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                                                    >
                                                      Received
                                                    </button>
                                                  ) : item.orderStatus === 'RECEIVED' ? (
                                                    <button
                                                      type="button"
                                                      disabled
                                                      className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-400"
                                                    >
                                                      Received
                                                    </button>
                                                  ) : (
                                                    <button
                                                      type="button"
                                                      onClick={() => handleMarkInventoryItemOrdered(item)}
                                                      className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-800 hover:bg-blue-100"
                                                    >
                                                      Mark Ordered
                                                    </button>
                                                  )}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ))}

                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                                      <div><span className="font-bold text-slate-900">Generated:</span> {generatedAt}</div>
                                      <div><span className="font-bold text-slate-900">Total Items Requiring Order:</span> {orderItems.length}</div>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : inventoryReportModal === 'Inventory Value' ? (
                              (() => {
                                const valueItems = allInventoryItems
                                  .filter((item) => !inventoryReportSupplyRoomId || item.supplyRoomId === inventoryReportSupplyRoomId)
                                  .filter((item) => !inventoryReportItemId || item.id === inventoryReportItemId)
                                  .sort((a, b) => (b.qtyOnHand * b.unitCost) - (a.qtyOnHand * a.unitCost));

                                const valueTotal = valueItems.reduce((sum, item) => sum + (item.qtyOnHand * item.unitCost), 0);
                                const totalUnits = valueItems.reduce((sum, item) => sum + item.qtyOnHand, 0);
                                const itemsMissingCost = valueItems.filter((item) => item.qtyOnHand > 0 && item.unitCost <= 0).length;
                                const valueBySupplyRoom = inventorySupplyRooms
                                  .map((room) => {
                                    const roomItems = valueItems.filter((item) => item.supplyRoomId === room.id);
                                    const roomValue = roomItems.reduce((sum, item) => sum + (item.qtyOnHand * item.unitCost), 0);
                                    const roomUnits = roomItems.reduce((sum, item) => sum + item.qtyOnHand, 0);

                                    return {
                                      roomId: room.id,
                                      roomName: room.name,
                                      itemCount: roomItems.length,
                                      roomUnits,
                                      roomValue,
                                    };
                                  })
                                  .filter((roomSummary) => roomSummary.itemCount > 0)
                                  .sort((a, b) => b.roomValue - a.roomValue);

                                const topValueItems = valueItems
                                  .filter((item) => item.qtyOnHand > 0)
                                  .slice(0, 10);

                                return valueItems.length === 0 ? (
                                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                                    No inventory items found for the selected report parameters.
                                  </div>
                                ) : (
                                  <div className="mt-4 space-y-4">
                                    <div className="grid gap-3 md:grid-cols-3">
                                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                        <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">Total Inventory Value</div>
                                        <div className="mt-1 text-2xl font-black text-emerald-800">${valueTotal.toFixed(2)}</div>
                                      </div>

                                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Items Included</div>
                                        <div className="mt-1 text-2xl font-black text-slate-900">{valueItems.length}</div>
                                      </div>

                                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Total Units On Hand</div>
                                        <div className="mt-1 text-2xl font-black text-slate-900">{totalUnits}</div>
                                      </div>
                                    </div>

                                    {itemsMissingCost > 0 && (
                                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                                        {itemsMissingCost} item{itemsMissingCost === 1 ? '' : 's'} with quantity on hand have no unit cost entered, so their value is calculating as $0.00.
                                      </div>
                                    )}

                                    <div className="grid gap-4 lg:grid-cols-2">
                                      <div className="rounded-lg border border-slate-200 bg-white">
                                        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900">
                                          Inventory Value by Supply Room
                                        </div>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-100 text-slate-800">
                                              <tr>
                                                <th className="px-3 py-2">Supply Room</th>
                                                <th className="px-3 py-2">Items</th>
                                                <th className="px-3 py-2">Units</th>
                                                <th className="px-3 py-2">Value</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {valueBySupplyRoom.map((roomSummary) => (
                                                <tr key={roomSummary.roomId} className="border-t border-slate-100">
                                                  <td className="px-3 py-2 font-semibold text-slate-900">{roomSummary.roomName}</td>
                                                  <td className="px-3 py-2 text-slate-700">{roomSummary.itemCount}</td>
                                                  <td className="px-3 py-2 text-slate-700">{roomSummary.roomUnits}</td>
                                                  <td className="px-3 py-2 font-bold text-emerald-700">${roomSummary.roomValue.toFixed(2)}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>

                                      <div className="rounded-lg border border-slate-200 bg-white">
                                        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900">
                                          Top Value Items
                                        </div>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-100 text-slate-800">
                                              <tr>
                                                <th className="px-3 py-2">Item</th>
                                                <th className="px-3 py-2">Qty</th>
                                                <th className="px-3 py-2">Unit Cost</th>
                                                <th className="px-3 py-2">Value</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {topValueItems.map((item) => {
                                                const inventoryValue = item.qtyOnHand * item.unitCost;

                                                return (
                                                  <tr key={item.id} className="border-t border-slate-100">
                                                    <td className="px-3 py-2 font-semibold text-slate-900">{item.itemName}</td>
                                                    <td className="px-3 py-2 text-slate-700">{item.qtyOnHand}</td>
                                                    <td className="px-3 py-2 text-slate-700">${item.unitCost.toFixed(2)}</td>
                                                    <td className="px-3 py-2 font-bold text-emerald-700">${inventoryValue.toFixed(2)}</td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 text-slate-800">
                                          <tr>
                                            <th className="px-3 py-2">Supply Room</th>
                                            <th className="px-3 py-2">Item</th>
                                            <th className="px-3 py-2">Item Number</th>
                                            <th className="px-3 py-2">Qty On Hand</th>
                                            <th className="px-3 py-2">Unit Cost</th>
                                            <th className="px-3 py-2">Inventory Value</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {valueItems.map((item) => {
                                            const inventoryValue = item.qtyOnHand * item.unitCost;
                                            const supplyRoomName = inventorySupplyRooms.find((room) => room.id === item.supplyRoomId)?.name ?? 'Unknown Room';

                                            return (
                                              <tr key={item.id} className="border-t border-slate-100">
                                                <td className="px-3 py-2 text-slate-700">{supplyRoomName}</td>
                                                <td className="px-3 py-2 font-semibold text-slate-900">{item.itemName}</td>
                                                <td className="px-3 py-2 text-slate-600">{item.itemNumber || '—'}</td>
                                                <td className="px-3 py-2 font-bold text-slate-900">{item.qtyOnHand}</td>
                                                <td className="px-3 py-2 text-slate-700">${item.unitCost.toFixed(2)}</td>
                                                <td className="px-3 py-2 font-bold text-emerald-700">${inventoryValue.toFixed(2)}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                        <tfoot>
                                          <tr className="border-t-2 border-slate-200 bg-slate-50">
                                            <td colSpan={5} className="px-3 py-3 text-right font-bold text-slate-900">
                                              Total Inventory Value
                                            </td>
                                            <td className="px-3 py-3 font-bold text-emerald-700">
                                              ${valueTotal.toFixed(2)}
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="mt-2 text-sm text-slate-600">
                                Report results will appear here as each report is moved into this viewer.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}



                  </div>
                )}

                {inventoryStatus && <div className="mt-3 text-sm font-semibold text-slate-700">{inventoryStatus}</div>}
              </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                {inventorySupplyRooms.length === 0 ? (
                  <div className="text-sm text-slate-600">No supply rooms have been created yet.</div>
                ) : (
                  <div className="space-y-4">
                    {!showInventoryRoomDetail && (
                      <div>
                        <div className="text-sm font-bold text-slate-900">Supply Rooms</div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {inventorySupplyRooms.map((room) => (
                            <button
                              key={room.id}
                              type="button"
                              onClick={() => {
                                setSelectedSupplyRoomId(room.id);
                                setShowInventoryRoomDetail(true);
                              }}
                              className={`rounded-xl border p-4 text-left transition ${
                                selectedSupplyRoomId === room.id
                                  ? 'border-blue-300 bg-blue-50'
                                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                              }`}
                            >
                              <div className="text-sm font-bold text-slate-900">{room.name}</div>
                              <div className="mt-1 text-xs text-slate-500">Open inventory room</div>
                              <div className="mt-3">
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteSupplyRoom(room);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      handleDeleteSupplyRoom(room);
                                    }
                                  }}
                                  className="inline-flex rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                                >
                                  Delete Supply Room
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {showInventoryRoomDetail && (
                      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
                        <div className="mt-6 max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
                          <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                            <div>
                              <div className="text-lg font-bold text-slate-900">
                                {inventorySupplyRooms.find((room) => room.id === selectedSupplyRoomId)?.name ?? 'Supply Room'}
                              </div>
                              <div className="text-sm text-slate-500">Inventory detail</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowInventoryRoomDetail(false);
                                setSelectedSupplyRoomId('');
                              }}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Close
                            </button>
                          </div>

                          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="text-sm font-bold text-slate-900">Inventory Items</div>
                              <button
                                type="button"
                                onClick={() => setShowCreateInventoryItemForm((value) => !value)}
                                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                              >
                                {showCreateInventoryItemForm ? 'Cancel' : 'Add Inventory Item'}
                              </button>
                            </div>

                            {showCreateInventoryItemForm && (
                              <> 
                            <div className="mt-3 grid gap-3 md:grid-cols-4">
                              <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                                Item Name
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                  value={newInventoryItemName}
                                  onChange={(event) => setNewInventoryItemName(event.target.value)}
                                  placeholder="Nitroglycerin Sublingual Tabs"
                                />
                              </label>
                              <label className="text-xs font-semibold text-slate-600">
                                Item Number / SKU
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                  value={newInventoryItemNumber}
                                  onChange={(event) => setNewInventoryItemNumber(event.target.value)}
                                  placeholder="0639-01"
                                />
                              </label>
                              <label className="text-xs font-semibold text-slate-600">
                                PAR
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                  value={newInventoryItemPar}
                                  onChange={(event) => setNewInventoryItemPar(event.target.value)}
                                  inputMode="numeric"
                                  placeholder="12"
                                />
                              </label>
                              <label className="text-xs font-semibold text-slate-600">
                                Unit Cost
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                  value={newInventoryItemUnitCost}
                                  onChange={(event) => setNewInventoryItemUnitCost(event.target.value)}
                                  inputMode="decimal"
                                  placeholder="0.00"
                                />
                              </label>
                            </div>
                            <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
                              <button
                                type="button"
                                onClick={handleCreateInventoryItem}
                                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                              >
                                Create Item
                              </button>
                              {inventoryStatus && <div className="text-sm font-semibold text-slate-700">{inventoryStatus}</div>}
                            </div>
                              </>
                            )}
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Item Name</th>
                            <th className="px-3 py-2">Item Number</th>
                            <th className="px-3 py-2">Qty on Hand</th>
                            <th className="px-3 py-2">PAR</th>
                            <th className="px-3 py-2">Lots</th>
                            <th className="px-3 py-2">Nearest Expiration</th>
                            <th className="px-3 py-2">Variance</th>
                            <th className="px-3 py-2">Order Status</th>
                            <th className="px-3 py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {inventoryItems.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="px-3 py-4 text-center text-slate-500">
                                No inventory items have been added to this supply room yet.
                              </td>
                            </tr>
                          ) : (
                            inventoryItems.map((item) => {
                              const variance = item.qtyOnHand - item.par;
                              const orderStatus =
                                item.par > 0 && item.qtyOnHand <= item.par * 0.25
                                  ? 'Order Now'
                                  : item.par > 0 && item.qtyOnHand <= item.par * 0.5
                                    ? 'Order Soon'
                                    : 'OK';

                              return (
                                <React.Fragment key={item.id}>
                                <tr>
                                  <td className="px-3 py-2 font-semibold text-slate-900">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedInventoryItemId((current) => (current === item.id ? '' : item.id))}
                                      className="text-left font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                                    >
                                      {item.itemName}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 text-slate-700">{item.itemNumber || '—'}</td>
                                  <td className="px-3 py-2 text-slate-700">{item.qtyOnHand}</td>
                                  <td className="px-3 py-2 text-slate-700">{item.par}</td>
                                  <td className="px-3 py-2 text-slate-700">{item.lotCount}</td>
                                  <td className="px-3 py-2">
                                    <span className={getInventoryExpirationClass(item.nearestExpiration)}>
                                      {item.nearestExpiration || '—'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-slate-700">{variance}</td>
                                  <td
                                    className={`px-3 py-2 font-semibold ${
                                      orderStatus === 'Order Now'
                                        ? 'text-red-700'
                                        : orderStatus === 'Order Soon'
                                          ? 'text-amber-600'
                                          : 'text-green-700'
                                    }`}
                                  >
                                    {orderStatus}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedEditInventoryItem(item);
                                          setEditInventoryItemName(item.itemName);
                                          setEditInventoryItemNumber(item.itemNumber);
                                          setEditInventoryItemPar(String(item.par));
                                          setInventoryStatus('');
                                        }}
                                        className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedAddInventoryItem(item);
                                          setAddInventoryQty('');
                                          setAddInventoryLotNumber('');
                                          setAddInventoryExpirationDate('');
                                          setAddInventoryManufacturer('');
                                          setAddInventoryNotes('');
                                          setInventoryStatus('');
                                        }}
                                        className="rounded-lg bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                                      >
                                        Add
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedRemoveInventoryItem(item);
                                          setRemoveInventoryQty('');
                                          setRemoveInventoryReason('Expired');
                                          setInventoryStatus('');
                                        }}
                                        className="rounded-lg bg-red-700 px-3 py-1 text-xs font-bold text-white hover:bg-red-800"
                                      >
                                        Remove
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedTransferInventoryItem(item);
                                          setTransferInventoryQty('');
                                          setTransferDestinationRoomId('');
                                          setInventoryStatus('');
                                        }}
                                        className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                                      >
                                        Transfer
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {expandedInventoryItemId === item.id && (
                                  <tr>
                                    <td colSpan={9} className="bg-slate-50 px-3 py-3">
                                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Lots</div>
                                        {(inventoryLotsByItemId[item.id] ?? []).length === 0 ? (
                                          <div className="text-sm text-slate-500">No active lots found for this item.</div>
                                        ) : (
                                          <div className="overflow-x-auto">
                                            <table className="min-w-full text-xs">
                                              <thead className="text-left font-bold uppercase tracking-wide text-slate-500">
                                                <tr>
                                                  <th className="px-2 py-1">Lot Number</th>
                                                  <th className="px-2 py-1">Qty</th>
                                                  <th className="px-2 py-1">Expiration</th>
                                                  <th className="px-2 py-1">Manufacturer</th>
                                                  <th className="px-2 py-1">Notes</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100">
                                                {(inventoryLotsByItemId[item.id] ?? []).map((lot) => (
                                                  <tr key={lot.id}>
                                                    <td className="px-2 py-1 font-semibold text-slate-800">{lot.lotNumber || '—'}</td>
                                                    <td className="px-2 py-1 text-slate-700">{lot.qtyOnHand}</td>
                                                    <td className="px-2 py-1">
                                                      <span className={getInventoryExpirationClass(lot.expirationDate)}>
                                                        {lot.expirationDate || '—'}
                                                      </span>
                                                    </td>
                                                    <td className="px-2 py-1 text-slate-700">{lot.manufacturer || '—'}</td>
                                                    <td className="px-2 py-1 text-slate-700">{lot.notes || '—'}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                </React.Fragment>
                              );
                            })
                          )}
                        </tbody>
                        </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>,
          )}

          {selectedEditInventoryItem && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <div className="text-lg font-bold text-slate-900">Edit Inventory Item</div>
                    <div className="text-sm text-slate-500">{selectedEditInventoryItem.itemName}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEditInventoryItem(null)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                    Item Name
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={editInventoryItemName}
                      onChange={(event) => setEditInventoryItemName(event.target.value)}
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Item Number / SKU
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={editInventoryItemNumber}
                      onChange={(event) => setEditInventoryItemNumber(event.target.value)}
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    PAR
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={editInventoryItemPar}
                      onChange={(event) => setEditInventoryItemPar(event.target.value)}
                      inputMode="numeric"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Unit Cost
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={editInventoryItemUnitCost}
                      onChange={(event) => setEditInventoryItemUnitCost(event.target.value)}
                      inputMode="decimal"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
                  <button
                    type="button"
                    onClick={handleUpdateInventoryItem}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteInventoryItem}
                    className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
                  >
                    Delete Item
                  </button>
                  {inventoryStatus && <div className="text-sm font-semibold text-slate-700">{inventoryStatus}</div>}
                </div>
              </div>
            </div>
          )}

          {selectedAddInventoryItem && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <div className="text-lg font-bold text-slate-900">Add Inventory</div>
                    <div className="text-sm text-slate-500">{selectedAddInventoryItem.itemName}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAddInventoryItem(null)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Quantity *
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={addInventoryQty}
                      onChange={(event) => setAddInventoryQty(event.target.value)}
                      inputMode="numeric"
                      placeholder="1"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Lot Number
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={addInventoryLotNumber}
                      onChange={(event) => setAddInventoryLotNumber(event.target.value)}
                      placeholder="17260413A"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Expiration Date
                    <input
                      type="date"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={addInventoryExpirationDate}
                      onChange={(event) => setAddInventoryExpirationDate(event.target.value)}
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Manufacturer
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={addInventoryManufacturer}
                      onChange={(event) => setAddInventoryManufacturer(event.target.value)}
                      placeholder="Bound Tree"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                    Notes
                    <textarea
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={addInventoryNotes}
                      onChange={(event) => setAddInventoryNotes(event.target.value)}
                      rows={3}
                      placeholder="Packing slip, invoice, or receiving notes"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
                  <button
                    type="button"
                    onClick={handleAddInventoryQuantity}
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800"
                  >
                    Save Inventory
                  </button>
                  {inventoryStatus && <div className="text-sm font-semibold text-slate-700">{inventoryStatus}</div>}
                </div>
              </div>
            </div>
          )}

          {selectedRemoveInventoryItem && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <div className="text-lg font-bold text-slate-900">Remove Inventory</div>
                    <div className="text-sm text-slate-500">{selectedRemoveInventoryItem.itemName}</div>
                    <div className="text-xs text-slate-500">Qty on hand: {selectedRemoveInventoryItem.qtyOnHand}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRemoveInventoryItem(null)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Quantity *
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={removeInventoryQty}
                      onChange={(event) => setRemoveInventoryQty(event.target.value)}
                      inputMode="numeric"
                      placeholder="1"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Reason
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={removeInventoryReason}
                      onChange={(event) => setRemoveInventoryReason(event.target.value)}
                    >
                      <option value="Normal Usage">Normal Usage</option>
                      <option value="Expired">Expired</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Shrink">Shrink</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
                  <button
                    type="button"
                    onClick={handleRemoveInventoryQuantity}
                    className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
                  >
                    Save Removal
                  </button>
                  {inventoryStatus && <div className="text-sm font-semibold text-slate-700">{inventoryStatus}</div>}
                </div>
              </div>
            </div>
          )}

          {selectedTransferInventoryItem && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <div className="text-lg font-bold text-slate-900">Transfer Inventory</div>
                    <div className="text-sm text-slate-500">{selectedTransferInventoryItem.itemName}</div>
                    <div className="text-xs text-slate-500">Qty on hand: {selectedTransferInventoryItem.qtyOnHand}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTransferInventoryItem(null)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Quantity *
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={transferInventoryQty}
                      onChange={(event) => setTransferInventoryQty(event.target.value)}
                      inputMode="numeric"
                      placeholder="1"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Destination Supply Room
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={transferDestinationRoomId}
                      onChange={(event) => setTransferDestinationRoomId(event.target.value)}
                    >
                      <option value="">Select destination</option>
                      {inventorySupplyRooms
                        .filter((room) => room.id !== selectedSupplyRoomId)
                        .map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
                  <button
                    type="button"
                    onClick={handleTransferInventoryQuantity}
                    className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                  >
                    Save Transfer
                  </button>
                  {inventoryStatus && <div className="text-sm font-semibold text-slate-700">{inventoryStatus}</div>}
                </div>
              </div>
            </div>
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

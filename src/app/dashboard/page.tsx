'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type ShiftName = 'R1' | 'R2' | 'P' | 'OC' | 'GM' | 'ADMIN_SUP' | 'FIELD_SUP';
type ShiftCategory = 'UNIT' | 'SUPERVISOR';
type VehicleValue = string;

type CertificationRecord = {
  driversLicense: string;
  ambulanceDriversLicense: string;
  ahaBlsCpr: string;
  medicalExaminerCertificate: string;
  annualTbScreen: string;
  californiaParamedicLicense: string;
  ccemsaParamedicLicense: string;
  acls: string;
  pals: string;
  californiaEmtLicense: string;
  ccemsaEmtLicense: string;
};

type EmployeeRole = 'Paramedic' | 'EMT' | 'Supervisor';

type EmployeeOption = {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  scope: 'ALS' | 'BLS';
  employeeType: string;
  seniorityLabel: string;
  certifications: CertificationRecord;
  status?: string;
};

type StoredEmployeeProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  scope?: string;
  employeeType?: string;
  seniorityLabel?: string;
  certifications?: Partial<CertificationRecord>;
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
  seniority_label: string | null;
  certifications: Partial<CertificationRecord> | null;
  status: string | null;
};

type ShiftType = 'REGULAR' | 'SICK' | 'VACATION' | 'LEAVE' | 'TRAINING';

type EmployeeSlot = {
  employeeId: string;
  startTime: string;
  endTime: string;
  note: string;
  shiftType: ShiftType;
};

type ShiftAssignment = {
  employee1: EmployeeSlot;
  employee2: EmployeeSlot;
  employee3: EmployeeSlot;
  showEmployee3: boolean;
  vehicle: VehicleValue;
  allowExtendedHours: boolean;
  hiddenFromEmployees: boolean;
};

type DayAssignments = Record<ShiftName, ShiftAssignment>;

type ExtraShiftAssignment = {
  id: string;
  label: string;
  category: ShiftCategory;
  employee1: EmployeeSlot;
  employee2: EmployeeSlot;
  employee3: EmployeeSlot;
  showEmployee3: boolean;
  vehicle: VehicleValue;
  allowExtendedHours: boolean;
  hiddenFromEmployees: boolean;
};

type DaySchedule = {
  standard: DayAssignments;
  extras: ExtraShiftAssignment[];
};

type ScheduleData = Record<string, DaySchedule>;

type PayPeriodOption = {
  key: string;
  year: number;
  number: number;
  start: Date;
  end: Date;
};

type DisplayAssignment = {
  key: string;
  label: string;
  slots: EmployeeSlot[];
  hiddenFromEmployees: boolean;
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


type VacationRequest = {
  id: string;
  employee_id: string;
  employee_name: string;
  date_key: string;
  shift_label: string;
  start_time: string;
  end_time: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  supervisor_note: string | null;
  requested_at: string;
};

type SelectedVacationShift = {
  dateKey: string;
  dateLabel: string;
  shiftKey: string;
  shiftLabel: string;
  startTime: string;
  endTime: string;
};

type CompanyAnnouncement = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  expiresAt: string;
  postedBy: string;
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
  senderRole: 'EMPLOYEE' | 'SUPERVISOR' | 'SYSTEM';
  recipients: ApolloMessageRecipient[];
  audienceLabel: string;
  title: string;
  body: string;
  createdAt: string;
  relatedType: 'TIMECARD_RETURNED' | 'GENERAL' | 'SCHEDULE' | 'URGENT';
  relatedId?: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
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
  payBreakdown: PayBreakdown;
  punches: TimePunch[];
  missedMealBreaks: MissedMealBreak[];
  corrections: TimecardCorrectionRequest[];
  note: string;
  status: 'PENDING_SUPERVISOR_REVIEW' | 'APPROVED' | 'RETURNED';
};

type EditableTimecardRow = {
  shiftLabel: string;
  payType: 'DAILY_OT_DT' | 'TWENTY_FOUR_HOUR' | 'SICK_TIME' | 'VACATION' | 'JURY_DUTY';
  clockInDate: string;
  clockInTime: string;
  clockOutDate: string;
  clockOutTime: string;
};

type ActiveShiftInfo = {
  date: Date;
  dateKey: string;
  label: string;
  slot: EmployeeSlot;
  locationLabel: string;
  latitude: number;
  longitude: number;
  radiusFeet: number;
};

type GeofenceLocation = {
  label: string;
  latitude: number;
  longitude: number;
  radiusFeet: number;
};

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

const SCHEDULE_STORAGE_KEY = 'apollo-schedule-page-v6';
const ANNOUNCEMENTS_STORAGE_KEY = 'apollo-company-announcements-v1';
const ANNOUNCEMENT_READ_STORAGE_KEY = 'apollo-company-announcements-read-v1';
const TIME_PUNCH_STORAGE_KEY = 'apollo-time-punches-v1';
const TIMECARD_NOTES_STORAGE_KEY = 'apollo-timecard-notes-v1';
const MISSED_MEAL_BREAK_STORAGE_KEY = 'apollo-missed-meal-breaks-v1';
const TIMECARD_CORRECTIONS_STORAGE_KEY = 'apollo-timecard-corrections-v1';
const SUBMITTED_TIMECARDS_STORAGE_KEY = 'apollo-submitted-timecards-v1';
const EDITABLE_TIMECARD_ROWS_STORAGE_KEY = 'apollo-editable-timecard-rows-v1';
const APOLLO_MESSAGES_STORAGE_KEY = 'apollo-messages-v2';
const CURRENT_SUPERVISOR_ID = 'supervisor-001';
const OPEN_ALS_SLOT_ID = '__OPEN_ALS__';
const OPEN_BLS_SLOT_ID = '__OPEN_BLS__';
const SYSTEM_CONFIG_STORAGE_KEY = 'apollo-system-config-v1';
const OPEN_SHIFT_REQUESTS_STORAGE_KEY = 'apollo-open-shift-requests-v1';

const DEFAULT_GEOFENCE_RADIUS_FEET = 500;

const SHIFT_GEOFENCES: Record<string, GeofenceLocation> = {
  'Reedley 1': {
    label: 'Reedley Station',
    latitude: 36.60163763301681,
    longitude: -119.44390972540988,
    radiusFeet: 500,
  },
  'Reedley 2': {
    label: 'Reedley Station',
    latitude: 36.60163763301681,
    longitude: -119.44390972540988,
    radiusFeet: 500,
  },
  Parlier: {
    label: 'Parlier Station',
    latitude: 36.608647190346666,
    longitude: -119.52968530322042,
    radiusFeet: 500,
  },
  'Orange Cove': {
    label: 'Orange Cove Station',
    latitude: 36.62257333716054,
    longitude: -119.32320178090212,
    radiusFeet: 500,
  },
  'General Manager': {
    label: 'Reedley Station',
    latitude: 36.60163763301681,
    longitude: -119.44390972540988,
    radiusFeet: 500,
  },
  'Admin Supervisor': {
    label: 'Reedley Station',
    latitude: 36.60163763301681,
    longitude: -119.44390972540988,
    radiusFeet: 500,
  },
  'Field Supervisor': {
    label: 'Reedley Station',
    latitude: 36.60163763301681,
    longitude: -119.44390972540988,
    radiusFeet: 500,
  },
};

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
    geofences: Object.entries(SHIFT_GEOFENCES).map(([shiftLabel, value]) => ({
      id: shiftLabel.toLowerCase().replaceAll(' ', '-'),
      shiftLabel,
      locationLabel: value.label,
      latitude: value.latitude,
      longitude: value.longitude,
      radiusFeet: value.radiusFeet,
    })),
  };
}
const EMPLOYEE_STORAGE_KEY = 'apollo-employee-profiles-v2';
const DEFAULT_EMPLOYEE_ID = 'emp-001';

const SHIFT_ORDER: ShiftName[] = ['R1', 'R2', 'P', 'OC', 'FIELD_SUP'];

const SHIFT_DISPLAY: Record<ShiftName, string> = {
  R1: 'Reedley 1',
  R2: 'Reedley 2',
  P: 'Parlier',
  OC: 'Orange Cove',
  GM: 'General Manager',
  ADMIN_SUP: 'Admin Supervisor',
  FIELD_SUP: 'Field Supervisor',
};

const EMPTY_CERTIFICATIONS: CertificationRecord = {
  driversLicense: '',
  ambulanceDriversLicense: '',
  ahaBlsCpr: '',
  medicalExaminerCertificate: '',
  annualTbScreen: '',
  californiaParamedicLicense: '',
  ccemsaParamedicLicense: '',
  acls: '',
  pals: '',
  californiaEmtLicense: '',
  ccemsaEmtLicense: '',
};

const CERTIFICATION_LABELS: Record<keyof CertificationRecord, string> = {
  driversLicense: 'Drivers License',
  ambulanceDriversLicense: 'Ambulance Drivers License',
  ahaBlsCpr: 'AHA BLS CPR Card',
  medicalExaminerCertificate: 'Medical Examiners Certificate',
  annualTbScreen: 'Annual TB Screen',
  californiaParamedicLicense: 'California Paramedic License',
  ccemsaParamedicLicense: 'CCEMSA Paramedic License',
  acls: 'ACLS',
  pals: 'PALS',
  californiaEmtLicense: 'California EMT License',
  ccemsaEmtLicense: 'CCEMSA EMT License',
};

function getRequiredCertificationKeys(scope: 'ALS' | 'BLS'): Array<keyof CertificationRecord> {
  const common: Array<keyof CertificationRecord> = [
    'driversLicense',
    'ambulanceDriversLicense',
    'ahaBlsCpr',
    'medicalExaminerCertificate',
    'annualTbScreen',
  ];

  const alsOnly: Array<keyof CertificationRecord> = [
    'californiaParamedicLicense',
    'ccemsaParamedicLicense',
    'acls',
    'pals',
  ];

  const blsOnly: Array<keyof CertificationRecord> = [
    'californiaEmtLicense',
    'ccemsaEmtLicense',
  ];

  return scope === 'ALS' ? [...common, ...alsOnly] : [...common, ...blsOnly];
}

function getCertificationStatus(employee: EmployeeOption | null) {
  if (!employee) {
    return {
      isCompliant: false,
      missingOrExpired: ['Employee profile not loaded'],
      nextExpiring: null as null | { label: string; date: Date },
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const requiredKeys = getRequiredCertificationKeys(employee.scope);
  const missingOrExpired: string[] = [];
  const validExpirations: Array<{ label: string; date: Date }> = [];

  for (const key of requiredKeys) {
    const value = employee.certifications[key];

    if (!value) {
      missingOrExpired.push(CERTIFICATION_LABELS[key]);
      continue;
    }

    const expiration = new Date(`${value}T00:00:00`);
    if (Number.isNaN(expiration.getTime()) || expiration < today) {
      missingOrExpired.push(CERTIFICATION_LABELS[key]);
      continue;
    }

    validExpirations.push({
      label: CERTIFICATION_LABELS[key],
      date: expiration,
    });
  }

  validExpirations.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    isCompliant: missingOrExpired.length === 0,
    missingOrExpired,
    nextExpiring: validExpirations[0] ?? null,
  };
}

function createEmptyEmployeeSlot(): EmployeeSlot {
  return {
    employeeId: '',
    startTime: '06:00',
    endTime: '06:00',
    note: '',
    shiftType: 'REGULAR',
  };
}

function createEmptyShift(showEmployee3 = false): ShiftAssignment {
  return {
    employee1: createEmptyEmployeeSlot(),
    employee2: createEmptyEmployeeSlot(),
    employee3: createEmptyEmployeeSlot(),
    showEmployee3,
    vehicle: '',
    allowExtendedHours: false,
    hiddenFromEmployees: false,
  };
}

function createEmptyDayAssignments(): DayAssignments {
  return {
    R1: createEmptyShift(false),
    R2: createEmptyShift(false),
    P: createEmptyShift(false),
    OC: createEmptyShift(false),
    GM: createEmptyShift(false),
    ADMIN_SUP: createEmptyShift(false),
    FIELD_SUP: createEmptyShift(false),
  };
}

function createEmptyDaySchedule(): DaySchedule {
  return {
    standard: createEmptyDayAssignments(),
    extras: [],
  };
}

function normalizeEmployeeRole(value: string | undefined): EmployeeRole {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'paramedic') return 'Paramedic';
  if (normalized === 'supervisor') return 'Supervisor';
  return 'EMT';
}

function normalizeEmployeeScope(scopeValue: string | undefined, roleValue: string | undefined): 'ALS' | 'BLS' {
  const normalizedScope = (scopeValue ?? '').trim().toUpperCase();
  if (normalizedScope === 'ALS') return 'ALS';
  if (normalizedScope === 'BLS') return 'BLS';
  return normalizeEmployeeRole(roleValue) === 'Paramedic' ? 'ALS' : 'BLS';
}

function normalizeCertificationRecord(value: Partial<CertificationRecord> | undefined): CertificationRecord {
  return {
    driversLicense: value?.driversLicense || '',
    ambulanceDriversLicense: value?.ambulanceDriversLicense || '',
    ahaBlsCpr: value?.ahaBlsCpr || '',
    medicalExaminerCertificate: value?.medicalExaminerCertificate || '',
    annualTbScreen: value?.annualTbScreen || '',
    californiaParamedicLicense: value?.californiaParamedicLicense || '',
    ccemsaParamedicLicense: value?.ccemsaParamedicLicense || '',
    acls: value?.acls || '',
    pals: value?.pals || '',
    californiaEmtLicense: value?.californiaEmtLicense || '',
    ccemsaEmtLicense: value?.ccemsaEmtLicense || '',
  };
}

function buildEmployeeName(profile: StoredEmployeeProfile): string {
  const first = (profile.firstName ?? '').trim();
  const last = (profile.lastName ?? '').trim();
  if (last && first) return `${last}, ${first}`;
  return `${first} ${last}`.trim() || profile.id || 'Unnamed Employee';
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
    role: normalizeEmployeeRole(employee.role ?? undefined),
    scope: normalizeEmployeeScope(employee.scope ?? undefined, employee.role ?? undefined),
    employeeType: (employee.employee_type ?? 'Full Time').trim() || 'Full Time',
    seniorityLabel: (employee.seniority_label ?? 'Seniority Unassigned').trim() || 'Seniority Unassigned',
    certifications: normalizeCertificationRecord(employee.certifications ?? undefined),
    status: (employee.status ?? 'Active').trim() || 'Active',
  };
}

async function loadEmployeesFromSupabase(): Promise<EmployeeOption[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id,email,first_name,last_name,role,scope,employee_type,seniority_label,certifications,status')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SupabaseEmployeeRow[])
    .map((employee) => mapSupabaseEmployee(employee))
    .filter((employee) => employee.id);
}

function normalizeShift(raw: unknown, category: ShiftCategory): ShiftAssignment {
  if (!raw || typeof raw !== 'object') {
    return createEmptyShift(false);
  }

  const maybe = raw as Partial<ShiftAssignment>;
  const shift: ShiftAssignment = {
    employee1: maybe.employee1 ?? createEmptyEmployeeSlot(),
    employee2: category === 'SUPERVISOR' ? createEmptyEmployeeSlot() : (maybe.employee2 ?? createEmptyEmployeeSlot()),
    employee3: category === 'SUPERVISOR' ? createEmptyEmployeeSlot() : (maybe.employee3 ?? createEmptyEmployeeSlot()),
    showEmployee3: category === 'SUPERVISOR' ? false : Boolean(maybe.showEmployee3 || maybe.employee3?.employeeId),
    vehicle: maybe.vehicle ?? '',
    allowExtendedHours: Boolean(maybe.allowExtendedHours),
    hiddenFromEmployees: Boolean((maybe as any).hiddenFromEmployees),
  };

  return shift;
}

function normalizeExtraShift(raw: unknown): ExtraShiftAssignment {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `extra-${Date.now()}`,
      label: 'Extra Shift',
      category: 'UNIT',
      employee1: createEmptyEmployeeSlot(),
      employee2: createEmptyEmployeeSlot(),
      employee3: createEmptyEmployeeSlot(),
      showEmployee3: false,
      vehicle: '',
      allowExtendedHours: false,
      hiddenFromEmployees: false,
    };
  }

  const maybe = raw as Partial<ExtraShiftAssignment>;
  const category: ShiftCategory = maybe.category === 'SUPERVISOR' ? 'SUPERVISOR' : 'UNIT';

  return {
    id: maybe.id ?? `extra-${Date.now()}`,
    label: maybe.label?.trim() || 'Extra Shift',
    category,
    employee1: maybe.employee1 ?? createEmptyEmployeeSlot(),
    employee2: category === 'SUPERVISOR' ? createEmptyEmployeeSlot() : (maybe.employee2 ?? createEmptyEmployeeSlot()),
    employee3: category === 'SUPERVISOR' ? createEmptyEmployeeSlot() : (maybe.employee3 ?? createEmptyEmployeeSlot()),
    showEmployee3: category === 'SUPERVISOR' ? false : Boolean(maybe.showEmployee3 || maybe.employee3?.employeeId),
    vehicle: maybe.vehicle ?? '',
    allowExtendedHours: Boolean(maybe.allowExtendedHours),
    hiddenFromEmployees: Boolean((maybe as any).hiddenFromEmployees),
  };
}

function normalizeDaySchedule(raw: unknown): DaySchedule {
  if (!raw || typeof raw !== 'object') {
    return createEmptyDaySchedule();
  }

  const maybeDay = raw as Partial<DaySchedule> & Partial<DayAssignments>;

  if ('standard' in maybeDay && maybeDay.standard) {
    const standard = maybeDay.standard as Partial<DayAssignments>;
    return {
      standard: {
        R1: normalizeShift(standard.R1, 'UNIT'),
        R2: normalizeShift(standard.R2, 'UNIT'),
        P: normalizeShift(standard.P, 'UNIT'),
        OC: normalizeShift(standard.OC, 'UNIT'),
        GM: normalizeShift(standard.GM, 'SUPERVISOR'),
        ADMIN_SUP: normalizeShift(standard.ADMIN_SUP, 'SUPERVISOR'),
        FIELD_SUP: normalizeShift(standard.FIELD_SUP, 'SUPERVISOR'),
      },
      extras: Array.isArray(maybeDay.extras) ? maybeDay.extras.map((extra) => normalizeExtraShift(extra)) : [],
    };
  }

  return {
    standard: {
      R1: normalizeShift(maybeDay.R1, 'UNIT'),
      R2: normalizeShift(maybeDay.R2, 'UNIT'),
      P: normalizeShift(maybeDay.P, 'UNIT'),
      OC: normalizeShift(maybeDay.OC, 'UNIT'),
      GM: normalizeShift(maybeDay.GM, 'SUPERVISOR'),
      ADMIN_SUP: normalizeShift(maybeDay.ADMIN_SUP, 'SUPERVISOR'),
      FIELD_SUP: normalizeShift(maybeDay.FIELD_SUP, 'SUPERVISOR'),
    },
    extras: [],
  };
}

function normalizeLoadedSchedule(raw: unknown): ScheduleData {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const input = raw as Record<string, unknown>;
  const output: ScheduleData = {};

  for (const [dateKey, value] of Object.entries(input)) {
    output[dateKey] = normalizeDaySchedule(value);
  }

  return output;
}

function getDaySchedule(data: ScheduleData, dateKey: string): DaySchedule {
  return normalizeDaySchedule(data[dateKey]);
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getSundayStart(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
  });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildPayPeriodOptions(baseDate: Date, count = 12): PayPeriodOption[] {
  const year = baseDate.getFullYear();
  const januaryFirst = new Date(year, 0, 1);
  const firstSunday = getSundayStart(addDays(januaryFirst, (7 - januaryFirst.getDay()) % 7));
  const options: PayPeriodOption[] = [];

  for (let index = 0; index < count; index += 1) {
    const start = addDays(firstSunday, index * 14);
    const end = addDays(start, 13);

    options.push({
      key: `${year}-pp-${index + 1}`,
      year,
      number: index + 1,
      start,
      end,
    });
  }

  return options;
}

function getCurrentPayPeriodOption(options: PayPeriodOption[], currentDate: Date): PayPeriodOption {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  return (
    options.find((option) => {
      const start = new Date(option.start);
      const end = new Date(option.end);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return today >= start && today <= end;
    }) ?? options[0]
  );
}

function splitIntoWeeks<T>(items: T[]): [T[], T[]] {
  return [items.slice(0, 7), items.slice(7, 14)];
}

function getAssignedSlots(assignment: ShiftAssignment | ExtraShiftAssignment, category: ShiftCategory): EmployeeSlot[] {
  if (category === 'SUPERVISOR') {
    return assignment.employee1.employeeId ? [assignment.employee1] : [];
  }

  const slots = [assignment.employee1, assignment.employee2];
  if (assignment.showEmployee3 || assignment.employee3.employeeId) {
    slots.push(assignment.employee3);
  }

  return slots.filter((slot) => slot.employeeId);
}

function parseTimeOnDate(date: Date, time: string): Date {
  const [hourText, minuteText] = time.split(':');
  const result = new Date(date);
  result.setHours(Number(hourText || 0), Number(minuteText || 0), 0, 0);
  return result;
}

function getShiftDateTimeRange(date: Date, slot: EmployeeSlot): { start: Date; end: Date } {
  const start = parseTimeOnDate(date, slot.startTime || '06:00');
  let end = parseTimeOnDate(date, slot.endTime || '06:00');

  if (end <= start) {
    end = addDays(end, 1);
  }

  return { start, end };
}

function getDistanceFeet(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusFeet = 20902231;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusFeet * c;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function loadEmployeesFromProfiles(): EmployeeOption[] {
  if (typeof window === 'undefined') {
    return [];
  }

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
        email: (profile.email ?? '').trim().toLowerCase(),
        role: normalizeEmployeeRole(profile.role),
        scope: normalizeEmployeeScope(profile.scope, profile.role),
        employeeType: (profile.employeeType ?? 'Full Time').trim() || 'Full Time',
        seniorityLabel: (profile.seniorityLabel ?? 'Seniority Unassigned').trim() || 'Seniority Unassigned',
        certifications: normalizeCertificationRecord(profile.certifications),
        status: (profile.status ?? 'Active').trim() || 'Active',
      }))
      .filter((employee) => employee.id);
  } catch (error) {
    console.error('Failed to load employee profiles:', error);
    return [];
  }
}

export default function DashboardPage() {
  const [scheduleData, setScheduleData] = useState<ScheduleData>({});
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [announcements, setAnnouncements] = useState<CompanyAnnouncement[]>([]);
  const [apolloMessages, setApolloMessages] = useState<ApolloMessage[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(getDefaultSystemConfig());
  const [openShiftRequests, setOpenShiftRequests] = useState<OpenShiftRequest[]>([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>([]);
  const [timePunches, setTimePunches] = useState<TimePunch[]>([]);
  const [timecardNotes, setTimecardNotes] = useState<Record<string, string>>({});
  const [missedMealBreaks, setMissedMealBreaks] = useState<MissedMealBreak[]>([]);
  const [timecardCorrections, setTimecardCorrections] = useState<TimecardCorrectionRequest[]>([]);
  const [submittedTimecards, setSubmittedTimecards] = useState<SubmittedTimecard[]>([]);
  const [editableTimecardRows, setEditableTimecardRows] = useState<Record<string, EditableTimecardRow>>({});
  const [missedMealDateKey, setMissedMealDateKey] = useState('');
  const [missedMealReason, setMissedMealReason] = useState('');
  const [correctionDateKey, setCorrectionDateKey] = useState('');
  const [correctionShiftLabel, setCorrectionShiftLabel] = useState('');
  const [correctionType, setCorrectionType] = useState<TimecardCorrectionRequest['correctionType']>('ADD_CLOCK_IN');
  const [correctionRequestedDate, setCorrectionRequestedDate] = useState('');
  const [correctionRequestedTime, setCorrectionRequestedTime] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [messageRecipientMode, setMessageRecipientMode] = useState('SUPERVISORS');
  const [messageRecipientEmployeeId, setMessageRecipientEmployeeId] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [timecardStatus, setTimecardStatus] = useState('');
  const [isPunching, setIsPunching] = useState(false);
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [activeTile, setActiveTile] = useState<string | null>(null);
  const [showCertificationUpload, setShowCertificationUpload] = useState(false);
  const [selectedPayPeriodKey, setSelectedPayPeriodKey] = useState('');
  const [mounted, setMounted] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [selectedVacationShift, setSelectedVacationShift] = useState<SelectedVacationShift | null>(null);
  const [vacationReason, setVacationReason] = useState('');
  const [vacationRequestStatus, setVacationRequestStatus] = useState('');

  const payPeriodOptions = useMemo(() => buildPayPeriodOptions(new Date(), 28), []);
  const currentPayPeriod = useMemo(() => getCurrentPayPeriodOption(payPeriodOptions, new Date()), [payPeriodOptions]);

  const currentEmployee = useMemo(() => {
    const normalizedAuthEmail = authEmail.trim().toLowerCase();

    if (!normalizedAuthEmail) {
      return null;
    }

    return employees.find((employee) => employee.email.trim().toLowerCase() === normalizedAuthEmail) ?? null;
  }, [authEmail, employees]);

  const currentEmployeeId = currentEmployee?.id ?? '';

  async function reloadPublishedSchedule() {
    try {
      const { data: schedules, error: scheduleError } = await supabase
        .from('schedules')
        .select('id,date_key')
        .order('date_key', { ascending: true });

      if (scheduleError) {
        throw scheduleError;
      }

      const { data: assignments, error: assignmentError } = await supabase
        .from('schedule_assignments')
        .select('*')
        .order('date_key', { ascending: true })
        .order('shift_key', { ascending: true })
        .order('slot_number', { ascending: true });

      if (assignmentError) {
        throw assignmentError;
      }

      const rebuilt: ScheduleData = {};
      for (const schedule of schedules ?? []) {
        rebuilt[String(schedule.date_key)] = createEmptyDaySchedule();
      }

      for (const row of assignments ?? []) {
        const dateKey = String(row.date_key);
        if (!rebuilt[dateKey]) {
          rebuilt[dateKey] = createEmptyDaySchedule();
        }

        const savedEmployeeId = row.is_open_slot
          ? row.open_slot_scope === 'ALS'
            ? OPEN_ALS_SLOT_ID
            : row.open_slot_scope === 'BLS'
              ? OPEN_BLS_SLOT_ID
              : ''
          : row.employee_id ?? '';

        const slot: EmployeeSlot = {
          employeeId: savedEmployeeId,
          startTime: row.start_time || '06:00',
          endTime: row.end_time || '06:00',
          note: row.note || '',
          shiftType: row.shift_type || 'REGULAR',
        };

        const day = rebuilt[dateKey];
        if (String(row.shift_key).startsWith('EXTRA::')) {
          const [, categoryText, extraId] = String(row.shift_key).split('::');
          const category: ShiftCategory = categoryText === 'SUPERVISOR' ? 'SUPERVISOR' : 'UNIT';
          let extra = day.extras.find((item) => item.id === extraId);

          if (!extra) {
            extra = {
              id: extraId || `extra-${Date.now()}`,
              label: row.shift_label || 'Extra Shift',
              category,
              employee1: createEmptyEmployeeSlot(),
              employee2: createEmptyEmployeeSlot(),
              employee3: createEmptyEmployeeSlot(),
              showEmployee3: false,
              vehicle: row.vehicle || '',
              allowExtendedHours: Boolean(row.allow_extended_hours),
              hiddenFromEmployees: Boolean(row.hidden_from_employees),
            };
            day.extras.push(extra);
          }

          extra.label = row.shift_label || extra.label;
          extra.category = category;
          extra.vehicle = row.vehicle || '';
          extra.allowExtendedHours = Boolean(row.allow_extended_hours);
          if (row.slot_number === 1) extra.employee1 = slot;
          if (row.slot_number === 2) extra.employee2 = slot;
          if (row.slot_number === 3) {
            extra.employee3 = slot;
            extra.showEmployee3 = Boolean(slot.employeeId);
          }
        } else {
          const shiftName = row.shift_key as ShiftName;
          if (!day.standard[shiftName]) continue;
          const shift = day.standard[shiftName];
          shift.vehicle = row.vehicle || '';
          shift.allowExtendedHours = Boolean(row.allow_extended_hours);
          if (row.slot_number === 1) shift.employee1 = slot;
          if (row.slot_number === 2) shift.employee2 = slot;
          if (row.slot_number === 3) {
            shift.employee3 = slot;
            shift.showEmployee3 = Boolean(slot.employeeId);
          }
        }
      }

      setScheduleData(normalizeLoadedSchedule(rebuilt));
    } catch (error) {
      console.error('Failed to load published schedule from Supabase:', error);
    }
  }

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
      loadEmployeesFromSupabase()
        .then((loadedEmployees) => {
          setEmployees(loadedEmployees);
        })
        .catch((error) => {
          console.error('Failed to load employee profiles from Supabase:', error);
          setEmployees(loadEmployeesFromProfiles());
        });

      reloadPublishedSchedule();

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
        .from('announcement_reads')
        .select('announcement_id')
        .eq('employee_id', currentEmployeeId)
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to load announcement read state:', error);
          } else {
            setReadAnnouncementIds((data ?? []).map((row: any) => row.announcement_id));
          }
        });

      supabase
        .from('time_punches')
        .select('*')
        .order('timestamp', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to load time punches:', error);
          } else {
            setTimePunches(
              (data ?? []).map((row: any) => ({
                id: row.id,
                employeeId: row.employee_id,
                type: row.type,
                timestamp: row.timestamp,
                shiftDateKey: row.shift_date_key,
                shiftLabel: row.shift_label,
                locationLabel: row.location_label,
                latitude: row.latitude,
                longitude: row.longitude,
                distanceFeet: row.distance_feet,
                geofenceStatus: row.geofence_status,
              })),
            );
          }
        });

      supabase
        .from('timecard_notes')
        .select('*')
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to load timecard notes:', error);
          } else {
            setTimecardNotes(
              Object.fromEntries(
                (data ?? []).map((row: any) => [
                  `${row.employee_id}-${row.pay_period_key}`,
                  row.note ?? '',
                ]),
              ),
            );
          }
        });

      supabase
        .from('missed_meal_breaks')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to load missed meal breaks:', error);
          } else {
            setMissedMealBreaks(
              (data ?? []).map((row: any) => ({
                id: row.id,
                employeeId: row.employee_id,
                dateKey: row.date_key,
                reason: row.reason,
                createdAt: row.created_at,
              })),
            );
          }
        });

      supabase
        .from('timecard_corrections')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to load timecard corrections:', error);
          } else {
            setTimecardCorrections(
              (data ?? []).map((row: any) => ({
                id: row.id,
                employeeId: row.employee_id,
                payPeriodKey: row.pay_period_key,
                dateKey: row.date_key,
                shiftLabel: row.shift_label,
                correctionType: row.correction_type,
                requestedDate: row.requested_date,
                requestedTime: row.requested_time,
                reason: row.reason,
                createdAt: row.created_at,
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
                payBreakdown: row.pay_breakdown ?? {
                  regularHours: row.total_hours ?? 0,
                  overtimeHours: 0,
                  doubleTimeHours: 0,
                  missedMealPenaltyHours: 0,
                  week1: { regularHours: row.total_hours ?? 0, overtimeHours: 0, doubleTimeHours: 0 },
                  week2: { regularHours: 0, overtimeHours: 0, doubleTimeHours: 0 },
                },
                punches: row.punches ?? [],
                missedMealBreaks: row.missed_meal_breaks ?? [],
                corrections: row.corrections ?? [],
                note: row.note ?? '',
                status: row.status,
              })),
            );
          }
        });

      supabase
        .from('editable_timecard_rows')
        .select('*')
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to load editable timecard rows:', error);
          } else {
            setEditableTimecardRows(
              Object.fromEntries(
                (data ?? []).map((row: any) => [
                  row.id,
                  row.row_data ?? {
                    shiftLabel: '',
                    payType: 'DAILY_OT_DT',
                    clockInDate: '',
                    clockInTime: '',
                    clockOutDate: '',
                    clockOutTime: '',
                  },
                ]),
              ),
            );
          }
        });

      setSelectedPayPeriodKey(currentPayPeriod.key);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setMounted(true);
    }
  }, [currentEmployeeId, currentPayPeriod.key]);



  async function refreshApolloMessages() {
    const { data, error } = await supabase
      .from('apollo_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Apollo message refresh failed:', error);
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
      .channel('dashboard-apollo-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'apollo_messages',
        },
        async () => {
          await refreshApolloMessages();
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

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SCHEDULE_STORAGE_KEY && event.newValue) {
        setScheduleData(normalizeLoadedSchedule(JSON.parse(event.newValue)));
      }

      if (event.key === ANNOUNCEMENTS_STORAGE_KEY && event.newValue) {
        setAnnouncements(JSON.parse(event.newValue));
      }


      if (event.key === SYSTEM_CONFIG_STORAGE_KEY && event.newValue) {
        setSystemConfig({
          ...getDefaultSystemConfig(),
          ...JSON.parse(event.newValue),
        });
      }

    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const weatherScriptId = 'weatherwidget-io-js';

    const initializeWeatherWidget = () => {
      const weatherWindow = window as typeof window & {
        __weatherwidget_init?: () => void;
      };

      if (typeof weatherWindow.__weatherwidget_init === 'function') {
        weatherWindow.__weatherwidget_init();
      }
    };

    const existingScript = document.getElementById(weatherScriptId) as HTMLScriptElement | null;

    if (existingScript) {
      initializeWeatherWidget();
      return;
    }

    const script = document.createElement('script');
    script.id = weatherScriptId;
    script.src = 'https://weatherwidget.io/js/widget.min.js';
    script.async = true;
    script.onload = initializeWeatherWidget;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const loadJotFormScript = (containerId: string, scriptSrc: string) => {
      const container = document.getElementById(containerId);
      if (!container) {
        return;
      }

      container.innerHTML = '';

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = scriptSrc;
      script.async = true;
      container.appendChild(script);
    };

    if (showCertificationUpload) {
      loadJotFormScript('apollo-certification-upload-container', 'https://form.jotform.com/jsform/250562086321047');
    }

    if (activeTile === 'incident-report') {
      loadJotFormScript('apollo-incident-report-container', 'https://form.jotform.com/jsform/240977206656061');
    }
  }, [activeTile, showCertificationUpload]);

  const selectedPayPeriod = useMemo(() => {
    return payPeriodOptions.find((option) => option.key === selectedPayPeriodKey) ?? currentPayPeriod;
  }, [currentPayPeriod, payPeriodOptions, selectedPayPeriodKey]);

  const dates = useMemo(() => {
    return Array.from({ length: 14 }, (_, index) => addDays(selectedPayPeriod.start, index));
  }, [selectedPayPeriod]);

  const [week1Dates, week2Dates] = useMemo(() => splitIntoWeeks(dates), [dates]);

  const certificationStatus = useMemo(() => getCertificationStatus(currentEmployee), [currentEmployee]);
  const isSupervisorUser = currentEmployee?.role === 'Supervisor';

  const activeAnnouncements = useMemo(() => {
    const now = new Date();

    return announcements
      .filter((announcement) => {
        const expiresAt = new Date(announcement.expiresAt);
        return !Number.isNaN(expiresAt.getTime()) && expiresAt >= now;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [announcements]);

  const hasUnreadAnnouncements = useMemo(() => {
    return activeAnnouncements.some((announcement) => !readAnnouncementIds.includes(announcement.id));
  }, [activeAnnouncements, readAnnouncementIds]);

  function markAnnouncementsRead() {
    const activeIds = activeAnnouncements.map((announcement) => announcement.id);
    const updated = Array.from(new Set([...readAnnouncementIds, ...activeIds]));
    setReadAnnouncementIds(updated);

    const rows = activeIds.map((announcementId) => ({
      id: `${currentEmployeeId}-${announcementId}`,
      employee_id: currentEmployeeId,
      announcement_id: announcementId,
      read_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      void supabase
        .from('announcement_reads')
        .upsert(rows, { onConflict: 'id' })
        .then(({ error }) => {
          if (error) {
            console.error('Failed to save announcement read state:', error);
          }
        });
    }
  }

  const currentEmployeeMessages = useMemo(() => {
    return apolloMessages
      .filter((message) => message.senderId === currentEmployeeId || message.recipients.some((recipient) => recipient.employeeId === currentEmployeeId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [apolloMessages]);

  const unreadMessageCount = currentEmployeeMessages.filter(
    (message) => message.senderId !== currentEmployeeId && message.recipients.some((recipient) => recipient.employeeId === currentEmployeeId && !recipient.readAt),
  ).length;

  const conversations = useMemo(() => {
    const grouped = new Map<string, ApolloMessage[]>();

    currentEmployeeMessages.forEach((message) => {
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
          (message) => message.senderId !== currentEmployeeId && message.recipients.some((recipient) => recipient.employeeId === currentEmployeeId && !recipient.readAt),
        ).length,
      }))
      .sort((a, b) => new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime());
  }, [currentEmployeeMessages]);

  const selectedConversation = conversations.find((conversation) => conversation.conversationId === selectedConversationId) ?? conversations[0] ?? null;

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

  function markConversationRead(conversationId: string) {
    const now = new Date().toISOString();
    const updated = apolloMessages.map((message) => {
      if (message.conversationId !== conversationId) return message;
      return {
        ...message,
        recipients: message.recipients.map((recipient) =>
          recipient.employeeId === currentEmployeeId && !recipient.readAt ? { ...recipient, readAt: now } : recipient,
        ),
      };
    });

    saveApolloMessages(updated);
  }

  function markMessagesRead() {
    const now = new Date().toISOString();
    const updated = apolloMessages.map((message) => ({
      ...message,
      recipients: message.recipients.map((recipient) =>
        recipient.employeeId === currentEmployeeId && !recipient.readAt ? { ...recipient, readAt: now } : recipient,
      ),
    }));

    saveApolloMessages(updated);
  }

  function getMessageStatus(message: ApolloMessage): string {
    if (message.senderId !== currentEmployeeId) {
      const mine = message.recipients.find((recipient) => recipient.employeeId === currentEmployeeId);
      return mine?.readAt ? 'Read' : 'Delivered';
    }

    const recipientCount = message.recipients.length;
    const readCount = message.recipients.filter((recipient) => recipient.readAt).length;
    if (recipientCount > 0 && readCount === recipientCount) return 'Read';
    if (message.recipients.some((recipient) => recipient.deliveredAt)) return 'Delivered';
    return 'Sent';
  }

  function getRecipientEmployeesForMode(mode: string): EmployeeOption[] {
    const activeEmployees = employees.filter((employee) => employee.status?.toLowerCase() !== 'removed');
    if (mode === 'SUPERVISORS') {
      return activeEmployees.filter((employee) => employee.role === 'Supervisor');
    }
    if (mode === 'INDIVIDUAL') {
      return activeEmployees.filter((employee) => employee.id === messageRecipientEmployeeId);
    }
    if (mode === 'FULLTIME') return activeEmployees.filter((employee) => employee.employeeType.toLowerCase().includes('full'));
    if (mode === 'PERDIEM') return activeEmployees.filter((employee) => employee.employeeType.toLowerCase().includes('per'));
    if (mode === 'PARAMEDIC') return activeEmployees.filter((employee) => employee.role === 'Paramedic' || employee.scope === 'ALS');
    if (mode === 'EMT') return activeEmployees.filter((employee) => employee.role === 'EMT' || employee.scope === 'BLS');
    return activeEmployees;
  }

  function sendEmployeeMessage() {
    if (!messageSubject.trim() || !messageBody.trim()) {
      window.alert('Enter a subject and message before sending.');
      return;
    }

    const recipients = getRecipientEmployeesForMode(messageRecipientMode).filter((employee) => employee.id !== currentEmployeeId);
    if (recipients.length === 0 && messageRecipientMode !== 'SUPERVISORS') {
      window.alert('No recipients were found for that selection.');
      return;
    }

    const createdAt = new Date().toISOString();
    const finalRecipients =
      recipients.length > 0
        ? recipients
        : [{ id: CURRENT_SUPERVISOR_ID, name: 'Supervisor', email: 'supervisor@sscems.org', role: 'Supervisor' as const, scope: 'ALS' as const, employeeType: 'Supervisor', seniorityLabel: '', certifications: EMPTY_CERTIFICATIONS, status: 'Active' }];

    const message: ApolloMessage = {
      id: `message-${Date.now()}`,
      conversationId: `conversation-${Date.now()}`,
      senderId: currentEmployeeId,
      senderName: currentEmployee?.name ?? 'Employee',
      senderRole: 'EMPLOYEE',
      recipients: finalRecipients.map((employee) => ({
        employeeId: employee.id,
        deliveredAt: createdAt,
        readAt: null,
      })),
      audienceLabel: messageRecipientMode === 'INDIVIDUAL' ? finalRecipients[0]?.name ?? 'Individual' : messageRecipientMode.replace('_', ' '),
      title: messageSubject.trim(),
      body: messageBody.trim(),
      createdAt,
      relatedType: messageRecipientMode === 'SUPERVISORS' ? 'GENERAL' : 'GENERAL',
      priority: 'NORMAL',
    };

    saveApolloMessages([message, ...apolloMessages]);
    setMessageSubject('');
    setMessageBody('');
    setMessageRecipientEmployeeId('');
    setMessageRecipientMode('SUPERVISORS');
    setSelectedConversationId(message.conversationId);
  }

  function sendEmployeeReply() {
    if (!selectedConversation || !replyBody.trim()) {
      return;
    }

    const createdAt = new Date().toISOString();
    const existingParticipantIds = Array.from(
      new Set([
        ...selectedConversation.messages.map((message) => message.senderId),
        ...selectedConversation.messages.flatMap((message) => message.recipients.map((recipient) => recipient.employeeId)),
      ]),
    );

    const recipientIds = existingParticipantIds.filter((id) => id !== currentEmployeeId);
    const reply: ApolloMessage = {
      id: `message-${Date.now()}`,
      conversationId: selectedConversation.conversationId,
      senderId: currentEmployeeId,
      senderName: currentEmployee?.name ?? 'Employee',
      senderRole: 'EMPLOYEE',
      recipients: recipientIds.map((employeeId) => ({
        employeeId,
        deliveredAt: createdAt,
        readAt: null,
      })),
      audienceLabel: selectedConversation.latest.audienceLabel,
      title: selectedConversation.latest.title,
      body: replyBody.trim(),
      createdAt,
      relatedType: selectedConversation.latest.relatedType,
      relatedId: selectedConversation.latest.relatedId,
      priority: selectedConversation.latest.priority,
    };

    saveApolloMessages([reply, ...apolloMessages]);
    setReplyBody('');
    setSelectedConversationId(selectedConversation.conversationId);
  }

  const assignmentsByDate = useMemo(() => {
    const byDate: Record<string, DisplayAssignment[]> = {};

    for (const date of dates) {
      const dateKey = toDateKey(date);
      const day = getDaySchedule(scheduleData, dateKey);

      const standardAssignments: DisplayAssignment[] = SHIFT_ORDER.map((shiftName) => ({
        key: `standard-${shiftName}`,
        label: SHIFT_DISPLAY[shiftName],
        slots: getAssignedSlots(day.standard[shiftName], shiftName === 'ADMIN_SUP' || shiftName === 'FIELD_SUP' ? 'SUPERVISOR' : 'UNIT'),
        hiddenFromEmployees: Boolean(day.standard[shiftName].hiddenFromEmployees),
      }));

      const extraAssignments: DisplayAssignment[] = day.extras.map((extra) => ({
        key: `extra-${extra.id}`,
        label: extra.label,
        slots: getAssignedSlots(extra, extra.category),
        hiddenFromEmployees: Boolean(extra.hiddenFromEmployees),
      }));

      byDate[dateKey] = [...standardAssignments, ...extraAssignments].filter((assignment) => {
        if (assignment.hiddenFromEmployees) {
          return false;
        }

        if (showFullSchedule) {
          return assignment.slots.length > 0 || getOpenSlotCount(assignment) > 0;
        }
        return assignment.slots.some((slot) => slot.employeeId === currentEmployeeId);
      });
    }

    return byDate;
  }, [dates, scheduleData, showFullSchedule]);

  const myShiftCount = useMemo(() => {
    return Object.values(assignmentsByDate).reduce((total, dayAssignments) => total + dayAssignments.length, 0);
  }, [assignmentsByDate]);

  const nextMyShift = useMemo(() => {
    for (const date of dates) {
      const dayAssignments = assignmentsByDate[toDateKey(date)] ?? [];

      for (const assignment of dayAssignments) {
        const slot = assignment.slots.find((item) => item.employeeId === currentEmployeeId);
        if (slot) {
          return {
            date,
            label: assignment.label,
            startTime: slot.startTime,
          };
        }
      }
    }

    return null;
  }, [assignmentsByDate, dates, systemConfig.geofences]);

  const activeShift = useMemo((): ActiveShiftInfo | null => {
    const now = new Date();
    const earlyWindowMinutes = 60;
    const lateWindowMinutes = 60;

    for (const date of dates) {
      const dateKey = toDateKey(date);
      const dayAssignments = assignmentsByDate[dateKey] ?? [];

      for (const assignment of dayAssignments) {
        const slot = assignment.slots.find((item) => item.employeeId === currentEmployeeId);
        if (!slot) {
          continue;
        }

        const { start, end } = getShiftDateTimeRange(date, slot);
        const earliestClockIn = new Date(start.getTime() - earlyWindowMinutes * 60 * 1000);
        const latestClockOut = new Date(end.getTime() + lateWindowMinutes * 60 * 1000);

        if (now >= earliestClockIn && now <= latestClockOut) {
          const configuredGeofence = systemConfig.geofences.find((item) => item.shiftLabel === assignment.label);
          const fallbackGeofence = SHIFT_GEOFENCES[assignment.label] ?? SHIFT_GEOFENCES['Reedley 1'];

          return {
            date,
            dateKey,
            label: assignment.label,
            slot,
            locationLabel: configuredGeofence?.locationLabel ?? fallbackGeofence.label,
            latitude: configuredGeofence?.latitude ?? fallbackGeofence.latitude,
            longitude: configuredGeofence?.longitude ?? fallbackGeofence.longitude,
            radiusFeet: configuredGeofence?.radiusFeet ?? fallbackGeofence.radiusFeet,
          };
        }
      }
    }

    return null;
  }, [assignmentsByDate, dates]);

  const currentEmployeePunches = useMemo(() => {
    return timePunches
      .filter((punch) => punch.employeeId === currentEmployeeId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [timePunches]);

  const payPeriodPunches = useMemo(() => {
    const start = new Date(selectedPayPeriod.start);
    const end = new Date(selectedPayPeriod.end);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return currentEmployeePunches.filter((punch) => {
      const timestamp = new Date(punch.timestamp);
      return timestamp >= start && timestamp <= end;
    });
  }, [currentEmployeePunches, selectedPayPeriod]);

  const lastPunch = currentEmployeePunches[0] ?? null;
  const isClockedIn = lastPunch?.type === 'CLOCK_IN';

  async function saveTimePunches(nextPunches: TimePunch[]) {
    setTimePunches(nextPunches);

    const payload = nextPunches.map((punch) => ({
      id: punch.id,
      employee_id: punch.employeeId,
      type: punch.type,
      timestamp: punch.timestamp,
      shift_date_key: punch.shiftDateKey,
      shift_label: punch.shiftLabel,
      location_label: punch.locationLabel,
      latitude: punch.latitude,
      longitude: punch.longitude,
      distance_feet: punch.distanceFeet,
      geofence_status: punch.geofenceStatus,
    }));

    const { error } = await supabase
      .from('time_punches')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Failed to save time punches:', error);
      window.alert(`Time punch save failed: ${error.message}`);
    }
  }

  function getTimecardNoteKey(): string {
    return `${currentEmployeeId}-${selectedPayPeriod.key}`;
  }

  async function saveTimecardNote(value: string) {
    const noteKey = getTimecardNoteKey();
    const updated = {
      ...timecardNotes,
      [noteKey]: value,
    };

    setTimecardNotes(updated);

    const { error } = await supabase
      .from('timecard_notes')
      .upsert(
        {
          id: noteKey,
          employee_id: currentEmployeeId,
          pay_period_key: selectedPayPeriod.key,
          note: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

    if (error) {
      console.error('Failed to save timecard note:', error);
      window.alert(`Timecard note save failed: ${error.message}`);
    }
  }

  async function saveMissedMealBreaks(nextBreaks: MissedMealBreak[]) {
    setMissedMealBreaks(nextBreaks);

    const payload = nextBreaks.map((mealBreak) => ({
      id: mealBreak.id,
      employee_id: mealBreak.employeeId,
      date_key: mealBreak.dateKey,
      reason: mealBreak.reason,
      created_at: mealBreak.createdAt,
    }));

    const { error } = await supabase
      .from('missed_meal_breaks')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Failed to save missed meal breaks:', error);
      window.alert(`Missed meal break save failed: ${error.message}`);
    }
  }

  function addMissedMealBreak() {
    if (!missedMealDateKey || !missedMealReason.trim()) {
      setTimecardStatus('Select a date and enter a reason before submitting a missed meal break.');
      return;
    }

    const newBreak: MissedMealBreak = {
      id: `missed-meal-${Date.now()}`,
      employeeId: currentEmployeeId,
      dateKey: missedMealDateKey,
      reason: missedMealReason.trim(),
      createdAt: new Date().toISOString(),
    };

    saveMissedMealBreaks([newBreak, ...missedMealBreaks]);
    setMissedMealDateKey('');
    setMissedMealReason('');
    setTimecardStatus('Missed meal break declaration added to this timecard.');
  }

  function removeMissedMealBreak(id: string) {
    saveMissedMealBreaks(missedMealBreaks.filter((item) => item.id !== id));
  }

  function getPunchPairForShift(dateKey: string, shiftLabel: string) {
    const punches = payPeriodPunches
      .filter((punch) => punch.shiftDateKey === dateKey && punch.shiftLabel === shiftLabel)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const clockIn = punches.find((punch) => punch.type === 'CLOCK_IN') ?? null;
    const clockOut = [...punches].reverse().find((punch) => punch.type === 'CLOCK_OUT') ?? null;

    return { clockIn, clockOut };
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

  function getHoursNumberBetween(clockIn: TimePunch | null, clockOut: TimePunch | null): number {
    if (!clockIn || !clockOut) {
      return 0;
    }

    const start = new Date(clockIn.timestamp);
    const end = new Date(clockOut.timestamp);
    return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
  }

  const payPeriodMissedMealBreaks = missedMealBreaks.filter(
    (item) => item.employeeId === currentEmployeeId && dates.some((date) => toDateKey(date) === item.dateKey),
  );

  const payPeriodCorrections = timecardCorrections.filter(
    (item) => item.employeeId === currentEmployeeId && item.payPeriodKey === selectedPayPeriod.key,
  );

  const submittedTimecard = submittedTimecards.find(
    (item) =>
      item.employeeId === currentEmployeeId &&
      item.payPeriodKey === selectedPayPeriod.key &&
      item.status !== 'RETURNED',
  ) ?? null;

  const returnedTimecard = submittedTimecards.find(
    (item) =>
      item.employeeId === currentEmployeeId &&
      item.payPeriodKey === selectedPayPeriod.key &&
      item.status === 'RETURNED',
  ) ?? null;

  function getEditableRowKey(dateKey: string): string {
    return `${currentEmployeeId}-${selectedPayPeriod.key}-${dateKey}`;
  }

  function getIsoDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getDefaultPayType(
    shiftLabel: string,
    hours: number,
    shiftType?: string,
  ): EditableTimecardRow['payType'] {

    if (shiftType === 'SICK') {
      return 'SICK_TIME';
    }

    if (shiftType === 'VACATION') {
      return 'VACATION';
    }

    if (shiftType === 'LEAVE') {
      return 'VACATION';
    }

    if (shiftType === 'TRAINING') {
      return 'DAILY_OT_DT';
    }

    const normalized = shiftLabel.toLowerCase();

    if (normalized.includes('jury') || normalized.includes('civic')) {
      return 'JURY_DUTY';
    }

    const defaultTwentyFourHourShifts = ['reedley 1', 'reedley 2', 'parlier', 'orange cove', 'field supervisor'];

    if (defaultTwentyFourHourShifts.includes(normalized)) {
      return 'TWENTY_FOUR_HOUR';
    }

    return hours >= 23 ? 'TWENTY_FOUR_HOUR' : 'DAILY_OT_DT';
  }

  function getEditableRowForDate(date: Date): EditableTimecardRow {
    const dateKey = toDateKey(date);
    const rowKey = getEditableRowKey(dateKey);
    const saved = editableTimecardRows[rowKey];

    const hasManualData =
      saved &&
      (
        saved.shiftLabel ||
        saved.clockInDate ||
        saved.clockInTime ||
        saved.clockOutDate ||
        saved.clockOutTime
      );

    if (hasManualData) {
      const assignment = getAssignedShiftForDate(date);

      return {
        ...saved,
        payType: getDefaultPayType(
          assignment?.label ?? saved.shiftLabel,
          getEditableRowHours(saved),
          assignment?.slots.find(
            (slot) => slot.employeeId === currentEmployeeId,
          )?.shiftType,
        ),
      };
    }

    const assignment = getAssignedShiftForDate(date);
    const punchPair = assignment ? getPunchPairForShift(dateKey, assignment.label) : { clockIn: null, clockOut: null };
    const clockInDate = punchPair.clockIn ? new Date(punchPair.clockIn.timestamp) : null;
    const clockOutDate = punchPair.clockOut ? new Date(punchPair.clockOut.timestamp) : null;

    const inferredHours = getHoursNumberBetween(punchPair.clockIn, punchPair.clockOut);

    return {
      shiftLabel: assignment?.label ?? '',
      payType: getDefaultPayType(
        assignment?.label ?? '',
        inferredHours,
        assignment?.slots.find(
          (slot) => slot.employeeId === currentEmployeeId,
        )?.shiftType,
      ),
      clockInDate: clockInDate ? getIsoDateInputValue(clockInDate) : '',
      clockInTime: clockInDate ? `${clockInDate.getHours()}`.padStart(2, '0') + ':' + `${clockInDate.getMinutes()}`.padStart(2, '0') : '',
      clockOutDate: clockOutDate ? getIsoDateInputValue(clockOutDate) : '',
      clockOutTime: clockOutDate ? `${clockOutDate.getHours()}`.padStart(2, '0') + ':' + `${clockOutDate.getMinutes()}`.padStart(2, '0') : '',
    };
  }

  function updateEditableRow(date: Date, partial: Partial<EditableTimecardRow>) {
    const dateKey = toDateKey(date);
    const rowKey = getEditableRowKey(dateKey);
    const current = getEditableRowForDate(date);

    const updatedRows = {
      ...editableTimecardRows,
      [rowKey]: {
        ...current,
        ...partial,
      },
    };

    setEditableTimecardRows(updatedRows);

    void supabase
      .from('editable_timecard_rows')
      .upsert(
        {
          id: rowKey,
          employee_id: currentEmployeeId,
          pay_period_key: selectedPayPeriod.key,
          date_key: dateKey,
          row_data: updatedRows[rowKey],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      .then(({ error }) => {
        if (error) {
          console.error('Failed to save editable timecard row:', error);
          window.alert(`Editable timecard row save failed: ${error.message}`);
        }
      });
  }

  function clearEditableRow(date: Date) {
    const confirmed = window.confirm('Clear this entire shift line? This will remove the shift, shift type, clock-in, clock-out, and calculated hours for this row.');
    if (!confirmed) {
      return;
    }

    const dateKey = toDateKey(date);
    const rowKey = getEditableRowKey(dateKey);
    const clearedRow: EditableTimecardRow = {
      shiftLabel: '',
      payType: 'DAILY_OT_DT',
      clockInDate: '',
      clockInTime: '',
      clockOutDate: '',
      clockOutTime: '',
    };

    const updatedRows: Record<string, EditableTimecardRow> = {
      ...editableTimecardRows,
      [rowKey]: clearedRow,
    };

    setEditableTimecardRows(updatedRows);

    void supabase
      .from('editable_timecard_rows')
      .upsert(
        {
          id: rowKey,
          employee_id: currentEmployeeId,
          pay_period_key: selectedPayPeriod.key,
          date_key: dateKey,
          row_data: clearedRow,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      .then(({ error }) => {
        if (error) {
          console.error('Failed to clear editable timecard row:', error);
          window.alert(`Editable timecard row clear failed: ${error.message}`);
        }
      });
  }

  function getEditableRowHours(row: EditableTimecardRow): number {
    if (!row.clockInDate || !row.clockInTime || !row.clockOutDate || !row.clockOutTime) {
      return 0;
    }

    const start = new Date(`${row.clockInDate}T${row.clockInTime}:00`);
    const end = new Date(`${row.clockOutDate}T${row.clockOutTime}:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return 0;
    }

    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  function isSpecialRegularOnlyPayType(payType: EditableTimecardRow['payType']): boolean {
    return payType === 'SICK_TIME' || payType === 'VACATION' || payType === 'JURY_DUTY';
  }

  function usesDailyOtDoubleTimeRule(row: EditableTimecardRow): boolean {
    return row.payType === 'DAILY_OT_DT';
  }

  function addToWeekBreakdown(
    current: PayBreakdown['week1'],
    values: { regularHours?: number; overtimeHours?: number; doubleTimeHours?: number },
  ): PayBreakdown['week1'] {
    return {
      regularHours: current.regularHours + (values.regularHours ?? 0),
      overtimeHours: current.overtimeHours + (values.overtimeHours ?? 0),
      doubleTimeHours: current.doubleTimeHours + (values.doubleTimeHours ?? 0),
    };
  }

  function calculateTimecardPayBreakdown(): PayBreakdown {
    let week1 = { regularHours: 0, overtimeHours: 0, doubleTimeHours: 0 };
    let week2 = { regularHours: 0, overtimeHours: 0, doubleTimeHours: 0 };

    const weeklyOtTrackedHours = [0, 0];

    dates.forEach((date, index) => {
      const row = getEditableRowForDate(date);
      const hours = getEditableRowHours(row);

      if (!hours || !row.shiftLabel) {
        return;
      }

      const weekIndex = index < 7 ? 0 : 1;
      const targetWeek = weekIndex === 0 ? week1 : week2;
      let nextWeek = targetWeek;

      if (isSpecialRegularOnlyPayType(row.payType)) {
        // Sick, vacation, and jury/civic duty are regular pay only and do not accrue OT/DT.
        nextWeek = addToWeekBreakdown(targetWeek, { regularHours: hours });
      } else if (usesDailyOtDoubleTimeRule(row)) {
        // Non 24-Shift rows still respect the weekly 40-hour regular cap.
        // Anything over 12 hours in this row is double time first.
        const doubleTimeHours = Math.max(0, hours - 12);
        const nonDoubleTimeHours = Math.max(0, hours - doubleTimeHours);
        const dailyOvertimeFloor = Math.max(0, Math.min(nonDoubleTimeHours, 12) - 8);
        const weeklyRegularRemaining = Math.max(0, 40 - weeklyOtTrackedHours[weekIndex]);
        const regularHours = Math.min(nonDoubleTimeHours - dailyOvertimeFloor, weeklyRegularRemaining);
        const overtimeHours = Math.max(0, nonDoubleTimeHours - regularHours);

        weeklyOtTrackedHours[weekIndex] += nonDoubleTimeHours;
        nextWeek = addToWeekBreakdown(targetWeek, { regularHours, overtimeHours, doubleTimeHours });
      } else {
        // 24-Hour Shift rows use weekly OT after 40 hours.
        const hoursBeforeThisShift = weeklyOtTrackedHours[weekIndex];
        const regularRemainingThisWeek = Math.max(0, 40 - hoursBeforeThisShift);
        const regularHours = Math.min(hours, regularRemainingThisWeek);
        const overtimeHours = Math.max(0, hours - regularHours);

        weeklyOtTrackedHours[weekIndex] += hours;
        nextWeek = addToWeekBreakdown(targetWeek, { regularHours, overtimeHours });
      }

      if (weekIndex === 0) {
        week1 = nextWeek;
      } else {
        week2 = nextWeek;
      }
    });

    const missedMealPenaltyHours = payPeriodMissedMealBreaks.length;

    return {
      regularHours: week1.regularHours + week2.regularHours,
      overtimeHours: week1.overtimeHours + week2.overtimeHours,
      doubleTimeHours: week1.doubleTimeHours + week2.doubleTimeHours,
      missedMealPenaltyHours,
      week1,
      week2,
    };
  }

  function getTimecardTotalHours(): number {
    return dates.reduce((total, date) => {
      const row = getEditableRowForDate(date);
      return total + getEditableRowHours(row);
    }, 0);
  }

  function getEditableTimecardPunches(): TimePunch[] {
    const punches: TimePunch[] = [];

    dates.forEach((date) => {
      const dateKey = toDateKey(date);
      const row = getEditableRowForDate(date);

      if (!row.shiftLabel) {
        return;
      }

      if (row.clockInDate && row.clockInTime) {
        punches.push({
          id: `editable-clock-in-${dateKey}`,
          employeeId: currentEmployeeId,
          type: 'CLOCK_IN',
          timestamp: new Date(`${row.clockInDate}T${row.clockInTime}:00`).toISOString(),
          shiftDateKey: dateKey,
          shiftLabel: row.shiftLabel,
          locationLabel: 'Employee edited timecard',
          latitude: null,
          longitude: null,
          distanceFeet: null,
          geofenceStatus: 'LOCATION_UNAVAILABLE',
        });
      }

      if (row.clockOutDate && row.clockOutTime) {
        punches.push({
          id: `editable-clock-out-${dateKey}`,
          employeeId: currentEmployeeId,
          type: 'CLOCK_OUT',
          timestamp: new Date(`${row.clockOutDate}T${row.clockOutTime}:00`).toISOString(),
          shiftDateKey: dateKey,
          shiftLabel: row.shiftLabel,
          locationLabel: 'Employee edited timecard',
          latitude: null,
          longitude: null,
          distanceFeet: null,
          geofenceStatus: 'LOCATION_UNAVAILABLE',
        });
      }
    });

    return punches;
  }

  function getTimecardTotalHoursFromPunchesLegacy(): number {
    return dates.reduce((total, date) => {
      const dateKey = toDateKey(date);
      const assignment = getAssignedShiftForDate(date);
      if (!assignment) {
        return total;
      }

      const pair = getPunchPairForShift(dateKey, assignment.label);
      return total + getHoursNumberBetween(pair.clockIn, pair.clockOut);
    }, 0);
  }

  async function saveTimecardCorrections(nextCorrections: TimecardCorrectionRequest[]) {
    setTimecardCorrections(nextCorrections);

    const payload = nextCorrections.map((correction) => ({
      id: correction.id,
      employee_id: correction.employeeId,
      pay_period_key: correction.payPeriodKey,
      date_key: correction.dateKey,
      shift_label: correction.shiftLabel,
      correction_type: correction.correctionType,
      requested_date: correction.requestedDate,
      requested_time: correction.requestedTime,
      reason: correction.reason,
      created_at: correction.createdAt,
    }));

    const { error } = await supabase
      .from('timecard_corrections')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Failed to save timecard corrections:', error);
      window.alert(`Timecard correction save failed: ${error.message}`);
    }
  }

  function addTimecardCorrection() {
    if (!correctionDateKey || !correctionShiftLabel || !correctionRequestedDate || !correctionRequestedTime || !correctionReason.trim()) {
      setTimecardStatus('Complete all correction fields before adding a correction request.');
      return;
    }

    const correction: TimecardCorrectionRequest = {
      id: `correction-${Date.now()}`,
      employeeId: currentEmployeeId,
      payPeriodKey: selectedPayPeriod.key,
      dateKey: correctionDateKey,
      shiftLabel: correctionShiftLabel,
      correctionType,
      requestedDate: correctionRequestedDate,
      requestedTime: correctionRequestedTime,
      reason: correctionReason.trim(),
      createdAt: new Date().toISOString(),
    };

    saveTimecardCorrections([correction, ...timecardCorrections]);
    setCorrectionDateKey('');
    setCorrectionShiftLabel('');
    setCorrectionType('ADD_CLOCK_IN');
    setCorrectionRequestedDate('');
    setCorrectionRequestedTime('');
    setCorrectionReason('');
    setTimecardStatus('Timecard correction request added.');
  }

  function removeTimecardCorrection(id: string) {
    saveTimecardCorrections(timecardCorrections.filter((item) => item.id !== id));
  }

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

  function submitTimecardForReview() {
    if (submittedTimecard && !returnedTimecard) {
      setTimecardStatus('This timecard has already been submitted for supervisor review.');
      return;
    }

    const confirmed = window.confirm(
      'I certify that this timecard is true and accurate. I understand that falsification may result in disciplinary action, up to and including termination. Submit this timecard for supervisor review?',
    );

    if (!confirmed) {
      return;
    }

    const timecard: SubmittedTimecard = {
      id: `timecard-${currentEmployeeId}-${selectedPayPeriod.key}-${Date.now()}`,
      employeeId: currentEmployeeId,
      employeeName: currentEmployee?.name ?? 'Employee profile not linked',
      payPeriodKey: selectedPayPeriod.key,
      payPeriodStart: selectedPayPeriod.start.toISOString(),
      payPeriodEnd: selectedPayPeriod.end.toISOString(),
      submittedAt: new Date().toISOString(),
      totalHours: getTimecardTotalHours(),
      payBreakdown: calculateTimecardPayBreakdown(),
      punches: getEditableTimecardPunches(),
      missedMealBreaks: payPeriodMissedMealBreaks,
      corrections: payPeriodCorrections,
      note: timecardNotes[getTimecardNoteKey()] ?? '',
      status: 'PENDING_SUPERVISOR_REVIEW',
    };

    const returnedForThisPeriod = submittedTimecards.find(
      (item) =>
        item.employeeId === currentEmployeeId &&
        item.payPeriodKey === selectedPayPeriod.key &&
        item.status === 'RETURNED',
    );

    saveSubmittedTimecards([timecard, ...submittedTimecards.filter((item) => item.id !== returnedForThisPeriod?.id)]);
    setTimecardStatus('Timecard submitted for supervisor review.');
  }

  function getCorrectionTypeLabel(type: TimecardCorrectionRequest['correctionType']): string {
    const labels: Record<TimecardCorrectionRequest['correctionType'], string> = {
      ADD_CLOCK_IN: 'Add Clock In',
      ADD_CLOCK_OUT: 'Add Clock Out',
      CORRECT_CLOCK_IN: 'Correct Clock In',
      CORRECT_CLOCK_OUT: 'Correct Clock Out',
      REMOVE_PUNCH: 'Remove Punch',
    };

    return labels[type];
  }

  function getAssignedShiftForDate(date: Date) {
    const dateKey = toDateKey(date);
    const dayAssignments = assignmentsByDate[dateKey] ?? [];

    return dayAssignments.find((assignment) =>
      assignment.slots.some((slot) => slot.employeeId === currentEmployeeId),
    ) ?? null;
  }

  function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not available in this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      });
    });
  }

  async function handlePunch(type: 'CLOCK_IN' | 'CLOCK_OUT') {
    if (!activeShift) {
      setTimecardStatus('No active assigned shift was found for the current time window.');
      return;
    }

    setIsPunching(true);
    setTimecardStatus('Checking location...');

    try {
      const position = await getCurrentPosition();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const distanceFeet = getDistanceFeet(latitude, longitude, activeShift.latitude, activeShift.longitude);
      const approved = distanceFeet <= activeShift.radiusFeet;

      const punch: TimePunch = {
        id: `punch-${Date.now()}`,
        employeeId: currentEmployeeId,
        type,
        timestamp: new Date().toISOString(),
        shiftDateKey: activeShift.dateKey,
        shiftLabel: activeShift.label,
        locationLabel: activeShift.locationLabel,
        latitude,
        longitude,
        distanceFeet,
        geofenceStatus: approved ? 'APPROVED' : 'OUTSIDE_GEOFENCE',
      };

      if (!approved) {
        setTimecardStatus(
          `Punch recorded as outside geofence. Distance: ${Math.round(distanceFeet)} ft from ${activeShift.locationLabel}.`,
        );
      } else {
        setTimecardStatus(`${type === 'CLOCK_IN' ? 'Clock in' : 'Clock out'} recorded successfully.`);
      }

      saveTimePunches([punch, ...timePunches]);
    } catch (error) {
      const punch: TimePunch = {
        id: `punch-${Date.now()}`,
        employeeId: currentEmployeeId,
        type,
        timestamp: new Date().toISOString(),
        shiftDateKey: activeShift.dateKey,
        shiftLabel: activeShift.label,
        locationLabel: activeShift.locationLabel,
        latitude: null,
        longitude: null,
        distanceFeet: null,
        geofenceStatus: 'LOCATION_UNAVAILABLE',
      };

      saveTimePunches([punch, ...timePunches]);
      setTimecardStatus('Location was unavailable. Punch was recorded for supervisor review.');
    } finally {
      setIsPunching(false);
    }
  }

  function isOpenShiftSlot(employeeId: string): boolean {
    return employeeId === OPEN_ALS_SLOT_ID || employeeId === OPEN_BLS_SLOT_ID;
  }

  function getEmployeeName(employeeId: string): string {
    if (employeeId === OPEN_ALS_SLOT_ID) {
      return 'Open ALS';
    }

    if (employeeId === OPEN_BLS_SLOT_ID) {
      return 'Open BLS';
    }

    return employees.find((employee) => employee.id === employeeId)?.name ?? 'Unassigned';
  }

  function getOpenSlotColorClasses(employeeId: string): string {
    if (employeeId === OPEN_ALS_SLOT_ID) {
      return 'border-blue-200 bg-blue-50 text-blue-800';
    }

    if (employeeId === OPEN_BLS_SLOT_ID) {
      return 'border-red-200 bg-red-50 text-red-800';
    }

    return '';
  }

  function toggleTile(tileId: string) {
    setActiveTile((current) => (current === tileId ? null : tileId));
  }

  function renderTile(
    id: string,
    title: string,
    description: string,
    children: React.ReactNode,
    urgent = false,
  ) {
    const isOpen = activeTile === id;

    return (
      <div className={`rounded-2xl border bg-white shadow-sm ${urgent ? 'border-red-200' : 'border-slate-200'}`}>
        <button
          type="button"
          onClick={() => toggleTile(id)}
          className={`flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left transition ${
            urgent ? 'bg-red-50 hover:bg-red-100' : 'bg-white hover:bg-slate-50'
          }`}
        >
          <div>
            <div className={`text-base font-bold ${urgent ? 'text-red-800' : 'text-slate-900'}`}>{title}</div>
            <div className={`mt-1 text-sm ${urgent ? 'text-red-700' : 'text-slate-600'}`}>{description}</div>
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

  async function saveOpenShiftRequests(nextRequests: OpenShiftRequest[]) {
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

    const { error } = await supabase
      .from('open_shift_requests')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('Failed to save open shift request:', error);
      window.alert('Failed to save open shift request.');
    }
  }

  function getMaxSlotsForAssignment(assignment: DisplayAssignment): number {
    if (assignment.key.includes('ADMIN_SUP') || assignment.key.includes('FIELD_SUP')) {
      return 1;
    }

    return 2;
  }

  function isFutureOrToday(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compare = new Date(date);
    compare.setHours(0, 0, 0, 0);
    return compare >= today;
  }

  function getOpenSlotCount(assignment: DisplayAssignment): number {
    const explicitOpenSlots = assignment.slots.filter((slot) => isOpenShiftSlot(slot.employeeId)).length;
    const emptyCapacity = Math.max(0, getMaxSlotsForAssignment(assignment) - assignment.slots.filter((slot) => !isOpenShiftSlot(slot.employeeId)).length - explicitOpenSlots);
    return explicitOpenSlots + emptyCapacity;
  }

  function hasCurrentEmployeeRequestedShift(dateKey: string, shiftKey: string): boolean {
    return openShiftRequests.some(
      (request) =>
        request.employeeId === currentEmployeeId &&
        request.dateKey === dateKey &&
        request.shiftKey === shiftKey &&
        request.status === 'PENDING',
    );
  }

  async function requestOpenShift(date: Date, assignment: DisplayAssignment) {
    const dateKey = toDateKey(date);

    if (!currentEmployee) {
      window.alert('Employee profile was not found.');
      return;
    }

    if (assignment.slots.some((slot) => slot.employeeId === currentEmployeeId)) {
      window.alert('You are already assigned to this shift.');
      return;
    }

    if (getOpenSlotCount(assignment) <= 0) {
      window.alert('This shift does not currently have an open slot.');
      return;
    }

    if (hasCurrentEmployeeRequestedShift(dateKey, assignment.key)) {
      window.alert('You already have a pending request for this shift.');
      return;
    }

    const confirmed = window.confirm(`Request ${assignment.label} on ${formatShortDate(date)}?`);
    if (!confirmed) {
      return;
    }

    const request: OpenShiftRequest = {
      id: `open-shift-${Date.now()}`,
      employeeId: currentEmployeeId,
      employeeName: currentEmployee.name,
      dateKey,
      shiftKey: assignment.key,
      shiftLabel: assignment.label,
      payPeriodKey: selectedPayPeriod.key,
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
    };

    await saveOpenShiftRequests([request, ...openShiftRequests]);
  }

  async function submitVacationRequest() {
    if (!currentEmployee || !selectedVacationShift) {
      return;
    }

    const request: VacationRequest = {
      id: `vacation-${currentEmployee.id}-${selectedVacationShift.dateKey}-${Date.now()}`,
      employee_id: currentEmployee.id,
      employee_name: currentEmployee.name,
      date_key: selectedVacationShift.dateKey,
      shift_label: selectedVacationShift.shiftLabel,
      start_time: selectedVacationShift.startTime,
      end_time: selectedVacationShift.endTime,
      reason: vacationReason.trim(),
      status: 'PENDING',
      supervisor_note: null,
      requested_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('vacation_requests').insert(request);
    if (error) {
      console.error('Failed to submit vacation request:', error);
      setVacationRequestStatus('Vacation request could not be submitted. Please try again.');
      return;
    }

    setVacationRequestStatus('Vacation request submitted to supervisors.');
    setVacationReason('');
    setSelectedVacationShift(null);
  }

  function renderScheduleWeek(weekLabel: string, weekDates: Date[]) {
    return (
      <div key={weekLabel} className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">{weekLabel}</div>
          <div className="mt-1 text-xs text-slate-500">
            {formatShortDate(weekDates[0])} to {formatShortDate(weekDates[weekDates.length - 1])}
          </div>
        </div>

        <div className="max-h-[40vh] overflow-auto rounded-b-2xl">
          <div className="grid min-w-[1400px] grid-cols-7">
            {weekDates.map((date) => {
              const dateKey = toDateKey(date);
              const dayAssignments = assignmentsByDate[dateKey] ?? [];

              return (
                <div key={`${weekLabel}-${dateKey}`} className="border-r border-slate-200 last:border-r-0">
                  <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">{formatDayLabel(date)}</div>
                    <div className="mt-1 text-xs text-slate-500">{dateKey}</div>
                  </div>

                  <div className="space-y-3 p-3">
                    {dayAssignments.length === 0 ? (
                      <div className="min-h-[120px] rounded-xl border border-dashed border-slate-200 bg-slate-50" />
                    ) : (
                      dayAssignments.map((assignment) => (
                        <div
                          key={`${weekLabel}-${dateKey}-${assignment.key}`}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold text-slate-900">{assignment.label}</div>
                              {getOpenSlotCount(assignment) > 0 && (
                                <div className="mt-1 text-xs font-semibold text-emerald-700">
                                  {getOpenSlotCount(assignment)} open slot{getOpenSlotCount(assignment) === 1 ? '' : 's'}
                                </div>
                              )}
                            </div>

                            {showFullSchedule &&
                              isFutureOrToday(date) &&
                              getOpenSlotCount(assignment) > 0 &&
                              !assignment.hiddenFromEmployees &&
                              !assignment.slots.some((slot) => slot.employeeId === currentEmployeeId) && (
                                <button
                                  type="button"
                                  onClick={() => requestOpenShift(date, assignment)}
                                  disabled={hasCurrentEmployeeRequestedShift(dateKey, assignment.key)}
                                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                                >
                                  {hasCurrentEmployeeRequestedShift(dateKey, assignment.key) ? 'Requested' : 'Request'}
                                </button>
                              )}
                          </div>

                          <div className="space-y-2">
                            {assignment.slots.length === 0 && (
                              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-2.5 py-3 text-xs font-semibold text-slate-500">
                                Open Shift
                              </div>
                            )}

                            {assignment.slots.map((slot, index) => {
                              const isOpenSlot = isOpenShiftSlot(slot.employeeId);
                              const isCurrentEmployee = slot.employeeId === currentEmployeeId;

                              return (
                                <div
                                  key={`${assignment.key}-${slot.employeeId}-${index}`}
                                  role={isCurrentEmployee ? 'button' : undefined}
                                  tabIndex={isCurrentEmployee ? 0 : undefined}
                                  onClick={() => {
                                    if (!isCurrentEmployee) return;
                                    setVacationRequestStatus('');
                                    setSelectedVacationShift({
                                      dateKey,
                                      dateLabel: formatShortDate(date),
                                      shiftKey: assignment.key,
                                      shiftLabel: assignment.label,
                                      startTime: slot.startTime,
                                      endTime: slot.endTime,
                                    });
                                  }}
                                  onKeyDown={(event) => {
                                    if (!isCurrentEmployee || (event.key !== 'Enter' && event.key !== ' ')) return;
                                    event.preventDefault();
                                    setVacationRequestStatus('');
                                    setSelectedVacationShift({
                                      dateKey,
                                      dateLabel: formatShortDate(date),
                                      shiftKey: assignment.key,
                                      shiftLabel: assignment.label,
                                      startTime: slot.startTime,
                                      endTime: slot.endTime,
                                    });
                                  }}
                                  className={`rounded-lg border px-2.5 py-2 ${isCurrentEmployee ? 'cursor-pointer hover:ring-2 hover:ring-emerald-200' : ''} ${
                                    isCurrentEmployee
                                      ? 'border-emerald-200 bg-emerald-50'
                                      : isOpenSlot
                                        ? getOpenSlotColorClasses(slot.employeeId)
                                        : 'border-slate-200 bg-white'
                                  }`}
                                >
                                  <div className={`text-sm font-medium ${
                                    isCurrentEmployee
                                      ? 'text-emerald-800'
                                      : isOpenSlot
                                        ? ''
                                        : 'text-slate-800'
                                  }`}>
                                    {getEmployeeName(slot.employeeId)}
                                  </div>

                                  <div className="mt-1 text-xs font-medium text-slate-500">{assignment.label}</div>

                                  <div className="mt-1 text-xs text-slate-600">
                                    {slot.startTime} - {slot.endTime}
                                  </div>

                                  {isCurrentEmployee && (
                                    <div className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                      You
                                    </div>
                                  )}

                                  {isCurrentEmployee && (
                                    <div className="mt-1 text-[11px] font-semibold text-emerald-700">
                                      Click to request vacation
                                    </div>
                                  )}

                                  {isCurrentEmployee && slot.note && (
                                    <div className="mt-1 text-xs text-slate-600">{slot.note}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 px-4 py-6 md:px-6">
      {selectedVacationShift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="text-lg font-bold text-slate-900">Request Vacation for Shift</div>
            <div className="mt-2 text-sm text-slate-600">
              {selectedVacationShift.shiftLabel} • {selectedVacationShift.dateLabel} • {selectedVacationShift.startTime}-{selectedVacationShift.endTime}
            </div>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Reason / note to supervisor
            </label>
            <textarea
              value={vacationReason}
              onChange={(event) => setVacationReason(event.target.value)}
              rows={4}
              placeholder="Optional note..."
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
            {vacationRequestStatus && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {vacationRequestStatus}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedVacationShift(null);
                  setVacationReason('');
                  setVacationRequestStatus('');
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitVacationRequest}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Apollo Dashboard</h1>
              <div className="mt-1 text-sm text-slate-600">
                {currentEmployee ? currentEmployee.name : authEmail ? 'Employee profile not linked' : 'Loading employee profile'} • Personal dashboard
              </div>

              {isSupervisorUser && (
                <a
                  href="/supervisor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Supervisor Tools
                </a>
              )}

              {authEmail && !currentEmployee && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
                  No employee profile is linked to {authEmail}. Check the email field in Employee Profiles.
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden text-right md:block">
                <div className="text-sm font-semibold text-slate-900">{systemConfig.companyName}</div>
                <div className="text-xs text-slate-500">Company logo configurable in Supervisor Tools</div>
              </div>

              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {systemConfig.logoDataUrl ? (
                  <img
                    src={systemConfig.logoDataUrl}
                    alt="Company logo"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <>
                    <img
                      src="/sequoia-logo.png"
                      alt="Company logo"
                      className="h-full w-full object-contain p-1"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="text-xs font-bold text-slate-500">SSC</span>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Employee Status</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {currentEmployee
                  ? `${currentEmployee.employeeType} • ${currentEmployee.role} / ${currentEmployee.scope} • Status: ${currentEmployee.status ?? 'Active'}`
                  : 'Employee profile not loaded'}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {certificationStatus.isCompliant
                  ? 'All required certifications are up to date.'
                  : `Missing or expired: ${certificationStatus.missingOrExpired.join(', ')}`}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {certificationStatus.nextExpiring
                  ? `Next expiring certification: ${certificationStatus.nextExpiring.label} on ${formatShortDate(certificationStatus.nextExpiring.date)}`
                  : 'No valid upcoming certification expiration found.'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  certificationStatus.isCompliant
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                }`}
              >
                {certificationStatus.isCompliant ? 'Compliant' : 'Action Needed'}
              </div>

              <button
                type="button"
                onClick={() => setShowCertificationUpload((current) => !current)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Upload Certifications
              </button>
            </div>
          </div>

          {showCertificationUpload && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div id="apollo-certification-upload-container" className="min-h-[720px] rounded-xl border border-slate-200 bg-white" />
            </div>
          )}
        </div>

        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <a
            className="weatherwidget-io"
            href="https://forecast7.com/en/36d60n119d45/reedley/?unit=us"
            data-label_1={systemConfig.companyName.toUpperCase()}
            data-label_2="Live Weather Updates"
            data-theme="weather_one"
          >
            {systemConfig.companyName} Live Weather Updates
          </a>
        </div>

        <div className="space-y-4">
          {renderTile(
            'timecard',
            'Timecard',
            isClockedIn
              ? 'You are currently clocked in.'
              : 'Review punches, approve the pay period timecard, request corrections, and clock in/out.',
            <div>
              <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
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
                    onClick={() => {
                      setSelectedPayPeriodKey(currentPayPeriod.key);
                      reloadPublishedSchedule();
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Current Pay Period
                  </button>
                </div>
              </div>

              <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Clock In / Clock Out</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {activeShift
                        ? `${activeShift.label} • ${formatShortDate(activeShift.date)} • ${activeShift.slot.startTime} - ${activeShift.slot.endTime}`
                        : 'No active assigned shift found for the current time window.'}
                    </div>
                    {activeShift && (
                      <div className="mt-1 text-xs text-slate-500">
                        {activeShift.locationLabel} • {activeShift.radiusFeet} ft geofence
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide ${
                        isClockedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isClockedIn ? 'Clocked In' : 'Off Duty'}
                    </div>

                    <button
                      type="button"
                      disabled={!activeShift || isClockedIn || isPunching}
                      onClick={() => handlePunch('CLOCK_IN')}
                      className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isPunching ? 'Checking...' : 'Clock In'}
                    </button>

                    <button
                      type="button"
                      disabled={!activeShift || !isClockedIn || isPunching}
                      onClick={() => handlePunch('CLOCK_OUT')}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isPunching ? 'Checking...' : 'Clock Out'}
                    </button>
                  </div>
                </div>

                {timecardStatus && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {timecardStatus}
                  </div>
                )}
              </div>

              <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Hours</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{getTimecardTotalHours().toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Regular</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{calculateTimecardPayBreakdown().regularHours.toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overtime</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{calculateTimecardPayBreakdown().overtimeHours.toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Double Time</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{calculateTimecardPayBreakdown().doubleTimeHours.toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missed Meal</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{calculateTimecardPayBreakdown().missedMealPenaltyHours.toFixed(2)}</div>
                </div>
              </div>

              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Week 1 Breakdown</div>
                  <div className="mt-1 text-sm text-slate-700">
                    Reg {calculateTimecardPayBreakdown().week1.regularHours.toFixed(2)} • OT {calculateTimecardPayBreakdown().week1.overtimeHours.toFixed(2)} • DT {calculateTimecardPayBreakdown().week1.doubleTimeHours.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Week 2 Breakdown</div>
                  <div className="mt-1 text-sm text-slate-700">
                    Reg {calculateTimecardPayBreakdown().week2.regularHours.toFixed(2)} • OT {calculateTimecardPayBreakdown().week2.overtimeHours.toFixed(2)} • DT {calculateTimecardPayBreakdown().week2.doubleTimeHours.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submission Status</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {returnedTimecard ? 'Returned - Corrections Needed' : submittedTimecard ? 'Pending Supervisor Review' : 'Not Submitted'}
                  </div>
                </div>
              </div>

              <div className="overflow-auto rounded-2xl border border-slate-300 bg-white">
                <div className="min-w-[980px] p-5">
                  <div className="mb-5 text-center text-sm font-bold uppercase tracking-wide text-slate-900">
                    Time Card
                  </div>

                  <div className="mb-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-300">
                      <div className="border-b border-slate-300 bg-slate-50 px-3 py-1 text-xs font-bold">Employee's Name:</div>
                      <div className="min-h-[42px] px-3 py-2 text-sm font-semibold text-slate-900">
                        {currentEmployee?.name ?? 'Employee profile not linked'}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-300">
                      <div className="border-b border-slate-300 bg-slate-50 px-3 py-1 text-xs font-bold">Start Date of the Pay Period:</div>
                      <div className="min-h-[42px] px-3 py-2 text-sm font-semibold text-slate-900">
                        {formatShortDate(selectedPayPeriod.start)}
                      </div>
                    </div>
                  </div>

                  {[
                    { label: 'Week-1', dates: week1Dates },
                    { label: 'Week-2', dates: week2Dates },
                  ].map((week) => (
                    <div key={week.label} className="mb-5">
                      <div className="border border-slate-400 bg-slate-100 py-1 text-center text-xs font-bold">
                        {week.label}
                      </div>
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr>
                            <th rowSpan={2} className="border border-slate-400 bg-slate-50 px-2 py-1">Shift #</th>
                            <th rowSpan={2} className="border border-slate-400 bg-slate-50 px-2 py-1">Shift</th>
                            <th rowSpan={2} className="border border-slate-400 bg-slate-50 px-2 py-1">Shift Type</th>
                            <th colSpan={2} className="border border-slate-400 bg-slate-50 px-2 py-1">Date &amp; Time In</th>
                            <th colSpan={2} className="border border-slate-400 bg-slate-50 px-2 py-1">Date &amp; Time Out</th>
                            <th rowSpan={2} className="border border-slate-400 bg-slate-50 px-2 py-1">Total Hours</th>
                            <th rowSpan={2} className="border border-slate-400 bg-slate-50 px-2 py-1">Clear</th>
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
                            const dateKey = toDateKey(date);
                            const row = getEditableRowForDate(date);
                            const totalHours = getEditableRowHours(row);

                            return (
                              <tr key={`${week.label}-${dateKey}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}>
                                <td className="border border-slate-400 px-2 py-1 text-center font-semibold">{index + 1}</td>
                                <td className="border border-slate-400 px-2 py-1 text-center">
                                  <select
                                    value={row.shiftLabel}
                                    onChange={(event) => {
                                      const nextShiftLabel = event.target.value;
                                      updateEditableRow(date, {
                                        shiftLabel: nextShiftLabel,
                                        payType: getDefaultPayType(nextShiftLabel, getEditableRowHours(row)),
                                      });
                                    }}
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-slate-500"
                                  >
                                    <option value="">Off</option>
                                    <option value="Reedley 1">Reedley 1</option>
                                    <option value="Reedley 2">Reedley 2</option>
                                    <option value="Parlier">Parlier</option>
                                    <option value="Orange Cove">Orange Cove</option>
                                    <option value="Field Supervisor">Field Supervisor</option>
                                    <option value="Administrative Supervisor">Administrative Supervisor</option>
                                    <option value="Standby">Standby</option>
                                    <option value="Transfer">Transfer</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </td>
                                <td className="border border-slate-400 px-2 py-1 text-center">
                                  <select
                                    value={row.payType}
                                    onChange={(event) =>
                                      updateEditableRow(date, {
                                        payType: event.target.value as EditableTimecardRow['payType'],
                                      })
                                    }
                                    disabled={!row.shiftLabel}
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-slate-500 disabled:bg-slate-100 disabled:text-slate-400"
                                    title="Shift Type controls how this row calculates regular, overtime, and double time."
                                  >
                                                                        <option value="DAILY_OT_DT">Non 24-Shift</option>
                                    <option value="TWENTY_FOUR_HOUR">24-Hour Shift</option>
                                    <option value="SICK_TIME">Sick Time</option>
                                    <option value="VACATION">Vacation</option>
                                    <option value="JURY_DUTY">Jury Duty</option>
                                  </select>
                                </td>
                                <td className="border border-slate-400 px-2 py-1 text-center">
                                  <input
                                    type="date"
                                    value={row.clockInDate}
                                    onChange={(event) => updateEditableRow(date, { clockInDate: event.target.value })}
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-slate-500"
                                  />
                                </td>
                                <td className="border border-slate-400 px-2 py-1 text-center">
                                  <input
                                    type="time"
                                    value={row.clockInTime}
                                    onChange={(event) => updateEditableRow(date, { clockInTime: event.target.value })}
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-slate-500"
                                  />
                                </td>
                                <td className="border border-slate-400 px-2 py-1 text-center">
                                  <input
                                    type="date"
                                    value={row.clockOutDate}
                                    onChange={(event) => updateEditableRow(date, { clockOutDate: event.target.value })}
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-slate-500"
                                  />
                                </td>
                                <td className="border border-slate-400 px-2 py-1 text-center">
                                  <input
                                    type="time"
                                    value={row.clockOutTime}
                                    onChange={(event) => updateEditableRow(date, { clockOutTime: event.target.value })}
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-slate-500"
                                  />
                                </td>
                                <td className="border border-slate-400 px-2 py-1 text-center font-semibold">
                                  {totalHours > 0 ? totalHours.toFixed(2) : ''}
                                </td>
                                <td className="border border-slate-400 px-2 py-1 text-center">
                                  <button
                                    type="button"
                                    onClick={() => clearEditableRow(date)}
                                    disabled={!row.shiftLabel && !row.clockInDate && !row.clockInTime && !row.clockOutDate && !row.clockOutTime}
                                    className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                  >
                                    Clear
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}

                  <div className="mt-5 rounded-xl border border-slate-300 bg-slate-50 p-4">
                    <div className="text-sm font-bold text-slate-900">Missed Meal Break Declaration</div>
                    <div className="mt-1 text-xs text-slate-600">
                      Use this section when you were unable to take a required meal break during the pay period.
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-[220px_1fr_auto]">
                      <select
                        value={missedMealDateKey}
                        onChange={(event) => setMissedMealDateKey(event.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                      >
                        <option value="">Select date</option>
                        {dates.map((date) => (
                          <option key={toDateKey(date)} value={toDateKey(date)}>
                            {formatDayLabel(date)}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={missedMealReason}
                        onChange={(event) => setMissedMealReason(event.target.value)}
                        placeholder="Reason missed meal break was not taken"
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                      />

                      <button
                        type="button"
                        onClick={addMissedMealBreak}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Add
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {payPeriodMissedMealBreaks.length === 0 ? (
                        <div className="text-xs text-slate-500">No missed meal breaks declared for this pay period.</div>
                      ) : (
                        payPeriodMissedMealBreaks.map((item) => (
                            <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                              <div>
                                <div className="font-semibold text-slate-900">{item.dateKey}</div>
                                <div className="text-slate-600">{item.reason}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeMissedMealBreak(item.id)}
                                className="text-xs font-semibold text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-300 bg-slate-50 p-4">
                    <label className="text-sm font-bold text-slate-900">Employee Note</label>
                    <textarea
                      value={timecardNotes[getTimecardNoteKey()] ?? ''}
                      onChange={(event) => saveTimecardNote(event.target.value)}
                      rows={4}
                      placeholder="Add a note to this timecard..."
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                    />
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    <div className="font-bold text-slate-900">Pay Calculation Rules</div>
                    <div className="mt-1">
                      Shift Type controls the calculation rule. Non 24-Shift respects the weekly 40-hour regular cap, with over 12 hours on that row paid as double time. 24-Hour Shift uses weekly OT after 40 worked hours per week. Sick Time, Vacation, and Jury Duty are regular-only and do not accrue OT/DT. Missed meal declarations add one regular-rate penalty hour after supervisor approval.
                    </div>
                  </div>

                  <div className="mt-5 text-xs text-slate-700">
                    I certify that the hours reported on this timecard, including any edits entered directly into the table, accurately reflect the hours I have worked during this pay period.
                    I understand that falsification of this record may result in disciplinary action, up to and including termination of employment.
                  </div>

                  <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Approve & Submit Timecard</div>
                      <div className="mt-1 text-xs text-slate-600">
                        This sends your timecard to the Supervisor UI for review and approval.
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={Boolean(submittedTimecard && !returnedTimecard)}
                      onClick={submitTimecardForReview}
                      className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {returnedTimecard ? 'Resubmit Timecard' : submittedTimecard ? 'Submitted' : 'Approve & Submit'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Browser location permission is required for geofence approval. Approved clock-in locations are Reedley, Parlier, and Orange Cove stations. If location is unavailable or outside the geofence, the punch is saved for supervisor review.
              </div>
            </div>,
            isClockedIn,
          )}

          {renderTile(
            'schedule',
            'Schedule',
            'View your assigned shifts or the full pay period schedule. Request time off or open shifts from shift details.',
            <div>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {formatShortDate(selectedPayPeriod.start)} to {formatShortDate(selectedPayPeriod.end)}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {showFullSchedule
                      ? 'Showing the full schedule with your assignments highlighted.'
                      : `Showing your assigned shifts only. ${myShiftCount} shift${myShiftCount === 1 ? '' : 's'} in this pay period.`}
                  </div>
                  {nextMyShift && (
                    <div className="mt-1 text-sm text-slate-600">
                      Next shift: {nextMyShift.label} on {formatShortDate(nextMyShift.date)} at {nextMyShift.startTime}
                    </div>
                  )}
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
                    onClick={() => {
                      setSelectedPayPeriodKey(currentPayPeriod.key);
                      reloadPublishedSchedule();
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Current
                  </button>

                  <button
                    type="button"
                    onClick={reloadPublishedSchedule}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Refresh Schedule
                  </button>

                  <div className="inline-flex rounded-xl border border-slate-300 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setShowFullSchedule(false)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        !showFullSchedule ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      My Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFullSchedule(true)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        showFullSchedule ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Full Schedule
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {renderScheduleWeek('Week 1', week1Dates)}
                {renderScheduleWeek('Week 2', week2Dates)}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Later, clicking a scheduled workday will open a shift detail page with public supervisor notes, time off requests, and open shift request actions.
              </div>
            </div>,
          )}

          {renderTile(
            'company-announcements',
            'Company Announcements',
            hasUnreadAnnouncements
              ? 'New company announcement available.'
              : 'Important company information, supervisor announcements, and required updates for employees.',
            <div className="space-y-4">
              {activeAnnouncements.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  No active company announcements are currently posted.
                </div>
              ) : (
                <>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={markAnnouncementsRead}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Mark Read
                    </button>
                  </div>

                  {activeAnnouncements.map((announcement) => {
                    const isUnread = !readAnnouncementIds.includes(announcement.id);

                    return (
                      <div
                        key={announcement.id}
                        className={`rounded-xl border p-4 ${
                          isUnread ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className={`text-sm font-bold ${isUnread ? 'text-red-800' : 'text-slate-900'}`}>
                              {announcement.title}
                            </div>
                            <div className={`mt-2 whitespace-pre-wrap text-sm ${isUnread ? 'text-red-700' : 'text-slate-700'}`}>
                              {announcement.message}
                            </div>
                          </div>

                          {isUnread && (
                            <div className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
                              New
                            </div>
                          )}
                        </div>

                        <div className="mt-3 text-xs text-slate-500">
                          Posted by {announcement.postedBy || 'Supervisor'} • Expires {formatShortDate(new Date(announcement.expiresAt))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>,
            hasUnreadAnnouncements,
          )}

          {renderTile(
            'messages',
            'Messages',
            unreadMessageCount > 0
              ? `${unreadMessageCount} unread Apollo message${unreadMessageCount === 1 ? '' : 's'}.`
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
                      <option value="SUPERVISORS">Supervisors</option>
                      <option value="INDIVIDUAL">Individual Employee</option>
                      <option value="ALL_ACTIVE">All Active Employees</option>
                      <option value="FULLTIME">Full-Time Employees</option>
                      <option value="PERDIEM">Per Diem Employees</option>
                      <option value="PARAMEDIC">Paramedics / ALS</option>
                      <option value="EMT">EMTs / BLS</option>
                    </select>

                    {messageRecipientMode === 'INDIVIDUAL' && (
                      <select
                        value={messageRecipientEmployeeId}
                        onChange={(event) => setMessageRecipientEmployeeId(event.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                      >
                        <option value="">Select employee</option>
                        {employees
                          .filter((employee) => employee.id !== currentEmployeeId && employee.status?.toLowerCase() !== 'removed')
                          .map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name}
                            </option>
                          ))}
                      </select>
                    )}

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
                      onClick={sendEmployeeMessage}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Send Message
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Conversations</div>
                      <div className="text-xs text-slate-500">{unreadMessageCount} unread</div>
                    </div>
                    <button
                      type="button"
                      onClick={markMessagesRead}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Mark All Read
                    </button>
                  </div>

                  <div className="max-h-[520px] space-y-2 overflow-auto">
                    {conversations.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                        No Apollo messages yet.
                      </div>
                    ) : (
                      conversations.map((conversation) => (
                        <button
                          type="button"
                          key={conversation.conversationId}
                          onClick={() => {
                            setSelectedConversationId(conversation.conversationId);
                            markConversationRead(conversation.conversationId);
                          }}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            selectedConversation?.conversationId === conversation.conversationId
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
                                {conversation.latest.senderName} • {formatDateTime(new Date(conversation.latest.createdAt))}
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
                {!selectedConversation ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    Select a conversation to view messages.
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 border-b border-slate-200 pb-3">
                      <div className="text-base font-bold text-slate-900">{selectedConversation.latest.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Audience: {selectedConversation.latest.audienceLabel}
                      </div>
                    </div>

                    <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
                      {selectedConversation.messages.map((message) => {
                        const isMine = message.senderId === currentEmployeeId;
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
                                {formatDateTime(new Date(message.createdAt))} • {getMessageStatus(message)}
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
                          onClick={sendEmployeeReply}
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

              <div className="xl:col-span-2">
                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Open Company Gmail
                </a>
              </div>
            </div>,
            unreadMessageCount > 0,
          )}

          {renderTile(
            'employee-handbook',
            'Employee Handbook',
            'View the company Employee Policy Manual / SOP.',
            <div>
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                The current handbook is the Sequoia Safety Council Employee Policy Manual, effective January 1, 2026.
              </div>
              <iframe
                src="/Employee Handbook.pdf"
                title="Employee Handbook"
                className="h-[720px] w-full rounded-xl border border-slate-200 bg-white"
              />
              <div className="mt-3 text-xs text-slate-500">
                Place the handbook PDF in the project's public folder as: public/Employee Handbook.pdf
              </div>
            </div>,
          )}

          {renderTile(
            'incident-report',
            'Incident Report',
            'Submit an incident report using the embedded company JotForm.',
            <div id="apollo-incident-report-container" className="min-h-[720px] rounded-xl border border-slate-200 bg-white" />,
          )}

          {renderTile(
            'important-links',
            'Important Links',
            'Quick access to company-approved external resources.',
            <div className="grid gap-3 md:grid-cols-2">
              {systemConfig.importantLinks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  No important links have been configured.
                </div>
              ) : (
                systemConfig.importantLinks.map((link) => (
                  <a
                    key={link.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.label}
                  </a>
                ))
              )}
            </div>,
          )}

        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
type ShiftName = 'R1' | 'R2' | 'P' | 'OC' | 'GM' | 'ADMIN_SUP' | 'FIELD_SUP';
type UnitVehicle = '305' | '310' | '315' | '320' | '325' | '330' | '335' | '';
type SupervisorVehicle = '300' | '301' | '302' | '303' | '';
type VehicleValue = UnitVehicle | SupervisorVehicle;
type StaffingLevel = 'ALS' | 'BLS' | 'SUP';
type ShiftCategory = 'UNIT' | 'SUPERVISOR';

type EmployeeRole = 'Paramedic' | 'EMT' | 'Supervisor';

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

type EmployeeOption = {
  id: string;
  name: string;
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
  role?: string;
  scope?: string;
  employeeType?: string;
  seniorityLabel?: string;
  certifications?: Partial<CertificationRecord>;
  status?: string;
};

type EmployeeSlot = {
  employeeId: string;
  startTime: string;
  endTime: string;
  note: string;
};

type ShiftAssignment = {
  employee1: EmployeeSlot;
  employee2: EmployeeSlot;
  employee3: EmployeeSlot;
  showEmployee3: boolean;
  vehicle: VehicleValue;
  allowExtendedHours: boolean;
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
};

type DaySchedule = {
  standard: DayAssignments;
  extras: ExtraShiftAssignment[];
};

type ScheduleData = Record<string, DaySchedule>;

type AssignmentRef = {
  key: string;
  label: string;
  category: ShiftCategory;
  shift: {
    employee1: EmployeeSlot;
    employee2: EmployeeSlot;
    employee3: EmployeeSlot;
    showEmployee3: boolean;
    vehicle: VehicleValue;
    allowExtendedHours: boolean;
  };
};

type ContinuousHoursResult = {
  warnings: string[];
  approvals: string[];
};

type EmployeeDaySummary = {
  hours: number;
  hasShift: boolean;
  hasExtendedApproval: boolean;
};

type EligibilityResult = {
  eligible: boolean;
  reason: string;
  warning?: string;
};

type PayPeriodInfo = {
  number: number;
  start: Date;
  end: Date;
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

type ApolloMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'EMPLOYEE' | 'SUPERVISOR';
  recipients: Array<{
    employeeId: string;
    deliveredAt: string;
    readAt: string | null;
  }>;
  audienceLabel: string;
  title: string;
  body: string;
  createdAt: string;
  relatedType: 'GENERAL' | 'SCHEDULE' | 'TIME_CARD' | 'URGENT';
  priority: 'NORMAL' | 'URGENT';
};


const STORAGE_KEY = 'apollo-schedule-page-v6';
const OPEN_SHIFT_REQUESTS_STORAGE_KEY = 'apollo-open-shift-requests-v1';
const APOLLO_MESSAGES_STORAGE_KEY = 'apollo-messages-v2';
const EMPLOYEE_STORAGE_KEY = 'apollo-employee-profiles-v2';
const PAY_PERIOD_REFERENCE_NUMBER = 9;
const PAY_PERIOD_REFERENCE_START = '2026-04-12';

const SHIFT_ORDER: ShiftName[] = ['R1', 'R2', 'P', 'OC', 'ADMIN_SUP', 'FIELD_SUP'];
const UNIT_SHIFTS = new Set<ShiftName>(['R1', 'R2', 'P', 'OC']);
const SUPERVISOR_SHIFTS = new Set<ShiftName>(['ADMIN_SUP', 'FIELD_SUP']);

const SHIFT_DISPLAY_NAMES: Record<ShiftName, string> = {
  R1: 'Reedley 1',
  R2: 'Reedley 2',
  P: 'Parlier',
  OC: 'Orange Cove',
  GM: 'GM',
  ADMIN_SUP: 'Administrative Supervisor',
  FIELD_SUP: 'Field Supervisor',
};

const UNIT_VEHICLES: UnitVehicle[] = ['', '305', '310', '315', '320', '325', '330', '335'];
const SUPERVISOR_VEHICLES: SupervisorVehicle[] = ['', '300', '301', '302', '303'];

const DEFAULT_START_TIME = '06:00';
const DEFAULT_END_TIME = '06:00';

function normalizeMilitaryTime(value: string, fallback = DEFAULT_START_TIME): string {
  const trimmed = (value || '').trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return fallback;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return fallback;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getDefaultEndTimeForShift(shiftName?: ShiftName, slotKey?: 'employee1' | 'employee2' | 'employee3'): string {
  return shiftName === 'ADMIN_SUP' && slotKey === 'employee1' ? '18:00' : DEFAULT_END_TIME;
}

const OPEN_ALS_SLOT_ID = '__OPEN_ALS__';
const OPEN_BLS_SLOT_ID = '__OPEN_BLS__';

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

const DEFAULT_EMPLOYEES: EmployeeOption[] = [
  { id: 'emp-001', name: 'Rivera, Alex', role: 'Paramedic', scope: 'ALS', employeeType: 'Full Time', seniorityLabel: 'Seniority Unassigned', certifications: EMPTY_CERTIFICATIONS, status: 'Active' },
  { id: 'emp-002', name: 'Lee, Jordan', role: 'EMT', scope: 'BLS', employeeType: 'Full Time', seniorityLabel: 'Seniority Unassigned', certifications: EMPTY_CERTIFICATIONS, status: 'Active' },
  { id: 'emp-003', name: 'Brooks, Taylor', role: 'Paramedic', scope: 'ALS', employeeType: 'Full Time', seniorityLabel: 'Seniority Unassigned', certifications: EMPTY_CERTIFICATIONS, status: 'Active' },
  { id: 'emp-004', name: 'Morgan, Casey', role: 'EMT', scope: 'BLS', employeeType: 'Full Time', seniorityLabel: 'Seniority Unassigned', certifications: EMPTY_CERTIFICATIONS, status: 'Active' },
  { id: 'emp-005', name: 'Foster, Riley', role: 'EMT', scope: 'BLS', employeeType: 'Per Diem', seniorityLabel: 'Seniority Unassigned', certifications: EMPTY_CERTIFICATIONS, status: 'Active' },
  { id: 'emp-006', name: 'Diaz, Morgan', role: 'Paramedic', scope: 'ALS', employeeType: 'Full Time', seniorityLabel: 'Seniority Unassigned', certifications: EMPTY_CERTIFICATIONS, status: 'Active' },
  { id: 'emp-007', name: 'Cooper, Jamie', role: 'Supervisor', scope: 'BLS', employeeType: 'Full Time', seniorityLabel: 'Seniority Unassigned', certifications: EMPTY_CERTIFICATIONS, status: 'Active' },
  { id: 'emp-008', name: 'Price, Cameron', role: 'Supervisor', scope: 'BLS', employeeType: 'Full Time', seniorityLabel: 'Seniority Unassigned', certifications: EMPTY_CERTIFICATIONS, status: 'Active' },
  { id: 'emp-009', name: 'Bennett, Avery', role: 'EMT', scope: 'BLS', employeeType: 'Per Diem', seniorityLabel: 'Seniority Unassigned', certifications: EMPTY_CERTIFICATIONS, status: 'Active' },
  { id: 'emp-010', name: 'Collins, Drew', role: 'Paramedic', scope: 'ALS', employeeType: 'Full Time', seniorityLabel: 'Seniority Unassigned', certifications: EMPTY_CERTIFICATIONS, status: 'Active' },
  { id: 'emp-011', name: 'Hughes, Parker', role: 'EMT', scope: 'BLS', employeeType: 'Per Diem', seniorityLabel: 'Seniority Unassigned', certifications: EMPTY_CERTIFICATIONS, status: 'Active' },
  { id: 'emp-012', name: 'Ward, Reese', role: 'Supervisor', scope: 'BLS', employeeType: 'Full Time', seniorityLabel: 'Seniority Unassigned', certifications: EMPTY_CERTIFICATIONS, status: 'Active' },
];

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

function buildEmployeeName(profile: StoredEmployeeProfile): string {
  const first = (profile.firstName ?? '').trim();
  const last = (profile.lastName ?? '').trim();
  const full = last && first ? `${last}, ${first}` : `${first} ${last}`.trim();
  return full || profile.id || 'Unnamed Employee';
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

function getEmployeeCertificationIssues(employee: EmployeeOption): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return getRequiredCertificationKeys(employee.scope)
    .filter((key) => {
      const value = employee.certifications[key];
      if (!value) {
        return true;
      }
      const expiration = new Date(`${value}T00:00:00`);
      return Number.isNaN(expiration.getTime()) || expiration < today;
    })
    .map((key) => CERTIFICATION_LABELS[key]);
}

function sortEmployeesByName(list: EmployeeOption[]): EmployeeOption[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

function loadEmployeesFromProfiles(): EmployeeOption[] {
  if (typeof window === 'undefined') {
    return sortEmployeesByName(DEFAULT_EMPLOYEES);
  }

  try {
    const raw = window.localStorage.getItem(EMPLOYEE_STORAGE_KEY);
    if (!raw) {
      return sortEmployeesByName(DEFAULT_EMPLOYEES);
    }

    const parsed = JSON.parse(raw) as StoredEmployeeProfile[];

    const loaded = parsed
      .map((profile) => ({
        id: profile.id,
        name: buildEmployeeName(profile),
        role: normalizeEmployeeRole(profile.role),
        scope: normalizeEmployeeScope(profile.scope, profile.role),
        employeeType: (profile.employeeType ?? 'Full Time').trim() || 'Full Time',
        seniorityLabel: (profile.seniorityLabel ?? 'Seniority Unassigned').trim() || 'Seniority Unassigned',
        certifications: normalizeCertificationRecord(profile.certifications),
        status: (profile.status ?? 'Active').trim() || 'Active',
      }))
      .filter((employee) => employee.id && employee.status !== 'Inactive');

    return sortEmployeesByName(loaded.length > 0 ? loaded : DEFAULT_EMPLOYEES);
  } catch (error) {
    console.error('Failed to load employees from profiles:', error);
    return sortEmployeesByName(DEFAULT_EMPLOYEES);
  }
}

async function loadEmployeesFromSupabase(): Promise<EmployeeOption[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id,first_name,last_name,role,scope,employee_type,seniority_label,certifications,status')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) {
    throw error;
  }

  const loaded = (data ?? [])
    .map((employee: any) => ({
      id: employee.id,
      name: `${employee.last_name ?? ''}, ${employee.first_name ?? ''}`.replace(/^,\s*/, '').trim() || employee.id || 'Unnamed Employee',
      role: normalizeEmployeeRole(employee.role ?? undefined),
      scope: normalizeEmployeeScope(employee.scope ?? undefined, employee.role ?? undefined),
      employeeType: (employee.employee_type ?? 'Full Time').trim() || 'Full Time',
      seniorityLabel: (employee.seniority_label ?? 'Seniority Unassigned').trim() || 'Seniority Unassigned',
      certifications: normalizeCertificationRecord(employee.certifications ?? undefined),
      status: (employee.status ?? 'Active').trim() || 'Active',
    }))
    .filter((employee) => employee.id && employee.status !== 'Inactive');

  return sortEmployeesByName(loaded.length > 0 ? loaded : DEFAULT_EMPLOYEES);
}

function isOpenShiftSlot(employeeId: string): boolean {
  return employeeId === OPEN_ALS_SLOT_ID || employeeId === OPEN_BLS_SLOT_ID;
}

function getOpenShiftLabel(employeeId: string): string {
  if (employeeId === OPEN_ALS_SLOT_ID) {
    return 'Open ALS';
  }

  if (employeeId === OPEN_BLS_SLOT_ID) {
    return 'Open BLS';
  }

  return '';
}

function createEmptyEmployeeSlot(): EmployeeSlot {
  return {
    employeeId: '',
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
    note: '',
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
  };
}

function createAdminSupervisorSlot(): EmployeeSlot {
  return {
    employeeId: '',
    startTime: '06:00',
    endTime: '18:00',
    note: '',
  };
}

function createAdminSupervisorShift(): ShiftAssignment {
  return {
    employee1: createAdminSupervisorSlot(),
    employee2: createEmptyEmployeeSlot(),
    employee3: createEmptyEmployeeSlot(),
    showEmployee3: false,
    vehicle: '',
    allowExtendedHours: false,
  };
}

function createEmptyDayAssignments(): DayAssignments {
  return {
    R1: createEmptyShift(false),
    R2: createEmptyShift(false),
    P: createEmptyShift(false),
    OC: createEmptyShift(false),
    GM: createEmptyShift(false),
    ADMIN_SUP: createAdminSupervisorShift(),
    FIELD_SUP: createEmptyShift(false),
  };
}

function createEmptyDaySchedule(): DaySchedule {
  return {
    standard: createEmptyDayAssignments(),
    extras: [],
  };
}

function cloneScheduleData(data: ScheduleData): ScheduleData {
  return JSON.parse(JSON.stringify(data)) as ScheduleData;
}

function parseTimeToMinutes(timeValue: string): number {
  const [hoursText, minutesText] = (timeValue || DEFAULT_START_TIME).split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 360;
  }

  return hours * 60 + minutes;
}

function calculateSlotHours(startTime: string, endTime: string): number {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  let duration = endMinutes - startMinutes;
  if (duration <= 0) {
    duration += 24 * 60;
  }

  const hours = duration / 60;
  return Math.min(Math.max(hours, 0), 24);
}

function formatHours(hours: number): string {
  if (Number.isInteger(hours)) {
    return `${hours}`;
  }
  return hours.toFixed(1);
}

function requiresSupervisorNote(slot: EmployeeSlot): boolean {
  if (!slot.employeeId) {
    return false;
  }

  return slot.endTime !== DEFAULT_END_TIME;
}

function normalizeEmployeeSlot(raw: unknown): EmployeeSlot {
  if (!raw || typeof raw !== 'object') {
    return createEmptyEmployeeSlot();
  }

  const maybeSlot = raw as Partial<EmployeeSlot> & {
    employeeId?: string;
    startTime?: string;
    endTime?: string;
    note?: string;
  };

  return {
    employeeId: maybeSlot.employeeId ?? '',
    startTime: maybeSlot.startTime ?? DEFAULT_START_TIME,
    endTime: maybeSlot.endTime ?? DEFAULT_END_TIME,
    note: maybeSlot.note ?? '',
  };
}

function normalizeLegacyEmployeeSlot(
  employeeId: string | undefined,
  startTime: string | undefined,
  endTime: string | undefined,
  note: string | undefined,
): EmployeeSlot {
  return {
    employeeId: employeeId ?? '',
    startTime: startTime ?? DEFAULT_START_TIME,
    endTime: endTime ?? DEFAULT_END_TIME,
    note: note ?? '',
  };
}

function normalizeShift(raw: unknown, category: ShiftCategory): ShiftAssignment {
  if (!raw || typeof raw !== 'object') {
    return createEmptyShift(false);
  }

  const maybeShift = raw as Partial<ShiftAssignment> & {
    employee1Id?: string;
    employee2Id?: string;
    employee3Id?: string;
    hours?: number;
    employee1StartTime?: string;
    employee1EndTime?: string;
    employee1Note?: string;
    employee2StartTime?: string;
    employee2EndTime?: string;
    employee2Note?: string;
    employee3StartTime?: string;
    employee3EndTime?: string;
    employee3Note?: string;
  };

  const employee1 =
    maybeShift.employee1 && typeof maybeShift.employee1 === 'object'
      ? normalizeEmployeeSlot(maybeShift.employee1)
      : normalizeLegacyEmployeeSlot(
          maybeShift.employee1Id,
          maybeShift.employee1StartTime,
          maybeShift.employee1EndTime,
          maybeShift.employee1Note,
        );

  const employee2 =
    category === 'SUPERVISOR'
      ? createEmptyEmployeeSlot()
      : maybeShift.employee2 && typeof maybeShift.employee2 === 'object'
        ? normalizeEmployeeSlot(maybeShift.employee2)
        : normalizeLegacyEmployeeSlot(
            maybeShift.employee2Id,
            maybeShift.employee2StartTime,
            maybeShift.employee2EndTime,
            maybeShift.employee2Note,
          );

  const employee3 =
    category === 'SUPERVISOR'
      ? createEmptyEmployeeSlot()
      : maybeShift.employee3 && typeof maybeShift.employee3 === 'object'
        ? normalizeEmployeeSlot(maybeShift.employee3)
        : normalizeLegacyEmployeeSlot(
            maybeShift.employee3Id,
            maybeShift.employee3StartTime,
            maybeShift.employee3EndTime,
            maybeShift.employee3Note,
          );

  return {
    employee1,
    employee2,
    employee3,
    showEmployee3: category === 'SUPERVISOR' ? false : Boolean(maybeShift.showEmployee3 || employee3.employeeId),
    vehicle: (maybeShift.vehicle ?? '') as VehicleValue,
    allowExtendedHours: Boolean(maybeShift.allowExtendedHours),
  };
}

function normalizeExtraShift(raw: unknown): ExtraShiftAssignment {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: 'Extra Shift',
      category: 'UNIT',
      employee1: createEmptyEmployeeSlot(),
      employee2: createEmptyEmployeeSlot(),
      employee3: createEmptyEmployeeSlot(),
      showEmployee3: false,
      vehicle: '',
      allowExtendedHours: false,
    };
  }

  const maybe = raw as Partial<ExtraShiftAssignment>;
  const category: ShiftCategory = maybe.category === 'SUPERVISOR' ? 'SUPERVISOR' : 'UNIT';
  const normalized = normalizeShift(maybe, category);

  return {
    id: maybe.id ?? `extra-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: maybe.label?.trim() || 'Extra Shift',
    category,
    employee1: normalized.employee1,
    employee2: normalized.employee2,
    employee3: normalized.employee3,
    showEmployee3: normalized.showEmployee3,
    vehicle: normalized.vehicle,
    allowExtendedHours: normalized.allowExtendedHours,
  };
}

function normalizeDaySchedule(raw: unknown): DaySchedule {
  if (!raw || typeof raw !== 'object') {
    return createEmptyDaySchedule();
  }

  const maybeDay = raw as Partial<DaySchedule> & Partial<DayAssignments>;

  if ('standard' in maybeDay && maybeDay.standard) {
    const standard = maybeDay.standard as Partial<DayAssignments>;
    const extras = Array.isArray(maybeDay.extras) ? maybeDay.extras : [];

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
      extras: extras.map((extra) => normalizeExtraShift(extra)),
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

function normalizeLoadedData(raw: unknown): ScheduleData {
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

function ensureDateExists(data: ScheduleData, dateKey: string): ScheduleData {
  if (data[dateKey]) {
    return data;
  }

  const next = cloneScheduleData(data);
  next[dateKey] = createEmptyDaySchedule();
  return next;
}

function getDaySchedule(data: ScheduleData, dateKey: string): DaySchedule {
  return normalizeDaySchedule(data[dateKey]);
}

function getSundayStart(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
  });
}

function getBiWeeklyDates(anchorDate: Date): Date[] {
  const start = getGlobalPayPeriodStart(anchorDate);
  return Array.from({ length: 14 }, (_, index) => addDays(start, index));
}

function getEmployeeById(id: string, employees: EmployeeOption[]): EmployeeOption | undefined {
  return employees.find((employee) => employee.id === id);
}

function getGlobalPayPeriodStart(date: Date): Date {
  const referenceStart = new Date(`${PAY_PERIOD_REFERENCE_START}T00:00:00`);
  const sunday = getSundayStart(date);
  const diffDays = Math.round((sunday.getTime() - referenceStart.getTime()) / (1000 * 60 * 60 * 24));
  const offsetWithinCycle = ((diffDays % 14) + 14) % 14;
  return addDays(sunday, -offsetWithinCycle);
}

function getPayPeriodInfo(date: Date): PayPeriodInfo {
  const periodStart = getGlobalPayPeriodStart(date);
  const periodEnd = addDays(periodStart, 13);

  const janFirst = new Date(date.getFullYear(), 0, 1);
  const firstPayPeriodStartOfYear = getGlobalPayPeriodStart(janFirst);
  const diffDays = Math.round(
    (periodStart.getTime() - firstPayPeriodStartOfYear.getTime()) / (1000 * 60 * 60 * 24),
  );
  const number = Math.floor(diffDays / 14) + 1;

  return {
    number,
    start: periodStart,
    end: periodEnd,
  };
}

function getPayPeriodsForYear(year: number): PayPeriodInfo[] {
  const janFirst = new Date(year, 0, 1);
  const nextJanFirst = new Date(year + 1, 0, 1);
  const firstStart = getGlobalPayPeriodStart(janFirst);
  const firstStartNextYear = getGlobalPayPeriodStart(nextJanFirst);

  const periods: PayPeriodInfo[] = [];
  for (let currentStart = new Date(firstStart); currentStart < firstStartNextYear; currentStart = addDays(currentStart, 14)) {
    periods.push(getPayPeriodInfo(currentStart));
  }

  return periods;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPayPeriodOptionLabel(payPeriod: PayPeriodInfo, year: number): string {
  return `${year} · Pay Period ${payPeriod.number} (${formatShortDate(payPeriod.start)} - ${formatShortDate(payPeriod.end)})`;
}

function isFullTimeEmployee(employeeType: string): boolean {
  return employeeType.toLowerCase().includes('full');
}

function getPayPeriodHoursThreshold(employeeType: string): number {
  return isFullTimeEmployee(employeeType) ? 120 : 48;
}

function getAwardBucket(employeeType: string, payPeriodHours: number): number {
  const threshold = getPayPeriodHoursThreshold(employeeType);
  const isFullTime = isFullTimeEmployee(employeeType);
  const isUnderThreshold = payPeriodHours < threshold;

  if (isFullTime && isUnderThreshold) return 1;
  if (!isFullTime && payPeriodHours <= threshold) return 2;
  if (isFullTime && !isUnderThreshold) return 3;
  return 4;
}

function getAwardBucketLabel(employeeType: string, payPeriodHours: number): string {
  const bucket = getAwardBucket(employeeType, payPeriodHours);
  const threshold = getPayPeriodHoursThreshold(employeeType);
  if (bucket === 1) return `Tier 1 · FT < ${threshold}h`;
  if (bucket === 2) return `Tier 2 · PD ≤ ${threshold}h`;
  if (bucket === 3) return `Tier 3 · FT ≥ ${threshold}h`;
  return `Tier 4 · PD > ${threshold}h`;
}

function getSenioritySortValue(seniorityLabel: string): number {
  const match = seniorityLabel.match(/(\d+)(?!.*\d)/);
  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function sortEmployeesByAwardPriority(
  list: EmployeeOption[],
  payPeriodHoursMap: Record<string, number>,
): EmployeeOption[] {
  return [...list].sort((a, b) => {
    const aHours = payPeriodHoursMap[a.id] ?? 0;
    const bHours = payPeriodHoursMap[b.id] ?? 0;
    const aPriority = getAwardBucket(a.employeeType, aHours);
    const bPriority = getAwardBucket(b.employeeType, bHours);

    if (aPriority !== bPriority) return aPriority - bPriority;
    if (aHours !== bHours) return aHours - bHours;

    const aSeniority = getSenioritySortValue(a.seniorityLabel || 'Seniority Unassigned');
    const bSeniority = getSenioritySortValue(b.seniorityLabel || 'Seniority Unassigned');
    if (aSeniority !== bSeniority) return aSeniority - bSeniority;

    return a.name.localeCompare(b.name);
  });
}

function getVehicleOptions(category: ShiftCategory): VehicleValue[] {
  return category === 'UNIT' ? UNIT_VEHICLES : SUPERVISOR_VEHICLES;
}

function getAssignedSlotsForAssignment(category: ShiftCategory, shift: AssignmentRef['shift']): EmployeeSlot[] {
  if (category === 'SUPERVISOR') {
    return shift.employee1.employeeId ? [shift.employee1] : [];
  }

  const slots = [shift.employee1, shift.employee2];
  if (shift.showEmployee3 || shift.employee3.employeeId) {
    slots.push(shift.employee3);
  }

  return slots.filter((slot) => slot.employeeId);
}

function getAssignmentRefsForDay(day: DaySchedule): AssignmentRef[] {
  const standardRefs: AssignmentRef[] = SHIFT_ORDER.map((shiftName) => ({
    key: `standard-${shiftName}`,
    label: SHIFT_DISPLAY_NAMES[shiftName],
    category: UNIT_SHIFTS.has(shiftName) ? 'UNIT' : 'SUPERVISOR',
    shift: day.standard[shiftName],
  }));

  const extraRefs: AssignmentRef[] = day.extras.map((extra) => ({
    key: `extra-${extra.id}`,
    label: extra.label,
    category: extra.category,
    shift: extra,
  }));

  return [...standardRefs, ...extraRefs];
}

function getStaffingLevel(category: ShiftCategory, shift: AssignmentRef['shift'], employees: EmployeeOption[]): StaffingLevel {
  if (category === 'SUPERVISOR') {
    return 'SUP';
  }

  const employee1 = getEmployeeById(shift.employee1.employeeId, employees);
  const employee2 = getEmployeeById(shift.employee2.employeeId, employees);

  if (employee1?.scope === 'ALS' || employee2?.scope === 'ALS') {
    return 'ALS';
  }

  return 'BLS';
}

function getEmployeeConflictMessages(day: DaySchedule, target: AssignmentRef, employees: EmployeeOption[]): string[] {
  if (target.category !== 'UNIT') {
    return [];
  }

  const messages: string[] = [];
  const targetSlots = getAssignedSlotsForAssignment(target.category, target.shift);

  const seenInSameShift = new Set<string>();
  for (const slot of targetSlots) {
    if (seenInSameShift.has(slot.employeeId)) {
      const employee = getEmployeeById(slot.employeeId, employees);
      messages.push(`${employee?.name ?? 'Employee'} is assigned twice in ${target.label}.`);
      continue;
    }
    seenInSameShift.add(slot.employeeId);
  }

  for (const slot of targetSlots) {
    const employee = getEmployeeById(slot.employeeId, employees);

    for (const other of getAssignmentRefsForDay(day)) {
      if (other.key === target.key) {
        continue;
      }

      if (other.category !== 'UNIT') {
        continue;
      }

      const otherSlots = getAssignedSlotsForAssignment(other.category, other.shift);

      if (otherSlots.some((otherSlot) => otherSlot.employeeId === slot.employeeId)) {
        messages.push(`${employee?.name ?? 'Employee'} is also assigned to ${other.label} on the same day.`);
      }
    }
  }

  return Array.from(new Set(messages));
}

function getVehicleConflictMessages(day: DaySchedule, target: AssignmentRef): string[] {
  if (!target.shift.vehicle) {
    return [];
  }

  const messages: string[] = [];

  for (const other of getAssignmentRefsForDay(day)) {
    if (other.key === target.key) {
      continue;
    }

    if (other.shift.vehicle && other.shift.vehicle === target.shift.vehicle) {
      messages.push(`Vehicle ${target.shift.vehicle} is also assigned to ${other.label} on the same day.`);
    }
  }

  return Array.from(new Set(messages));
}

function buildEmployeeDailyUnitSummary(scheduleData: ScheduleData, employeeId: string): Record<string, EmployeeDaySummary> {
  const summary: Record<string, EmployeeDaySummary> = {};

  for (const dateKey of Object.keys(scheduleData)) {
    const day = getDaySchedule(scheduleData, dateKey);
    let hours = 0;
    let hasShift = false;
    let hasExtendedApproval = false;

    for (const assignment of getAssignmentRefsForDay(day)) {
      if (assignment.category !== 'UNIT') {
        continue;
      }

      for (const slot of getAssignedSlotsForAssignment(assignment.category, assignment.shift)) {
        if (slot.employeeId === employeeId) {
          hasShift = true;
          hours += calculateSlotHours(slot.startTime, slot.endTime);
          if (assignment.shift.allowExtendedHours) {
            hasExtendedApproval = true;
          }
        }
      }
    }

    if (hasShift) {
      summary[dateKey] = {
        hours,
        hasShift,
        hasExtendedApproval,
      };
    }
  }

  return summary;
}

function getChainHours(summary: Record<string, EmployeeDaySummary>, targetDateKey: string): { totalHours: number; hasApproval: boolean } {
  const targetDate = parseDateKey(targetDateKey);
  let totalHours = summary[targetDateKey]?.hours ?? 0;
  let hasApproval = summary[targetDateKey]?.hasExtendedApproval ?? false;

  let cursor = addDays(targetDate, -1);
  while (true) {
    const key = toDateKey(cursor);
    if (!summary[key]?.hasShift) {
      break;
    }
    totalHours += summary[key].hours;
    hasApproval = hasApproval || summary[key].hasExtendedApproval;
    cursor = addDays(cursor, -1);
  }

  cursor = addDays(targetDate, 1);
  while (true) {
    const key = toDateKey(cursor);
    if (!summary[key]?.hasShift) {
      break;
    }
    totalHours += summary[key].hours;
    hasApproval = hasApproval || summary[key].hasExtendedApproval;
    cursor = addDays(cursor, 1);
  }

  return { totalHours, hasApproval };
}

function getContinuousHoursResult(
  scheduleData: ScheduleData,
  dateKey: string,
  target: AssignmentRef,
  employees: EmployeeOption[],
): ContinuousHoursResult {
  if (target.category !== 'UNIT') {
    return { warnings: [], approvals: [] };
  }

  const warnings: string[] = [];
  const approvals: string[] = [];
  const slots = getAssignedSlotsForAssignment(target.category, target.shift);

  for (const slot of slots) {
    const employee = getEmployeeById(slot.employeeId, employees);
    const summary = buildEmployeeDailyUnitSummary(scheduleData, slot.employeeId);
    const { totalHours, hasApproval } = getChainHours(summary, dateKey);

    if (totalHours > 48) {
      if (hasApproval) {
        approvals.push(
          `${employee?.name ?? 'Employee'} is scheduled for ${formatHours(totalHours)} continuous hours, and extended hours are approved.`,
        );
      } else {
        warnings.push(
          `${employee?.name ?? 'Employee'} would reach ${formatHours(totalHours)} continuous scheduled hours across consecutive days.`,
        );
      }
    }
  }

  return {
    warnings: Array.from(new Set(warnings)),
    approvals: Array.from(new Set(approvals)),
  };
}

function getRequiredNoteMessages(target: AssignmentRef, employees: EmployeeOption[]): string[] {
  const messages: string[] = [];

  const slots = getAssignedSlotsForAssignment(target.category, target.shift);
  for (const slot of slots) {
    if (requiresSupervisorNote(slot) && !slot.note.trim()) {
      const employee = getEmployeeById(slot.employeeId, employees);
      messages.push(`${employee?.name ?? 'Employee'} has a custom end time and requires a supervisor note.`);
    }
  }

  return Array.from(new Set(messages));
}

function getCertificationMessages(target: AssignmentRef, employees: EmployeeOption[]): string[] {
  const messages: string[] = [];

  for (const slot of getAssignedSlotsForAssignment(target.category, target.shift)) {
    const employee = getEmployeeById(slot.employeeId, employees);
    if (!employee) {
      continue;
    }

    const issues = getEmployeeCertificationIssues(employee);
    if (issues.length > 0) {
      messages.push(`${employee.name} has missing or expired required credentials: ${issues.join(', ')}.`);
    }
  }

  return Array.from(new Set(messages));
}

function getAssignmentHoursForEmployeeOnDate(
  scheduleData: ScheduleData,
  dateKey: string,
  employeeId: string,
  excludedAssignmentKey?: string,
): number {
  const day = getDaySchedule(scheduleData, dateKey);
  let hours = 0;

  for (const assignment of getAssignmentRefsForDay(day)) {
    if (assignment.category !== 'UNIT') {
      continue;
    }

    if (excludedAssignmentKey && assignment.key === excludedAssignmentKey) {
      continue;
    }

    for (const slot of getAssignedSlotsForAssignment(assignment.category, assignment.shift)) {
      if (slot.employeeId === employeeId) {
        hours += calculateSlotHours(slot.startTime, slot.endTime);
      }
    }
  }

  return hours;
}

function getEmployeePayPeriodHours(
  scheduleData: ScheduleData,
  dateKey: string,
  employeeId: string,
  excludedAssignmentKey?: string,
): number {
  const payPeriod = getPayPeriodInfo(parseDateKey(dateKey));
  let hours = 0;

  for (let cursor = new Date(payPeriod.start); cursor <= payPeriod.end; cursor = addDays(cursor, 1)) {
    const currentDateKey = toDateKey(cursor);
    const day = getDaySchedule(scheduleData, currentDateKey);

    for (const assignment of getAssignmentRefsForDay(day)) {
      if (excludedAssignmentKey && currentDateKey === dateKey && assignment.key === excludedAssignmentKey) {
        continue;
      }

      for (const slot of getAssignedSlotsForAssignment(assignment.category, assignment.shift)) {
        if (slot.employeeId === employeeId) {
          hours += calculateSlotHours(slot.startTime, slot.endTime);
        }
      }
    }
  }

  return hours;
}

function getEligibilityForEmployee(
  scheduleData: ScheduleData,
  dateKey: string,
  employeeId: string,
  target: AssignmentRef,
  employees: EmployeeOption[],
  excludedAssignmentKey?: string,
): EligibilityResult {
  const employee = getEmployeeById(employeeId, employees);
  if (!employee) {
    return { eligible: false, reason: 'employee not found' };
  }

  if (employee.status && employee.status !== 'Active') {
    return { eligible: false, reason: `status: ${employee.status}` };
  }

  const certificationIssues = getEmployeeCertificationIssues(employee);
  if (certificationIssues.length > 0) {
    return { eligible: false, reason: `missing/expired: ${certificationIssues.join(', ')}` };
  }

  if (target.category === 'SUPERVISOR' && employee.role !== 'Supervisor') {
    return { eligible: false, reason: 'supervisor shift requires supervisor role' };
  }

  const sameDayHours = getAssignmentHoursForEmployeeOnDate(scheduleData, dateKey, employeeId, excludedAssignmentKey);
  if (sameDayHours > 0) {
    return { eligible: false, reason: 'already scheduled that day' };
  }

  if (target.category !== 'UNIT') {
    return { eligible: true, reason: '' };
  }

  const summary = buildEmployeeDailyUnitSummary(scheduleData, employeeId);
  const targetAssignmentHours = getAssignedSlotsForAssignment(target.category, target.shift)
    .filter((slot) => slot.employeeId === employeeId)
    .reduce((total, slot) => total + calculateSlotHours(slot.startTime, slot.endTime), 0);

  const hasCurrentDayExistingHours = summary[dateKey]?.hours ?? 0;
  const adjustedCurrentDayHours = Math.max(hasCurrentDayExistingHours - targetAssignmentHours, 0);

  summary[dateKey] = {
    hours: adjustedCurrentDayHours + 24,
    hasShift: true,
    hasExtendedApproval: summary[dateKey]?.hasExtendedApproval ?? false,
  };

  const { totalHours, hasApproval } = getChainHours(summary, dateKey);

  if (totalHours > 48 && !hasApproval) {
    return {
      eligible: true,
      reason: '',
      warning: `would exceed 48 continuous hours (${formatHours(totalHours)}h)`,
    };
  }

  return { eligible: true, reason: '' };
}

function createExtraShiftId(): string {
  return `extra-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SchedulePage() {
  const [anchorDate, setAnchorDate] = useState<Date>(() => getGlobalPayPeriodStart(new Date()));
  const [payPeriodReady, setPayPeriodReady] = useState(false);
  const [scheduleData, setScheduleData] = useState<ScheduleData>({});
  const scheduleDataRef = useRef<ScheduleData>({});
  const [mounted, setMounted] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Schedule loaded.');
  const [openShiftRequests, setOpenShiftRequests] = useState<OpenShiftRequest[]>([]);
  const [showPendingOpenShiftRequests, setShowPendingOpenShiftRequests] = useState(false);
  const [showRecentOpenShiftDecisions, setShowRecentOpenShiftDecisions] = useState(false);

  function markUnsavedChanges() {
    setHasUnsavedChanges(true);
    setSaveStatus('Unsaved changes. Click Confirm Changes to save.');
  }

  function setScheduleDataSafely(updater: ScheduleData | ((current: ScheduleData) => ScheduleData)) {
    setScheduleData((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      scheduleDataRef.current = next;
      return next;
    });
  }

  useEffect(() => {
    scheduleDataRef.current = scheduleData;
  }, [scheduleData]);

  useEffect(() => {
    const currentPayPeriodStart = getGlobalPayPeriodStart(new Date());
    setAnchorDate(currentPayPeriodStart);
    setPayPeriodReady(true);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      try {
        try {
          const openShiftRaw = window.localStorage.getItem(OPEN_SHIFT_REQUESTS_STORAGE_KEY);
          if (openShiftRaw && isActive) {
            setOpenShiftRequests(JSON.parse(openShiftRaw));
          }
        } catch (openShiftError) {
          console.error('Failed to load open shift requests:', openShiftError);
        }

        loadEmployeesFromSupabase()
          .then((loadedEmployees) => {
            if (isActive) setEmployees(loadedEmployees);
          })
          .catch((error) => {
            console.error('Failed to load employees from Supabase. Using local fallback:', error);
            if (isActive) setEmployees(loadEmployeesFromProfiles());
          });

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

          const day = rebuilt[dateKey];
          const savedEmployeeId = row.is_open_slot
            ? row.open_slot_scope === 'ALS'
              ? OPEN_ALS_SLOT_ID
              : row.open_slot_scope === 'BLS'
                ? OPEN_BLS_SLOT_ID
                : ''
            : row.employee_id ?? '';

          const slot: EmployeeSlot = {
            employeeId: savedEmployeeId,
            startTime: row.start_time || DEFAULT_START_TIME,
            endTime: row.end_time || DEFAULT_END_TIME,
            note: row.note || '',
          };

          if (String(row.shift_key).startsWith('EXTRA::')) {
            const [, categoryText, extraId] = String(row.shift_key).split('::');
            const category: ShiftCategory = categoryText === 'SUPERVISOR' ? 'SUPERVISOR' : 'UNIT';
            let extra = day.extras.find((item) => item.id === extraId);

            if (!extra) {
              extra = {
                id: extraId || createExtraShiftId(),
                label: row.shift_label || 'Extra Shift',
                category,
                employee1: createEmptyEmployeeSlot(),
                employee2: createEmptyEmployeeSlot(),
                employee3: createEmptyEmployeeSlot(),
                showEmployee3: false,
                vehicle: (row.vehicle || '') as VehicleValue,
                allowExtendedHours: Boolean(row.allow_extended_hours),
              };
              day.extras.push(extra);
            }

            extra.label = row.shift_label || extra.label;
            extra.category = category;
            extra.vehicle = (row.vehicle || '') as VehicleValue;
            extra.allowExtendedHours = Boolean(row.allow_extended_hours);

            if (row.slot_number === 1) extra.employee1 = slot;
            if (row.slot_number === 2) extra.employee2 = slot;
            if (row.slot_number === 3) {
              extra.employee3 = slot;
              extra.showEmployee3 = Boolean(slot.employeeId);
            }
          } else {
            const shiftName = row.shift_key as ShiftName;
            if (!day.standard[shiftName]) {
              continue;
            }

            const shift = day.standard[shiftName];
            shift.vehicle = (row.vehicle || '') as VehicleValue;
            shift.allowExtendedHours = Boolean(row.allow_extended_hours);

            if (row.slot_number === 1) shift.employee1 = slot;
            if (row.slot_number === 2) shift.employee2 = slot;
            if (row.slot_number === 3) {
              shift.employee3 = slot;
              shift.showEmployee3 = Boolean(slot.employeeId);
            }
          }
        }

        if (isActive) {
          setScheduleDataSafely(normalizeLoadedData(rebuilt));
        }
      } catch (error) {
        console.error('Failed to load schedule from Supabase:', error);
      } finally {
        if (isActive) setMounted(true);
      }
    };

    loadData();

    return () => {
      isActive = false;
    };
  }, []);

  function hasMeaningfulSlotData(slot: EmployeeSlot, shiftName?: ShiftName, slotKey?: 'employee1' | 'employee2' | 'employee3'): boolean {
    const defaultEndTime = getDefaultEndTimeForShift(shiftName, slotKey);
    return Boolean(
      slot.employeeId ||
        normalizeMilitaryTime(slot.startTime, DEFAULT_START_TIME) !== DEFAULT_START_TIME ||
        normalizeMilitaryTime(slot.endTime, defaultEndTime) !== defaultEndTime ||
        slot.note?.trim(),
    );
  }

  function buildAssignmentRow(params: {
    dateKey: string;
    shiftKey: string;
    shiftLabel: string;
    slotNumber: number;
    slot: EmployeeSlot;
    vehicle: VehicleValue;
    allowExtendedHours: boolean;
    defaultEndTime?: string;
  }) {
    const isOpenSlot = isOpenShiftSlot(params.slot.employeeId);

    return {
      id: `${params.dateKey}-${params.shiftKey}-${params.slotNumber}`,
      schedule_id: params.dateKey,
      date_key: params.dateKey,
      shift_key: params.shiftKey,
      shift_label: params.shiftLabel,
      slot_number: params.slotNumber,
      employee_id: isOpenSlot ? null : params.slot.employeeId || null,
      start_time: normalizeMilitaryTime(params.slot.startTime, DEFAULT_START_TIME),
      end_time: normalizeMilitaryTime(params.slot.endTime, params.defaultEndTime ?? DEFAULT_END_TIME),
      note: params.slot.note || '',
      vehicle: params.vehicle || '',
      allow_extended_hours: Boolean(params.allowExtendedHours),
      is_open_slot: isOpenSlot,
      open_slot_scope: params.slot.employeeId === OPEN_ALS_SLOT_ID ? 'ALS' : params.slot.employeeId === OPEN_BLS_SLOT_ID ? 'BLS' : null,
      updated_at: new Date().toISOString(),
    };
  }

  async function saveScheduleToSupabase() {
    if (!mounted) {
      return;
    }

    setSaveStatus('Saving schedule changes...');

    try {
      const normalizedSchedule = normalizeLoadedData(scheduleDataRef.current);

      for (const [dateKey, day] of Object.entries(normalizedSchedule)) {
        const { error: scheduleError } = await supabase.from('schedules').upsert({
          id: dateKey,
          date_key: dateKey,
          updated_at: new Date().toISOString(),
        });

        if (scheduleError) {
          throw scheduleError;
        }

        const rows: any[] = [];

        for (const shiftName of SHIFT_ORDER) {
          const shift = day.standard[shiftName];
          const slots: Array<['employee1' | 'employee2' | 'employee3', EmployeeSlot]> = [
            ['employee1', shift.employee1],
            ['employee2', shift.employee2],
            ['employee3', shift.employee3],
          ];

          rows.push({
            id: `${dateKey}-${shiftName}-0`,
            schedule_id: dateKey,
            date_key: dateKey,
            shift_key: shiftName,
            shift_label: SHIFT_DISPLAY_NAMES[shiftName],
            slot_number: 0,
            employee_id: null,
            start_time: DEFAULT_START_TIME,
            end_time: getDefaultEndTimeForShift(shiftName, 'employee1'),
            note: '',
            vehicle: shift.vehicle || '',
            allow_extended_hours: Boolean(shift.allowExtendedHours),
            is_open_slot: false,
            open_slot_scope: null,
            updated_at: new Date().toISOString(),
          });

          slots.forEach(([slotKey, slot], index) => {
            if (SUPERVISOR_SHIFTS.has(shiftName) && slotKey !== 'employee1') {
              return;
            }

            if (!hasMeaningfulSlotData(slot, shiftName, slotKey)) {
              return;
            }

            rows.push(
              buildAssignmentRow({
                dateKey,
                shiftKey: shiftName,
                shiftLabel: SHIFT_DISPLAY_NAMES[shiftName],
                slotNumber: index + 1,
                slot,
                vehicle: shift.vehicle || '',
                allowExtendedHours: Boolean(shift.allowExtendedHours),
                defaultEndTime: getDefaultEndTimeForShift(shiftName, slotKey),
              }),
            );
          });
        }

        for (const extra of day.extras) {
          const extraShiftKey = `EXTRA::${extra.category}::${extra.id}`;
          const slots: Array<['employee1' | 'employee2' | 'employee3', EmployeeSlot]> = [
            ['employee1', extra.employee1],
            ['employee2', extra.employee2],
            ['employee3', extra.employee3],
          ];

          rows.push({
            id: `${dateKey}-${extraShiftKey}-0`,
            schedule_id: dateKey,
            date_key: dateKey,
            shift_key: extraShiftKey,
            shift_label: extra.label,
            slot_number: 0,
            employee_id: null,
            start_time: DEFAULT_START_TIME,
            end_time: DEFAULT_END_TIME,
            note: '',
            vehicle: extra.vehicle || '',
            allow_extended_hours: Boolean(extra.allowExtendedHours),
            is_open_slot: false,
            open_slot_scope: null,
            updated_at: new Date().toISOString(),
          });

          slots.forEach(([slotKey, slot], index) => {
            if (extra.category === 'SUPERVISOR' && slotKey !== 'employee1') {
              return;
            }

            if (!hasMeaningfulSlotData(slot)) {
              return;
            }

            rows.push(
              buildAssignmentRow({
                dateKey,
                shiftKey: extraShiftKey,
                shiftLabel: extra.label,
                slotNumber: index + 1,
                slot,
                vehicle: extra.vehicle || '',
                allowExtendedHours: Boolean(extra.allowExtendedHours),
              }),
            );
          });
        }

        const { error: deleteError } = await supabase
          .from('schedule_assignments')
          .delete()
          .eq('date_key', dateKey);

        if (deleteError) {
          throw deleteError;
        }

        if (rows.length > 0) {
          const { error: assignmentError } = await supabase.from('schedule_assignments').upsert(rows, { onConflict: 'id' });

          if (assignmentError) {
            throw assignmentError;
          }
        }
      }

      setHasUnsavedChanges(false);
      setSaveStatus(`Schedule saved at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`);
    } catch (error) {
      console.error('Supabase schedule save failed:', error);
      setSaveStatus('Schedule save failed. Check console and try again.');
      window.alert('Schedule save failed. Please check the console for details and try again.');
    }
  }


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
    window.localStorage.setItem(OPEN_SHIFT_REQUESTS_STORAGE_KEY, JSON.stringify(nextRequests));
  }

  function saveAutomatedOpenShiftMessage(request: OpenShiftRequest, status: 'APPROVED' | 'DENIED') {
    const createdAt = new Date().toISOString();
    const title = status === 'APPROVED' ? 'Open shift request approved' : 'Open shift request denied';
    const body =
      status === 'APPROVED'
        ? `Your open shift request for ${request.shiftLabel} on ${request.dateKey} was approved. The schedule has been updated automatically.`
        : `Your open shift request for ${request.shiftLabel} on ${request.dateKey} was denied. Please contact a supervisor if you have questions.`;

    const message: ApolloMessage = {
      id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      conversationId: `conversation-open-shift-${request.id}`,
      senderId: 'APOLLO_SYSTEM',
      senderName: 'Apollo System',
      senderRole: 'SUPERVISOR',
      recipients: [
        {
          employeeId: request.employeeId,
          deliveredAt: createdAt,
          readAt: null,
        },
      ],
      audienceLabel: request.employeeName,
      title,
      body,
      createdAt,
      relatedType: 'SCHEDULE',
      priority: 'NORMAL',
    };

    try {
      const rawMessages = window.localStorage.getItem(APOLLO_MESSAGES_STORAGE_KEY);
      const existingMessages = rawMessages ? (JSON.parse(rawMessages) as ApolloMessage[]) : [];
      window.localStorage.setItem(APOLLO_MESSAGES_STORAGE_KEY, JSON.stringify([message, ...existingMessages]));
    } catch (error) {
      console.error('Failed to save automated open shift message:', error);
    }
  }

  function assignApprovedOpenShiftRequest(current: ScheduleData, request: OpenShiftRequest): { next: ScheduleData; assigned: boolean } {
    const next = cloneScheduleData(normalizeLoadedData(current));
    const dateKey = request.dateKey;
    next[dateKey] = next[dateKey] ?? createEmptyDaySchedule();

    const employee = employees.find((item) => item.id === request.employeeId);
    const preferredOpenSlotId = employee?.scope === 'BLS' ? OPEN_BLS_SLOT_ID : OPEN_ALS_SLOT_ID;
    const fallbackOpenSlotId = preferredOpenSlotId === OPEN_ALS_SLOT_ID ? OPEN_BLS_SLOT_ID : OPEN_ALS_SLOT_ID;

    const assignIntoShift = (shift: ShiftAssignment | ExtraShiftAssignment, shiftName?: ShiftName): boolean => {
      const slotKeys: Array<'employee1' | 'employee2' | 'employee3'> = ['employee1', 'employee2', 'employee3'];
      const isSupervisorShift = shiftName ? SUPERVISOR_SHIFTS.has(shiftName) : 'category' in shift && shift.category === 'SUPERVISOR';
      const availableSlotKeys = isSupervisorShift ? slotKeys.slice(0, 1) : slotKeys;

      let targetSlotKey = availableSlotKeys.find((slotKey) => shift[slotKey].employeeId === preferredOpenSlotId);
      targetSlotKey = targetSlotKey ?? availableSlotKeys.find((slotKey) => shift[slotKey].employeeId === fallbackOpenSlotId);
      targetSlotKey = targetSlotKey ?? availableSlotKeys.find((slotKey) => !shift[slotKey].employeeId);

      if (!targetSlotKey && !isSupervisorShift && !shift.showEmployee3) {
        shift.showEmployee3 = true;
        targetSlotKey = 'employee3';
      }

      if (!targetSlotKey) {
        return false;
      }

      const existingSlot = shift[targetSlotKey];
      shift[targetSlotKey] = {
        ...existingSlot,
        employeeId: request.employeeId,
        startTime: existingSlot.startTime || DEFAULT_START_TIME,
        endTime: existingSlot.endTime || getDefaultEndTimeForShift(shiftName, targetSlotKey),
        note: existingSlot.note || `Approved open shift request on ${new Date().toLocaleDateString('en-US')}.`,
      };

      if (targetSlotKey === 'employee3') {
        shift.showEmployee3 = true;
      }

      return true;
    };

    if (request.shiftKey.startsWith('EXTRA::')) {
      const extraId = request.shiftKey.split('::')[2];
      const extra = next[dateKey].extras.find((item) => item.id === extraId || request.shiftKey.endsWith(item.id));
      return { next, assigned: extra ? assignIntoShift(extra) : false };
    }

    const rawShiftKey = request.shiftKey.replace(/^standard-/, '');
    const standardShiftKey = (
      SHIFT_ORDER.find((shiftName) =>
        shiftName === rawShiftKey ||
        SHIFT_DISPLAY_NAMES[shiftName] === request.shiftLabel ||
        SHIFT_DISPLAY_NAMES[shiftName] === request.shiftKey
      ) ?? rawShiftKey
    ) as ShiftName;

    const standardShift = next[dateKey].standard[standardShiftKey];
    return { next, assigned: standardShift ? assignIntoShift(standardShift, standardShiftKey) : false };
  }

  async function updateOpenShiftRequestStatus(requestId: string, status: OpenShiftRequest['status']) {
    const request = openShiftRequests.find((item) => item.id === requestId);
    if (!request || status === 'PENDING') return;

    const confirmed =
      status === 'APPROVED'
        ? window.confirm(`Approve ${request.employeeName} for ${request.shiftLabel} on ${request.dateKey}? This will automatically update the schedule and send the employee a message.`)
        : window.confirm(`Deny ${request.employeeName}'s request for ${request.shiftLabel} on ${request.dateKey}? This will send the employee a message.`);

    if (!confirmed) return;

    let approvedScheduleAssigned = false;
    if (status === 'APPROVED') {
      const assignmentResult = assignApprovedOpenShiftRequest(scheduleDataRef.current, request);
      approvedScheduleAssigned = assignmentResult.assigned;

      if (!approvedScheduleAssigned) {
        window.alert('Apollo could not find an available open slot for this request. The request was not approved. Please assign the employee manually first.');
        return;
      }

      setScheduleDataSafely(assignmentResult.next);
    }

    const nextRequests = openShiftRequests.map((item) =>
      item.id === requestId
        ? {
            ...item,
            status,
            supervisorNote:
              status === 'APPROVED'
                ? 'Approved by supervisor. Schedule updated automatically.'
                : 'Denied by supervisor.',
          }
        : item,
    );

    saveOpenShiftRequests(nextRequests);
    saveAutomatedOpenShiftMessage(request, status);
    setShowRecentOpenShiftDecisions(true);

    if (status === 'APPROVED') {
      setSaveStatus('Saving approved open shift assignment...');
      await saveScheduleToSupabase();
      setHasUnsavedChanges(false);
    }
  }

  const visiblePayPeriod = useMemo(() => getPayPeriodInfo(anchorDate), [anchorDate]);
  const visiblePayPeriodStartKey = toDateKey(visiblePayPeriod.start);
  const dates = useMemo(
    () => Array.from({ length: 14 }, (_, index) => addDays(visiblePayPeriod.start, index)),
    [visiblePayPeriodStartKey],
  );

  const goToCurrentPayPeriod = () => {
    setAnchorDate(getGlobalPayPeriodStart(new Date()));
    setPayPeriodReady(true);
  };
  const visibleYear = visiblePayPeriod.end.getFullYear();
  const payPeriodOptions = useMemo(() => {
    const years = [visibleYear - 1, visibleYear, visibleYear + 1];
    return years.flatMap((year) =>
      getPayPeriodsForYear(year).map((payPeriod) => ({
        year,
        ...payPeriod,
      })),
    );
  }, [visibleYear]);
  const selectedPayPeriodValue = `${visibleYear}|${toDateKey(visiblePayPeriod.start)}`;

  useEffect(() => {
    setScheduleDataSafely((current) => {
      let next = current;
      for (const date of dates) {
        next = ensureDateExists(next, toDateKey(date));
      }
      return normalizeLoadedData(next);
    });
  }, [dates]);

  const handleStandardShiftChange = (
    dateKey: string,
    shiftName: ShiftName,
    field: 'showEmployee3' | 'vehicle' | 'allowExtendedHours',
    value: string | boolean,
  ) => {
    markUnsavedChanges();
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      if (!next[dateKey]) {
        next[dateKey] = createEmptyDaySchedule();
      }

      const shift = next[dateKey].standard[shiftName];
      (shift[field] as string | boolean) = value;

      if (SUPERVISOR_SHIFTS.has(shiftName)) {
        shift.employee2 = createEmptyEmployeeSlot();
        shift.employee3 = createEmptyEmployeeSlot();
        shift.showEmployee3 = false;
      }

      return next;
    });
  };

  const handleStandardSlotChange = (
    dateKey: string,
    shiftName: ShiftName,
    slotKey: 'employee1' | 'employee2' | 'employee3',
    field: keyof EmployeeSlot,
    value: string,
  ) => {
    markUnsavedChanges();
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      if (!next[dateKey]) {
        next[dateKey] = createEmptyDaySchedule();
      }

      const shift = next[dateKey].standard[shiftName];
      shift[slotKey][field] = value;

      if (field === 'employeeId' && value && shiftName === 'ADMIN_SUP' && slotKey === 'employee1') {
        shift[slotKey].startTime = '06:00';
        shift[slotKey].endTime = '18:00';
      }

      if (field === 'employeeId' && !value) {
        shift[slotKey].startTime = DEFAULT_START_TIME;
        shift[slotKey].endTime = getDefaultEndTimeForShift(shiftName, slotKey);
        shift[slotKey].note = '';
      }

      return next;
    });
  };

  const handleExtraShiftChange = (
    dateKey: string,
    extraId: string,
    field: keyof ExtraShiftAssignment,
    value: string | boolean,
  ) => {
    markUnsavedChanges();
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      if (!next[dateKey]) {
        next[dateKey] = createEmptyDaySchedule();
      }

      const extra = next[dateKey].extras.find((item) => item.id === extraId);
      if (!extra) {
        return current;
      }

      (extra[field] as string | boolean) = value;

      if (field === 'category' && value === 'SUPERVISOR') {
        extra.employee2 = createEmptyEmployeeSlot();
        extra.employee3 = createEmptyEmployeeSlot();
        extra.showEmployee3 = false;
      }

      return next;
    });
  };

  const handleExtraSlotChange = (
    dateKey: string,
    extraId: string,
    slotKey: 'employee1' | 'employee2' | 'employee3',
    field: keyof EmployeeSlot,
    value: string,
  ) => {
    markUnsavedChanges();
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      if (!next[dateKey]) {
        next[dateKey] = createEmptyDaySchedule();
      }

      const extra = next[dateKey].extras.find((item) => item.id === extraId);
      if (!extra) {
        return current;
      }

      extra[slotKey][field] = value;

      if (field === 'employeeId' && !value) {
        extra[slotKey].startTime = DEFAULT_START_TIME;
        extra[slotKey].endTime = DEFAULT_END_TIME;
        extra[slotKey].note = '';
      }

      return next;
    });
  };

  const handleAddEmployeeSlot = (dateKey: string, shiftName: ShiftName) => {
    handleStandardShiftChange(dateKey, shiftName, 'showEmployee3', true);
  };

  const handleAddEmployeeSlotToExtra = (dateKey: string, extraId: string) => {
    handleExtraShiftChange(dateKey, extraId, 'showEmployee3', true);
  };

  const handleAddShift = (dateKey: string) => {
    const label = window.prompt('Enter the extra shift name (example: Standby or LDT):', 'Standby');
    if (!label || !label.trim()) {
      return;
    }

    const typeInput = window.prompt('Enter shift type: UNIT or SUPERVISOR', 'UNIT');
    const category: ShiftCategory = typeInput?.trim().toUpperCase() === 'SUPERVISOR' ? 'SUPERVISOR' : 'UNIT';

    markUnsavedChanges();
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      if (!next[dateKey]) {
        next[dateKey] = createEmptyDaySchedule();
      }

      next[dateKey].extras.push({
        id: createExtraShiftId(),
        label: label.trim(),
        category,
        employee1: createEmptyEmployeeSlot(),
        employee2: createEmptyEmployeeSlot(),
        employee3: createEmptyEmployeeSlot(),
        showEmployee3: false,
        vehicle: '',
        allowExtendedHours: false,
      });

      return next;
    });
  };

  const handleRemoveExtraShift = (dateKey: string, extraId: string, label: string) => {
    const confirmed = window.confirm(`Remove extra shift "${label}" from this day?`);
    if (!confirmed) {
      return;
    }

    markUnsavedChanges();
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      if (!next[dateKey]) {
        return current;
      }

      next[dateKey].extras = next[dateKey].extras.filter((item) => item.id !== extraId);
      return next;
    });
  };

  const handleCopyPreviousDay = (dateKey: string, previousDateKey: string) => {
    markUnsavedChanges();
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      const previousDay = getDaySchedule(next, previousDateKey);
      next[dateKey] = JSON.parse(JSON.stringify(previousDay)) as DaySchedule;

      for (const shiftName of SHIFT_ORDER) {
        if (SUPERVISOR_SHIFTS.has(shiftName)) {
          next[dateKey].standard[shiftName].employee2 = createEmptyEmployeeSlot();
          next[dateKey].standard[shiftName].employee3 = createEmptyEmployeeSlot();
          next[dateKey].standard[shiftName].showEmployee3 = false;
        }
      }

      next[dateKey].extras = next[dateKey].extras.map((extra) => {
        if (extra.category === 'SUPERVISOR') {
          return {
            ...extra,
            employee2: createEmptyEmployeeSlot(),
            employee3: createEmptyEmployeeSlot(),
            showEmployee3: false,
          };
        }
        return extra;
      });

      return next;
    });
  };


  const handlePayPeriodChange = (value: string) => {
    const [, startDateKey] = value.split('|');
    if (!startDateKey) {
      return;
    }

    setAnchorDate(getGlobalPayPeriodStart(parseDateKey(startDateKey)));
  };

  function renderEmployeeSlotEditor(
    slot: EmployeeSlot,
    slotLabel: string,
    isVisible: boolean,
    onChange: (field: keyof EmployeeSlot, value: string) => void,
    eligibilityMap: Record<string, EligibilityResult>,
    payPeriodHoursMap: Record<string, number>,
    requestContext?: { dateKey: string; shiftKey: string; shiftLabel: string },
  ) {
    if (!isVisible) {
      return null;
    }

    const slotHours = slot.employeeId ? calculateSlotHours(slot.startTime, slot.endTime) : 0;
    const noteRequired = requiresSupervisorNote(slot);
    const requestedEmployeeIds = requestContext
      ? pendingOpenShiftRequests
          .filter((request) => {
            const sameDate = request.dateKey === requestContext.dateKey;
            const sameShift = request.shiftKey === requestContext.shiftKey || request.shiftLabel === requestContext.shiftLabel;
            return sameDate && sameShift;
          })
          .map((request) => request.employeeId)
      : [];
    const requestedEmployeeIdSet = new Set(requestedEmployeeIds);
    const requestedEmployees = requestedEmployeeIds
      .map((employeeId) => employees.find((employee) => employee.id === employeeId))
      .filter((employee): employee is EmployeeOption => Boolean(employee));

    const baseEligibleEmployees = sortEmployeesByAwardPriority(
      employees.filter((employee) => {
        const eligibility = eligibilityMap[employee.id] ?? { eligible: true, reason: '' };
        const isCurrentSelection = slot.employeeId === employee.id;
        return eligibility.eligible || isCurrentSelection;
      }),
      payPeriodHoursMap,
    );
    const eligibleEmployees = [
      ...requestedEmployees,
      ...baseEligibleEmployees.filter((employee) => !requestedEmployeeIdSet.has(employee.id)),
    ];
    const recommendedEmployee = baseEligibleEmployees.find((employee) => eligibilityMap[employee.id]?.eligible !== false) ?? null;
    const isOpenSlotSelection = isOpenShiftSlot(slot.employeeId);
    const selectedEmployee = slot.employeeId && !isOpenSlotSelection ? getEmployeeById(slot.employeeId, employees) : null;
    const selectedEligibility = slot.employeeId && !isOpenSlotSelection ? eligibilityMap[slot.employeeId] : null;
    const isLowerPrioritySelection = Boolean(
      slot.employeeId && !isOpenSlotSelection && recommendedEmployee && slot.employeeId !== recommendedEmployee.id,
    );

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{slotLabel}</label>
          <div className="flex items-center gap-2">
            {requestedEmployees.length > 0 && !slot.employeeId && (
              <div className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                Requested: {requestedEmployees.map((employee) => employee.name).join(', ')}
              </div>
            )}
            {recommendedEmployee && !slot.employeeId && (
              <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Recommended: {recommendedEmployee.name}
              </div>
            )}
            {slot.employeeId ? (
              <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {formatHours(slotHours)}h
              </div>
            ) : (
              <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">0h</div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <select
            value={slot.employeeId}
            onChange={(event) => onChange('employeeId', event.target.value)}
            className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-slate-500 ${
              slot.employeeId === OPEN_ALS_SLOT_ID
                ? 'border-blue-200 bg-blue-50 text-blue-800'
                : slot.employeeId === OPEN_BLS_SLOT_ID
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-slate-300 bg-white text-slate-900'
            }`}
          >
            <option value="">Select employee</option>
            <option value={OPEN_ALS_SLOT_ID}>Open ALS</option>
            <option value={OPEN_BLS_SLOT_ID}>Open BLS</option>
            {eligibleEmployees.map((employee) => {
              const payPeriodHours = payPeriodHoursMap[employee.id] ?? 0;
              const eligibility = eligibilityMap[employee.id] ?? { eligible: true, reason: '' };
              const isRecommended = recommendedEmployee?.id === employee.id;
              const isRequested = requestedEmployeeIdSet.has(employee.id);
              const label = `${employee.name} — PP ${formatHours(payPeriodHours)}h — ${getAwardBucketLabel(
                employee.employeeType,
                payPeriodHours,
              )}${isRequested ? ' — Requested Shift' : ''}${isRecommended ? ' — Recommended' : ''}${eligibility.warning ? ` — Warning: ${eligibility.warning}` : ''}`;

              return (
                <option key={employee.id} value={employee.id}>
                  {label}
                </option>
              );
            })}
          </select>

          {slot.employeeId && selectedEligibility?.warning && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-800">
              {selectedEligibility.warning}
            </div>
          )}

          {isLowerPrioritySelection && recommendedEmployee && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-800">
              Higher priority employee available: {recommendedEmployee.name}. Selection is still allowed, but should be treated as a supervisor override if used.
            </div>
          )}

          {slot.employeeId && selectedEligibility && !selectedEligibility.eligible && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-700">
              {selectedEmployee?.name ?? 'Selected employee'} is not eligible: {selectedEligibility.reason}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Start
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-2][0-9]:[0-5][0-9]"
                placeholder="06:00"
                value={slot.startTime}
                onChange={(event) => onChange('startTime', event.target.value)}
                onBlur={(event) => onChange('startTime', normalizeMilitaryTime(event.target.value, DEFAULT_START_TIME))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                End
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-2][0-9]:[0-5][0-9]"
                placeholder="06:00"
                value={slot.endTime}
                onChange={(event) => onChange('endTime', event.target.value)}
                onBlur={(event) => onChange('endTime', normalizeMilitaryTime(event.target.value, DEFAULT_END_TIME))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              />
            </div>
          </div>

          {showNotes && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Supervisor Note {noteRequired ? '(required)' : '(optional)'}
              </label>
              <textarea
                value={slot.note}
                onChange={(event) => onChange('note', event.target.value)}
                disabled={!slot.employeeId}
                rows={2}
                placeholder={noteRequired ? 'Explain why the end time is not 06:00' : 'Add note if needed'}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:opacity-50"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!payPeriodReady) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
        <div className="mx-auto max-w-[1900px] rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700 shadow-sm">
          Loading current pay period...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-[1900px]">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Apollo Schedule</h1>

            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[340px]">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Pay Period
                </label>
                <select
                  value={selectedPayPeriodValue}
                  onChange={(event) => handlePayPeriodChange(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-500"
                >
                  {payPeriodOptions.map((option) => (
                    <option key={`${option.year}-${toDateKey(option.start)}`} value={`${option.year}|${toDateKey(option.start)}`}>
                      {formatPayPeriodOptionLabel(option, option.year)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={saveScheduleToSupabase}
                disabled={!hasUnsavedChanges || saveStatus.startsWith('Saving')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  hasUnsavedChanges
                    ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                    : 'cursor-not-allowed bg-slate-200 text-slate-500'
                }`}
              >
                Confirm Changes
              </button>

              <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                hasUnsavedChanges ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              }`}>
                {saveStatus}
              </div>

              <button
                type="button"
                onClick={goToCurrentPayPeriod}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Current Pay Period
              </button>

              <button
                type="button"
                onClick={() => setShowNotes((s) => !s)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {showNotes ? 'Hide Shift Details' : 'Show Shift Details'}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <div className={`rounded-2xl border p-4 shadow-sm ${pendingOpenShiftRequests.length > 0 ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
            <button
              type="button"
              onClick={() => setShowPendingOpenShiftRequests((value) => !value)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <div className={`text-sm font-bold ${pendingOpenShiftRequests.length > 0 ? 'text-red-800' : 'text-slate-900'}`}>
                  Pending Open Shift Requests
                </div>
                <div className={`mt-1 text-xs ${pendingOpenShiftRequests.length > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                  {pendingOpenShiftRequests.length > 0
                    ? `${pendingOpenShiftRequests.length} request${pendingOpenShiftRequests.length === 1 ? '' : 's'} awaiting review.`
                    : 'No pending open shift requests.'}
                </div>
              </div>
              <span className={`rounded-xl px-3 py-2 text-xs font-bold ${pendingOpenShiftRequests.length > 0 ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {showPendingOpenShiftRequests ? 'Hide Details' : 'Show Details'}
              </span>
            </button>

            {showPendingOpenShiftRequests && (
              <div className="mt-4 space-y-3">
                {pendingOpenShiftRequests.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                    No pending open shift requests.
                  </div>
                ) : (
                  pendingOpenShiftRequests.map((request) => (
                    <div key={request.id} className="rounded-xl border border-red-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{request.employeeName}</div>
                          <div className="mt-1 text-sm text-slate-600">
                            {request.shiftLabel} • {request.dateKey}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Requested {new Date(request.requestedAt).toLocaleString('en-US', {
                              month: 'numeric',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => updateOpenShiftRequestStatus(request.id, 'DENIED')}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            Deny
                          </button>
                          <button
                            type="button"
                            onClick={() => updateOpenShiftRequestStatus(request.id, 'APPROVED')}
                            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => setShowRecentOpenShiftDecisions((value) => !value)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <div className="text-sm font-bold text-slate-900">Recent Open Shift Decisions</div>
                <div className="mt-1 text-xs text-slate-500">
                  {reviewedOpenShiftRequests.length > 0
                    ? `${reviewedOpenShiftRequests.length} reviewed request${reviewedOpenShiftRequests.length === 1 ? '' : 's'} available.`
                    : 'No reviewed open shift requests yet.'}
                </div>
              </div>
              <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                {showRecentOpenShiftDecisions ? 'Hide Details' : 'Show Details'}
              </span>
            </button>

            {showRecentOpenShiftDecisions && (
              <div className="mt-4 space-y-2">
                {reviewedOpenShiftRequests.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                    No reviewed open shift requests yet.
                  </div>
                ) : (
                  reviewedOpenShiftRequests.slice(0, 8).map((request) => (
                    <div key={request.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                      <span className="font-bold text-slate-900">{request.employeeName}</span>
                      <span className="text-slate-600"> — {request.shiftLabel} on {request.dateKey}</span>
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                          request.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="max-h-[78vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div key={visiblePayPeriodStartKey} className="grid min-w-[3900px] grid-cols-[180px_repeat(14,minmax(270px,1fr))]">
            <div className="sticky left-0 top-0 z-50 border-b border-r border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shift</div>
            </div>

            {dates.map((date, index) => {
              const dateKey = toDateKey(date);
              const previousDateKey = index > 0 ? toDateKey(dates[index - 1]) : '';

              return (
                <div key={dateKey} className="sticky top-0 z-30 border-b border-r border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{formatDayLabel(date)}</div>
                      <div className="mt-1 text-xs text-slate-500">{dateKey}</div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!previousDateKey) return;
                          handleCopyPreviousDay(dateKey, previousDateKey);
                        }}
                        disabled={!previousDateKey}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Copy Previous Day
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddShift(dateKey)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                      >
                        Add Shift
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {SHIFT_ORDER.map((shiftName) => (
              <React.Fragment key={shiftName}>
                <div className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white p-4">
                  <div className="flex h-full flex-col justify-center">
                    <div className="text-base font-bold text-slate-900">{SHIFT_DISPLAY_NAMES[shiftName]}</div>
                  </div>
                </div>

                {dates.map((date) => {
                  const dateKey = toDateKey(date);
                  const day = getDaySchedule(scheduleData, dateKey);
                  const shift = day.standard[shiftName];
                  const category: ShiftCategory = UNIT_SHIFTS.has(shiftName) ? 'UNIT' : 'SUPERVISOR';
                  const assignmentRef: AssignmentRef = {
                    key: `standard-${shiftName}`,
                    label: SHIFT_DISPLAY_NAMES[shiftName],
                    category,
                    shift,
                  };

                  const slotEligibilityMaps = {
                    employee1: Object.fromEntries(
                      employees.map((employee) => [
                        employee.id,
                        getEligibilityForEmployee(scheduleData, dateKey, employee.id, assignmentRef, employees, assignmentRef.key),
                      ]),
                    ) as Record<string, EligibilityResult>,
                    employee2: Object.fromEntries(
                      employees.map((employee) => [
                        employee.id,
                        getEligibilityForEmployee(scheduleData, dateKey, employee.id, assignmentRef, employees, assignmentRef.key),
                      ]),
                    ) as Record<string, EligibilityResult>,
                    employee3: Object.fromEntries(
                      employees.map((employee) => [
                        employee.id,
                        getEligibilityForEmployee(scheduleData, dateKey, employee.id, assignmentRef, employees, assignmentRef.key),
                      ]),
                    ) as Record<string, EligibilityResult>,
                  };

                  const payPeriodHoursMap = Object.fromEntries(
                    employees.map((employee) => [
                      employee.id,
                      getEmployeePayPeriodHours(scheduleData, dateKey, employee.id, assignmentRef.key),
                    ]),
                  ) as Record<string, number>;

                  const staffingLevel = getStaffingLevel(category, shift, employees);
                  const employeeMessages = getEmployeeConflictMessages(day, assignmentRef, employees);
                  const vehicleMessages = getVehicleConflictMessages(day, assignmentRef);
                  const continuousHours = getContinuousHoursResult(scheduleData, dateKey, assignmentRef, employees);
                  const requiredNoteMessages = getRequiredNoteMessages(assignmentRef, employees);
                  const certificationMessages = getCertificationMessages(assignmentRef, employees);
                  const warningMessages = [...employeeMessages, ...vehicleMessages, ...continuousHours.warnings, ...requiredNoteMessages, ...certificationMessages];
                  const approvalMessages = continuousHours.approvals;
                  const isSupervisorShift = category === 'SUPERVISOR';

                  return (
                    <div key={`${shiftName}-${dateKey}`} className="border-b border-r border-slate-200 bg-white p-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              staffingLevel === 'ALS'
                                ? 'bg-emerald-100 text-emerald-700'
                                : staffingLevel === 'BLS'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-sky-100 text-sky-700'
                            }`}
                          >
                            {staffingLevel}
                          </div>

                          {warningMessages.length > 0 ? (
                            <div className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                              Warning
                            </div>
                          ) : approvalMessages.length > 0 ? (
                            <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Approved
                            </div>
                          ) : (
                            <div className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              Clear
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {renderEmployeeSlotEditor(
                            shift.employee1,
                            'Employee 1',
                            true,
                            (field, value) => handleStandardSlotChange(dateKey, shiftName, 'employee1', field, value),
                            slotEligibilityMaps.employee1,
                            payPeriodHoursMap,
                            { dateKey, shiftKey: shiftName, shiftLabel: SHIFT_DISPLAY_NAMES[shiftName] },
                          )}

                          {!isSupervisorShift &&
                            renderEmployeeSlotEditor(
                              shift.employee2,
                              'Employee 2',
                              true,
                              (field, value) => handleStandardSlotChange(dateKey, shiftName, 'employee2', field, value),
                              slotEligibilityMaps.employee2,
                              payPeriodHoursMap,
                              { dateKey, shiftKey: shiftName, shiftLabel: SHIFT_DISPLAY_NAMES[shiftName] },
                            )}

                          {!isSupervisorShift &&
                            renderEmployeeSlotEditor(
                              shift.employee3,
                              'Employee 3',
                              shift.showEmployee3 || Boolean(shift.employee3.employeeId),
                              (field, value) => handleStandardSlotChange(dateKey, shiftName, 'employee3', field, value),
                              slotEligibilityMaps.employee3,
                              payPeriodHoursMap,
                              { dateKey, shiftKey: shiftName, shiftLabel: SHIFT_DISPLAY_NAMES[shiftName] },
                            )}

                          {!isSupervisorShift && !shift.showEmployee3 && !shift.employee3.employeeId && (
                            <button
                              type="button"
                              onClick={() => handleAddEmployeeSlot(dateKey, shiftName)}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              Add Employee
                            </button>
                          )}

                          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={shift.allowExtendedHours}
                              onChange={(event) =>
                                handleStandardShiftChange(dateKey, shiftName, 'allowExtendedHours', event.target.checked)
                              }
                              className="h-4 w-4"
                            />
                            Allow extended hours
                          </label>

                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Vehicle
                            </label>
                            <select
                              value={shift.vehicle}
                              onChange={(event) =>
                                handleStandardShiftChange(dateKey, shiftName, 'vehicle', event.target.value)
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                            >
                              {getVehicleOptions(category).map((vehicle) => (
                                <option key={vehicle || 'none'} value={vehicle}>
                                  {vehicle || 'No vehicle selected'}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {warningMessages.length > 0 && (
                          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                              Conflict Warnings
                            </div>
                            <ul className="space-y-1 text-xs text-red-700">
                              {warningMessages.map((message) => (
                                <li key={message}>• {message}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {approvalMessages.length > 0 && (
                          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                              Extended Hours Approved
                            </div>
                            <ul className="space-y-1 text-xs text-emerald-700">
                              {approvalMessages.map((message) => (
                                <li key={message}>• {message}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}

            <div className="sticky left-0 z-10 border-r border-slate-200 bg-white p-4">
              <div className="flex h-full flex-col justify-center">
                <div className="text-base font-bold text-slate-900">EXTRA SHIFTS</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">Day-specific additions</div>
              </div>
            </div>

            {dates.map((date) => {
              const dateKey = toDateKey(date);
              const day = getDaySchedule(scheduleData, dateKey);

              return (
                <div key={`extras-${dateKey}`} className="border-r border-slate-200 bg-white p-3 align-top">
                  <div className="space-y-3">
                    {day.extras.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
                        No extra shifts
                      </div>
                    ) : (
                      day.extras.map((extra) => {
                        const assignmentRef: AssignmentRef = {
                          key: `extra-${extra.id}`,
                          label: extra.label,
                          category: extra.category,
                          shift: extra,
                        };

                        const slotEligibilityMaps = {
                          employee1: Object.fromEntries(
                            employees.map((employee) => [
                              employee.id,
                              getEligibilityForEmployee(scheduleData, dateKey, employee.id, assignmentRef, employees, assignmentRef.key),
                            ]),
                          ) as Record<string, EligibilityResult>,
                          employee2: Object.fromEntries(
                            employees.map((employee) => [
                              employee.id,
                              getEligibilityForEmployee(scheduleData, dateKey, employee.id, assignmentRef, employees, assignmentRef.key),
                            ]),
                          ) as Record<string, EligibilityResult>,
                          employee3: Object.fromEntries(
                            employees.map((employee) => [
                              employee.id,
                              getEligibilityForEmployee(scheduleData, dateKey, employee.id, assignmentRef, employees, assignmentRef.key),
                            ]),
                          ) as Record<string, EligibilityResult>,
                        };

                        const payPeriodHoursMap = Object.fromEntries(
                          employees.map((employee) => [
                            employee.id,
                            getEmployeePayPeriodHours(scheduleData, dateKey, employee.id, assignmentRef.key),
                          ]),
                        ) as Record<string, number>;

                        const staffingLevel = getStaffingLevel(extra.category, extra, employees);
                        const employeeMessages = getEmployeeConflictMessages(day, assignmentRef, employees);
                        const vehicleMessages = getVehicleConflictMessages(day, assignmentRef);
                        const continuousHours = getContinuousHoursResult(scheduleData, dateKey, assignmentRef, employees);
                        const requiredNoteMessages = getRequiredNoteMessages(assignmentRef, employees);
                        const certificationMessages = getCertificationMessages(assignmentRef, employees);
                        const warningMessages = [...employeeMessages, ...vehicleMessages, ...continuousHours.warnings, ...requiredNoteMessages, ...certificationMessages];
                        const approvalMessages = continuousHours.approvals;
                        const isSupervisorShift = extra.category === 'SUPERVISOR';

                        return (
                          <div key={extra.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
                            <div className="mb-3 flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <input
                                  type="text"
                                  value={extra.label}
                                  onChange={(event) =>
                                    handleExtraShiftChange(dateKey, extra.id, 'label', event.target.value)
                                  }
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-500"
                                />
                                <div className="mt-2 flex items-center gap-2">
                                  <div
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                      staffingLevel === 'ALS'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : staffingLevel === 'BLS'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-sky-100 text-sky-700'
                                    }`}
                                  >
                                    {staffingLevel}
                                  </div>

                                  <select
                                    value={extra.category}
                                    onChange={(event) =>
                                      handleExtraShiftChange(dateKey, extra.id, 'category', event.target.value)
                                    }
                                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none transition focus:border-slate-500"
                                  >
                                    <option value="UNIT">UNIT</option>
                                    <option value="SUPERVISOR">SUPERVISOR</option>
                                  </select>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveExtraShift(dateKey, extra.id, extra.label)}
                                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="space-y-3">
                              {renderEmployeeSlotEditor(
                                extra.employee1,
                                'Employee 1',
                                true,
                                (field, value) => handleExtraSlotChange(dateKey, extra.id, 'employee1', field, value),
                                slotEligibilityMaps.employee1,
                                payPeriodHoursMap,
                                { dateKey, shiftKey: extra.id, shiftLabel: extra.label },
                              )}

                              {!isSupervisorShift &&
                                renderEmployeeSlotEditor(
                                  extra.employee2,
                                  'Employee 2',
                                  true,
                                  (field, value) => handleExtraSlotChange(dateKey, extra.id, 'employee2', field, value),
                                  slotEligibilityMaps.employee2,
                                  payPeriodHoursMap,
                                  { dateKey, shiftKey: extra.id, shiftLabel: extra.label },
                                )}

                              {!isSupervisorShift &&
                                renderEmployeeSlotEditor(
                                  extra.employee3,
                                  'Employee 3',
                                  extra.showEmployee3 || Boolean(extra.employee3.employeeId),
                                  (field, value) => handleExtraSlotChange(dateKey, extra.id, 'employee3', field, value),
                                  slotEligibilityMaps.employee3,
                                  payPeriodHoursMap,
                                  { dateKey, shiftKey: extra.id, shiftLabel: extra.label },
                                )}

                              {!isSupervisorShift && !extra.showEmployee3 && !extra.employee3.employeeId && (
                                <button
                                  type="button"
                                  onClick={() => handleAddEmployeeSlotToExtra(dateKey, extra.id)}
                                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                >
                                  Add Employee
                                </button>
                              )}

                              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={extra.allowExtendedHours}
                                  onChange={(event) =>
                                    handleExtraShiftChange(dateKey, extra.id, 'allowExtendedHours', event.target.checked)
                                  }
                                  className="h-4 w-4"
                                />
                                Allow extended hours
                              </label>

                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Vehicle
                                </label>
                                <select
                                  value={extra.vehicle}
                                  onChange={(event) =>
                                    handleExtraShiftChange(dateKey, extra.id, 'vehicle', event.target.value)
                                  }
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                                >
                                  {getVehicleOptions(extra.category).map((vehicle) => (
                                    <option key={vehicle || 'none'} value={vehicle}>
                                      {vehicle || 'No vehicle selected'}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {warningMessages.length > 0 && (
                              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                                  Conflict Warnings
                                </div>
                                <ul className="space-y-1 text-xs text-red-700">
                                  {warningMessages.map((message) => (
                                    <li key={message}>• {message}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {approvalMessages.length > 0 && (
                              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                  Extended Hours Approved
                                </div>
                                <ul className="space-y-1 text-xs text-emerald-700">
                                  {approvalMessages.map((message) => (
                                    <li key={message}>• {message}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

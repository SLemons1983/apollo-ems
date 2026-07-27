'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  addDays,
  getGlobalPayPeriodStart,
  getPayPeriodInfo,
  getPayPeriodsForYear,
  type PayPeriodOption,
} from '@/lib/payPeriods';
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
  email?: string;
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
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  scope?: string;
  employeeType?: string;
  seniorityLabel?: string;
  certifications?: Partial<CertificationRecord>;
  status?: string;
};

type ShiftType = 'REGULAR' | 'SICK' | 'VACATION' | 'LEAVE' | 'TRAINING';

type EmployeeSlot = {
  employeeId: string;
  startTime: string;
  endTime: string;
  note: string;
  shiftType: ShiftType;
};
type ScheduleSlotKey = 'employee1' | 'employee2' | 'employee3' | 'employee4' | 'employee5';

type ShiftAssignment = {
  employee1: EmployeeSlot;
  employee2: EmployeeSlot;
  employee3: EmployeeSlot;
  employee4: EmployeeSlot;
  employee5: EmployeeSlot;
  showEmployee3: boolean;
  visibleEmployeeSlots: number;
  vehicle: VehicleValue;
  allowExtendedHours: boolean;
  hiddenFromEmployees: boolean;
  supervisorNote: string;
};

type DayAssignments = Record<ShiftName, ShiftAssignment>;

type ExtraShiftAssignment = {
  id: string;
  label: string;
  category: ShiftCategory;
  employee1: EmployeeSlot;
  employee2: EmployeeSlot;
  employee3: EmployeeSlot;
  employee4: EmployeeSlot;
  employee5: EmployeeSlot;
  showEmployee3: boolean;
  visibleEmployeeSlots: number;
  vehicle: VehicleValue;
  allowExtendedHours: boolean;
  hiddenFromEmployees: boolean;
  supervisorNote: string;
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

type PayPeriodInfo = PayPeriodOption;

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

type ShiftTradeRequest = {
  id: string;
  requestingEmployeeId: string;
  requestingEmployeeName: string;
  requestingDateKey: string;
  requestingShiftKey: string;
  requestingShiftLabel: string;
  requestingStartTime?: string;
  requestingEndTime?: string;
  targetEmployeeId?: string;
  targetEmployeeName?: string;
  targetDateKey: string;
  targetShiftKey: string;
  targetShiftLabel: string;
  targetStartTime?: string;
  targetEndTime?: string;
  targetIsOpenShift: boolean;
  payPeriodKey: string;
  requestedAt: string;
  status: 'PENDING_EMPLOYEE' | 'DECLINED_BY_EMPLOYEE' | 'PENDING_SUPERVISOR' | 'APPROVED' | 'DENIED' | 'COMPLETED';
  employeeNote?: string;
  recipientNote?: string;
  supervisorNote?: string;
};

type VacationRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  dateKey: string;
  shiftLabel: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  supervisorNote?: string;
  requestedAt: string;
};

const STORAGE_KEY = 'apollo-schedule-page-v6';
const OPEN_SHIFT_REQUESTS_STORAGE_KEY = 'apollo-open-shift-requests-v1';
const EMPLOYEE_STORAGE_KEY = 'apollo-employee-profiles-v2';
const REVIEWED_SUPERVISOR_NOTES_SIGNATURE_STORAGE_KEY = 'apollo-reviewed-supervisor-notes-signature-v1';

const SHIFT_ORDER: ShiftName[] = ['R1', 'R2', 'P', 'OC', 'FIELD_SUP'];
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

const SHIFT_TABLE_LABELS: Record<ShiftName, string> = {
  R1: 'R1 (311)',
  R2: 'R2 (312)',
  P: 'P (316)',
  OC: 'OC (318)',
  GM: 'GM',
  ADMIN_SUP: 'ADMIN SUP',
  FIELD_SUP: 'SUP (S301)',
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

function getDefaultEndTimeForShift(shiftName?: ShiftName, slotKey?: ScheduleSlotKey): string {
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
    const raw = null;
    if (!raw) {
      return sortEmployeesByName(DEFAULT_EMPLOYEES);
    }

    const parsed = JSON.parse(raw) as StoredEmployeeProfile[];

    const loaded = parsed
      .map((profile) => ({
        id: profile.id,
        email: profile.email?.trim().toLowerCase(),
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
    .select('id,email,first_name,last_name,role,scope,employee_type,seniority_label,certifications,status')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) {
    throw error;
  }

  const loaded = (data ?? [])
    .map((employee: any) => ({
      id: employee.id,
      email: employee.email?.trim().toLowerCase(),
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
    shiftType: 'REGULAR',
  };
}

function createEmptyShift(showEmployee3 = false): ShiftAssignment {
  return {
    employee1: createEmptyEmployeeSlot(),
    employee2: createEmptyEmployeeSlot(),
    employee3: createEmptyEmployeeSlot(),
    employee4: createEmptyEmployeeSlot(),
    employee5: createEmptyEmployeeSlot(),
    showEmployee3,
    visibleEmployeeSlots: showEmployee3 ? 3 : 2,
    vehicle: '',
    allowExtendedHours: false,
    hiddenFromEmployees: false,
    supervisorNote: '',
  };
}

function createAdminSupervisorSlot(): EmployeeSlot {
  return {
    employeeId: '',
    startTime: '06:00',
    endTime: '18:00',
    note: '',
    shiftType: 'REGULAR',
  };
}

function createAdminSupervisorShift(): ShiftAssignment {
  return {
    employee1: createAdminSupervisorSlot(),
    employee2: createEmptyEmployeeSlot(),
    employee3: createEmptyEmployeeSlot(),
    employee4: createEmptyEmployeeSlot(),
    employee5: createEmptyEmployeeSlot(),
    showEmployee3: false,
    visibleEmployeeSlots: 2,
    vehicle: '',
    allowExtendedHours: false,
    hiddenFromEmployees: false,
    supervisorNote: '',
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
  let endMinutes = parseTimeToMinutes(endTime);

  if (endMinutes <= startMinutes || endMinutes === parseTimeToMinutes(DEFAULT_END_TIME)) {
    endMinutes += 24 * 60;
  }

  const hours = (endMinutes - startMinutes) / 60;
  return Math.max(hours, 0);
}

function formatHours(hours: number): string {
  if (Number.isInteger(hours)) {
    return `${hours}`;
  }
  return hours.toFixed(1);
}

function formatCollapsedShiftHours(startTime: string, endTime: string): string {
  const normalizedStart = normalizeMilitaryTime(startTime, DEFAULT_START_TIME);
  const normalizedEnd = normalizeMilitaryTime(endTime, DEFAULT_END_TIME);
  const hours = calculateSlotHours(normalizedStart, normalizedEnd);

  if (normalizedStart === '06:00' && normalizedEnd === '06:00') {
    return '24 H';
  }

  if (normalizedStart === '06:00' && normalizedEnd === '18:00') {
    return 'Day 12';
  }

  if (normalizedStart === '18:00' && normalizedEnd === '06:00') {
    return 'Night 12';
  }

  return `${formatHours(hours)} H`;
}

function getCollapsedShiftTypeLabel(shiftType: ShiftType): string {
  switch (shiftType) {
    case 'SICK':
      return 'Sick';
    case 'VACATION':
      return 'Vacation';
    case 'LEAVE':
      return 'Leave';
    case 'TRAINING':
      return 'Training';
    default:
      return '';
  }
}

function getCollapsedShiftTypeClasses(shiftType: ShiftType): string {
  switch (shiftType) {
    case 'SICK':
      return 'bg-red-100 text-red-700';
    case 'VACATION':
      return 'bg-amber-100 text-amber-700';
    case 'LEAVE':
      return 'bg-purple-100 text-purple-700';
    case 'TRAINING':
      return 'bg-blue-100 text-blue-700';
    default:
      return '';
  }
}

function requiresSupervisorNote(_slot: EmployeeSlot): boolean {
  return false;
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
    shiftType?: ShiftType;
  };

  return {
    employeeId: maybeSlot.employeeId ?? '',
    startTime: maybeSlot.startTime ?? DEFAULT_START_TIME,
    endTime: maybeSlot.endTime ?? DEFAULT_END_TIME,
    note: maybeSlot.note ?? '',
    shiftType: maybeSlot.shiftType ?? 'REGULAR',
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
    shiftType: 'REGULAR',
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

  const employee4 =
    maybeShift.employee4 && typeof maybeShift.employee4 === 'object'
      ? normalizeEmployeeSlot(maybeShift.employee4)
      : createEmptyEmployeeSlot();

  const employee5 =
    maybeShift.employee5 && typeof maybeShift.employee5 === 'object'
      ? normalizeEmployeeSlot(maybeShift.employee5)
      : createEmptyEmployeeSlot();

  const visibleEmployeeSlots = Math.max(
    2,
    Math.min(
      5,
      Number(maybeShift.visibleEmployeeSlots ?? (employee5.employeeId ? 5 : employee4.employeeId ? 4 : maybeShift.showEmployee3 || employee3.employeeId ? 3 : 2)),
    ),
  );

  return {
    employee1,
    employee2,
    employee3,
    employee4,
    employee5,
    showEmployee3: Boolean(maybeShift.showEmployee3 || employee3.employeeId),
    visibleEmployeeSlots,
    vehicle: (maybeShift.vehicle ?? '') as VehicleValue,
    allowExtendedHours: Boolean(maybeShift.allowExtendedHours),
    hiddenFromEmployees: Boolean((maybeShift as any).hiddenFromEmployees),
    supervisorNote:
      typeof (maybeShift as any).supervisorNote === 'string'
        ? (maybeShift as any).supervisorNote
        : '',
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
      employee4: createEmptyEmployeeSlot(),
      employee5: createEmptyEmployeeSlot(),
      showEmployee3: false,
      visibleEmployeeSlots: 2,
      vehicle: '',
      allowExtendedHours: false,
      hiddenFromEmployees: false,
      supervisorNote: '',
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
    employee4: normalized.employee4,
    employee5: normalized.employee5,
    showEmployee3: normalized.showEmployee3,
    visibleEmployeeSlots: normalized.visibleEmployeeSlots,
    vehicle: normalized.vehicle,
    allowExtendedHours: normalized.allowExtendedHours,
    hiddenFromEmployees: normalized.hiddenFromEmployees,
    supervisorNote: normalized.supervisorNote,
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

function getEmployeeById(id: string, employees: EmployeeOption[]): EmployeeOption | undefined {
  return employees.find((employee) => employee.id === id);
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTileDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString('en-US', {
    weekday: 'long',
    month: '2-digit',
    day: '2-digit',
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

function getShiftTypeCardClasses(shiftType: ShiftType): string {
  switch (shiftType) {
    case 'SICK':
      return 'border-red-300 bg-red-50';
    case 'VACATION':
      return 'border-amber-300 bg-amber-50';
    case 'LEAVE':
      return 'border-purple-300 bg-purple-50';
    case 'TRAINING':
      return 'border-blue-300 bg-blue-50';
    default:
      return 'border-slate-200 bg-white';
  }
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

  const isActiveAssignmentSlot = (slot: EmployeeSlot) =>
    !isOpenShiftSlot(slot.employeeId) &&
    slot.shiftType !== 'SICK' &&
    slot.shiftType !== 'VACATION' &&
    slot.shiftType !== 'LEAVE';

  const messages: string[] = [];
  const targetSlots = getAssignedSlotsForAssignment(target.category, target.shift)
    .filter(isActiveAssignmentSlot);

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

      const otherSlots = getAssignedSlotsForAssignment(other.category, other.shift)
        .filter(isActiveAssignmentSlot);

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
    if (isOpenShiftSlot(slot.employeeId)) {
      continue;
    }

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
  const scheduleScrollRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [expandedShiftKey, setExpandedShiftKey] = useState<string | null>(null);
  const [pendingExpandedShiftKey, setPendingExpandedShiftKey] = useState<string | null>(null);
  const [visibleScheduleWeek, setVisibleScheduleWeek] = useState<'ALL' | 'WEEK1' | 'WEEK2'>('WEEK1');
  const [expandedWarnings, setExpandedWarnings] = useState<Record<string, boolean>>({});
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Schedule loaded.');
  const [openShiftRequests, setOpenShiftRequests] = useState<OpenShiftRequest[]>([]);
  const [shiftTradeRequests, setShiftTradeRequests] = useState<ShiftTradeRequest[]>([]);
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([]);
  const [showPendingOpenShiftRequests, setShowPendingOpenShiftRequests] = useState(false);
  const [showPendingVacationRequests, setShowPendingVacationRequests] = useState(false);
  const [showPendingShiftTradeRequests, setShowPendingShiftTradeRequests] = useState(false);
  const [showSupervisorNotes, setShowSupervisorNotes] = useState(false);
  const [showOnDutyEmployees, setShowOnDutyEmployees] = useState(false);
  const [showOpenShiftsNeedingCoverage, setShowOpenShiftsNeedingCoverage] = useState(false);
  const [showScheduleKey, setShowScheduleKey] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [reviewedSupervisorNoteSignature, setReviewedSupervisorNoteSignature] = useState('');
  const dirtyDatesRef = useRef<Set<string>>(new Set());
  const isSavingScheduleRef = useRef(false);

  function markUnsavedChanges(dateKey?: string) {
    if (dateKey) {
      dirtyDatesRef.current.add(dateKey);
    }

    setHasUnsavedChanges(true);
    setSaveStatus('Unsaved changes. Click Confirm Changes to save.');
  }

  function closeSchedulePanels() {
    setShowPendingOpenShiftRequests(false);
    setShowPendingVacationRequests(false);
    setShowPendingShiftTradeRequests(false);
    setShowSupervisorNotes(false);
    setShowOnDutyEmployees(false);
    setShowOpenShiftsNeedingCoverage(false);
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

    setReviewedSupervisorNoteSignature(localStorage.getItem(REVIEWED_SUPERVISOR_NOTES_SIGNATURE_STORAGE_KEY) ?? '');
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      try {
        try {
          const { data: openShiftData, error: openShiftError } = await supabase
            .from('open_shift_requests')
            .select('*')
            .order('requested_at', { ascending: false });

          if (openShiftError) {
            console.error('Failed to load open shift requests:', openShiftError);
          } else if (isActive) {
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
        } catch (openShiftError) {
          console.error('Failed to load open shift requests:', openShiftError);
        }

        try {
          const { data: vacationData, error: vacationError } = await supabase
            .from('vacation_requests')
            .select('*')
            .order('requested_at', { ascending: false });

          if (vacationError) {
            console.error('Failed to load vacation requests:', vacationError);
          } else if (isActive) {
            setVacationRequests(
              (vacationData ?? []).map((row: any) => ({
                id: row.id,
                employeeId: row.employee_id,
                employeeName: row.employee_name,
                dateKey: row.date_key,
                shiftLabel: row.shift_label,
                startTime: row.start_time,
                endTime: row.end_time,
                reason: row.reason ?? '',
                status: row.status,
                supervisorNote: row.supervisor_note ?? undefined,
                requestedAt: row.requested_at,
              })),
            );
          }
        } catch (vacationError) {
          console.error('Failed to load vacation requests:', vacationError);
        }

        try {
          const { data: shiftTradeData, error: shiftTradeError } = await supabase
            .from('shift_trade_requests')
            .select('*')
            .order('requested_at', { ascending: false });

          if (shiftTradeError) {
            console.error('Failed to load shift trade requests:', shiftTradeError);
          } else if (isActive) {
            setShiftTradeRequests(
              (shiftTradeData ?? []).map((row: any) => ({
                id: row.id,
                requestingEmployeeId: row.requesting_employee_id,
                requestingEmployeeName: row.requesting_employee_name,
                requestingDateKey: row.requesting_date_key,
                requestingShiftKey: row.requesting_shift_key,
                requestingShiftLabel: row.requesting_shift_label,
                requestingStartTime: row.requesting_start_time ?? undefined,
                requestingEndTime: row.requesting_end_time ?? undefined,
                targetEmployeeId: row.target_employee_id ?? undefined,
                targetEmployeeName: row.target_employee_name ?? undefined,
                targetDateKey: row.target_date_key,
                targetShiftKey: row.target_shift_key,
                targetShiftLabel: row.target_shift_label,
                targetStartTime: row.target_start_time ?? undefined,
                targetEndTime: row.target_end_time ?? undefined,
                targetIsOpenShift: Boolean(row.target_is_open_shift),
                payPeriodKey: row.pay_period_key,
                requestedAt: row.requested_at,
                status: row.status,
                employeeNote: row.employee_note ?? undefined,
                recipientNote: row.recipient_note ?? undefined,
                supervisorNote: row.supervisor_note ?? undefined,
              })),
            );
          }
        } catch (shiftTradeError) {
          console.error('Failed to load shift trade requests:', shiftTradeError);
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

        const assignments: any[] = [];
        let assignmentPageStart = 0;
        const assignmentPageSize = 1000;

        while (true) {
          const { data: assignmentPage, error: assignmentError } = await supabase
            .from('schedule_assignments')
            .select('*')
            .order('date_key', { ascending: true })
            .order('shift_key', { ascending: true })
            .order('slot_number', { ascending: true })
            .range(assignmentPageStart, assignmentPageStart + assignmentPageSize - 1);

          if (assignmentError) {
            throw assignmentError;
          }

          assignments.push(...(assignmentPage ?? []));

          if (!assignmentPage || assignmentPage.length < assignmentPageSize) {
            break;
          }

          assignmentPageStart += assignmentPageSize;
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
            shiftType: (row.shift_type as ShiftType) || 'REGULAR',
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
                employee4: createEmptyEmployeeSlot(),
                employee5: createEmptyEmployeeSlot(),
                showEmployee3: false,
                visibleEmployeeSlots: 2,
                vehicle: (row.vehicle || '') as VehicleValue,
                allowExtendedHours: Boolean(row.allow_extended_hours),
                hiddenFromEmployees: Boolean(row.hidden_from_employees),
                supervisorNote: '',
              };
              day.extras.push(extra);
            }

            extra.label = row.shift_label || extra.label;
            extra.category = category;
            extra.vehicle = (row.vehicle || '') as VehicleValue;
            extra.allowExtendedHours = Boolean(row.allow_extended_hours);
            extra.hiddenFromEmployees = Boolean(row.hidden_from_employees);

            if (row.slot_number === 0) {
              extra.supervisorNote = row.note || '';
              continue;
            }

            if (row.slot_number === 1) extra.employee1 = slot;
            if (row.slot_number === 2) extra.employee2 = slot;
            if (row.slot_number === 3) {
              extra.employee3 = slot;
              extra.showEmployee3 = Boolean(slot.employeeId);
            }
            if (row.slot_number === 4) {
            extra.employee4 = slot;
            extra.visibleEmployeeSlots = Math.max(extra.visibleEmployeeSlots, 4);
}

           if (row.slot_number === 5) {
           extra.employee5 = slot;
           extra.visibleEmployeeSlots = Math.max(extra.visibleEmployeeSlots, 5);
}
          } else {
            const shiftName = row.shift_key as ShiftName;
            if (!day.standard[shiftName]) {
              continue;
            }

            const shift = day.standard[shiftName];
            shift.vehicle = (row.vehicle || '') as VehicleValue;
            shift.allowExtendedHours = Boolean(row.allow_extended_hours);
            shift.hiddenFromEmployees = Boolean(row.hidden_from_employees);

            if (row.slot_number === 0) {
              shift.supervisorNote = row.note || '';
              continue;
            }

            if (row.slot_number === 1) shift.employee1 = slot;
            if (row.slot_number === 2) shift.employee2 = slot;
            if (row.slot_number === 3) {
              shift.employee3 = slot;
              shift.showEmployee3 = Boolean(slot.employeeId);
            }
            if (row.slot_number === 4) {
            shift.employee4 = slot;
            shift.visibleEmployeeSlots = Math.max(shift.visibleEmployeeSlots, 4);
            }

            if (row.slot_number === 5) {
            shift.employee5 = slot;
            shift.visibleEmployeeSlots = Math.max(shift.visibleEmployeeSlots, 5);
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

    const handleScheduleRefresh = (event: StorageEvent) => {
      if (event.key === 'apollo-schedule-refresh') {
        void loadData();
      }
    };

    window.addEventListener('storage', handleScheduleRefresh);

    return () => {
      isActive = false;
      window.removeEventListener('storage', handleScheduleRefresh);
    };
  }, []);

  function hasMeaningfulSlotData(slot: EmployeeSlot, shiftName?: ShiftName, slotKey?: ScheduleSlotKey): boolean {
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
    hiddenFromEmployees: boolean;
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
      shift_type: params.slot.shiftType,
      vehicle: params.vehicle || '',
      allow_extended_hours: Boolean(params.allowExtendedHours),
      hidden_from_employees: Boolean(params.hiddenFromEmployees),
      is_open_slot: isOpenSlot,
      open_slot_scope: params.slot.employeeId === OPEN_ALS_SLOT_ID ? 'ALS' : params.slot.employeeId === OPEN_BLS_SLOT_ID ? 'BLS' : null,
      updated_at: new Date().toISOString(),
    };
  }

  async function saveScheduleToSupabase(): Promise<boolean> {
    if (!mounted) {
      return false;
    }

    if (isSavingScheduleRef.current) {
      return false;
    }

    isSavingScheduleRef.current = true;

    const saveStartedAt = Date.now();
    setSaveStatus('Saving schedule changes...');

    try {
      const normalizedSchedule = normalizeLoadedData(scheduleDataRef.current);
      const dirtyDates = Array.from(dirtyDatesRef.current);
      const datesToSave =
        dirtyDates.length > 0
          ? dirtyDates.filter((dateKey) => normalizedSchedule[dateKey])
          : Object.keys(normalizedSchedule);

      console.log(`Apollo schedule save started: ${datesToSave.length} of ${Object.keys(normalizedSchedule).length} dates.`);

      const saveTasks: Promise<any>[] = [];

      for (const dateKey of datesToSave) {
        const day = normalizedSchedule[dateKey];
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
          const slots: Array<[ScheduleSlotKey, EmployeeSlot]> = [
            ['employee1', shift.employee1],
            ['employee2', shift.employee2],
            ['employee3', shift.employee3],
            ['employee4', shift.employee4],
            ['employee5', shift.employee5],
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
            note: shift.supervisorNote || '',
            vehicle: shift.vehicle || '',
            allow_extended_hours: Boolean(shift.allowExtendedHours),
            hidden_from_employees: Boolean(shift.hiddenFromEmployees),
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
                hiddenFromEmployees: Boolean(shift.hiddenFromEmployees),
                defaultEndTime: getDefaultEndTimeForShift(shiftName, slotKey),
              }),
            );
          });
        }

        for (const extra of day.extras) {
          const extraShiftKey = `EXTRA::${extra.category}::${extra.id}`;
          const slots: Array<[ScheduleSlotKey, EmployeeSlot]> = [
            ['employee1', extra.employee1],
            ['employee2', extra.employee2],
            ['employee3', extra.employee3],
            ['employee4', extra.employee4],
            ['employee5', extra.employee5],
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
            note: extra.supervisorNote || '',
            vehicle: extra.vehicle || '',
            allow_extended_hours: Boolean(extra.allowExtendedHours),
            hidden_from_employees: Boolean(extra.hiddenFromEmployees),
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
                hiddenFromEmployees: Boolean(extra.hiddenFromEmployees),
              }),
            );
          });
        }

        saveTasks.push(
          (async () => {
            const { error: deleteError } = await supabase
              .from('schedule_assignments')
              .delete()
              .eq('date_key', dateKey);

        if (deleteError) {
          throw deleteError;
        }

        if (rows.length > 0) {
          const { error: assignmentError } = await supabase
            .from('schedule_assignments')
            .upsert(rows, { onConflict: 'id' });

          if (assignmentError) {
            throw assignmentError;
          }
        }
          })(),
        );
      }

      await Promise.all(saveTasks);

      dirtyDatesRef.current.clear();
      setHasUnsavedChanges(false);

      const saveSeconds = ((Date.now() - saveStartedAt) / 1000).toFixed(1);
      console.log(`Apollo schedule save completed in ${saveSeconds}s.`);
      setSaveStatus(`Schedule saved at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (${saveSeconds}s).`);
      return true;
    } catch (error) {
      console.error('Supabase schedule save failed:', error);
      setSaveStatus('Action Required — schedule changes were not saved.');
      window.alert('Schedule changes were not saved. The shift editor will remain open so you can try again.');
      return false;
    } finally {
      isSavingScheduleRef.current = false;
    }
  }


  const pendingOpenShiftRequests = useMemo(() => {
    return openShiftRequests
      .filter((request) => request.status === 'PENDING')
      .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());
  }, [openShiftRequests]);

  const pendingShiftTradeRequests = useMemo(() => {
    return shiftTradeRequests
      .filter((request) => request.status === 'PENDING_SUPERVISOR')
      .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());
  }, [shiftTradeRequests]);

  const pendingVacationRequests = useMemo(() => {
    return vacationRequests
      .filter((request) => request.status === 'PENDING')
      .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());
  }, [vacationRequests]);

  function applyApprovedVacationRequest(
    current: ScheduleData,
    request: VacationRequest,
  ): { next: ScheduleData; applied: boolean } {
    const next = cloneScheduleData(normalizeLoadedData(current));
    const day = next[request.dateKey];
    if (!day) return { next, applied: false };

    const employee = employees.find((item) => item.id === request.employeeId);
    if (!employee) return { next, applied: false };

    const slotKeys: ScheduleSlotKey[] = ['employee1', 'employee2', 'employee3', 'employee4', 'employee5'];
    let matchedShift: ShiftAssignment | ExtraShiftAssignment | null = null;
    let matchedSlotKey: ScheduleSlotKey | null = null;

    const matchingStandardNames = SHIFT_ORDER.filter(
      (shiftName) => SHIFT_DISPLAY_NAMES[shiftName] === request.shiftLabel,
    );
    const standardNamesToSearch = matchingStandardNames.length > 0 ? matchingStandardNames : SHIFT_ORDER;

    for (const shiftName of standardNamesToSearch) {
      const shift = day.standard[shiftName];
      const slotKey = slotKeys.find((key) => shift[key].employeeId === request.employeeId);
      if (slotKey) {
        matchedShift = shift;
        matchedSlotKey = slotKey;
        break;
      }
    }

    if (!matchedShift) {
      const matchingExtras = day.extras.filter((extra) => extra.label === request.shiftLabel);
      const extrasToSearch = matchingExtras.length > 0 ? matchingExtras : day.extras;
      for (const extra of extrasToSearch) {
        const slotKey = slotKeys.find((key) => extra[key].employeeId === request.employeeId);
        if (slotKey) {
          matchedShift = extra;
          matchedSlotKey = slotKey;
          break;
        }
      }
    }

    if (!matchedShift || !matchedSlotKey) return { next, applied: false };

    const vacationSlot = matchedShift[matchedSlotKey];
    const coverageStartTime = vacationSlot.startTime || request.startTime || DEFAULT_START_TIME;
    const coverageEndTime = vacationSlot.endTime || request.endTime || DEFAULT_END_TIME;
    vacationSlot.shiftType = 'VACATION';

    const openSlotId = employee.scope === 'BLS' ? OPEN_BLS_SLOT_ID : OPEN_ALS_SLOT_ID;
    const availableSlotKey = slotKeys.find((key) => !matchedShift![key].employeeId);

    if (availableSlotKey) {
      matchedShift[availableSlotKey] = {
        employeeId: openSlotId,
        startTime: coverageStartTime,
        endTime: coverageEndTime,
        note: `Vacation coverage for ${request.employeeName}`,
        shiftType: 'REGULAR',
      };
      const slotNumber = slotKeys.indexOf(availableSlotKey) + 1;
      matchedShift.visibleEmployeeSlots = Math.max(matchedShift.visibleEmployeeSlots, slotNumber);
      matchedShift.showEmployee3 = matchedShift.visibleEmployeeSlots >= 3;
    } else {
      day.extras.push({
        id: createExtraShiftId(),
        label: `${request.shiftLabel} Vacation Coverage`,
        category: 'UNIT',
        employee1: {
          employeeId: openSlotId,
          startTime: coverageStartTime,
          endTime: coverageEndTime,
          note: `Vacation coverage for ${request.employeeName}`,
          shiftType: 'REGULAR',
        },
        employee2: createEmptyEmployeeSlot(),
        employee3: createEmptyEmployeeSlot(),
        employee4: createEmptyEmployeeSlot(),
        employee5: createEmptyEmployeeSlot(),
        showEmployee3: false,
        visibleEmployeeSlots: 2,
        vehicle: '',
        allowExtendedHours: false,
        hiddenFromEmployees: false,
        supervisorNote: `Created automatically for ${request.employeeName}'s approved vacation.`,
      });
    }

    return { next, applied: true };
  }

  async function sendVacationDecisionNotifications(
    request: VacationRequest,
    status: 'APPROVED' | 'DENIED',
  ) {
    const employee = employees.find((item) => item.id === request.employeeId);
    const title = status === 'APPROVED' ? 'Vacation request approved' : 'Vacation request denied';
    const body = status === 'APPROVED'
      ? `Your vacation request for ${request.shiftLabel} on ${request.dateKey} was approved. Your schedule has been updated.`
      : `Your vacation request for ${request.shiftLabel} on ${request.dateKey} was denied. Please contact a supervisor if you have questions.`;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const notifications: Promise<Response>[] = [];

    if (employee?.email) {
      notifications.push(fetch('/api/email/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: employee.email,
          senderName: 'ApolloEMS Scheduling',
          subject: title,
          message: body,
          notificationType: 'SCHEDULE',
        }),
      }));
    }

    if (accessToken) {
      notifications.push(fetch('/api/sms/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientMode: 'INDIVIDUAL',
          recipientEmployeeId: request.employeeId,
          messageBody: `ApolloEMS: ${body}`,
        }),
      }));
    }

    const results = await Promise.allSettled(notifications);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.error('Vacation decision notification failed:', result.reason);
      } else if (!result.value.ok && result.value.status !== 400) {
        console.error('Vacation decision notification was not accepted:', result.value.status);
      }
    });
  }

  async function updateVacationRequestStatus(requestId: string, status: 'APPROVED' | 'DENIED') {
    const request = vacationRequests.find((item) => item.id === requestId);
    if (!request) return;

    const confirmed = window.confirm(
      `${status === 'APPROVED' ? 'Approve' : 'Deny'} ${request.employeeName}'s vacation request for ${request.dateKey}?`,
    );
    if (!confirmed) return;

    const previousSchedule = scheduleDataRef.current;
    if (status === 'APPROVED') {
      const result = applyApprovedVacationRequest(previousSchedule, request);
      if (!result.applied) {
        window.alert('Apollo could not find this employee on the requested date. No changes were made.');
        return;
      }

      markUnsavedChanges(request.dateKey);
      scheduleDataRef.current = result.next;
      setScheduleDataSafely(result.next);
      setSaveStatus('Saving approved vacation and coverage shift...');
      const scheduleSaved = await saveScheduleToSupabase();
      if (!scheduleSaved) return;
    }

    const supervisorNote = status === 'APPROVED'
      ? 'Approved by supervisor. Assignment changed to Vacation and a coverage opening was created automatically.'
      : 'Denied by supervisor.';
    const { error } = await supabase
      .from('vacation_requests')
      .update({ status, supervisor_note: supervisorNote })
      .eq('id', request.id);

    if (error) {
      console.error('Failed to update vacation request:', error);
      if (status === 'APPROVED') {
        markUnsavedChanges(request.dateKey);
        scheduleDataRef.current = previousSchedule;
        setScheduleDataSafely(previousSchedule);
        await saveScheduleToSupabase();
      }
      window.alert('Vacation request could not be updated. The schedule was left unchanged.');
      return;
    }

    setVacationRequests((current) => current.map((item) =>
      item.id === request.id ? { ...item, status, supervisorNote } : item,
    ));
    await sendVacationDecisionNotifications(request, status);
    setSaveStatus(
      status === 'APPROVED'
        ? 'Vacation approved, schedule updated, and employee notified.'
        : 'Vacation request denied and employee notified.',
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
      console.error('Failed to save open shift requests:', error);
      window.alert('Failed to save open shift requests.');
      return false;
    }

    return true;
  }

  async function resolveOpenShiftRequestsFromDropdown(
    requestContext: { dateKey: string; shiftKey: string; shiftLabel: string },
    assignedEmployeeId: string,
  ) {
    const matchingRequests = openShiftRequests.filter((request) => {
      if (request.status !== 'PENDING' || request.dateKey !== requestContext.dateKey) {
        return false;
      }

      return (
        request.shiftKey === requestContext.shiftKey ||
        request.shiftKey === requestContext.shiftKey.replace(/^standard-/, '') ||
        request.shiftLabel === requestContext.shiftLabel
      );
    });

    if (matchingRequests.length === 0) {
      return;
    }

    const decisions = matchingRequests.map((request) => ({
      request,
      status: (request.employeeId === assignedEmployeeId ? 'APPROVED' : 'DENIED') as
        | 'APPROVED'
        | 'DENIED',
    }));

    const decisionById = new Map(decisions.map((decision) => [decision.request.id, decision.status]));
    const nextRequests = openShiftRequests.map((request) => {
      const status = decisionById.get(request.id);
      if (!status) {
        return request;
      }

      return {
        ...request,
        status,
        supervisorNote:
          status === 'APPROVED'
            ? 'Automatically approved when the employee was assigned through the schedule dropdown.'
            : 'Automatically denied when another employee was assigned through the schedule dropdown.',
      };
    });

    const saved = await saveOpenShiftRequests(nextRequests);
    if (!saved) {
      setSaveStatus(
        'Schedule saved, but open shift request decisions need supervisor attention.',
      );
      return;
    }

    await Promise.all(
      decisions.map(({ request, status }) =>
        sendOpenShiftDecisionNotifications(request, status),
      ),
    );

    const approvedCount = decisions.filter(({ status }) => status === 'APPROVED').length;
    const deniedCount = decisions.length - approvedCount;
    setSaveStatus(
      `Schedule saved. ${approvedCount > 0 ? 'Request approved' : 'No requester selected'}${
        deniedCount > 0
          ? `; ${deniedCount} other request${deniedCount === 1 ? '' : 's'} denied`
          : ''
      }. Notifications sent.`,
    );
  }

  function findTradeSlot(schedule: ScheduleData, dateKey: string, shiftKey: string, employeeId: string) {
    const day = schedule[dateKey];
    if (!day) return null;

    const slotKeys = ['employee1', 'employee2', 'employee3', 'employee4', 'employee5'] as ScheduleSlotKey[];

    if (shiftKey.startsWith('standard-')) {
      const shiftName = shiftKey.replace('standard-', '') as ShiftName;
      const shift = day.standard[shiftName];
      if (!shift) return null;

      const slotKey = slotKeys.find((key) => shift[key]?.employeeId === employeeId);
      return slotKey ? { shift, slotKey } : null;
    }

    if (shiftKey.startsWith('extra-')) {
      const extraId = shiftKey.replace('extra-', '');
      const shift = day.extras.find((item) => item.id === extraId);
      if (!shift) return null;

      const slotKey = slotKeys.find((key) => shift[key]?.employeeId === employeeId);
      return slotKey ? { shift, slotKey } : null;
    }

    return null;
  }

  function applyApprovedShiftTrade(current: ScheduleData, request: ShiftTradeRequest): { next: ScheduleData; applied: boolean } {
    const next = cloneScheduleData(normalizeLoadedData(current));
    const requestingEmployee = employees.find((employee) => employee.id === request.requestingEmployeeId);
    const requestingOpenSlotId = requestingEmployee?.scope === 'BLS' ? OPEN_BLS_SLOT_ID : OPEN_ALS_SLOT_ID;

    const requestingSlot = findTradeSlot(
      next,
      request.requestingDateKey,
      request.requestingShiftKey,
      request.requestingEmployeeId,
    );

    if (!requestingSlot) {
      return { next, applied: false };
    }

    if (request.targetIsOpenShift) {
      const preferredOpenSlotId = requestingOpenSlotId;
      const fallbackOpenSlotId = preferredOpenSlotId === OPEN_ALS_SLOT_ID ? OPEN_BLS_SLOT_ID : OPEN_ALS_SLOT_ID;

      const targetSlot =
        findTradeSlot(next, request.targetDateKey, request.targetShiftKey, preferredOpenSlotId) ??
        findTradeSlot(next, request.targetDateKey, request.targetShiftKey, fallbackOpenSlotId);

      if (!targetSlot) {
        return { next, applied: false };
      }

      requestingSlot.shift[requestingSlot.slotKey].employeeId = requestingOpenSlotId;
      targetSlot.shift[targetSlot.slotKey].employeeId = request.requestingEmployeeId;

      return { next, applied: true };
    }

    if (!request.targetEmployeeId) {
      return { next, applied: false };
    }

    const targetSlot = findTradeSlot(
      next,
      request.targetDateKey,
      request.targetShiftKey,
      request.targetEmployeeId,
    );

    if (!targetSlot) {
      return { next, applied: false };
    }

    requestingSlot.shift[requestingSlot.slotKey].employeeId = request.targetEmployeeId;
    targetSlot.shift[targetSlot.slotKey].employeeId = request.requestingEmployeeId;

    return { next, applied: true };
  }

  async function updateShiftTradeRequestStatus(requestId: string, status: 'APPROVED' | 'DENIED') {
    const request = shiftTradeRequests.find((item) => item.id === requestId);
    if (!request) {
      return;
    }

    const confirmed = window.confirm(
      `${status === 'APPROVED' ? 'Approve' : 'Deny'} shift trade request from ${request.requestingEmployeeName}?`,
    );

    if (!confirmed) {
      return;
    }

    let scheduleUpdated = false;

    if (status === 'APPROVED') {
      const tradeResult = applyApprovedShiftTrade(scheduleDataRef.current, request);
      if (!tradeResult.applied) {
        window.alert('Apollo could not locate one or more shift assignments. No schedule changes were made.');
        return;
      }

      markUnsavedChanges(request.requestingDateKey);
      markUnsavedChanges(request.targetDateKey);
      setScheduleDataSafely(tradeResult.next);
      scheduleUpdated = true;
    }

    const nextStatus: ShiftTradeRequest['status'] = status === 'APPROVED' ? 'COMPLETED' : 'DENIED';

    const nextRequests: ShiftTradeRequest[] = shiftTradeRequests.map((item) =>
      item.id === requestId
        ? {
            ...item,
            status: nextStatus,
            supervisorNote:
              status === 'APPROVED'
                ? 'Approved by supervisor. Schedule updated automatically.'
                : 'Denied by supervisor.',
          }
        : item,
    );

    await saveShiftTradeRequests(nextRequests);

    if (scheduleUpdated) {
      setSaveStatus('Saving approved shift trade...');
      await saveScheduleToSupabase();
      setHasUnsavedChanges(false);
    }
  }

  async function saveShiftTradeRequests(nextRequests: ShiftTradeRequest[]) {
    setShiftTradeRequests(nextRequests);

    const rows = nextRequests.map((request) => ({
      id: request.id,
      requesting_employee_id: request.requestingEmployeeId,
      requesting_employee_name: request.requestingEmployeeName,
      requesting_date_key: request.requestingDateKey,
      requesting_shift_key: request.requestingShiftKey,
      requesting_shift_label: request.requestingShiftLabel,
      requesting_start_time: request.requestingStartTime ?? null,
      requesting_end_time: request.requestingEndTime ?? null,
      target_employee_id: request.targetEmployeeId ?? null,
      target_employee_name: request.targetEmployeeName ?? null,
      target_date_key: request.targetDateKey,
      target_shift_key: request.targetShiftKey,
      target_shift_label: request.targetShiftLabel,
      target_start_time: request.targetStartTime ?? null,
      target_end_time: request.targetEndTime ?? null,
      target_is_open_shift: request.targetIsOpenShift,
      pay_period_key: request.payPeriodKey,
      requested_at: request.requestedAt,
      status: request.status,
      employee_note: request.employeeNote ?? null,
      recipient_note: request.recipientNote ?? null,
      supervisor_note: request.supervisorNote ?? null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('shift_trade_requests')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('Failed to save shift trade requests:', error);
      window.alert('Failed to save shift trade requests.');
    }
  }

  async function sendOpenShiftDecisionNotifications(
    request: OpenShiftRequest,
    status: 'APPROVED' | 'DENIED',
  ) {
    const title = status === 'APPROVED' ? 'Open shift request approved' : 'Open shift request denied';
    const body =
      status === 'APPROVED'
        ? `Your open shift request for ${request.shiftLabel} on ${request.dateKey} was approved. The schedule has been updated automatically.`
        : `Your open shift request for ${request.shiftLabel} on ${request.dateKey} was denied. Please contact a supervisor if you have questions.`;
    const employee = employees.find((item) => item.id === request.employeeId);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    const notifications: Promise<Response>[] = [];

    if (employee?.email) {
      notifications.push(
        fetch('/api/email/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: employee.email,
            senderName: 'ApolloEMS Scheduling',
            subject: title,
            message: body,
            notificationType: 'SCHEDULE',
          }),
        }),
      );
    }

    if (accessToken) {
      notifications.push(
        fetch('/api/sms/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipientMode: 'INDIVIDUAL',
            recipientEmployeeId: request.employeeId,
            messageBody: `ApolloEMS: ${body}`,
          }),
        }),
      );
    }

    const results = await Promise.allSettled(notifications);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.error('Open shift decision notification failed:', result.reason);
      } else if (!result.value.ok && result.value.status !== 400) {
        console.error('Open shift decision notification was not accepted:', result.value.status);
      }
    });
  }

  function assignApprovedOpenShiftRequest(current: ScheduleData, request: OpenShiftRequest): { next: ScheduleData; assigned: boolean } {
    const next = cloneScheduleData(normalizeLoadedData(current));
    const dateKey = request.dateKey;
    next[dateKey] = next[dateKey] ?? createEmptyDaySchedule();

    const employee = employees.find((item) => item.id === request.employeeId);
    const preferredOpenSlotId = employee?.scope === 'BLS' ? OPEN_BLS_SLOT_ID : OPEN_ALS_SLOT_ID;
    const fallbackOpenSlotId = preferredOpenSlotId === OPEN_ALS_SLOT_ID ? OPEN_BLS_SLOT_ID : OPEN_ALS_SLOT_ID;

    const assignIntoShift = (shift: ShiftAssignment | ExtraShiftAssignment, shiftName?: ShiftName): boolean => {
      const slotKeys: ScheduleSlotKey[] = ['employee1', 'employee2', 'employee3', 'employee4', 'employee5'];

      let targetSlotKey = slotKeys.find((slotKey) => shift[slotKey].employeeId === preferredOpenSlotId);
      targetSlotKey = targetSlotKey ?? slotKeys.find((slotKey) => shift[slotKey].employeeId === fallbackOpenSlotId);
      targetSlotKey = targetSlotKey ?? slotKeys.find((slotKey) => !shift[slotKey].employeeId);

      if (!targetSlotKey && shift.visibleEmployeeSlots < 5) {
        shift.visibleEmployeeSlots += 1;
        shift.showEmployee3 = shift.visibleEmployeeSlots >= 3;
        targetSlotKey = `employee${shift.visibleEmployeeSlots}` as ScheduleSlotKey;
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
        ? window.confirm(`Approve ${request.employeeName} for ${request.shiftLabel} on ${request.dateKey}? This will automatically update the schedule and notify the employee by email and SMS.`)
        : window.confirm(`Deny ${request.employeeName}'s request for ${request.shiftLabel} on ${request.dateKey}? This will notify the employee by email and SMS.`);

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

    await saveOpenShiftRequests(nextRequests);
    await sendOpenShiftDecisionNotifications(request, status);

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

  const visibleDates = useMemo(() => {
    if (visibleScheduleWeek === 'WEEK1') {
      return dates.slice(0, 7);
    }

    if (visibleScheduleWeek === 'WEEK2') {
      return dates.slice(7, 14);
    }

    return dates;
  }, [dates, visibleScheduleWeek]);

  const goToCurrentPayPeriod = () => {
    setAnchorDate(getGlobalPayPeriodStart(new Date()));
    setPayPeriodReady(true);
  };

  const jumpScheduleToColumn = (columnIndex: number) => {
    const container = scheduleScrollRef.current;
    if (!container) {
      return;
    }

    const leftLabelWidth = 180;
    const dayColumnWidth = 270;
    const targetLeft = Math.max(0, leftLabelWidth + dayColumnWidth * columnIndex - leftLabelWidth);

    container.scrollTo({
      left: targetLeft,
      behavior: 'smooth',
    });
  };

  const jumpScheduleToToday = () => {
    const todayKey = toDateKey(new Date());
    const todayIndex = dates.findIndex((date) => toDateKey(date) === todayKey);

    if (todayIndex >= 0) {
      jumpScheduleToColumn(todayIndex);
      return;
    }

    goToCurrentPayPeriod();
  };

  const handleExpandedShiftChange = (nextKey: string | null) => {
    if (
      hasUnsavedChanges &&
      expandedShiftKey &&
      expandedShiftKey !== nextKey
    ) {
      setPendingExpandedShiftKey(nextKey);
      return;
    }

    setExpandedShiftKey(nextKey);
  };

  const discardUnsavedChangesAndContinue = () => {
    dirtyDatesRef.current.clear();
    setHasUnsavedChanges(false);
    setSaveStatus('Changes discarded.');
    setExpandedShiftKey(pendingExpandedShiftKey);
    setPendingExpandedShiftKey(null);
  };

  const saveChangesAndContinue = async () => {
    const saved = await saveScheduleToSupabase();

    if (!saved) {
      return;
    }

    setExpandedShiftKey(pendingExpandedShiftKey);
    setPendingExpandedShiftKey(null);
  };

  const closeExpandedShiftEditor = async () => {
    if (isSavingScheduleRef.current) {
      return;
    }

    if (!hasUnsavedChanges) {
      setExpandedShiftKey(null);
      return;
    }

    const saved = await saveScheduleToSupabase();

    if (!saved) {
      return;
    }

    setExpandedShiftKey(null);
  };
  const visibleYear = visiblePayPeriod.end.getFullYear();
  const payPeriodOptions = useMemo(() => {
    const years = [visibleYear - 1, visibleYear, visibleYear + 1];
    return years.flatMap((year) =>
      getPayPeriodsForYear(year).map((payPeriod) => ({
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
    field:
      | 'showEmployee3'
      | 'vehicle'
      | 'allowExtendedHours'
      | 'hiddenFromEmployees'
      | 'supervisorNote',
    value: string | boolean,
  ) => {
    markUnsavedChanges(dateKey);
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      if (!next[dateKey]) {
        next[dateKey] = createEmptyDaySchedule();
      }

      const shift = next[dateKey].standard[shiftName];
      (shift[field] as string | boolean) = value;

      return next;
    });
  };

  const handleStandardSlotChange = (
    dateKey: string,
    shiftName: ShiftName,
    slotKey: ScheduleSlotKey,
    field: keyof EmployeeSlot,
    value: string,
  ) => {
    markUnsavedChanges(dateKey);
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      if (!next[dateKey]) {
        next[dateKey] = createEmptyDaySchedule();
      }

      const shift = next[dateKey].standard[shiftName];

      if (field === 'shiftType') {
        shift[slotKey].shiftType = value as ShiftType;
      } else {
        shift[slotKey][field] = value;
      }

      if (field === 'employeeId' && value && shiftName === 'ADMIN_SUP' && slotKey === 'employee1') {
        shift[slotKey].startTime = '06:00';
        shift[slotKey].endTime = '18:00';
      }

      if (field === 'employeeId' && !value) {
        shift[slotKey].startTime = DEFAULT_START_TIME;
        shift[slotKey].endTime = getDefaultEndTimeForShift(shiftName, slotKey);
        shift[slotKey].note = '';
        shift[slotKey].shiftType = 'REGULAR';
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
    markUnsavedChanges(dateKey);
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

      return next;
    });
  };

  function assignOpenShiftFromPanel(
    dateKey: string,
    assignmentKey: string,
    slotKey: ScheduleSlotKey,
    employeeId: string,
  ) {
    if (!employeeId) return;

    if (assignmentKey.startsWith('standard-')) {
      const shiftName = assignmentKey.replace('standard-', '') as ShiftName;
      handleStandardSlotChange(dateKey, shiftName, slotKey, 'employeeId', employeeId);
      return;
    }

    if (assignmentKey.startsWith('extra-')) {
      const extraId = assignmentKey.replace('extra-', '');
      handleExtraSlotChange(dateKey, extraId, slotKey, 'employeeId', employeeId);
    }
  }

  const handleExtraSlotChange = (
    dateKey: string,
    extraId: string,
    slotKey: ScheduleSlotKey,
    field: keyof EmployeeSlot,
    value: string,
  ) => {
    markUnsavedChanges(dateKey);
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      if (!next[dateKey]) {
        next[dateKey] = createEmptyDaySchedule();
      }

      const extra = next[dateKey].extras.find((item) => item.id === extraId);
      if (!extra) {
        return current;
      }

      if (field === 'shiftType') {
        extra[slotKey].shiftType = value as ShiftType;
      } else {
        extra[slotKey][field] = value;
      }

      if (field === 'employeeId' && !value) {
        extra[slotKey].startTime = DEFAULT_START_TIME;
        extra[slotKey].endTime = DEFAULT_END_TIME;
        extra[slotKey].note = '';
        extra[slotKey].shiftType = 'REGULAR';
      }

      return next;
    });
  };

    const handleAddEmployeeSlot = (dateKey: string, shiftName: ShiftName) => {
    markUnsavedChanges(dateKey);
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      if (!next[dateKey]) {
        next[dateKey] = createEmptyDaySchedule();
      }

      const shift = next[dateKey].standard[shiftName];
      shift.visibleEmployeeSlots = Math.min(5, Math.max(3, shift.visibleEmployeeSlots + 1));
      shift.showEmployee3 = shift.visibleEmployeeSlots >= 3;

      return next;
    });
  };

  const handleAddEmployeeSlotToExtra = (dateKey: string, extraId: string) => {
    markUnsavedChanges(dateKey);
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      if (!next[dateKey]) {
        next[dateKey] = createEmptyDaySchedule();
      }

      const extra = next[dateKey].extras.find((item) => item.id === extraId);
      if (!extra) {
        return current;
      }

      extra.visibleEmployeeSlots = Math.min(5, Math.max(3, extra.visibleEmployeeSlots + 1));
      extra.showEmployee3 = extra.visibleEmployeeSlots >= 3;

      return next;
    });
  };

  const handleRemoveEmployeeSlot = (dateKey: string, shiftName: ShiftName) => {
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      const shift = next[dateKey]?.standard[shiftName];
      if (!shift || SUPERVISOR_SHIFTS.has(shiftName)) {
        return current;
      }

      const visibleSlots = Math.min(5, Math.max(2, shift.visibleEmployeeSlots));
      if (visibleSlots <= 2) {
        return current;
      }

      const slotKey = `employee${visibleSlots}` as ScheduleSlotKey;
      if (shift[slotKey].employeeId) {
        window.alert(`Remove the employee from Employee ${visibleSlots} before removing that slot.`);
        return current;
      }

      markUnsavedChanges(dateKey);
      shift[slotKey] = createEmptyEmployeeSlot();
      shift.visibleEmployeeSlots = visibleSlots - 1;
      shift.showEmployee3 = shift.visibleEmployeeSlots >= 3;

      return next;
    });
  };

  const handleRemoveEmployeeSlotFromExtra = (dateKey: string, extraId: string) => {
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      const extra = next[dateKey]?.extras.find((item) => item.id === extraId);
      if (!extra || extra.category === 'SUPERVISOR') {
        return current;
      }

      const visibleSlots = Math.min(5, Math.max(2, extra.visibleEmployeeSlots));
      if (visibleSlots <= 2) {
        return current;
      }

      const slotKey = `employee${visibleSlots}` as ScheduleSlotKey;
      if (extra[slotKey].employeeId) {
        window.alert(`Remove the employee from Employee ${visibleSlots} before removing that slot.`);
        return current;
      }

      markUnsavedChanges(dateKey);
      extra[slotKey] = createEmptyEmployeeSlot();
      extra.visibleEmployeeSlots = visibleSlots - 1;
      extra.showEmployee3 = extra.visibleEmployeeSlots >= 3;

      return next;
    });
  };

  const handleAddShift = (dateKey: string) => {
    const label = window.prompt('Enter the extra shift name (example: Standby or LDT):', 'Standby');
    if (!label || !label.trim()) {
      return;
    }

    const typeInput = window.prompt('Enter shift type: UNIT or SUPERVISOR', 'UNIT');
    const category: ShiftCategory = typeInput?.trim().toUpperCase() === 'SUPERVISOR' ? 'SUPERVISOR' : 'UNIT';

    markUnsavedChanges(dateKey);
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
        employee4: createEmptyEmployeeSlot(),
        employee5: createEmptyEmployeeSlot(),
        showEmployee3: false,
        visibleEmployeeSlots: 2,
        vehicle: '',
        allowExtendedHours: false,
        hiddenFromEmployees: false,
        supervisorNote: '',
      });

      return next;
    });
  };

  const handleRemoveExtraShift = async (dateKey: string, extraId: string, label: string) => {
    const confirmed = window.confirm(`Remove extra shift "${label}" from this day?`);
    if (!confirmed) {
      return;
    }

    if (isSavingScheduleRef.current) {
      return;
    }

    const previousSchedule = scheduleDataRef.current;
    const next = cloneScheduleData(normalizeLoadedData(previousSchedule));
    const day = next[dateKey];

    if (!day || !day.extras.some((item) => item.id === extraId)) {
      return;
    }

    day.extras = day.extras.filter((item) => item.id !== extraId);

    markUnsavedChanges(dateKey);
    scheduleDataRef.current = next;
    setScheduleData(next);

    const saved = await saveScheduleToSupabase();

    if (saved) {
      setExpandedShiftKey(null);
      setPendingExpandedShiftKey(null);
      return;
    }

    scheduleDataRef.current = previousSchedule;
    setScheduleData(previousSchedule);
    dirtyDatesRef.current.add(dateKey);
    setHasUnsavedChanges(true);
  };

  const handleCopyPreviousDay = (dateKey: string, previousDateKey: string) => {
    markUnsavedChanges(dateKey);
    setScheduleDataSafely((current) => {
      const next = cloneScheduleData(normalizeLoadedData(current));
      const previousDay = getDaySchedule(next, previousDateKey);
      next[dateKey] = JSON.parse(JSON.stringify(previousDay)) as DaySchedule;

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
    showDetails: boolean,
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
    ].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    const recommendedEmployee = baseEligibleEmployees.find((employee) => eligibilityMap[employee.id]?.eligible !== false) ?? null;
    const isOpenSlotSelection = isOpenShiftSlot(slot.employeeId);
    const selectedEmployee = slot.employeeId && !isOpenSlotSelection ? getEmployeeById(slot.employeeId, employees) : null;
    const selectedEligibility = slot.employeeId && !isOpenSlotSelection ? eligibilityMap[slot.employeeId] : null;
    const isLowerPrioritySelection = Boolean(
      slot.employeeId && !isOpenSlotSelection && recommendedEmployee && slot.employeeId !== recommendedEmployee.id,
    );

    if (!showDetails) {
      if (slot.shiftType === 'SICK' || slot.shiftType === 'LEAVE') {
        return null;
      }

      const isOpenAls = slot.employeeId === OPEN_ALS_SLOT_ID;
      const isOpenBls = slot.employeeId === OPEN_BLS_SLOT_ID;
      const isSpecialShiftType =
        slot.shiftType &&
        slot.shiftType !== 'REGULAR';

      const shiftTypeLabel = getCollapsedShiftTypeLabel(slot.shiftType);
      const collapsedHours = slot.employeeId
        ? formatCollapsedShiftHours(slot.startTime, slot.endTime)
        : '';

      const sortedEligibleEmployees = [...eligibleEmployees].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );

      const handleCollapsedEmployeeChange = async (
        event: React.ChangeEvent<HTMLSelectElement>,
      ) => {
        event.stopPropagation();

        if (isSavingScheduleRef.current) {
          return;
        }

        const previousEmployeeId = slot.employeeId;
        const nextEmployeeId = event.target.value;

        if (nextEmployeeId === previousEmployeeId) {
          return;
        }

        onChange('employeeId', nextEmployeeId);

        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 0);
        });

        const saved = await saveScheduleToSupabase();

        if (!saved) {
          onChange('employeeId', previousEmployeeId);
          setSaveStatus(
            'Action Required — assignment was restored because the schedule could not be saved.',
          );
          return;
        }

        if (
          requestContext &&
          isOpenShiftSlot(previousEmployeeId) &&
          nextEmployeeId &&
          !isOpenShiftSlot(nextEmployeeId)
        ) {
          await resolveOpenShiftRequestsFromDropdown(
            requestContext,
            nextEmployeeId,
          );
        }
      };

      return (
        <div
          title={
            isOpenSlotSelection && requestedEmployees.length > 0
              ? `Requested by: ${requestedEmployees.map((employee) => employee.name).join(', ')}`
              : undefined
          }
          className={`rounded-lg border px-3 py-2 ${
            isOpenAls
              ? 'border-blue-800 bg-blue-300'
              : isOpenBls
                ? 'border-red-800 bg-red-300'
                : isSpecialShiftType
                  ? 'border-yellow-500 bg-yellow-100'
                  : 'border-slate-400 bg-white'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div
              className="min-w-0 flex-1"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <label className="sr-only">
                Change {slotLabel} assignment
              </label>

              <select
                value={slot.employeeId}
                onChange={(event) => void handleCollapsedEmployeeChange(event)}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                disabled={saveStatus.startsWith('Saving')}
                aria-label={`Change ${slotLabel} assignment`}
                title={
                  slot.note?.trim()
                    ? `Employee Note: ${slot.note.trim()}`
                    : `Change ${slotLabel} assignment`
                }
                className={`w-full min-w-0 cursor-pointer truncate rounded-lg border px-2 py-1.5 text-sm font-semibold outline-none transition focus:ring-2 disabled:cursor-wait disabled:opacity-70 ${
                  isOpenAls
                    ? 'border-blue-700 bg-blue-200 text-blue-950 focus:border-blue-900 focus:ring-blue-300'
                    : isOpenBls
                      ? 'border-red-700 bg-red-200 text-red-950 focus:border-red-900 focus:ring-red-300'
                      : isSpecialShiftType
                        ? 'border-yellow-400 bg-yellow-50 text-yellow-900 focus:border-yellow-600 focus:ring-yellow-200'
                        : 'border-slate-300 bg-white text-slate-800 focus:border-slate-500 focus:ring-slate-200'
                }`}
              >
                <option value="">Open</option>
                <option value={OPEN_ALS_SLOT_ID}>Open ALS</option>
                <option value={OPEN_BLS_SLOT_ID}>Open BLS</option>

                {sortedEligibleEmployees.map((employee) => {
                  const eligibility =
                    eligibilityMap[employee.id] ?? {
                      eligible: true,
                      reason: '',
                    };

                  return (
                    <option
                      key={employee.id}
                      value={employee.id}
                      disabled={
                        !eligibility.eligible &&
                        slot.employeeId !== employee.id
                      }
                    >
                      {employee.name}
                    </option>
                  );
                })}
              </select>

              {isOpenSlotSelection && requestedEmployees.length > 0 && (
                <div
                  className="mt-1 text-sm"
                  title={`Requested by: ${requestedEmployees.map((employee) => employee.name).join(', ')}`}
                >
                  ⭐
                </div>
              )}

              {shiftTypeLabel && (
                <div
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    getCollapsedShiftTypeClasses(slot.shiftType)
                  }`}
                >
                  {shiftTypeLabel}
                </div>
              )}
            </div>

            {collapsedHours && (
              <div className="shrink-0 text-xs font-bold text-slate-600">
                {collapsedHours}
              </div>
            )}
          </div>
        </div>
      );
    }


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
            {recommendedEmployee && !slot.employeeId && !recommendedEmployee.name.toLowerCase().includes('richardson, russ') && (
              <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Recommended: {recommendedEmployee.name}
              </div>
            )}

          </div>
        </div>

        <div
          className="space-y-2"
          onClick={(event) => event.stopPropagation()}
        >
          <select
            value={slot.employeeId}
            onChange={(event) => onChange('employeeId', event.target.value)}
            className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-slate-500 ${
              slot.employeeId === OPEN_ALS_SLOT_ID
                ? 'border-blue-700 bg-blue-200 text-blue-950'
                : slot.employeeId === OPEN_BLS_SLOT_ID
                  ? 'border-red-700 bg-red-200 text-red-950'
                  : 'border-slate-300 bg-white text-slate-900'
            }`}
          >
            <option value="">Select employee</option>
            <option value={OPEN_ALS_SLOT_ID}>Open ALS</option>
            <option value={OPEN_BLS_SLOT_ID}>Open BLS</option>
            {eligibleEmployees.map((employee) => {
              const payPeriodHours = payPeriodHoursMap[employee.id] ?? 0;
              const eligibility = eligibilityMap[employee.id] ?? { eligible: true, reason: '' };
              const isRecommended = recommendedEmployee?.id === employee.id && !employee.name.toLowerCase().includes('richardson, russ');
              const isRequested = requestedEmployeeIdSet.has(employee.id);
              const label = `${employee.name}${isRequested ? ' — Requested' : ''}${isRecommended ? ' — Recommended' : ''}${eligibility.warning ? ` — Warning: ${eligibility.warning}` : ''}`;

              return (
                <option key={employee.id} value={employee.id}>
                  {label}
                </option>
              );
            })}
          </select>

          {slot.employeeId && selectedEligibility?.warning && (
            <div>
              <button
                type="button"
                onClick={() =>
                  setExpandedWarnings((current) => ({
                    ...current,
                    [`warning-${slotLabel}`]: !current[`warning-${slotLabel}`],
                  }))
                }
                className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-sm font-bold text-amber-800 transition hover:bg-amber-200"
                title="Show warning"
              >
                ⚠
              </button>

              {expandedWarnings[`warning-${slotLabel}`] && (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-800">
                  {selectedEligibility.warning}
                </div>
              )}
            </div>
          )}

          {isLowerPrioritySelection &&
            recommendedEmployee &&
            !recommendedEmployee.name.toLowerCase().includes('richardson, russ') && (
            <div>
              <button
                type="button"
                onClick={() =>
                  setExpandedWarnings((current) => ({
                    ...current,
                    [`priority-${slotLabel}`]: !current[`priority-${slotLabel}`],
                  }))
                }
                className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-sm font-bold text-amber-800 transition hover:bg-amber-200"
                title="Show staffing warning"
              >
                ⚠
              </button>

              {expandedWarnings[`priority-${slotLabel}`] && (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-800">
                  Higher priority employee available: {recommendedEmployee.name}. Selection is still allowed, but should be treated as a supervisor override if used.
                </div>
              )}
            </div>
          )}

          {slot.employeeId && selectedEligibility && !selectedEligibility.eligible && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-700">
              {selectedEmployee?.name ?? 'Selected employee'} is not eligible: {selectedEligibility.reason}
            </div>
          )}

          {showDetails && (
            <>
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
                    defaultValue={slot.startTime}
                    onBlur={(event) => onChange('startTime', normalizeMilitaryTime(event.target.value, DEFAULT_START_TIME))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.currentTarget.blur();
                      }
                    }}
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
                    defaultValue={slot.endTime}
                    onBlur={(event) => onChange('endTime', normalizeMilitaryTime(event.target.value, DEFAULT_END_TIME))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.currentTarget.blur();
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>
              </div>



              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Shift Type
                </label>

                <select
                  value={slot.shiftType}
                  onChange={(event) => onChange('shiftType', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                >
                  <option value="REGULAR">Regular Shift</option>
                  <option value="SICK">Sick Time</option>
                  <option value="VACATION">Vacation</option>
                  <option value="LEAVE">Leave</option>
                  <option value="TRAINING">Training</option>
                </select>
              </div>

              <div>
                <label className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${
                  slot.shiftType === 'SICK'
                    ? 'text-red-700'
                    : slot.shiftType === 'VACATION'
                      ? 'text-amber-700'
                      : slot.shiftType === 'LEAVE'
                        ? 'text-purple-700'
                        : slot.shiftType === 'TRAINING'
                          ? 'text-blue-700'
                          : 'text-slate-500'
                }`}>
                  Employee Note {noteRequired ? '(required)' : '(optional)'}
                </label>
                <textarea
                  defaultValue={slot.note}
                  onBlur={(event) => onChange('note', event.target.value)}
                  disabled={!slot.employeeId}
                  rows={2}
                  placeholder={
                    noteRequired
                      ? 'Explain why the end time is not 06:00'
                      : 'Visible to the assigned employee'
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:opacity-50"
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  function getExpandedExtraShift() {
    if (!expandedShiftKey || !expandedShiftKey.startsWith('extra-')) {
      return null;
    }

    const dateKey = expandedShiftKey.slice(-10);

    const extraId = expandedShiftKey
      .slice(0, -11)
      .replace(/^extra-/, '');

    const day = getDaySchedule(scheduleData, dateKey);

    const extra = day.extras.find((item) => item.id === extraId);

    if (!extra) {
      return null;
    }

    return {
      dateKey,
      extra,
    };
  }

  function getExpandedStandardShift() {
    if (!expandedShiftKey) {
      return null;
    }

    const dateKey = expandedShiftKey.slice(-10);
    const shiftName = expandedShiftKey.slice(0, -11);

    if (!SHIFT_ORDER.includes(shiftName as ShiftName) || !dateKey) {
      return null;
    }

    const day = getDaySchedule(scheduleData, dateKey);
    const typedShiftName = shiftName as ShiftName;
    const shift = day.standard[typedShiftName];

    return {
      dateKey,
      shiftName: typedShiftName,
      shift,
      category: UNIT_SHIFTS.has(typedShiftName) ? 'UNIT' as ShiftCategory : 'SUPERVISOR' as ShiftCategory,
      label: SHIFT_DISPLAY_NAMES[typedShiftName],
    };
  }

  const now = new Date();
  const todayKey = toDateKey(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const openShiftsNeedingCoverage = dates.flatMap((date) => {
    const dateKey = toDateKey(date);
    const day = getDaySchedule(scheduleData, dateKey);

    return getAssignmentRefsForDay(day).flatMap((assignment) => {
      const shiftWithSlots = assignment.shift as ShiftAssignment | ExtraShiftAssignment;
      const slotKeys: ScheduleSlotKey[] = ['employee1', 'employee2', 'employee3', 'employee4', 'employee5'];
      return slotKeys
        .filter((slotKey) => shiftWithSlots[slotKey] && isOpenShiftSlot(shiftWithSlots[slotKey].employeeId))
        .map((slotKey) => {
          const slot = shiftWithSlots[slotKey];
          return {
            dateKey,
            assignmentKey: assignment.key,
            slotKey,
            shiftLabel: assignment.label,
            slotLabel: getOpenShiftLabel(slot.employeeId),
            vehicle: assignment.shift.vehicle || 'No vehicle assigned',
            startTime: slot.startTime,
            endTime: slot.endTime,
          };
        });
    });
  });

  function getUnavailableEmployeesForDate(dateKey: string) {
    return getAssignmentRefsForDay(getDaySchedule(scheduleData, dateKey))
      .flatMap((assignment) => {
        const shift = assignment.shift as ShiftAssignment | ExtraShiftAssignment;
        const slotKeys: ScheduleSlotKey[] = ['employee1', 'employee2', 'employee3', 'employee4', 'employee5'];

        return slotKeys.flatMap((slotKey) => {
          const slot = shift[slotKey];
          if (
            !slot?.employeeId ||
            (slot.shiftType !== 'SICK' &&
              slot.shiftType !== 'LEAVE' &&
              slot.shiftType !== 'VACATION')
          ) {
            return [];
          }

          return [{
            id: `${assignment.key}-${slotKey}-${slot.employeeId}`,
            employeeName: getEmployeeById(slot.employeeId, employees)?.name ?? slot.employeeId,
            shiftLabel: assignment.label,
            status:
              slot.shiftType === 'SICK'
                ? 'Sick'
                : slot.shiftType === 'VACATION'
                  ? 'Vacation'
                  : 'Leave',
          }];
        });
      });
  }

  function getPendingRequestNames(dateKey: string, assignmentKey: string, shiftLabel: string) {
    return pendingOpenShiftRequests
      .filter((request) =>
        request.dateKey === dateKey &&
        (request.shiftKey === assignmentKey ||
          request.shiftKey === assignmentKey.replace(/^standard-/, '') ||
          request.shiftLabel === shiftLabel),
      )
      .map((request) => request.employeeName)
      .filter((name, index, names) => names.indexOf(name) === index);
  }

    const onDutyEmployees = getAssignmentRefsForDay(getDaySchedule(scheduleData, todayKey))
    .flatMap((assignment) =>
      getAssignedSlotsForAssignment(assignment.category, assignment.shift)
        .filter(
          (slot) =>
            slot.employeeId &&
            slot.shiftType !== 'SICK' &&
            slot.shiftType !== 'LEAVE' &&
            slot.shiftType !== 'VACATION',
        )
        .map((slot) => ({
          dateKey: todayKey,
          employeeName: getEmployeeById(slot.employeeId, employees)?.name ?? slot.employeeId,
          shiftLabel: assignment.label,
          vehicle: assignment.shift.vehicle || 'No vehicle assigned',
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
    )
    .filter((item) => {
      const start = parseTimeToMinutes(item.startTime);
      let end = parseTimeToMinutes(item.endTime);

      if (end <= start || end === parseTimeToMinutes(DEFAULT_END_TIME)) {
        end += 24 * 60;
      }

      const adjustedCurrentMinutes = currentMinutes < start ? currentMinutes + 24 * 60 : currentMinutes;

      return adjustedCurrentMinutes >= start && adjustedCurrentMinutes <= end;
    });

  const supervisorNotes = dates.flatMap<{
    id: string;
    dateKey: string;
    shiftLabel: string;
    employeeName: string;
    note: string;
  }>((date) => {
    const dateKey = toDateKey(date);
    const day = getDaySchedule(scheduleData, dateKey);

    const standardNotes = SHIFT_ORDER
      .map((shiftName) => {
        const note = day.standard[shiftName].supervisorNote?.trim();

        if (!note) {
          return null;
        }

        return {
          id: `${dateKey}-${shiftName}-supervisor-note`,
          dateKey,
          shiftLabel: SHIFT_DISPLAY_NAMES[shiftName],
          employeeName: 'Shift-wide',
          note,
        };
      })
      .filter(
        (entry): entry is NonNullable<typeof entry> => entry !== null,
      );

    const extraNotes = day.extras
      .map((extra) => {
        const note = extra.supervisorNote?.trim();

        if (!note) {
          return null;
        }

        return {
          id: `${dateKey}-${extra.id}-supervisor-note`,
          dateKey,
          shiftLabel: extra.label,
          employeeName: 'Shift-wide',
          note,
        };
      })
      .filter(
        (entry): entry is NonNullable<typeof entry> => entry !== null,
      );

    return [...standardNotes, ...extraNotes];
  });

  const employeeSearchResults = useMemo(() => {
    const query = employeeSearchQuery.trim().toLowerCase();
    if (!query) return [];

    const results: Array<{ id: string; employeeName: string; dateKey: string; shiftLabel: string; expandedKey: string }> = [];
    for (const date of dates) {
      const dateKey = toDateKey(date);
      const day = getDaySchedule(scheduleData, dateKey);

      for (const shiftName of SHIFT_ORDER) {
        const shift = day.standard[shiftName];
        (['employee1', 'employee2', 'employee3', 'employee4', 'employee5'] as ScheduleSlotKey[]).forEach((slotKey) => {
          const employee = getEmployeeById(shift[slotKey].employeeId, employees);
          if (employee?.name.toLowerCase().includes(query)) {
            results.push({
              id: `${dateKey}-${shiftName}-${slotKey}-${employee.id}`,
              employeeName: employee.name,
              dateKey,
              shiftLabel: SHIFT_DISPLAY_NAMES[shiftName],
              expandedKey: `${shiftName}-${dateKey}`,
            });
          }
        });
      }

      day.extras.forEach((extra) => {
        (['employee1', 'employee2', 'employee3', 'employee4', 'employee5'] as ScheduleSlotKey[]).forEach((slotKey) => {
          const employee = getEmployeeById(extra[slotKey].employeeId, employees);
          if (employee?.name.toLowerCase().includes(query)) {
            results.push({
              id: `${dateKey}-${extra.id}-${slotKey}-${employee.id}`,
              employeeName: employee.name,
              dateKey,
              shiftLabel: extra.label,
              expandedKey: `extra-${extra.id}-${dateKey}`,
            });
          }
        });
      });
    }

    return results;
  }, [employeeSearchQuery, scheduleData, employees, dates]);

  const supervisorNotesSignature = supervisorNotes
    .map((entry) => `${entry.id}:${entry.note}`)
    .join('|');

  const hasUnreadSupervisorNotes = supervisorNotes.length > 0 && supervisorNotesSignature !== reviewedSupervisorNoteSignature;

  if (!payPeriodReady) {
    return (
      <div className="min-h-screen bg-slate-200 px-4 py-6 md:px-6">
        <div className="mx-auto max-w-[1900px] rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700 shadow-sm">
          Loading current pay period...
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-page bg-slate-200 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-[1900px]">
        <div className="mb-6 rounded-2xl border border-slate-400 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
             <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Sequoia Safety Council Schedule
             </h1>

</div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[340px]">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Pay Period
                </label>
                <select
                  value={selectedPayPeriodValue}
                  onChange={(event) => handlePayPeriodChange(event.target.value)}
                  className="w-full rounded-xl border border-slate-500 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-700"
                >
                  {payPeriodOptions.map((option) => (
                    <option key={`${option.year}-${toDateKey(option.start)}`} value={`${option.year}|${toDateKey(option.start)}`}>
                      {formatPayPeriodOptionLabel(option, option.year)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={`inline-flex rounded-xl px-3 py-2 text-xs font-semibold ${
                    saveStatus.startsWith('Saving')
                      ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-400'
                      : saveStatus.toLowerCase().includes('failed')
                        ? 'bg-red-50 text-red-700 ring-1 ring-red-400'
                        : hasUnsavedChanges
                          ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-400'
                          : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400'
                  }`}
                >
                  {saveStatus}
                </div>

                <button
                  type="button"
                  onClick={saveScheduleToSupabase}
                  disabled={!hasUnsavedChanges || saveStatus.startsWith('Saving')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    hasUnsavedChanges
                      ? 'border border-emerald-800 bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'cursor-not-allowed border border-slate-400 bg-slate-200 text-slate-500'
                  }`}
                >
                  Confirm Changes
                </button>
              </div>


              <button
                type="button"
                onClick={goToCurrentPayPeriod}
                className="rounded-xl border border-slate-500 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Current Pay Period
              </button>

            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className={`rounded-xl border p-3 shadow-sm ${pendingOpenShiftRequests.length > 0 ? 'border-violet-500 bg-violet-50' : 'border-slate-500 bg-white'}`}>
            <button
              type="button"
              onClick={() => {
                const nextValue = !showPendingOpenShiftRequests;
                closeSchedulePanels();
                setShowPendingOpenShiftRequests(nextValue);
              }}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <div className={`text-sm font-bold ${pendingOpenShiftRequests.length > 0 ? 'text-violet-800' : 'text-slate-900'}`}>
                  Pending Open Shift Requests
                </div>
                <div className={`mt-1 text-xs ${pendingOpenShiftRequests.length > 0 ? 'text-violet-700' : 'text-slate-500'}`}>
                  {pendingOpenShiftRequests.length > 0
                    ? `${pendingOpenShiftRequests.length} request${pendingOpenShiftRequests.length === 1 ? '' : 's'} awaiting supervisor review.`
                    : 'No pending open shift requests.'}
                </div>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${pendingOpenShiftRequests.length > 0 ? 'bg-violet-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {showPendingOpenShiftRequests ? 'Hide Details' : 'Show Details'}
              </span>
            </button>

            {showPendingOpenShiftRequests && (
              <div className="mt-2 space-y-2">
                {pendingOpenShiftRequests.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                    No pending open shift requests.
                  </div>
                ) : (
                  pendingOpenShiftRequests.map((request) => (
                    <div key={request.id} className="rounded-xl border border-violet-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{request.employeeName}</div>
                          <div className="mt-1 text-sm text-slate-700">
                            {request.shiftLabel} • {formatTileDate(request.dateKey)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Requested {new Date(request.requestedAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => void updateOpenShiftRequestStatus(request.id, 'DENIED')} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                            Deny
                          </button>
                          <button type="button" onClick={() => void updateOpenShiftRequestStatus(request.id, 'APPROVED')} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800">
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

          <div className={`rounded-xl border p-3 shadow-sm ${pendingVacationRequests.length > 0 ? 'border-sky-500 bg-sky-50' : 'border-slate-500 bg-white'}`}>
            <button
              type="button"
              onClick={() => {
                const nextValue = !showPendingVacationRequests;
                closeSchedulePanels();
                setShowPendingVacationRequests(nextValue);
              }}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <div className={`text-sm font-bold ${pendingVacationRequests.length > 0 ? 'text-sky-800' : 'text-slate-900'}`}>
                  Pending Vacation Requests
                </div>
                <div className={`mt-1 text-xs ${pendingVacationRequests.length > 0 ? 'text-sky-700' : 'text-slate-500'}`}>
                  {pendingVacationRequests.length > 0
                    ? `${pendingVacationRequests.length} request${pendingVacationRequests.length === 1 ? '' : 's'} awaiting supervisor review.`
                    : 'No pending vacation requests.'}
                </div>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${pendingVacationRequests.length > 0 ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {showPendingVacationRequests ? 'Hide Details' : 'Show Details'}
              </span>
            </button>

            {showPendingVacationRequests && (
              <div className="mt-2 space-y-2">
                {pendingVacationRequests.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                    No pending vacation requests.
                  </div>
                ) : (
                  pendingVacationRequests.map((request) => (
                    <div key={request.id} className="rounded-xl border border-sky-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{request.employeeName}</div>
                          <div className="mt-1 text-sm text-slate-700">
                            {request.shiftLabel} • {formatTileDate(request.dateKey)} • {request.startTime}-{request.endTime}
                          </div>
                          {request.reason && (
                            <div className="mt-2 text-sm text-slate-600">Reason: {request.reason}</div>
                          )}
                          <div className="mt-1 text-xs text-slate-500">
                            Requested {new Date(request.requestedAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void updateVacationRequestStatus(request.id, 'DENIED')}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            Deny
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateVacationRequestStatus(request.id, 'APPROVED')}
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

          <div className={`rounded-xl border p-3 shadow-sm ${pendingShiftTradeRequests.length > 0 ? 'border-amber-500 bg-amber-50' : 'border-slate-500 bg-white'}`}>
            <button
              type="button"
              onClick={() => {
                const nextValue = !showPendingShiftTradeRequests;
                closeSchedulePanels();
                setShowPendingShiftTradeRequests(nextValue);
              }}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <div className={`text-sm font-bold ${pendingShiftTradeRequests.length > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
                  Pending Shift Trade Requests
                </div>
                <div className={`mt-1 text-xs ${pendingShiftTradeRequests.length > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                  {pendingShiftTradeRequests.length > 0
                    ? `${pendingShiftTradeRequests.length} trade${pendingShiftTradeRequests.length === 1 ? '' : 's'} awaiting supervisor review.`
                    : 'No pending shift trade requests.'}
                </div>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${pendingShiftTradeRequests.length > 0 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {showPendingShiftTradeRequests ? 'Hide Details' : 'Show Details'}
              </span>
            </button>

            {showPendingShiftTradeRequests && (
              <div className="mt-2 space-y-2">
                {pendingShiftTradeRequests.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                    No pending shift trade requests.
                  </div>
                ) : (
                  pendingShiftTradeRequests.map((request) => (
                    <div key={request.id} className="rounded-xl border border-amber-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{request.requestingEmployeeName}</div>
                          <div className="mt-1 text-sm text-slate-700">
                            Wants to trade {request.requestingShiftLabel} • {formatTileDate(request.requestingDateKey)}
                          </div>
                          <div className="mt-1 text-sm text-slate-700">
                            For {request.targetIsOpenShift ? 'Open Shift' : request.targetEmployeeName ?? 'Employee'} • {request.targetShiftLabel} • {formatTileDate(request.targetDateKey)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {request.requestingStartTime ?? '--'}-{request.requestingEndTime ?? '--'}
                            {' → '}
                            {request.targetStartTime ?? '--'}-{request.targetEndTime ?? '--'}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => updateShiftTradeRequestStatus(request.id, 'DENIED')}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            Deny
                          </button>
                          <button
                            type="button"
                            onClick={() => updateShiftTradeRequestStatus(request.id, 'APPROVED')}
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

          <div className={`rounded-xl border p-3 shadow-sm ${showOnDutyEmployees ? 'border-emerald-600 bg-emerald-50' : 'border-emerald-500 bg-white'}`}>
            <button
              type="button"
              onClick={() => {
                const nextValue = !showOnDutyEmployees;
                closeSchedulePanels();
                setShowOnDutyEmployees(nextValue);
              }}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <div className={`text-sm font-bold ${showOnDutyEmployees ? 'text-emerald-800' : 'text-slate-900'}`}>On-Duty Now</div>
                <div className={`mt-1 text-xs ${showOnDutyEmployees ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {onDutyEmployees.length} employee{onDutyEmployees.length === 1 ? '' : 's'} currently on duty.
                </div>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${showOnDutyEmployees ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                {showOnDutyEmployees ? 'Hide Details' : 'Show Details'}
              </span>
            </button>
          </div>

          <div className={`rounded-xl border p-3 shadow-sm ${showOpenShiftsNeedingCoverage ? 'border-red-600 bg-red-50' : 'border-red-500 bg-white'}`}>
            <button
              type="button"
              onClick={() => {
                const nextValue = !showOpenShiftsNeedingCoverage;
                closeSchedulePanels();
                setShowOpenShiftsNeedingCoverage(nextValue);
              }}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <div className={`text-sm font-bold ${showOpenShiftsNeedingCoverage ? 'text-red-800' : 'text-slate-900'}`}>Open Shifts</div>
                <div className={`mt-1 text-xs ${showOpenShiftsNeedingCoverage ? 'text-red-700' : 'text-slate-500'}`}>
                  {openShiftsNeedingCoverage.length} shift{openShiftsNeedingCoverage.length === 1 ? '' : 's'} need coverage.
                </div>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${showOpenShiftsNeedingCoverage ? 'bg-red-700 text-white' : 'bg-red-100 text-red-700'}`}>
                {showOpenShiftsNeedingCoverage ? 'Hide Details' : 'Show Details'}
              </span>
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[180px]">
  <select
    value={visibleScheduleWeek}
    onChange={(event) =>
      setVisibleScheduleWeek(
        event.target.value as 'WEEK1' | 'WEEK2' | 'ALL'
      )
    }
    className="w-full rounded-xl border border-slate-500 bg-white px-3 py-2 text-sm font-medium text-slate-700"
  >
    <option value="WEEK1">Week 1</option>
    <option value="WEEK2">Week 2</option>
    <option value="ALL">Full Pay Period</option>
  </select>
</div>

          <button
            type="button"
            onClick={() => setShowScheduleKey((current) => !current)}
            className="rounded-xl border border-slate-500 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            {showScheduleKey ? 'Hide Key' : 'Show Key'}
          </button>

        </div>

        <div className="mb-3 rounded-2xl border border-slate-400 bg-white p-4 shadow-sm">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search Employees on Schedule
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              value={employeeSearchQuery}
              onChange={(event) => setEmployeeSearchQuery(event.target.value)}
              placeholder="Type an employee name"
              className="w-full rounded-xl border border-slate-400 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-700"
            />
            {employeeSearchQuery && (
              <button type="button" onClick={() => setEmployeeSearchQuery('')} className="rounded-xl border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Clear
              </button>
            )}
          </div>

          {employeeSearchQuery.trim() && (
            <div className="mt-3">
              <div className="mb-2 text-xs font-semibold text-slate-600">
                {employeeSearchResults.length} matching assignment{employeeSearchResults.length === 1 ? '' : 's'}
              </div>
              <div className="flex flex-wrap gap-2">
                {employeeSearchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => {
                      const dateIndex = dates.findIndex((date) => toDateKey(date) === result.dateKey);
                      setVisibleScheduleWeek(dateIndex >= 7 ? 'WEEK2' : 'WEEK1');
                      setExpandedShiftKey(result.expandedKey);
                    }}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-left text-xs transition hover:bg-slate-100"
                  >
                    <span className="font-bold text-slate-900">{result.employeeName}</span>
                    <span className="ml-2 text-slate-600">{formatTileDate(result.dateKey)} • {result.shiftLabel}</span>
                  </button>
                ))}
                {employeeSearchResults.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    No scheduled assignments match that employee name.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showScheduleKey && (
          <div className="mb-3 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-blue-800 bg-blue-200 px-3 py-2 font-semibold text-blue-950">Open ALS shift</div>
              <div className="rounded-xl border border-red-800 bg-red-200 px-3 py-2 font-semibold text-red-950">Open BLS shift</div>
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 font-semibold text-amber-950">Sick / Leave / Vacation employee</div>
              <div className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-800">⭐ Employee requested this open shift</div>
              <div className="rounded-xl border border-red-300 bg-red-100 px-3 py-2 font-semibold text-red-800">⚠ Scheduling warning</div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 font-semibold text-sky-800">📝 Employee-visible note</div>
              <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 font-semibold text-violet-800">🔒 Supervisor-only note</div>
              <div className="rounded-xl border border-emerald-300 bg-emerald-100 px-3 py-2 font-semibold text-emerald-900">Green column = today</div>
            </div>
          </div>
        )}

        {showOpenShiftsNeedingCoverage && (
          <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="text-sm font-bold text-red-900">Open Shifts Needing Coverage</div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {openShiftsNeedingCoverage.length === 0 ? (
                <div className="rounded-xl border border-dashed border-red-300 bg-white p-3 text-sm text-red-800">No open shifts in this pay period.</div>
              ) : (
                openShiftsNeedingCoverage.map((item) => {
                  const requestNames = getPendingRequestNames(item.dateKey, item.assignmentKey, item.shiftLabel);

                  return (
                  <div
                    key={`${item.dateKey}-${item.shiftLabel}-${item.slotLabel}-${item.startTime}-${item.endTime}`}
                    title={requestNames.length > 0 ? `Requested by: ${requestNames.join(', ')}` : undefined}
                    className={`rounded-xl border p-3 ${
                      item.slotLabel === 'Open ALS'
                        ? 'border-blue-800 bg-blue-200'
                        : 'border-red-800 bg-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-slate-950">{item.slotLabel}</div>
                      {requestNames.length > 0 && (
                        <span title={`Requested by: ${requestNames.join(', ')}`}>⭐</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{item.shiftLabel} • {item.vehicle}</div>
                    <div className="mt-1 text-xs font-semibold text-red-700">{formatTileDate(item.dateKey)} • {item.startTime} - {item.endTime}</div>

                    <select
                      value=""
                      onChange={(event) => assignOpenShiftFromPanel(item.dateKey, item.assignmentKey, item.slotKey, event.target.value)}
                      className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                    >
                      <option value="">Assign Employee</option>
                      {employees
                        .filter((employee) =>
                          item.slotLabel === 'Open ALS'
                            ? employee.scope === 'ALS'
                            : item.slotLabel === 'Open BLS'
                              ? employee.scope === 'BLS'
                              : true
                        )
                        .map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {showOnDutyEmployees && (
          <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-sm font-bold text-emerald-900">On-Duty Now</div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {onDutyEmployees.length === 0 ? (
                <div className="rounded-xl border border-dashed border-emerald-300 bg-white p-3 text-sm text-emerald-800">No employees currently on duty.</div>
              ) : (
                onDutyEmployees.map((item) => (
                  <div key={`${item.employeeName}-${item.shiftLabel}-${item.startTime}-${item.endTime}`} className="rounded-xl border border-emerald-200 bg-white p-3">
                    <div className="text-sm font-bold text-slate-900">{item.employeeName}</div>
                    <div className="mt-1 text-xs text-slate-600">{item.shiftLabel} • {item.vehicle}</div>
                    <div className="mt-1 text-xs font-semibold text-emerald-700">{formatTileDate(item.dateKey)}</div>
                    <div className="mt-1 text-xs font-semibold text-emerald-700">{item.startTime} - {item.endTime}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div ref={scheduleScrollRef} className="overflow-x-hidden rounded-2xl border border-slate-500 bg-white shadow-sm">
          <div key={visiblePayPeriodStartKey} className={`grid w-full ${visibleScheduleWeek === 'ALL' ? 'grid-cols-[100px_repeat(14,minmax(0,1fr))]' : 'grid-cols-[100px_repeat(7,minmax(0,1fr))]'}`}>
            <div className="sticky left-0 top-0 z-50 border-b border-r border-slate-400 bg-slate-50 p-4 shadow-sm">
              
            </div>

            {visibleDates.map((date, index) => {
              const dateKey = toDateKey(date);
              const previousDateKey = index > 0 ? toDateKey(dates[index - 1]) : '';
              const unavailableEmployees = getUnavailableEmployeesForDate(dateKey);

              const isToday = todayKey === dateKey;
              const isPastDate = dateKey < todayKey;

              return (
                <div
                  key={dateKey}
                  className={`sticky top-0 z-30 border-b border-r p-4 ${
                    isToday
                      ? 'border-emerald-400 bg-emerald-100'
                      : isPastDate
                        ? 'border-slate-400 bg-slate-200'
                        : 'border-slate-400 bg-slate-50'
                  }`}
                >
                  <div
          className="space-y-2"
          onClick={(event) => event.stopPropagation()}
        >
                    <div className="text-center">
                      <div className="text-sm font-semibold text-slate-900">{formatDayLabel(date)}</div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddShift(dateKey)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                      >
                        Add Shift
                      </button>
                    </div>

                    {unavailableEmployees.length > 0 && (
                      <details className="rounded-lg border border-amber-300 bg-amber-50 text-left">
                        <summary className="cursor-pointer px-2 py-1.5 text-xs font-bold text-amber-900">
                          Sick / Leave / Vacation ({unavailableEmployees.length})
                        </summary>
                        <div className="space-y-1 border-t border-amber-200 px-2 py-2">
                          {unavailableEmployees.map((item) => (
                            <div key={item.id} className="text-[11px] leading-4 text-amber-950">
                              <span className="font-bold">{item.employeeName}</span>
                              {' · '}{item.status} · {item.shiftLabel}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}

            {SHIFT_ORDER.map((shiftName) => (
              <React.Fragment key={shiftName}>
                <div className="sticky left-0 z-10 border-b border-r border-slate-400 bg-white p-4">
                  <div className="flex h-full flex-col justify-center">
                    <div className="text-sm font-bold text-slate-900">{SHIFT_TABLE_LABELS[shiftName]}</div>
                  </div>
                </div>

                {visibleDates.map((date) => {
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

                  const sharedEligibilityMap = Object.fromEntries(
                    employees.map((employee) => [
                      employee.id,
                      getEligibilityForEmployee(scheduleData, dateKey, employee.id, assignmentRef, employees, assignmentRef.key),
                    ]),
                  ) as Record<string, EligibilityResult>;
                  const slotEligibilityMaps = {
                    employee1: sharedEligibilityMap,
                    employee2: sharedEligibilityMap,
                    employee3: sharedEligibilityMap,
                    employee4: sharedEligibilityMap,
                    employee5: sharedEligibilityMap,
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
                  const certificationMessages = getCertificationMessages(assignmentRef, employees);
                  const warningMessages = [...employeeMessages, ...vehicleMessages, ...continuousHours.warnings, ...certificationMessages];
                  const approvalMessages = continuousHours.approvals;
                  const isSupervisorShift = category === 'SUPERVISOR';
                  const isTodayColumn = todayKey === dateKey;
                  const isPastColumn = dateKey < todayKey;
                  const isDarkScheduleRow = shiftName === 'R1' || shiftName === 'P' || shiftName === 'FIELD_SUP';

                  const expandedKey = `${shiftName}-${dateKey}`;
                  const isExpanded = expandedShiftKey === expandedKey;

                  return (
                    <div
                      key={`${shiftName}-${dateKey}`}
                      className={`border-b border-r border-slate-300 p-3 ${
                        isTodayColumn
                          ? 'bg-emerald-200'
                          : isPastColumn
                            ? isDarkScheduleRow
                              ? 'bg-slate-300'
                              : 'bg-slate-200'
                            : isDarkScheduleRow
                              ? 'bg-slate-300'
                              : 'bg-white'
                      }`}
                    >
                      <div
                        onClick={() =>
                          handleExpandedShiftChange(
                            isExpanded ? null : expandedKey
                          )
                        }
                        className={`cursor-pointer rounded-xl border p-2 shadow-sm transition ${
                          warningMessages.length > 0
                            ? 'border-red-500 bg-red-100 hover:bg-red-200'
                            : isExpanded
                              ? 'border-slate-700 bg-slate-200'
                              : 'border-slate-500 bg-slate-100 hover:bg-slate-200'
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
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

                            {shift.hiddenFromEmployees && (
                              <div className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                Hidden
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {!isExpanded && (
                              <select
                                value={shift.vehicle}
                                aria-label={`Vehicle for ${SHIFT_DISPLAY_NAMES[shiftName]} on ${dateKey}`}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  handleStandardShiftChange(
                                    dateKey,
                                    shiftName,
                                    'vehicle',
                                    event.target.value,
                                  );
                                }}
                                className="w-[92px] rounded-lg border border-slate-500 bg-white px-2 py-1 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              >
                                {getVehicleOptions(category).map((vehicle) => (
                                  <option key={vehicle || 'none'} value={vehicle}>
                                    {vehicle ? `Unit ${vehicle}` : 'No Unit'}
                                  </option>
                                ))}
                              </select>
                            )}

                            {warningMessages.length > 0 && (
                              <div
                                title={warningMessages.join(' | ')}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700"
                              >
                                ⚠
                              </div>
                            )}
                          </div>
                        </div>

                        {!isExpanded && (
                          <div className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            Click to Edit
                          </div>
                        )}

                        <div
          className="space-y-2"
          onClick={(event) => event.stopPropagation()}
        >
                          {renderEmployeeSlotEditor(
                            shift.employee1,
                            'Employee 1',
                            isExpanded ||
                              !['SICK', 'LEAVE', 'VACATION'].includes(shift.employee1.shiftType),
                            (field, value) => handleStandardSlotChange(dateKey, shiftName, 'employee1', field, value),
                            isExpanded,
                            slotEligibilityMaps.employee1,
                            payPeriodHoursMap,
                            { dateKey, shiftKey: shiftName, shiftLabel: SHIFT_DISPLAY_NAMES[shiftName] },
                          )}

                          {renderEmployeeSlotEditor(
                              shift.employee2,
                              'Employee 2',
                              isExpanded ||
                                !['SICK', 'LEAVE', 'VACATION'].includes(shift.employee2.shiftType),
                              (field, value) => handleStandardSlotChange(dateKey, shiftName, 'employee2', field, value),
                              isExpanded,
                              slotEligibilityMaps.employee2,
                              payPeriodHoursMap,
                              { dateKey, shiftKey: shiftName, shiftLabel: SHIFT_DISPLAY_NAMES[shiftName] },
                            )}

                          {renderEmployeeSlotEditor(
                              shift.employee3,
                              'Employee 3',
                              (shift.showEmployee3 || Boolean(shift.employee3.employeeId)) &&
                                (isExpanded ||
                                  !['SICK', 'LEAVE', 'VACATION'].includes(shift.employee3.shiftType)),
                              (field, value) => handleStandardSlotChange(dateKey, shiftName, 'employee3', field, value),
                              isExpanded,
                              slotEligibilityMaps.employee3,
                              payPeriodHoursMap,
                              { dateKey, shiftKey: shiftName, shiftLabel: SHIFT_DISPLAY_NAMES[shiftName] },
                            )}
                          {renderEmployeeSlotEditor(
                              shift.employee4,
                              'Employee 4',
                              (shift.visibleEmployeeSlots >= 4 || Boolean(shift.employee4.employeeId)) &&
                                (isExpanded ||
                                  !['SICK', 'LEAVE', 'VACATION'].includes(shift.employee4.shiftType)),
                              (field, value) => handleStandardSlotChange(dateKey, shiftName, 'employee4', field, value),
                              isExpanded,
                              slotEligibilityMaps.employee4,
                              payPeriodHoursMap,
                              { dateKey, shiftKey: shiftName, shiftLabel: SHIFT_DISPLAY_NAMES[shiftName] },
                            )}

                          {renderEmployeeSlotEditor(
                              shift.employee5,
                              'Employee 5',
                              (shift.visibleEmployeeSlots >= 5 || Boolean(shift.employee5.employeeId)) &&
                                (isExpanded ||
                                  !['SICK', 'LEAVE', 'VACATION'].includes(shift.employee5.shiftType)),
                              (field, value) => handleStandardSlotChange(dateKey, shiftName, 'employee5', field, value),
                              isExpanded,
                              slotEligibilityMaps.employee5,
                              payPeriodHoursMap,
                              { dateKey, shiftKey: shiftName, shiftLabel: SHIFT_DISPLAY_NAMES[shiftName] },
                            )}

                          <div className="mt-2 flex flex-wrap gap-2">
                            {[
                              shift.employee1,
                              shift.employee2,
                              shift.employee3,
                              shift.employee4,
                              shift.employee5,
                            ].some((slot) => slot.note?.trim()) && (
                              <div
                                title={[
                                  shift.employee1,
                                  shift.employee2,
                                  shift.employee3,
                                  shift.employee4,
                                  shift.employee5,
                                ]
                                  .filter((slot) => slot.employeeId && slot.note?.trim())
                                  .map((slot) => {
                                    const employeeName =
                                      getEmployeeById(slot.employeeId, employees)?.name ??
                                      'Unknown Employee';

                                    return `${employeeName}: ${slot.note.trim()}`;
                                  })
                                  .join('\n')}
                                className="inline-flex cursor-help rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200"
                              >
                                📝 Employee Note
                              </div>
                            )}

                            {shift.supervisorNote?.trim() && (
                              <div
                                title={shift.supervisorNote.trim()}
                                className="inline-flex cursor-help rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200"
                              >
                                🔒 Supervisor Note
                              </div>
                            )}
                          </div>
                          {false && isExpanded && (
                            <>
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

                              <label className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                                <input
                                  type="checkbox"
                                  checked={Boolean(shift.hiddenFromEmployees)}
                                  onChange={(event) =>
                                    handleStandardShiftChange(dateKey, shiftName, 'hiddenFromEmployees', event.target.checked)
                                  }
                                  className="h-4 w-4"
                                />
                                Hide shift from employees
                              </label>

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  saveScheduleToSupabase();
                                }}
                                disabled={!hasUnsavedChanges || saveStatus.startsWith('Saving')}
                                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                  hasUnsavedChanges
                                    ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                    : 'cursor-not-allowed bg-slate-200 text-slate-500'
                                }`}
                              >
                                Confirm Changes
                              </button>

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
                            </>
                          )}
                        </div>

                        {isExpanded && warningMessages.length > 0 && (
                          <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2">
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

                        {isExpanded && approvalMessages.length > 0 && (
                          <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2">
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

            <div className="sticky left-0 z-10 border-r border-slate-400 bg-white p-4">
              <div className="flex h-full items-center justify-center">
                <div className="text-base font-bold text-slate-900">EX</div>
              </div>
            </div>

            {visibleDates.map((date) => {
              const dateKey = toDateKey(date);
              const day = getDaySchedule(scheduleData, dateKey);
              const isTodayColumn = todayKey === dateKey;
              const isPastColumn = dateKey < todayKey;

              return (
                <div
                  key={`extras-${dateKey}`}
                  className={`border-r border-slate-300 p-3 align-top ${
                    isTodayColumn
                      ? 'bg-emerald-200'
                      : isPastColumn
                        ? 'bg-slate-200'
                        : 'bg-white'
                  }`}
                >
                  <div
          className="space-y-2"
          onClick={(event) => event.stopPropagation()}
        >
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

                        const sharedEligibilityMap = Object.fromEntries(
                          employees.map((employee) => [
                            employee.id,
                            getEligibilityForEmployee(scheduleData, dateKey, employee.id, assignmentRef, employees, assignmentRef.key),
                          ]),
                        ) as Record<string, EligibilityResult>;
                        const slotEligibilityMaps = {
                          employee1: sharedEligibilityMap,
                          employee2: sharedEligibilityMap,
                          employee3: sharedEligibilityMap,
                          employee4: sharedEligibilityMap,
                          employee5: sharedEligibilityMap,
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
                        const certificationMessages = getCertificationMessages(assignmentRef, employees);
                        const warningMessages = [...employeeMessages, ...vehicleMessages, ...continuousHours.warnings, ...certificationMessages];
                        const approvalMessages = continuousHours.approvals;
                        const isSupervisorShift = extra.category === 'SUPERVISOR';
                        const expandedKey = `extra-${extra.id}-${dateKey}`;
                        const isExpanded = expandedShiftKey === expandedKey;

                        return (
                          <div
                            key={extra.id}
                            onClick={() =>
                              handleExpandedShiftChange(
                                isExpanded ? null : expandedKey
                              )
                            }
                            className={`cursor-pointer rounded-xl border p-2 shadow-sm transition ${
                              isExpanded
                                ? 'border-slate-700 bg-slate-200'
                                : 'border-slate-500 bg-slate-100 hover:bg-slate-200'
                            }`}
                          >
                            <div className="mb-2">
                              <div className="truncate text-sm font-bold text-slate-900">
                                {extra.label}
                              </div>

                              <div className="mt-2 flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
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

                                  {extra.hiddenFromEmployees && (
                                    <div className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                      Hidden
                                    </div>
                                  )}
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                  {!isExpanded && (
                                    <select
                                      value={extra.vehicle}
                                      aria-label={`Vehicle for ${extra.label} on ${dateKey}`}
                                      onClick={(event) => event.stopPropagation()}
                                      onChange={(event) => {
                                        event.stopPropagation();
                                        handleExtraShiftChange(
                                          dateKey,
                                          extra.id,
                                          'vehicle',
                                          event.target.value,
                                        );
                                      }}
                                      className="w-[92px] rounded-lg border border-slate-500 bg-white px-2 py-1 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    >
                                      {getVehicleOptions(extra.category).map((vehicle) => (
                                        <option key={vehicle || 'none'} value={vehicle}>
                                          {vehicle ? `Unit ${vehicle}` : 'No Unit'}
                                        </option>
                                      ))}
                                    </select>
                                  )}

                                  {warningMessages.length > 0 && (
                                    <div
                                      title={warningMessages.join(' | ')}
                                      className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700"
                                    >
                                      ⚠
                                    </div>
                                  )}
                                </div>
                              </div>

                              {!isExpanded && (
                                <div className="mt-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                  Click to Edit
                                </div>
                              )}
                            </div>

                            <div
          className="space-y-2"
          onClick={(event) => event.stopPropagation()}
        >
                              {renderEmployeeSlotEditor(
                                extra.employee1,
                                'Employee 1',
                                isExpanded ||
                                  !['SICK', 'LEAVE', 'VACATION'].includes(extra.employee1.shiftType),
                                (field, value) => handleExtraSlotChange(dateKey, extra.id, 'employee1', field, value),
                                isExpanded,
                                slotEligibilityMaps.employee1,
                                payPeriodHoursMap,
                                { dateKey, shiftKey: extra.id, shiftLabel: extra.label },
                              )}

                              {renderEmployeeSlotEditor(
                                  extra.employee2,
                                  'Employee 2',
                                  isExpanded ||
                                    !['SICK', 'LEAVE', 'VACATION'].includes(extra.employee2.shiftType),
                                  (field, value) => handleExtraSlotChange(dateKey, extra.id, 'employee2', field, value),
                                  isExpanded,
                                  slotEligibilityMaps.employee2,
                                  payPeriodHoursMap,
                                  { dateKey, shiftKey: extra.id, shiftLabel: extra.label },
                                )}

                              {renderEmployeeSlotEditor(
                                  extra.employee3,
                                  'Employee 3',
                                  (extra.showEmployee3 || Boolean(extra.employee3.employeeId)) &&
                                    (isExpanded ||
                                      !['SICK', 'LEAVE', 'VACATION'].includes(extra.employee3.shiftType)),
                                  (field, value) => handleExtraSlotChange(dateKey, extra.id, 'employee3', field, value),
                                  isExpanded,
                                  slotEligibilityMaps.employee3,
                                  payPeriodHoursMap,
                                  { dateKey, shiftKey: extra.id, shiftLabel: extra.label },
                                )}
                                                            {renderEmployeeSlotEditor(
                                  extra.employee4,
                                  'Employee 4',
                                  (extra.visibleEmployeeSlots >= 4 || Boolean(extra.employee4.employeeId)) &&
                                    (isExpanded ||
                                      !['SICK', 'LEAVE', 'VACATION'].includes(extra.employee4.shiftType)),
                                  (field, value) => handleExtraSlotChange(dateKey, extra.id, 'employee4', field, value),
                                  isExpanded,
                                  slotEligibilityMaps.employee4,
                                  payPeriodHoursMap,
                                  { dateKey, shiftKey: extra.id, shiftLabel: extra.label },
                                )}

                              {renderEmployeeSlotEditor(
                                  extra.employee5,
                                  'Employee 5',
                                  (extra.visibleEmployeeSlots >= 5 || Boolean(extra.employee5.employeeId)) &&
                                    (isExpanded ||
                                      !['SICK', 'LEAVE', 'VACATION'].includes(extra.employee5.shiftType)),
                                  (field, value) => handleExtraSlotChange(dateKey, extra.id, 'employee5', field, value),
                                  isExpanded,
                                  slotEligibilityMaps.employee5,
                                  payPeriodHoursMap,
                                  { dateKey, shiftKey: extra.id, shiftLabel: extra.label },
                                )}

                              <div className="mt-2 flex flex-wrap gap-2">
                                {[
                                  extra.employee1,
                                  extra.employee2,
                                  extra.employee3,
                                  extra.employee4,
                                  extra.employee5,
                                ].some((slot) => slot.note?.trim()) && (
                                  <div
                                    title={[
                                      extra.employee1,
                                      extra.employee2,
                                      extra.employee3,
                                      extra.employee4,
                                      extra.employee5,
                                    ]
                                      .filter((slot) => slot.employeeId && slot.note?.trim())
                                      .map((slot) => {
                                        const employeeName =
                                          getEmployeeById(slot.employeeId, employees)?.name ??
                                          'Unknown Employee';

                                        return `${employeeName}: ${slot.note.trim()}`;
                                      })
                                      .join('\n')}
                                    className="inline-flex cursor-help rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200"
                                  >
                                    📝 Employee Note
                                  </div>
                                )}

                                {extra.supervisorNote?.trim() && (
                                  <div
                                    title={extra.supervisorNote.trim()}
                                    className="inline-flex cursor-help rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200"
                                  >
                                    🔒 Supervisor Note
                                  </div>
                                )}
                              </div>
                              {false && isExpanded && (
                                <>
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

                                  <label className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(extra.hiddenFromEmployees)}
                                      onChange={(event) =>
                                        handleExtraShiftChange(dateKey, extra.id, 'hiddenFromEmployees', event.target.checked)
                                      }
                                      className="h-4 w-4"
                                    />
                                    Hide shift from employees
                                  </label>

                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      saveScheduleToSupabase();
                                    }}
                                    disabled={!hasUnsavedChanges || saveStatus.startsWith('Saving')}
                                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                      hasUnsavedChanges
                                        ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                        : 'cursor-not-allowed bg-slate-200 text-slate-500'
                                    }`}
                                  >
                                    Confirm Changes
                                  </button>

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
                                </>
                              )}
                            </div>

                            {isExpanded && warningMessages.length > 0 && (
                              <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2">
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

                            {isExpanded && approvalMessages.length > 0 && (
                              <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2">
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
      {expandedShiftKey && pendingExpandedShiftKey === null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Edit Shift</h2>
                <p className="mt-1 text-sm text-slate-600">{expandedShiftKey}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              {(() => {
                const selectedShift = getExpandedStandardShift();

                if (!selectedShift) {
                  const selectedExtraShift = getExpandedExtraShift();

                  if (!selectedExtraShift) {
                    return (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                        Select a standard shift or extra shift to edit.
                      </div>
                    );
                  }

                  const day = getDaySchedule(scheduleData, selectedExtraShift.dateKey);
                  const extra = selectedExtraShift.extra;
                  const assignmentRef: AssignmentRef = {
                    key: `extra-${extra.id}`,
                    label: extra.label,
                    category: extra.category,
                    shift: extra,
                  };
                  const isSupervisorShift = extra.category === 'SUPERVISOR';
                  const slotEligibilityMaps = {
                    employee1: Object.fromEntries(employees.map((employee) => [employee.id, getEligibilityForEmployee(scheduleData, selectedExtraShift.dateKey, employee.id, assignmentRef, employees, assignmentRef.key)])) as Record<string, EligibilityResult>,
                    employee2: Object.fromEntries(employees.map((employee) => [employee.id, getEligibilityForEmployee(scheduleData, selectedExtraShift.dateKey, employee.id, assignmentRef, employees, assignmentRef.key)])) as Record<string, EligibilityResult>,
                    employee3: Object.fromEntries(employees.map((employee) => [employee.id, getEligibilityForEmployee(scheduleData, selectedExtraShift.dateKey, employee.id, assignmentRef, employees, assignmentRef.key)])) as Record<string, EligibilityResult>,
                    employee4: Object.fromEntries(employees.map((employee) => [employee.id, getEligibilityForEmployee(scheduleData, selectedExtraShift.dateKey, employee.id, assignmentRef, employees, assignmentRef.key)])) as Record<string, EligibilityResult>,
                    employee5: Object.fromEntries(employees.map((employee) => [employee.id, getEligibilityForEmployee(scheduleData, selectedExtraShift.dateKey, employee.id, assignmentRef, employees, assignmentRef.key)])) as Record<string, EligibilityResult>,
                  };
                  const payPeriodHoursMap = Object.fromEntries(employees.map((employee) => [employee.id, getEmployeePayPeriodHours(scheduleData, selectedExtraShift.dateKey, employee.id, assignmentRef.key)])) as Record<string, number>;
                  const warningMessages = [
                    ...getEmployeeConflictMessages(day, assignmentRef, employees),
                    ...getVehicleConflictMessages(day, assignmentRef),
                    ...getContinuousHoursResult(scheduleData, selectedExtraShift.dateKey, assignmentRef, employees).warnings,
                    ...getCertificationMessages(assignmentRef, employees),
                  ];

                  return (
                    <div className="space-y-3">
                      <div>
                        <input
                          type="text"
                          value={extra.label}
                          onChange={(event) => handleExtraShiftChange(selectedExtraShift.dateKey, extra.id, 'label', event.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-lg font-bold text-slate-900 outline-none transition focus:border-slate-500"
                        />
                        <div className="mt-1 text-sm text-slate-600">{selectedExtraShift.dateKey}</div>
                      </div>

                      <select
                        value={extra.category}
                        onChange={(event) => handleExtraShiftChange(selectedExtraShift.dateKey, extra.id, 'category', event.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-500"
                      >
                        <option value="UNIT">UNIT</option>
                        <option value="SUPERVISOR">SUPERVISOR</option>
                      </select>

                      {renderEmployeeSlotEditor(extra.employee1, 'Employee 1', true, (field, value) => handleExtraSlotChange(selectedExtraShift.dateKey, extra.id, 'employee1', field, value), true, slotEligibilityMaps.employee1, payPeriodHoursMap, { dateKey: selectedExtraShift.dateKey, shiftKey: extra.id, shiftLabel: extra.label })}

                      {renderEmployeeSlotEditor(extra.employee2, 'Employee 2', true, (field, value) => handleExtraSlotChange(selectedExtraShift.dateKey, extra.id, 'employee2', field, value), true, slotEligibilityMaps.employee2, payPeriodHoursMap, { dateKey: selectedExtraShift.dateKey, shiftKey: extra.id, shiftLabel: extra.label })}

                      {renderEmployeeSlotEditor(extra.employee3, 'Employee 3', extra.visibleEmployeeSlots >= 3 || Boolean(extra.employee3.employeeId), (field, value) => handleExtraSlotChange(selectedExtraShift.dateKey, extra.id, 'employee3', field, value), true, slotEligibilityMaps.employee3, payPeriodHoursMap, { dateKey: selectedExtraShift.dateKey, shiftKey: extra.id, shiftLabel: extra.label })}

                      {renderEmployeeSlotEditor(extra.employee4, 'Employee 4', extra.visibleEmployeeSlots >= 4 || Boolean(extra.employee4.employeeId), (field, value) => handleExtraSlotChange(selectedExtraShift.dateKey, extra.id, 'employee4', field, value), true, slotEligibilityMaps.employee4, payPeriodHoursMap, { dateKey: selectedExtraShift.dateKey, shiftKey: extra.id, shiftLabel: extra.label })}

                      {renderEmployeeSlotEditor(extra.employee5, 'Employee 5', extra.visibleEmployeeSlots >= 5 || Boolean(extra.employee5.employeeId), (field, value) => handleExtraSlotChange(selectedExtraShift.dateKey, extra.id, 'employee5', field, value), true, slotEligibilityMaps.employee5, payPeriodHoursMap, { dateKey: selectedExtraShift.dateKey, shiftKey: extra.id, shiftLabel: extra.label })}

                      <div className="flex flex-wrap gap-2">
                          {extra.visibleEmployeeSlots < 5 && (
                            <button type="button" onClick={() => handleAddEmployeeSlotToExtra(selectedExtraShift.dateKey, extra.id)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                              Add Employee
                            </button>
                          )}

                          {extra.visibleEmployeeSlots > 2 && (
                            <button type="button" onClick={() => handleRemoveEmployeeSlotFromExtra(selectedExtraShift.dateKey, extra.id)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                              Remove Empty Slot
                            </button>
                          )}
                        </div>

                      <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-violet-700">
                          Supervisor Note
                        </label>

                        <textarea
                          key={`${selectedExtraShift.dateKey}-${extra.id}-supervisor-note`}
                          defaultValue={extra.supervisorNote}
                          onBlur={(event) =>
                            handleExtraShiftChange(
                              selectedExtraShift.dateKey,
                              extra.id,
                              'supervisorNote',
                              event.target.value,
                            )
                          }
                          rows={3}
                          placeholder="Internal shift note"
                          className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-500"
                        />

                        <div className="mt-1 text-xs text-violet-700">
                          Internal only. Employees will not see this note.
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                          <input type="checkbox" checked={extra.allowExtendedHours} onChange={(event) => handleExtraShiftChange(selectedExtraShift.dateKey, extra.id, 'allowExtendedHours', event.target.checked)} className="h-4 w-4" />
                          Allow extended hours
                        </label>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Vehicle</label>
                        <select value={extra.vehicle} onChange={(event) => handleExtraShiftChange(selectedExtraShift.dateKey, extra.id, 'vehicle', event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500">
                          {getVehicleOptions(extra.category).map((vehicle) => (
                            <option key={vehicle || 'none'} value={vehicle}>{vehicle || 'No vehicle selected'}</option>
                          ))}
                        </select>
                      </div>

                      {warningMessages.length > 0 && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          {warningMessages.map((message) => <div key={message}>• {message}</div>)}
                        </div>
                      )}

                      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                          saveStatus.startsWith('Saving')
                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                            : saveStatus.toLowerCase().includes('failed') || saveStatus.startsWith('Action Required')
                              ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                              : hasUnsavedChanges
                                ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        }`}>
                          {saveStatus}
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void closeExpandedShiftEditor()}
                            disabled={saveStatus.startsWith('Saving')}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {saveStatus.startsWith('Saving') ? 'Saving...' : 'Close'}
                          </button>

                          <button
                            type="button"
                            onClick={() => void saveScheduleToSupabase()}
                            disabled={!hasUnsavedChanges || saveStatus.startsWith('Saving')}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                              hasUnsavedChanges && !saveStatus.startsWith('Saving')
                                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                : 'cursor-not-allowed bg-slate-200 text-slate-500'
                            }`}
                          >
                            {saveStatus.startsWith('Saving') ? 'Saving...' : 'Confirm Changes'}
                          </button>
                        </div>

                        <button type="button" onClick={() => void handleRemoveExtraShift(selectedExtraShift.dateKey, extra.id, extra.label)} disabled={saveStatus.startsWith('Saving')} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">
                          Remove Extra Shift
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <div>
                      <div className="text-lg font-bold text-slate-900">{selectedShift.label}</div>
                      <div className="mt-1 text-sm text-slate-600">{selectedShift.dateKey}</div>
                    </div>

                    {(() => {
                      const day = getDaySchedule(scheduleData, selectedShift.dateKey);
                      const assignmentRef: AssignmentRef = {
                        key: `standard-${selectedShift.shiftName}`,
                        label: selectedShift.label,
                        category: selectedShift.category,
                        shift: selectedShift.shift,
                      };
                      const isSupervisorShift = selectedShift.category === 'SUPERVISOR';
                      const slotEligibilityMaps = {
                        employee1: Object.fromEntries(employees.map((employee) => [employee.id, getEligibilityForEmployee(scheduleData, selectedShift.dateKey, employee.id, assignmentRef, employees, assignmentRef.key)])) as Record<string, EligibilityResult>,
                        employee2: Object.fromEntries(employees.map((employee) => [employee.id, getEligibilityForEmployee(scheduleData, selectedShift.dateKey, employee.id, assignmentRef, employees, assignmentRef.key)])) as Record<string, EligibilityResult>,
                        employee3: Object.fromEntries(employees.map((employee) => [employee.id, getEligibilityForEmployee(scheduleData, selectedShift.dateKey, employee.id, assignmentRef, employees, assignmentRef.key)])) as Record<string, EligibilityResult>,
                        employee4: Object.fromEntries(employees.map((employee) => [employee.id, getEligibilityForEmployee(scheduleData, selectedShift.dateKey, employee.id, assignmentRef, employees, assignmentRef.key)])) as Record<string, EligibilityResult>,
                        employee5: Object.fromEntries(employees.map((employee) => [employee.id, getEligibilityForEmployee(scheduleData, selectedShift.dateKey, employee.id, assignmentRef, employees, assignmentRef.key)])) as Record<string, EligibilityResult>,
                      };
                      const payPeriodHoursMap = Object.fromEntries(employees.map((employee) => [employee.id, getEmployeePayPeriodHours(scheduleData, selectedShift.dateKey, employee.id, assignmentRef.key)])) as Record<string, number>;
                      const warningMessages = [
                        ...getEmployeeConflictMessages(day, assignmentRef, employees),
                        ...getVehicleConflictMessages(day, assignmentRef),
                        ...getContinuousHoursResult(scheduleData, selectedShift.dateKey, assignmentRef, employees).warnings,
                        ...getCertificationMessages(assignmentRef, employees),
                      ];

                      return (
                        <div className="space-y-3">
                          {renderEmployeeSlotEditor(selectedShift.shift.employee1, 'Employee 1', true, (field, value) => handleStandardSlotChange(selectedShift.dateKey, selectedShift.shiftName, 'employee1', field, value), true, slotEligibilityMaps.employee1, payPeriodHoursMap, { dateKey: selectedShift.dateKey, shiftKey: selectedShift.shiftName, shiftLabel: selectedShift.label })}

                          {renderEmployeeSlotEditor(selectedShift.shift.employee2, 'Employee 2', true, (field, value) => handleStandardSlotChange(selectedShift.dateKey, selectedShift.shiftName, 'employee2', field, value), true, slotEligibilityMaps.employee2, payPeriodHoursMap, { dateKey: selectedShift.dateKey, shiftKey: selectedShift.shiftName, shiftLabel: selectedShift.label })}

                          {renderEmployeeSlotEditor(selectedShift.shift.employee3, 'Employee 3', selectedShift.shift.visibleEmployeeSlots >= 3 || Boolean(selectedShift.shift.employee3.employeeId), (field, value) => handleStandardSlotChange(selectedShift.dateKey, selectedShift.shiftName, 'employee3', field, value), true, slotEligibilityMaps.employee3, payPeriodHoursMap, { dateKey: selectedShift.dateKey, shiftKey: selectedShift.shiftName, shiftLabel: selectedShift.label })}

                          {renderEmployeeSlotEditor(selectedShift.shift.employee4, 'Employee 4', selectedShift.shift.visibleEmployeeSlots >= 4 || Boolean(selectedShift.shift.employee4.employeeId), (field, value) => handleStandardSlotChange(selectedShift.dateKey, selectedShift.shiftName, 'employee4', field, value), true, slotEligibilityMaps.employee4, payPeriodHoursMap, { dateKey: selectedShift.dateKey, shiftKey: selectedShift.shiftName, shiftLabel: selectedShift.label })}

                          {renderEmployeeSlotEditor(selectedShift.shift.employee5, 'Employee 5', selectedShift.shift.visibleEmployeeSlots >= 5 || Boolean(selectedShift.shift.employee5.employeeId), (field, value) => handleStandardSlotChange(selectedShift.dateKey, selectedShift.shiftName, 'employee5', field, value), true, slotEligibilityMaps.employee5, payPeriodHoursMap, { dateKey: selectedShift.dateKey, shiftKey: selectedShift.shiftName, shiftLabel: selectedShift.label })}

                          <div className="flex flex-wrap gap-2">
                              {selectedShift.shift.visibleEmployeeSlots < 5 && (
                                <button type="button" onClick={() => handleAddEmployeeSlot(selectedShift.dateKey, selectedShift.shiftName)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                                  Add Employee
                                </button>
                              )}

                              {selectedShift.shift.visibleEmployeeSlots > 2 && (
                                <button type="button" onClick={() => handleRemoveEmployeeSlot(selectedShift.dateKey, selectedShift.shiftName)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                                  Remove Empty Slot
                                </button>
                              )}
                            </div>

                          <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-violet-700">
                              Supervisor Note
                            </label>

                            <textarea
                              key={`${selectedShift.dateKey}-${selectedShift.shiftName}-supervisor-note`}
                              defaultValue={selectedShift.shift.supervisorNote}
                              onBlur={(event) =>
                                handleStandardShiftChange(
                                  selectedShift.dateKey,
                                  selectedShift.shiftName,
                                  'supervisorNote',
                                  event.target.value,
                                )
                              }
                              rows={3}
                              placeholder="Internal shift note"
                              className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-500"
                            />

                            <div className="mt-1 text-xs text-violet-700">
                              Internal only. Employees will not see this note.
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                              <input type="checkbox" checked={selectedShift.shift.allowExtendedHours} onChange={(event) => handleStandardShiftChange(selectedShift.dateKey, selectedShift.shiftName, 'allowExtendedHours', event.target.checked)} className="h-4 w-4" />
                              Allow extended hours
                            </label>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Vehicle</label>
                            <select value={selectedShift.shift.vehicle} onChange={(event) => handleStandardShiftChange(selectedShift.dateKey, selectedShift.shiftName, 'vehicle', event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500">
                              {getVehicleOptions(selectedShift.category).map((vehicle) => (
                                <option key={vehicle || 'none'} value={vehicle}>{vehicle || 'No vehicle selected'}</option>
                              ))}
                            </select>
                          </div>

                          {warningMessages.length > 0 && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                              {warningMessages.map((message) => <div key={message}>• {message}</div>)}
                            </div>
                          )}

                          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                              saveStatus.startsWith('Saving')
                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                : saveStatus.toLowerCase().includes('failed') || saveStatus.startsWith('Action Required')
                                  ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                                  : hasUnsavedChanges
                                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            }`}>
                              {saveStatus}
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => void closeExpandedShiftEditor()}
                                disabled={saveStatus.startsWith('Saving')}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {saveStatus.startsWith('Saving') ? 'Saving...' : 'Close'}
                              </button>

                              <button
                                type="button"
                                onClick={() => void saveScheduleToSupabase()}
                                disabled={!hasUnsavedChanges || saveStatus.startsWith('Saving')}
                                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                  hasUnsavedChanges && !saveStatus.startsWith('Saving')
                                    ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                    : 'cursor-not-allowed bg-slate-200 text-slate-500'
                                }`}
                              >
                                {saveStatus.startsWith('Saving') ? 'Saving...' : 'Confirm Changes'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {pendingExpandedShiftKey !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              Unsaved Changes
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              You have unsaved schedule changes. Save before switching shifts?
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveChangesAndContinue}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Save Changes
              </button>

              <button
                type="button"
                onClick={discardUnsavedChangesAndContinue}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                Discard Changes
              </button>

              <button
                type="button"
                onClick={() => setPendingExpandedShiftKey(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .schedule-page select {
          transition: transform 150ms ease, background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
          transform-origin: center;
        }

        .schedule-page select:hover:not(:disabled) {
          transform: scale(1.015);
          background-color: #f1f5f9;
          border-color: #64748b;
          box-shadow: 0 3px 10px rgb(15 23 42 / 0.12);
        }
      `}</style>
    </div>
  );
}

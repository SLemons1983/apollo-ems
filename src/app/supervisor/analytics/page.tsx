'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Employee = {
  id: string;
  name: string;
  employeeType: string;
  scope: string;
  status: string;
  role: string;
  certifications: Record<string, unknown>;
};

type Timecard = {
  id: string;
  employeeId: string;
  employeeName: string;
  start: string;
  end: string;
  total: number;
  status: string;
  breakdown: Record<string, any>;
  punches: Record<string, any>[];
  missedMeals: Record<string, any>[];
  corrections: Record<string, any>[];
  compensation: Record<string, any>[];
};

type Assignment = {
  id: string;
  dateKey: string;
  shiftKey: string;
  shiftLabel: string;
  employeeId: string;
  isOpen: boolean;
  openScope: string;
  startTime: string;
  endTime: string;
  heldOver: boolean;
  shiftType: string;
};

type RequestRow = Record<string, any>;
type Section = 'WORKFORCE' | 'ATTENDANCE' | 'STAFFING' | 'EXCEPTIONS' | 'CERTIFICATIONS';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CERTIFICATIONS = [
  ['driversLicense', "Driver's License"],
  ['ambulanceDriversLicense', "Ambulance Driver's License"],
  ['ahaBlsCpr', 'AHA BLS CPR'],
  ['medicalExaminerCertificate', 'Medical Examiner Certificate'],
  ['californiaParamedicLicense', 'California Paramedic License'],
  ['ccemsaParamedicLicense', 'CCEMSA Paramedic License'],
  ['acls', 'ACLS'],
  ['pals', 'PALS'],
  ['californiaEmtLicense', 'California EMT License'],
  ['ccemsaEmtLicense', 'CCEMSA EMT License'],
] as const;
const DOCUMENTS = [
  ['driversLicenseDocument', "Driver's License"],
  ['ambulanceDriversLicenseDocument', "Ambulance Driver's License"],
  ['ahaBlsCprDocument', 'AHA BLS CPR'],
  ['medicalExaminerCertificateDocument', 'Medical Examiner Certificate'],
  ['is100Document', 'IS-100'],
  ['is200Document', 'IS-200'],
  ['is700Document', 'IS-700'],
  ['is800Document', 'IS-800'],
  ['californiaParamedicLicenseDocument', 'California Paramedic License'],
  ['ccemsaParamedicLicenseDocument', 'CCEMSA Paramedic License'],
  ['aclsDocument', 'ACLS'],
  ['palsDocument', 'PALS'],
  ['californiaEmtLicenseDocument', 'California EMT License'],
  ['ccemsaEmtLicenseDocument', 'CCEMSA EMT License'],
] as const;

function localDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(value: string) {
  return localDate(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

function beginningOfPayPeriod(reference: Date) {
  const anchor = localDate('2026-06-07');
  const copy = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 12);
  const days = Math.floor((copy.getTime() - anchor.getTime()) / 86400000);
  const offset = ((days % 14) + 14) % 14;
  copy.setDate(copy.getDate() - offset);
  return copy;
}

function presetRange(preset: string) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const end = new Date(start);
  if (preset === 'CURRENT_PAY_PERIOD' || preset === 'PREVIOUS_PAY_PERIOD') {
    const pp = beginningOfPayPeriod(today);
    if (preset === 'PREVIOUS_PAY_PERIOD') pp.setDate(pp.getDate() - 14);
    start.setTime(pp.getTime());
    end.setTime(pp.getTime());
    end.setDate(end.getDate() + 13);
  } else if (preset === 'MONTH') {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  } else if (preset === 'QUARTER') {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
    end.setMonth(start.getMonth() + 3, 0);
  } else {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }
  return { start: dateKey(start), end: dateKey(end) };
}

function hoursBetween(
  start: string,
  end: string,
  heldOver = false,
  isStandardTwentyFourHourShift = false,
) {
  const [sh, sm] = (start || '06:00').split(':').map(Number);
  const [eh, em] = (end || '06:00').split(':').map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0 || (isStandardTwentyFourHourShift && heldOver && minutes > 0)) {
    minutes += 1440;
  }
  return minutes / 60;
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function csvCell(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function isRequiredCertification(employee: Employee, key: string) {
  if (['californiaParamedicLicense', 'ccemsaParamedicLicense', 'acls', 'pals'].includes(key)) {
    return employee.scope === 'ALS';
  }
  if (['californiaEmtLicense', 'ccemsaEmtLicense'].includes(key)) return employee.scope === 'BLS';
  return true;
}

function isRequiredDocument(employee: Employee, key: string) {
  if (key === 'annualTbScreenDocument') return false;
  return isRequiredCertification(employee, key.replace('Document', ''));
}

function employeeName(row: any) {
  const first = String(row.first_name ?? '').trim();
  const last = String(row.last_name ?? '').trim();
  return last && first ? `${last}, ${first}` : `${first} ${last}`.trim() || String(row.id);
}

function Stat({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
      {detail && <div className="mt-1 text-xs text-slate-500">{detail}</div>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">{children}</div>;
}

export default function AnalyticsPage() {
  const initial = presetRange('CURRENT_PAY_PERIOD');
  const [section, setSection] = useState<Section>('WORKFORCE');
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState('ALL');
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [certificationFilter, setCertificationFilter] = useState('ALL');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timecards, setTimecards] = useState<Timecard[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [openRequests, setOpenRequests] = useState<RequestRow[]>([]);
  const [tradeRequests, setTradeRequests] = useState<RequestRow[]>([]);
  const [vacationRequests, setVacationRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const signedInEmail = sessionData.session?.user?.email?.trim().toLowerCase();
        if (!signedInEmail) {
          window.location.href = '/login';
          return;
        }

        const { data: signedInEmployee, error: signedInEmployeeError } = await supabase
          .from('employees')
          .select('role,job_title,status')
          .ilike('email', signedInEmail)
          .maybeSingle();

        if (signedInEmployeeError) throw signedInEmployeeError;

        const roleText = `${signedInEmployee?.role ?? ''} ${signedInEmployee?.job_title ?? ''}`.toLowerCase();
        const isSupervisor =
          ['supervisor', 'admin', 'general manager'].some((term) => roleText.includes(term)) ||
          roleText.split(/\s+/).includes('gm');
        if (!signedInEmployee || signedInEmployee.status === 'Removed' || !isSupervisor) {
          setError('You do not have permission to view Analytics & Reports.');
          return;
        }

        const [
          employeeResult,
          timecardResult,
          assignmentResult,
          openResult,
          tradeResult,
          vacationResult,
        ] = await Promise.all([
          supabase.from('employees').select('id,first_name,last_name,role,scope,employee_type,status,certifications'),
          supabase.from('submitted_timecards').select('*').order('submitted_at', { ascending: false }),
          supabase.from('schedule_assignments').select('*').order('date_key', { ascending: true }),
          supabase.from('open_shift_requests').select('*').order('requested_at', { ascending: false }),
          supabase.from('shift_trade_requests').select('*').order('requested_at', { ascending: false }),
          supabase.from('vacation_requests').select('*').order('requested_at', { ascending: false }),
        ]);
        const firstError = [employeeResult, timecardResult, assignmentResult, openResult, tradeResult, vacationResult]
          .map((result) => result.error)
          .find(Boolean);
        if (firstError) throw firstError;
        if (!active) return;
        setEmployees((employeeResult.data ?? []).map((row: any) => ({
          id: row.id,
          name: employeeName(row),
          employeeType: row.employee_type || 'Full Time',
          scope: String(row.scope || (row.role === 'Paramedic' ? 'ALS' : 'BLS')).toUpperCase(),
          status: row.status || 'Active',
          role: row.role || '',
          certifications: row.certifications && typeof row.certifications === 'object' ? row.certifications : {},
        })).sort((a, b) => a.name.localeCompare(b.name)));
        setTimecards((timecardResult.data ?? []).map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id,
          employeeName: row.employee_name,
          start: row.pay_period_start,
          end: row.pay_period_end,
          total: number(row.total_hours),
          status: row.status,
          breakdown: row.pay_breakdown || {},
          punches: Array.isArray(row.punches) ? row.punches : [],
          missedMeals: Array.isArray(row.missed_meal_breaks) ? row.missed_meal_breaks : [],
          corrections: Array.isArray(row.corrections) ? row.corrections : [],
          compensation: Array.isArray(row.additional_compensation) ? row.additional_compensation : [],
        })));
        setAssignments((assignmentResult.data ?? []).map((row: any) => ({
          id: row.id,
          dateKey: row.date_key,
          shiftKey: row.shift_key,
          shiftLabel: row.shift_label || row.shift_key || 'Unlabeled Shift',
          employeeId: row.employee_id || '',
          isOpen: Boolean(row.is_open_slot),
          openScope: row.open_slot_scope || '',
          startTime: row.start_time || '06:00',
          endTime: row.end_time || '06:00',
          heldOver: Boolean(row.held_over),
          shiftType: String(row.shift_type || 'REGULAR').toUpperCase(),
        })));
        setOpenRequests(openResult.data ?? []);
        setTradeRequests(tradeResult.data ?? []);
        setVacationRequests(vacationResult.data ?? []);
      } catch (loadError) {
        console.error('Analytics load failed:', loadError);
        if (active) setError('Apollo could not load the reporting data. Refresh the page and try again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const filteredEmployees = useMemo(() => employees.filter((employee) =>
    (employeeFilter === 'ALL' || employee.id === employeeFilter) &&
    (employeeTypeFilter === 'ALL' || employee.employeeType === employeeTypeFilter) &&
    (scopeFilter === 'ALL' || employee.scope === scopeFilter) &&
    (statusFilter === 'ALL' || employee.status === statusFilter)
  ), [employees, employeeFilter, employeeTypeFilter, scopeFilter, statusFilter]);
  const allowedEmployeeIds = useMemo(() => new Set(filteredEmployees.map((employee) => employee.id)), [filteredEmployees]);
  const rangeAssignments = useMemo(() => assignments.filter((row) =>
    row.dateKey >= startDate && row.dateKey <= endDate &&
    (row.isOpen || allowedEmployeeIds.has(row.employeeId))
  ), [assignments, startDate, endDate, allowedEmployeeIds]);
  const rangeTimecards = useMemo(() => timecards.filter((card) =>
    card.start >= startDate && card.end <= endDate && allowedEmployeeIds.has(card.employeeId)
  ), [timecards, startDate, endDate, allowedEmployeeIds]);
  const approvedTimecards = useMemo(() => rangeTimecards.filter((card) => card.status === 'APPROVED'), [rangeTimecards]);

  const employeeRows = useMemo(() => filteredEmployees.map((employee) => {
    const cards = approvedTimecards.filter((card) => card.employeeId === employee.id);
    const scheduled = rangeAssignments.filter((row) => row.employeeId === employee.id && !row.isOpen && !['SICK', 'SICK_TIME', 'VACATION', 'LEAVE'].includes(row.shiftType))
      .reduce(
        (sum, row) =>
          sum +
          hoursBetween(
            row.startTime,
            row.endTime,
            row.heldOver,
            ['R1', 'R2', 'P', 'OC'].includes(row.shiftKey),
          ),
        0,
      );
    return {
      ...employee,
      total: cards.reduce((sum, card) => sum + card.total, 0),
      regular: cards.reduce((sum, card) => sum + number(card.breakdown.regularHours), 0),
      overtime: cards.reduce((sum, card) => sum + number(card.breakdown.overtimeHours), 0),
      doubleTime: cards.reduce((sum, card) => sum + number(card.breakdown.doubleTimeHours), 0),
      scheduled,
    };
  }).filter((row) => row.total || row.scheduled), [filteredEmployees, approvedTimecards, rangeAssignments]);

  const totals = useMemo(() => employeeRows.reduce((sum, row) => ({
    total: sum.total + row.total,
    regular: sum.regular + row.regular,
    overtime: sum.overtime + row.overtime,
    doubleTime: sum.doubleTime + row.doubleTime,
    scheduled: sum.scheduled + row.scheduled,
  }), { total: 0, regular: 0, overtime: 0, doubleTime: 0, scheduled: 0 }), [employeeRows]);

  const attendance = useMemo(() => {
    const byDay = DAY_NAMES.map((day) => ({ day, sick: 0, sickHours: 0, vacation: 0, vacationHours: 0, leave: 0, leaveHours: 0 }));
    const monthly = new Map<string, { sick: number; vacation: number; leave: number }>();
    for (const row of rangeAssignments.filter((item) => !item.isOpen)) {
      const type = row.shiftType === 'SICK_TIME' ? 'SICK' : row.shiftType;
      if (!['SICK', 'VACATION', 'LEAVE'].includes(type)) continue;
      const day = byDay[localDate(row.dateKey).getDay()];
      const hours = hoursBetween(
        row.startTime,
        row.endTime,
        row.heldOver,
        ['R1', 'R2', 'P', 'OC'].includes(row.shiftKey),
      );
      const month = row.dateKey.slice(0, 7);
      const monthRow = monthly.get(month) || { sick: 0, vacation: 0, leave: 0 };
      if (type === 'SICK') { day.sick += 1; day.sickHours += hours; monthRow.sick += hours; }
      if (type === 'VACATION') { day.vacation += 1; day.vacationHours += hours; monthRow.vacation += hours; }
      if (type === 'LEAVE') { day.leave += 1; day.leaveHours += hours; monthRow.leave += hours; }
      monthly.set(month, monthRow);
    }
    return { byDay, monthly: [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)) };
  }, [rangeAssignments]);

  const staffing = useMemo(() => {
    const scheduled = rangeAssignments.filter((row) => !row.isOpen && !['SICK', 'SICK_TIME', 'VACATION', 'LEAVE'].includes(row.shiftType))
      .reduce(
        (sum, row) =>
          sum +
          hoursBetween(
            row.startTime,
            row.endTime,
            row.heldOver,
            ['R1', 'R2', 'P', 'OC'].includes(row.shiftKey),
          ),
        0,
      );
    const requestRows = openRequests.filter((row) => String(row.date_key) >= startDate && String(row.date_key) <= endDate);
    const opportunities = new Map<string, { date: string; shift: string; statuses: string[] }>();
    for (const row of requestRows) {
      if (employeeFilter !== 'ALL' && row.employee_id !== employeeFilter) continue;
      const key = `${row.date_key}|${row.shift_key}`;
      const current = opportunities.get(key) || {
        date: String(row.date_key),
        shift: String(row.shift_label || row.shift_key),
        statuses: [] as string[],
      };
      current.statuses.push(String(row.status || 'PENDING').toUpperCase());
      opportunities.set(key, current);
    }
    const tracked = [...opportunities.values()];
    const filled = tracked.filter((row) => row.statuses.includes('APPROVED')).length;
    const pendingOpen = rangeAssignments.filter((row) => row.isOpen).length;
    const dayRows = DAY_NAMES.map((day) => ({ day, tracked: 0, filled: 0, rate: 0 }));
    for (const row of tracked) {
      const item = dayRows[localDate(row.date).getDay()];
      item.tracked += 1;
      if (row.statuses.includes('APPROVED')) item.filled += 1;
    }
    dayRows.forEach((row) => { row.rate = row.tracked ? row.filled / row.tracked * 100 : 0; });
    const eligibleDays = dayRows.filter((row) => row.tracked >= 3);
    const easiest = [...eligibleDays].sort((a, b) => b.rate - a.rate || b.tracked - a.tracked)[0];
    const hardest = [...eligibleDays].sort((a, b) => a.rate - b.rate || b.tracked - a.tracked)[0];
    const trades = tradeRequests.filter((row) => String(row.requesting_date_key) >= startDate && String(row.requesting_date_key) <= endDate);
    const vacations = vacationRequests.filter((row) => String(row.date_key) >= startDate && String(row.date_key) <= endDate);
    return { scheduled, tracked, filled, pendingOpen, dayRows, easiest, hardest, trades, vacations };
  }, [rangeAssignments, openRequests, tradeRequests, vacationRequests, startDate, endDate, employeeFilter]);

  const exceptions = useMemo(() => {
    const cards = rangeTimecards;
    return {
      missedMeals: cards.reduce((sum, card) => sum + card.missedMeals.length, 0),
      ldt: cards.reduce((sum, card) => sum + card.compensation.filter((item) => item.compensationType === 'LDT_STIPEND' || item.compensation_type === 'LDT_STIPEND').length, 0),
      ldtAmount: cards.reduce((sum, card) => sum + card.compensation.filter((item) => item.compensationType === 'LDT_STIPEND' || item.compensation_type === 'LDT_STIPEND').reduce((subtotal, item) => subtotal + number(item.amount), 0), 0),
      corrections: cards.reduce((sum, card) => sum + card.corrections.length, 0),
      geofence: cards.reduce((sum, card) => sum + card.punches.filter((punch) => punch.geofenceStatus === 'OUTSIDE_GEOFENCE' || punch.geofence_status === 'OUTSIDE_GEOFENCE').length, 0),
      unavailable: cards.reduce((sum, card) => sum + card.punches.filter((punch) => punch.geofenceStatus === 'LOCATION_UNAVAILABLE' || punch.geofence_status === 'LOCATION_UNAVAILABLE').length, 0),
      returned: cards.filter((card) => card.status === 'RETURNED').length,
      pending: cards.filter((card) => card.status === 'PENDING_SUPERVISOR_REVIEW').length,
      missing: filteredEmployees.filter((employee) => {
        const scheduled = rangeAssignments.some((row) => row.employeeId === employee.id && !row.isOpen && !['SICK', 'SICK_TIME', 'VACATION', 'LEAVE'].includes(row.shiftType));
        return scheduled && !rangeTimecards.some((card) => card.employeeId === employee.id);
      }),
    };
  }, [rangeTimecards, filteredEmployees, rangeAssignments]);

  const certificationRows = useMemo(() => filteredEmployees.flatMap((employee) => {
    const rows: { employee: Employee; key: string; label: string; expiration: string; days: number | null; missing: boolean; missingDocument: boolean }[] = [];
    for (const [key, label] of CERTIFICATIONS) {
      if (!isRequiredCertification(employee, key) || (certificationFilter !== 'ALL' && certificationFilter !== key)) continue;
      const expiration = typeof employee.certifications[key] === 'string' ? String(employee.certifications[key]) : '';
      const days = expiration ? Math.ceil((localDate(expiration).getTime() - localDate(dateKey(new Date())).getTime()) / 86400000) : null;
      const documentKey = `${key}Document`;
      const documentRequired = DOCUMENTS.some(([candidate]) => candidate === documentKey) && isRequiredDocument(employee, documentKey);
      rows.push({ employee, key, label, expiration, days, missing: !expiration, missingDocument: documentRequired && !employee.certifications[documentKey] });
    }
    for (const [key, label] of DOCUMENTS.filter(([key]) => key.startsWith('is'))) {
      if (certificationFilter !== 'ALL' && certificationFilter !== key) continue;
      rows.push({ employee, key, label, expiration: '', days: null, missing: false, missingDocument: !employee.certifications[key] });
    }
    return rows;
  }), [filteredEmployees, certificationFilter]);
  const compliantEmployees = useMemo(() => filteredEmployees.filter((employee) =>
    !certificationRows.some((row) => row.employee.id === employee.id && (row.missing || row.missingDocument || (row.days !== null && row.days < 0)))
  ).length, [filteredEmployees, certificationRows]);

  function applyPreset(preset: string) {
    const next = presetRange(preset);
    setStartDate(next.start);
    setEndDate(next.end);
  }

  function exportCurrent() {
    if (section === 'WORKFORCE') {
      downloadCsv('apollo-workforce-hours.csv', [
        ['Employee', 'Employee Type', 'Scope', 'Scheduled Hours', 'Worked Hours', 'Regular', 'OT', 'DT'],
        ...employeeRows.map((row) => [row.name, row.employeeType, row.scope, row.scheduled.toFixed(2), row.total.toFixed(2), row.regular.toFixed(2), row.overtime.toFixed(2), row.doubleTime.toFixed(2)]),
      ]);
    } else if (section === 'ATTENDANCE') {
      downloadCsv('apollo-attendance-leave.csv', [
        ['Day', 'Sick Occurrences', 'Sick Hours', 'Vacation Occurrences', 'Vacation Hours', 'Leave Occurrences', 'Leave Hours'],
        ...attendance.byDay.map((row) => [row.day, row.sick, row.sickHours.toFixed(2), row.vacation, row.vacationHours.toFixed(2), row.leave, row.leaveHours.toFixed(2)]),
      ]);
    } else if (section === 'STAFFING') {
      downloadCsv('apollo-scheduling-staffing.csv', [
        ['Day', 'Tracked Openings', 'Filled', 'Tracked Fill Rate'],
        ...staffing.dayRows.map((row) => [row.day, row.tracked, row.filled, `${row.rate.toFixed(1)}%`]),
      ]);
    } else if (section === 'EXCEPTIONS') {
      downloadCsv('apollo-payroll-exceptions.csv', [
        ['Metric', 'Count'],
        ['Missed meals', exceptions.missedMeals],
        ['LDT stipends', exceptions.ldt],
        ['Corrections', exceptions.corrections],
        ['Outside geofence', exceptions.geofence],
        ['Location unavailable', exceptions.unavailable],
        ['Returned timecards', exceptions.returned],
        ['Missing submissions', exceptions.missing.length],
      ]);
    } else {
      downloadCsv('apollo-certifications.csv', [
        ['Employee', 'Certification', 'Expiration', 'Days Remaining', 'Missing Date', 'Missing Document'],
        ...certificationRows.map((row) => [row.employee.name, row.label, row.expiration, row.days ?? '', row.missing ? 'Yes' : 'No', row.missingDocument ? 'Yes' : 'No']),
      ]);
    }
  }

  const sectionNames: Record<Section, string> = {
    WORKFORCE: 'Workforce Hours',
    ATTENDANCE: 'Attendance & Leave',
    STAFFING: 'Scheduling & Staffing',
    EXCEPTIONS: 'Payroll Exceptions',
    CERTIFICATIONS: 'Certifications',
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 print:bg-white">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <a href="/supervisor" className="text-sm font-bold text-blue-700 hover:text-blue-900">← Supervisor Tools</a>
            <h1 className="mt-1 text-2xl font-black">Analytics & Reports</h1>
            <p className="text-sm text-slate-500">Payroll, attendance, staffing, exceptions, and certification insights.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={exportCurrent} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50">Export CSV</button>
            <button type="button" onClick={() => window.print()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">Print / Save PDF</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
          <div className="flex flex-wrap gap-2">
            {(['CURRENT_PAY_PERIOD', 'PREVIOUS_PAY_PERIOD', 'MONTH', 'QUARTER', 'YEAR'] as const).map((preset) => (
              <button key={preset} type="button" onClick={() => applyPreset(preset)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50">
                {preset.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <label className="text-xs font-bold text-slate-600">Start Date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="text-xs font-bold text-slate-600">End Date<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="text-xs font-bold text-slate-600">Employee<select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="ALL">All Employees</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600">Employee Type<select value={employeeTypeFilter} onChange={(event) => setEmployeeTypeFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="ALL">All Types</option><option>Full Time</option><option>Per Diem</option></select></label>
            <label className="text-xs font-bold text-slate-600">Scope<select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="ALL">ALS & BLS</option><option>ALS</option><option>BLS</option></select></label>
            <label className="text-xs font-bold text-slate-600">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="ALL">All Statuses</option>{[...new Set(employees.map((employee) => employee.status))].map((status) => <option key={status}>{status}</option>)}</select></label>
            {section === 'CERTIFICATIONS' && <label className="text-xs font-bold text-slate-600">Certification<select value={certificationFilter} onChange={(event) => setCertificationFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="ALL">All Certifications</option>{CERTIFICATIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}{DOCUMENTS.filter(([key]) => key.startsWith('is')).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
          </div>
        </section>

        <nav className="flex gap-2 overflow-x-auto pb-1 print:hidden">
          {(Object.keys(sectionNames) as Section[]).map((key) => (
            <button key={key} type="button" onClick={() => setSection(key)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold ${section === key ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{sectionNames[key]}</button>
          ))}
        </nav>

        <div className="hidden print:block">
          <h1 className="text-2xl font-black">ApolloEMS — {sectionNames[section]}</h1>
          <p className="mt-1 text-sm">{formatDate(startDate)} through {formatDate(endDate)}</p>
        </div>

        {loading && <Empty>Loading report data…</Empty>}
        {error && <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}

        {!loading && !error && section === 'WORKFORCE' && (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Stat label="Total Worked" value={`${totals.total.toFixed(2)} hrs`} />
              <Stat label="Regular" value={`${totals.regular.toFixed(2)} hrs`} />
              <Stat label="Overtime" value={`${totals.overtime.toFixed(2)} hrs`} />
              <Stat label="Double Time" value={`${totals.doubleTime.toFixed(2)} hrs`} />
              <Stat label="Scheduled" value={`${totals.scheduled.toFixed(2)} hrs`} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Stat label="Full Time Worked" value={`${employeeRows.filter((row) => row.employeeType === 'Full Time').reduce((sum, row) => sum + row.total, 0).toFixed(2)} hrs`} />
              <Stat label="Per Diem Worked" value={`${employeeRows.filter((row) => row.employeeType === 'Per Diem').reduce((sum, row) => sum + row.total, 0).toFixed(2)} hrs`} />
              <Stat label="ALS Worked" value={`${employeeRows.filter((row) => row.scope === 'ALS').reduce((sum, row) => sum + row.total, 0).toFixed(2)} hrs`} />
              <Stat label="BLS Worked" value={`${employeeRows.filter((row) => row.scope === 'BLS').reduce((sum, row) => sum + row.total, 0).toFixed(2)} hrs`} />
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Employee', 'Type', 'Scope', 'Scheduled', 'Worked', 'Regular', 'OT', 'DT'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody>{employeeRows.map((row) => <tr key={row.id} className="border-t border-slate-200"><td className="px-4 py-3 font-bold">{row.name}</td><td className="px-4 py-3">{row.employeeType}</td><td className="px-4 py-3">{row.scope}</td><td className="px-4 py-3">{row.scheduled.toFixed(2)}</td><td className="px-4 py-3 font-bold">{row.total.toFixed(2)}</td><td className="px-4 py-3">{row.regular.toFixed(2)}</td><td className="px-4 py-3">{row.overtime.toFixed(2)}</td><td className="px-4 py-3">{row.doubleTime.toFixed(2)}</td></tr>)}</tbody></table>
            </div>
            <p className="text-xs text-slate-500">Worked and payroll-classified hours include approved timecards fully contained inside the selected range. This preserves Apollo’s original OT/DT classifications instead of recalculating partial workweeks.</p>
          </section>
        )}

        {!loading && !error && section === 'ATTENDANCE' && (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3"><Stat label="Sick Hours" value={`${attendance.monthly.reduce((sum, [, row]) => sum + row.sick, 0).toFixed(2)} hrs`} /><Stat label="Vacation Hours" value={`${attendance.monthly.reduce((sum, [, row]) => sum + row.vacation, 0).toFixed(2)} hrs`} /><Stat label="Leave Hours" value={`${attendance.monthly.reduce((sum, [, row]) => sum + row.leave, 0).toFixed(2)} hrs`} /></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="font-black">Sick Occurrences by Day of Week</h2>
              <p className="mt-1 text-xs text-slate-500">Counts assignments marked Sick; Apollo does not yet record whether each change was a same-day call-out.</p>
              <div className="mt-4 grid gap-2">{attendance.byDay.map((row) => { const max = Math.max(1, ...attendance.byDay.map((day) => day.sick)); return <div key={row.day} className="grid grid-cols-[90px_1fr_110px] items-center gap-3 text-sm"><span className="font-bold">{row.day}</span><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-red-500" style={{ width: `${row.sick / max * 100}%` }} /></div><span className="text-right">{row.sick} / {row.sickHours.toFixed(1)} hrs</span></div>; })}</div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Month</th><th className="px-4 py-3">Sick Hours</th><th className="px-4 py-3">Vacation Hours</th><th className="px-4 py-3">Leave Hours</th></tr></thead><tbody>{attendance.monthly.map(([month, row]) => <tr key={month} className="border-t border-slate-200"><td className="px-4 py-3 font-bold">{localDate(`${month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td><td className="px-4 py-3">{row.sick.toFixed(2)}</td><td className="px-4 py-3">{row.vacation.toFixed(2)}</td><td className="px-4 py-3">{row.leave.toFixed(2)}</td></tr>)}</tbody></table></div>
          </section>
        )}

        {!loading && !error && section === 'STAFFING' && (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Stat label="Scheduled Hours" value={`${staffing.scheduled.toFixed(2)} hrs`} />
              <Stat label="Worked Hours" value={`${totals.total.toFixed(2)} hrs`} />
              <Stat label="Open Now in Range" value={staffing.pendingOpen} />
              <Stat label="Tracked Fill Rate" value={`${(staffing.tracked.length ? staffing.filled / staffing.tracked.length * 100 : 0).toFixed(1)}%`} detail={`${staffing.filled} filled of ${staffing.tracked.length} openings with requests`} />
              <Stat label="Trade Requests" value={staffing.trades.length} detail={`${staffing.trades.filter((row) => row.status === 'APPROVED').length} approved`} />
            </div>
            <div className="grid gap-3 md:grid-cols-2"><Stat label="Easiest Day to Fill" value={staffing.easiest?.day || 'Not enough data'} detail={staffing.easiest ? `${staffing.easiest.rate.toFixed(1)}% across ${staffing.easiest.tracked} tracked openings` : 'Requires at least 3 tracked openings'} /><Stat label="Hardest Day to Fill" value={staffing.hardest?.day || 'Not enough data'} detail={staffing.hardest ? `${staffing.hardest.rate.toFixed(1)}% across ${staffing.hardest.tracked} tracked openings` : 'Requires at least 3 tracked openings'} /></div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Day</th><th className="px-4 py-3">Tracked Openings</th><th className="px-4 py-3">Filled</th><th className="px-4 py-3">Fill Rate</th></tr></thead><tbody>{staffing.dayRows.map((row) => <tr key={row.day} className="border-t border-slate-200"><td className="px-4 py-3 font-bold">{row.day}</td><td className="px-4 py-3">{row.tracked}</td><td className="px-4 py-3">{row.filled}</td><td className="px-4 py-3">{row.tracked ? `${row.rate.toFixed(1)}%` : '—'}</td></tr>)}</tbody></table></div>
            <div className="grid gap-3 sm:grid-cols-3"><Stat label="Vacation Requests" value={staffing.vacations.length} /><Stat label="Approved Vacation" value={staffing.vacations.filter((row) => row.status === 'APPROVED').length} /><Stat label="Pending Vacation Coverage" value={rangeAssignments.filter((row) => row.isOpen && String(row.shiftLabel).toLowerCase().includes('vacation')).length} /></div>
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>Tracked fill rate:</strong> the percentage of distinct open shifts with at least one employee request that resulted in an approved request. Historical openings that received no request or were overwritten when filled are not preserved by the current schema, so this is not yet a complete agency-wide fill rate. Future event-history tracking will make it exact.</p>
          </section>
        )}

        {!loading && !error && section === 'EXCEPTIONS' && (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Missed Meals" value={exceptions.missedMeals} /><Stat label="LDT Stipends" value={exceptions.ldt} detail={`$${exceptions.ldtAmount.toFixed(2)} total`} /><Stat label="Corrections" value={exceptions.corrections} /><Stat label="Outside Geofence" value={exceptions.geofence} /><Stat label="Location Unavailable" value={exceptions.unavailable} /><Stat label="Returned Timecards" value={exceptions.returned} /><Stat label="Pending Review" value={exceptions.pending} /><Stat label="Missing Submissions" value={exceptions.missing.length} /></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="font-black">Employees Missing a Submission</h2>{exceptions.missing.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{exceptions.missing.map((employee) => <div key={employee.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">{employee.name}</div>)}</div> : <p className="mt-2 text-sm text-emerald-700">No missing submissions for the selected filters and fully contained pay periods.</p>}</div>
          </section>
        )}

        {!loading && !error && section === 'CERTIFICATIONS' && (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Stat label="Compliance" value={`${(filteredEmployees.length ? compliantEmployees / filteredEmployees.length * 100 : 0).toFixed(1)}%`} detail={`${compliantEmployees} of ${filteredEmployees.length} employees`} /><Stat label="Expired" value={certificationRows.filter((row) => row.days !== null && row.days < 0).length} /><Stat label="Within 30 Days" value={certificationRows.filter((row) => row.days !== null && row.days >= 0 && row.days <= 30).length} /><Stat label="Within 60 Days" value={certificationRows.filter((row) => row.days !== null && row.days >= 0 && row.days <= 60).length} /><Stat label="Within 90 Days" value={certificationRows.filter((row) => row.days !== null && row.days >= 0 && row.days <= 90).length} /><Stat label="Missing Dates" value={certificationRows.filter((row) => row.missing).length} /><Stat label="Missing Documents" value={certificationRows.filter((row) => row.missingDocument).length} /></div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Certification</th><th className="px-4 py-3">Expiration</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Document</th></tr></thead><tbody>{certificationRows.filter((row) => row.missing || row.missingDocument || (row.days !== null && row.days <= 90)).map((row) => <tr key={`${row.employee.id}-${row.key}`} className="border-t border-slate-200"><td className="px-4 py-3 font-bold">{row.employee.name}</td><td className="px-4 py-3">{row.label}</td><td className="px-4 py-3">{row.expiration || 'Missing'}</td><td className={`px-4 py-3 font-bold ${row.days !== null && row.days < 0 ? 'text-red-700' : row.days !== null && row.days <= 30 ? 'text-orange-700' : 'text-slate-700'}`}>{row.missing ? 'Missing date' : row.days === null ? 'Document only' : row.days < 0 ? `Expired ${Math.abs(row.days)} days ago` : `${row.days} days remaining`}</td><td className="px-4 py-3">{row.missingDocument ? 'Missing' : 'On file / N/A'}</td></tr>)}</tbody></table></div>
          </section>
        )}
      </div>
    </main>
  );
}

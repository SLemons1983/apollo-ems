'use client';

import React, { memo, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { EmployeeOption } from './shared';

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

const OPEN_ALS_SLOT_ID = '__OPEN_ALS__';
const OPEN_BLS_SLOT_ID = '__OPEN_BLS__';

type ScheduleManagementTileProps = {
  employees: EmployeeOption[];
  addAuditEntry: (action: string, details: string) => Promise<void> | void;
};

function ScheduleManagementTile({ employees, addAuditEntry }: ScheduleManagementTileProps) {
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);
  const [builderStartDate, setBuilderStartDate] = useState('');
  const [builderEndDate, setBuilderEndDate] = useState('');
  const [builderSchedule, setBuilderSchedule] = useState<BuilderSchedule>({});

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

      const rows: Record<string, unknown>[] = [];

      launchDateKeys.forEach((dateKey, index) => {
        const templateIndex = index % 14;
        const normalizedTemplateDateKey = templateDateKeys[templateIndex];
        const normalizedTemplateDay = builderSchedule[normalizedTemplateDateKey];

        if (!normalizedTemplateDay) {
          return;
        }

        const normalizedLaunchedDay = getLaunchedScheduleDayFromBuilderDay(normalizedTemplateDay);

        Object.entries(normalizedLaunchedDay.standard).forEach(([shiftKey, shift]) => {
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
  // Only the schedule draft and employee names feed the warnings.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const builderWarnings = useMemo(() => getBuilderWarnings(), [builderSchedule, employees]);

  return (
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

    </div>
  );
}

export default memo(ScheduleManagementTile);
